import { query } from '../config/database.js'
import { sendMulticast } from '../utils/firebaseAdmin.js'

/* ── default campaigns seeded on first fetch ─────────────────── */
const DEFAULTS = {
  retention: [
    { name: 'Inactivo 1 día',    config: { days: 1  }, sort_order: 0 },
    { name: 'Inactivo 3 días',   config: { days: 3  }, sort_order: 1 },
    { name: 'Inactivo 7 días',   config: { days: 7  }, sort_order: 2 },
    { name: 'Inactivo 14 días',  config: { days: 14 }, sort_order: 3 },
    { name: 'Inactivo 30 días',  config: { days: 30 }, sort_order: 4 },
  ],
  events: [
    { name: 'Evento inicia',       config: { event_type: 'event_start'    }, sort_order: 0 },
    { name: 'Evento por terminar', config: { event_type: 'event_warning', minutes_before: 15 }, sort_order: 1 },
    { name: 'Evento terminó',      config: { event_type: 'event_end'      }, sort_order: 2 },
    { name: 'Resultado sorteo',    config: { event_type: 'lottery_result' }, sort_order: 3 },
  ],
  onboarding: [
    { name: 'Día 0',             config: { day: 0, condition: 'always'        }, sort_order: 0 },
    { name: 'Día 1 - Depositó',  config: { day: 1, condition: 'deposited'     }, sort_order: 1 },
    { name: 'Día 1 - No depositó', config: { day: 1, condition: 'not_deposited' }, sort_order: 2 },
    { name: 'Día 3',             config: { day: 3, condition: 'always'        }, sort_order: 3 },
    { name: 'Día 5',             config: { day: 5, condition: 'always'        }, sort_order: 4 },
    { name: 'Día 7',             config: { day: 7, condition: 'always'        }, sort_order: 5 },
  ],
}

function parseConfig(row) {
  if (!row) return row
  const cfg = row.config
  return {
    ...row,
    config: cfg
      ? (typeof cfg === 'string' ? JSON.parse(cfg) : cfg)
      : {},
  }
}

async function seedDefaults(type) {
  const defs = DEFAULTS[type] || []
  for (const d of defs) {
    await query(
      `INSERT INTO push_campaigns (type, name, title, body, config, is_active, sort_order)
       VALUES (?, ?, '', '', ?, 1, ?)`,
      [type, d.name, JSON.stringify(d.config), d.sort_order]
    )
  }
}

/* ── credentials ──────────────────────────────────────────────── */

export async function getCredentials(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT project_id, client_email,
              IF(private_key IS NOT NULL AND private_key != '', '••••••', '') AS private_key_masked,
              api_key, auth_domain, storage_bucket, messaging_sender_id, app_id, vapid_key
       FROM push_credentials WHERE id = 1 LIMIT 1`
    )
    const row = rows?.[0] || {}
    res.json({
      credentials: {
        projectId:          row.project_id          || '',
        clientEmail:        row.client_email        || '',
        privateKey:         row.private_key_masked  || '',
        apiKey:             row.api_key             || '',
        authDomain:         row.auth_domain         || '',
        storageBucket:      row.storage_bucket      || '',
        messagingSenderId:  row.messaging_sender_id || '',
        appId:              row.app_id              || '',
        vapidKey:           row.vapid_key           || '',
      },
    })
  } catch (err) { next(err) }
}

export async function updateCredentials(req, res, next) {
  try {
    const {
      projectId, clientEmail, privateKey,
      apiKey, authDomain, storageBucket,
      messagingSenderId, appId, vapidKey,
    } = req.body

    const sets = []; const vals = []
    const add = (col, val) => { if (val !== undefined) { sets.push(`${col} = ?`); vals.push(val || null) } }
    add('project_id',          projectId)
    add('client_email',        clientEmail)
    if (privateKey && privateKey !== '••••••') add('private_key', privateKey)
    add('api_key',             apiKey)
    add('auth_domain',         authDomain)
    add('storage_bucket',      storageBucket)
    add('messaging_sender_id', messagingSenderId)
    add('app_id',              appId)
    add('vapid_key',           vapidKey)

    if (sets.length) {
      const cols = sets.map(s => s.split(' = ')[0])
      await query(
        `INSERT INTO push_credentials (id, ${cols.join(', ')})
         VALUES (1, ${cols.map(() => '?').join(', ')})
         ON DUPLICATE KEY UPDATE ${sets.join(', ')}`,
        [...vals, ...vals]
      )
    }
    res.json({ ok: true })
  } catch (err) { next(err) }
}

export async function getFirebaseClientConfig(req, res, next) {
  try {
    const { rows } = await query(
      'SELECT api_key, auth_domain, project_id, storage_bucket, messaging_sender_id, app_id, vapid_key FROM push_credentials WHERE id = 1 LIMIT 1'
    )
    const r = rows?.[0] || {}
    if (!r.api_key) return res.json({ configured: false })
    res.json({
      configured: true,
      apiKey:            r.api_key             || '',
      authDomain:        r.auth_domain         || '',
      projectId:         r.project_id          || '',
      storageBucket:     r.storage_bucket      || '',
      messagingSenderId: r.messaging_sender_id || '',
      appId:             r.app_id              || '',
      vapidKey:          r.vapid_key           || '',
    })
  } catch (err) { next(err) }
}

/* ── global settings ──────────────────────────────────────────── */

export async function getSettings(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM push_global_settings WHERE id = 1 LIMIT 1')
    const r = rows?.[0] || {}
    res.json({
      settings: {
        isActive:          Boolean(r.is_active),
        quietStart:        Number(r.quiet_start   ?? 2),
        quietEnd:          Number(r.quiet_end     ?? 9),
        maxPerDay:         Number(r.max_per_day   ?? 3),
        checkInterval:     Number(r.check_interval ?? 15),
        timezone:          r.timezone             || 'America/Argentina/Buenos_Aires',
        engagementActive:  Boolean(r.engagement_active),
        eventsActive:      Boolean(r.events_active),
        onboardingActive:  Boolean(r.onboarding_active),
        vipActive:         Boolean(r.vip_active),
      },
    })
  } catch (err) { next(err) }
}

export async function updateSettings(req, res, next) {
  try {
    const {
      isActive, quietStart, quietEnd, maxPerDay, checkInterval, timezone,
      engagementActive, eventsActive, onboardingActive, vipActive,
    } = req.body

    const sets = []; const vals = []
    const addBool = (col, v) => { if (v !== undefined) { sets.push(`${col} = ?`); vals.push(v ? 1 : 0) } }
    const addNum  = (col, v) => { if (v !== undefined) { sets.push(`${col} = ?`); vals.push(Number(v)) } }
    const addStr  = (col, v) => { if (v !== undefined) { sets.push(`${col} = ?`); vals.push(String(v)) } }

    addBool('is_active',         isActive)
    addNum('quiet_start',        quietStart)
    addNum('quiet_end',          quietEnd)
    addNum('max_per_day',        maxPerDay)
    addNum('check_interval',     checkInterval)
    addStr('timezone',           timezone)
    addBool('engagement_active', engagementActive)
    addBool('events_active',     eventsActive)
    addBool('onboarding_active', onboardingActive)
    addBool('vip_active',        vipActive)

    if (sets.length) {
      await query(`UPDATE push_global_settings SET ${sets.join(', ')} WHERE id = 1`, vals)
    }
    res.json({ ok: true })
  } catch (err) { next(err) }
}

/* ── stats ────────────────────────────────────────────────────── */

export async function getStats(req, res, next) {
  try {
    const [subRows, sentRows, sent30Rows] = await Promise.all([
      query('SELECT COUNT(DISTINCT client_id) AS cnt FROM push_tokens WHERE is_active = 1'),
      query('SELECT COALESCE(SUM(sent_count), 0) AS total, COALESCE(SUM(failed_count), 0) AS failed FROM push_history'),
      query(`SELECT COALESCE(SUM(sent_count),0) AS s, COALESCE(SUM(failed_count),0) AS f
             FROM push_history WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`),
    ])
    res.json({
      subscribers:  Number(subRows.rows?.[0]?.cnt    || 0),
      totalSent:    Number(sentRows.rows?.[0]?.total  || 0),
      totalFailed:  Number(sentRows.rows?.[0]?.failed || 0),
      sent30d:      Number(sent30Rows.rows?.[0]?.s    || 0),
      failed30d:    Number(sent30Rows.rows?.[0]?.f    || 0),
    })
  } catch (err) { next(err) }
}

/* ── campaigns CRUD ───────────────────────────────────────────── */

export async function getCampaigns(req, res, next) {
  try {
    const type = String(req.query.type || 'retention')
    let { rows } = await query(
      'SELECT * FROM push_campaigns WHERE type = ? ORDER BY sort_order, id',
      [type]
    )

    if ((!rows || rows.length === 0) && DEFAULTS[type]) {
      await seedDefaults(type)
      const refetch = await query(
        'SELECT * FROM push_campaigns WHERE type = ? ORDER BY sort_order, id',
        [type]
      )
      rows = refetch.rows || []
    }

    res.json({ campaigns: (rows || []).map(parseConfig) })
  } catch (err) { next(err) }
}

export async function createCampaign(req, res, next) {
  try {
    const { type, name, title, body, config, isActive } = req.body
    const validTypes = ['retention','reconsumo','engagement','events','onboarding','vip']
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'Tipo inválido' })

    const { rows: countRows } = await query(
      'SELECT COALESCE(MAX(sort_order),0) AS mx FROM push_campaigns WHERE type = ?', [type]
    )
    const sortOrder = Number(countRows?.[0]?.mx || 0) + 1

    const { rows, error } = await query(
      `INSERT INTO push_campaigns (type, name, title, body, config, is_active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [type, name || '', title || '', body || '', JSON.stringify(config || {}), isActive !== false ? 1 : 0, sortOrder]
    )
    if (error) throw error

    const { rows: newRows } = await query('SELECT * FROM push_campaigns WHERE id = ? LIMIT 1', [rows.insertId])
    res.json({ campaign: parseConfig(newRows?.[0]) })
  } catch (err) { next(err) }
}

export async function updateCampaign(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const { name, title, body, config, isActive } = req.body
    const sets = []; const vals = []
    const addStr  = (col, v) => { if (v !== undefined) { sets.push(`${col} = ?`); vals.push(v) } }
    const addBool = (col, v) => { if (v !== undefined) { sets.push(`${col} = ?`); vals.push(v ? 1 : 0) } }
    const addJson = (col, v) => { if (v !== undefined) { sets.push(`${col} = ?`); vals.push(JSON.stringify(v)) } }

    addStr('name',      name)
    addStr('title',     title)
    addStr('body',      body)
    addJson('config',   config)
    addBool('is_active', isActive)

    if (!sets.length) return res.status(400).json({ error: 'Nada que actualizar' })

    vals.push(id)
    await query(`UPDATE push_campaigns SET ${sets.join(', ')} WHERE id = ?`, vals)

    const { rows } = await query('SELECT * FROM push_campaigns WHERE id = ? LIMIT 1', [id])
    res.json({ campaign: parseConfig(rows?.[0]) })
  } catch (err) { next(err) }
}

export async function deleteCampaign(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    await query('DELETE FROM push_campaigns WHERE id = ?', [id])
    res.json({ ok: true })
  } catch (err) { next(err) }
}

/* ── target token resolution ──────────────────────────────────── */

async function getTargetTokens(campaign, maxPerDay) {
  const cfg = campaign.config || {};
  const maxPD = maxPerDay || 3;

  const activeTokenBase = `
    SELECT pt.id, pt.client_id, pt.token
    FROM push_tokens pt
    INNER JOIN (
      SELECT client_id, MAX(id) AS id
      FROM push_tokens
      WHERE is_active = 1
      GROUP BY client_id
    ) last_pt ON last_pt.id = pt.id
    WHERE pt.is_active = 1
  `;

  switch (campaign.type) {
    case 'retention': {
      const days = Number(cfg.days || 1);

      const { rows } = await query(`
        ${activeTokenBase}
          AND pt.client_id IN (
            SELECT ch.client_id
            FROM chats ch
            WHERE ch.last_message_at IS NOT NULL
              AND DATEDIFF(NOW(), ch.last_message_at) >= ?
          )
          AND pt.client_id NOT IN (
            SELECT client_id
            FROM push_retention_log
            WHERE campaign_id = ?
              AND date = CURDATE()
          )
          AND COALESCE((
            SELECT pds.count
            FROM push_daily_sent pds
            WHERE pds.client_id = pt.client_id
              AND pds.date = CURDATE()
          ), 0) < ?
      `, [days, campaign.id, maxPD]);

      return rows || [];
    }

    case 'reconsumo': {
      const noDays = Number(cfg.no_deposit_days || 3);

      const { rows } = await query(`
        ${activeTokenBase}
          AND pt.client_id IN (
            SELECT DISTINCT client_id FROM manual_payment_movements WHERE status = 'paid'
            UNION
            SELECT DISTINCT client_id FROM hgcash_movements WHERE status = 'paid'
            UNION
            SELECT DISTINCT client_id FROM mercadopago_movements WHERE status = 'paid'
          )
          AND pt.client_id NOT IN (
            SELECT client_id FROM manual_payment_movements
            WHERE status = 'paid'
              AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)

            UNION

            SELECT client_id FROM hgcash_movements
            WHERE status = 'paid'
              AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)

            UNION

            SELECT client_id FROM mercadopago_movements
            WHERE status = 'paid'
              AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
          )
          AND COALESCE((
            SELECT pds.count
            FROM push_daily_sent pds
            WHERE pds.client_id = pt.client_id
              AND pds.date = CURDATE()
          ), 0) < ?
      `, [noDays, noDays, noDays, maxPD]);

      return rows || [];
    }

    case 'vip': {
      const minDeposits = Number(cfg.min_deposits || 0);

      const vipCondition = minDeposits > 0
        ? `
          AND pt.client_id IN (
            SELECT client_id
            FROM (
              SELECT client_id, SUM(amount) AS total
              FROM (
                SELECT client_id, amount FROM manual_payment_movements WHERE status = 'paid'
                UNION ALL
                SELECT client_id, amount FROM hgcash_movements WHERE status = 'paid'
                UNION ALL
                SELECT client_id, amount FROM mercadopago_movements WHERE status = 'paid'
              ) d
              GROUP BY client_id
            ) t
            WHERE total >= ?
          )
        `
        : '';

      const params = minDeposits > 0
        ? [minDeposits, maxPD]
        : [maxPD];

      const { rows } = await query(`
        ${activeTokenBase}
          ${vipCondition}
          AND COALESCE((
            SELECT pds.count
            FROM push_daily_sent pds
            WHERE pds.client_id = pt.client_id
              AND pds.date = CURDATE()
          ), 0) < ?
      `, params);

      return rows || [];
    }

    case 'engagement': {
      const { rows } = await query(`
        ${activeTokenBase}
          AND COALESCE((
            SELECT pds.count
            FROM push_daily_sent pds
            WHERE pds.client_id = pt.client_id
              AND pds.date = CURDATE()
          ), 0) < ?
      `, [maxPD]);

      return rows || [];
    }

    case 'onboarding': {
      const day = Number(cfg.day ?? 0);
      const condition = cfg.condition || 'always';

      const condSQL = condition === 'deposited'
        ? `
          AND pt.client_id IN (
            SELECT DISTINCT client_id FROM manual_payment_movements WHERE status = 'paid'
            UNION
            SELECT DISTINCT client_id FROM hgcash_movements WHERE status = 'paid'
            UNION
            SELECT DISTINCT client_id FROM mercadopago_movements WHERE status = 'paid'
          )
        `
        : condition === 'not_deposited'
          ? `
            AND pt.client_id NOT IN (
              SELECT DISTINCT client_id FROM manual_payment_movements WHERE status = 'paid'
              UNION
              SELECT DISTINCT client_id FROM hgcash_movements WHERE status = 'paid'
              UNION
              SELECT DISTINCT client_id FROM mercadopago_movements WHERE status = 'paid'
            )
          `
          : '';

      const { rows } = await query(`
        ${activeTokenBase}
          INNER JOIN clients cl ON cl.id = pt.client_id
          ${condSQL}
          AND DATEDIFF(NOW(), cl.created_at) = ?
          AND pt.client_id NOT IN (
            SELECT client_id
            FROM push_onboarding_log
            WHERE campaign_id = ?
          )
      `, [day, campaign.id]);

      return rows || [];
    }

    case 'events': {
      const { rows } = await query(`
        ${activeTokenBase}
      `);

      return rows || [];
    }

    default:
      return [];
  }
}

/* ── audience tokens for direct pushes ──────────────────────────── */
async function getAudienceTokens(audience) {
  const base = `
    SELECT pt.id, pt.client_id, pt.token
    FROM push_tokens pt
    INNER JOIN (
      SELECT client_id, MAX(id) AS id
      FROM push_tokens
      WHERE is_active = 1
      GROUP BY client_id
    ) last_pt ON last_pt.id = pt.id
    WHERE pt.is_active = 1
  `;

  switch (audience) {
    case 'active': {
      const { rows } = await query(`${base}
        AND pt.client_id IN (
          SELECT client_id 
          FROM chats 
          WHERE last_message_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        )`);
      return rows || [];
    }

    case 'depositors': {
      const { rows } = await query(`${base}
        AND pt.client_id IN (
          SELECT DISTINCT client_id FROM manual_payment_movements WHERE status='paid'
          UNION
          SELECT DISTINCT client_id FROM hgcash_movements WHERE status='paid'
          UNION
          SELECT DISTINCT client_id FROM mercadopago_movements WHERE status='paid'
        )`);
      return rows || [];
    }

    case 'vip': {
      const { rows } = await query(`${base}
        AND pt.client_id IN (
          SELECT client_id FROM (
            SELECT client_id, COUNT(*) AS total FROM (
              SELECT client_id FROM manual_payment_movements WHERE status='paid'
              UNION ALL
              SELECT client_id FROM hgcash_movements WHERE status='paid'
              UNION ALL
              SELECT client_id FROM mercadopago_movements WHERE status='paid'
            ) d
            GROUP BY client_id
          ) t
          WHERE total >= 5
        )`);
      return rows || [];
    }

    case 'inactive': {
      const { rows } = await query(`${base}
        AND pt.client_id NOT IN (
          SELECT client_id 
          FROM chats 
          WHERE last_message_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        )`);
      return rows || [];
    }

    default: {
      const { rows } = await query(base);
      return rows || [];
    }
  }
}

export async function sendDirect(req, res, next) {
  try {
    const { title, body, audience = 'all' } = req.body
    if (!title?.trim() || !body?.trim()) return res.status(400).json({ error: 'Título y mensaje requeridos' })

    const tokens = await getAudienceTokens(audience)
    if (!tokens.length) return res.json({ sent: 0, failed: 0, target: 0 })

    const sendResult = await sendMulticast(tokens, title.trim(), body.trim())

    await query(
      `INSERT INTO push_history
       (campaign_id, campaign_type, campaign_name, title, body, target_count, sent_count, failed_count, trigger_type)
       VALUES (NULL, 'direct', ?, ?, ?, ?, ?, ?, 'manual')`,
      [audience, title.trim(), body.trim(), tokens.length, sendResult.sent, sendResult.failed]
    )

    if (sendResult.invalidTokenIds.length) {
      const ph = sendResult.invalidTokenIds.map(() => '?').join(',')
      await query(`UPDATE push_tokens SET is_active = 0 WHERE id IN (${ph})`, sendResult.invalidTokenIds)
    }

    res.json({ sent: sendResult.sent, failed: sendResult.failed, target: tokens.length })
  } catch (err) { next(err) }
}

async function executeSend(campaign, tokens, triggerType) {
  if (!tokens.length) return { sent: 0, failed: 0, target: 0, historyId: null }

  const sendResult = await sendMulticast(tokens, campaign.title, campaign.body, {
    campaign_id:   String(campaign.id),
    campaign_type: campaign.type,
  })

  const { rows: histRows } = await query(
    `INSERT INTO push_history
     (campaign_id, campaign_type, campaign_name, title, body, target_count, sent_count, failed_count, trigger_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [campaign.id, campaign.type, campaign.name, campaign.title, campaign.body,
     tokens.length, sendResult.sent, sendResult.failed, triggerType]
  )
  const historyId = histRows?.insertId

  const CHUNK = 200
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK)
    await Promise.all(chunk.map(async t => {
      const invalid = sendResult.invalidTokenIds.includes(t.id)
      if (historyId) {
        await query(
          'INSERT INTO push_history_tokens (history_id, client_id, token_prefix, status) VALUES (?, ?, ?, ?)',
          [historyId, t.client_id, String(t.token).slice(0, 50), invalid ? 'failed' : 'sent']
        )
      }
      await query(
        'INSERT INTO push_daily_sent (client_id, date, count) VALUES (?, CURDATE(), 1) ON DUPLICATE KEY UPDATE count = count + 1',
        [t.client_id]
      )
    }))
  }

  if (sendResult.invalidTokenIds.length) {
    const ph = sendResult.invalidTokenIds.map(() => '?').join(',')
    await query(`UPDATE push_tokens SET is_active = 0 WHERE id IN (${ph})`, sendResult.invalidTokenIds)
  }

  if (campaign.type === 'retention') {
    for (const t of tokens) {
      await query('INSERT IGNORE INTO push_retention_log (client_id, campaign_id, date) VALUES (?, ?, CURDATE())', [t.client_id, campaign.id])
    }
  }
  if (campaign.type === 'onboarding') {
    for (const t of tokens) {
      await query('INSERT IGNORE INTO push_onboarding_log (client_id, campaign_id) VALUES (?, ?)', [t.client_id, campaign.id])
    }
  }

  return { sent: sendResult.sent, failed: sendResult.failed, target: tokens.length, historyId }
}

export async function sendCampaignNow(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const { rows: campRows } = await query('SELECT * FROM push_campaigns WHERE id = ? LIMIT 1', [id])
    const campaign = parseConfig(campRows?.[0])
    if (!campaign) return res.status(404).json({ error: 'Campaña no encontrada' })

    const { rows: settRows } = await query('SELECT max_per_day FROM push_global_settings WHERE id = 1 LIMIT 1')
    const maxPerDay = Number(settRows?.[0]?.max_per_day || 3)

    const tokens = await getTargetTokens(campaign, maxPerDay)
    const result = await executeSend(campaign, tokens, 'manual')

    res.json({ result })
  } catch (err) { next(err) }
}

/* ── history ──────────────────────────────────────────────────── */

export async function getHistory(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page  || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)))
    const offset = (page - 1) * limit

    const { rows: cntRows } = await query('SELECT COUNT(*) AS total FROM push_history')
    const total = Number(cntRows?.[0]?.total || 0)

    const { rows } = await query(
      `SELECT id, campaign_id, campaign_type, campaign_name, title, body,
              target_count, sent_count, failed_count, trigger_type, sent_at
       FROM push_history ORDER BY sent_at DESC LIMIT ${limit} OFFSET ${offset}`
    )

    res.json({
      history: (rows || []).map(r => ({
        id:           Number(r.id),
        campaignId:   r.campaign_id ? Number(r.campaign_id) : null,
        campaignType: r.campaign_type,
        campaignName: r.campaign_name,
        title:        r.title,
        body:         r.body,
        targetCount:  Number(r.target_count),
        sentCount:    Number(r.sent_count),
        failedCount:  Number(r.failed_count),
        deliveryRate: r.target_count > 0 ? Math.round((r.sent_count / r.target_count) * 100) : 0,
        triggerType:  r.trigger_type,
        sentAt:       r.sent_at,
      })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) { next(err) }
}

/* ── client token registration ────────────────────────────────── */

export async function registerToken(req, res, next) {
  try {
    const { clientId, token, device } = req.body
    if (!clientId || !token) return res.status(400).json({ error: 'clientId y token requeridos' })

    // Verify client exists
    const { rows: clientRows } = await query('SELECT id FROM clients WHERE id = ? LIMIT 1', [clientId])
    if (!clientRows?.length) return res.status(404).json({ error: 'Cliente no encontrado' })

    // Deactivate old tokens for this token string (token might be reused)
    await query("UPDATE push_tokens SET is_active = 0 WHERE token = ? AND client_id != ?", [token, clientId])

    // Upsert by client+token
    const { rows: existing } = await query(
      "SELECT id FROM push_tokens WHERE client_id = ? AND token = ? LIMIT 1",
      [clientId, token]
    )

    if (existing?.length) {
      await query(
        "UPDATE push_tokens SET is_active = 1, device = ?, last_seen = NOW() WHERE client_id = ? AND token = ?",
        [device || null, clientId, token]
      )
    } else {
      // Deactivate old tokens for this client (one active per client/device)
      await query(
        "UPDATE push_tokens SET is_active = 0 WHERE client_id = ? AND device = ?",
        [clientId, device || null]
      )
      await query(
        "INSERT INTO push_tokens (client_id, token, device, is_active) VALUES (?, ?, ?, 1)",
        [clientId, token, device || null]
      )
    }

    res.json({ ok: true })
  } catch (err) { next(err) }
}

export async function unregisterToken(req, res, next) {
  try {
    const { token } = req.body
    if (!token) return res.status(400).json({ error: 'token requerido' })
    await query("UPDATE push_tokens SET is_active = 0 WHERE token = ?", [token])
    res.json({ ok: true })
  } catch (err) { next(err) }
}

/* ── scheduler helper (exported for pushScheduler.js) ────────── */

export async function runScheduledCampaigns() {
  const { rows: settRows } = await query('SELECT * FROM push_global_settings WHERE id = 1 LIMIT 1')
  const settings = settRows?.[0]
  if (!settings?.is_active) return

  const tz       = settings.timezone || 'America/Argentina/Buenos_Aires'
  const now      = new Date()
  const localHr  = Number(new Intl.DateTimeFormat('en', { timeZone: tz, hour: 'numeric', hour12: false }).format(now))
  const localMin = Number(new Intl.DateTimeFormat('en', { timeZone: tz, minute: 'numeric' }).format(now))

  // Respect quiet hours
  if (localHr >= settings.quiet_start && localHr < settings.quiet_end) return

  const maxPD = Number(settings.max_per_day || 3)

  // Retention
  const { rows: retCamps } = await query(
    "SELECT * FROM push_campaigns WHERE type = 'retention' AND is_active = 1"
  )
  for (const camp of retCamps || []) {
    const c = parseConfig(camp)
    const tokens = await getTargetTokens(c, maxPD)
    if (tokens.length) await executeSend(c, tokens, 'scheduler')
  }

  // Reconsumo
  const { rows: recCamps } = await query(
    "SELECT * FROM push_campaigns WHERE type = 'reconsumo' AND is_active = 1"
  )
  for (const camp of recCamps || []) {
    const c = parseConfig(camp)
    const tokens = await getTargetTokens(c, maxPD)
    if (tokens.length) await executeSend(c, tokens, 'scheduler')
  }

  // Engagement — time-based
  if (settings.engagement_active) {
    const { rows: engCamps } = await query(
      "SELECT * FROM push_campaigns WHERE type = 'engagement' AND is_active = 1"
    )
    const localDow = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(now) + 'T00:00:00').getDay()

    for (const camp of engCamps || []) {
      const c = parseConfig(camp)
      const { weekdays = [], time = '' } = c.config || {}
      if (!weekdays.includes(localDow)) continue
      if (!time) continue
      const [hh, mm] = time.split(':').map(Number)
      const diff = Math.abs(localHr * 60 + localMin - (hh * 60 + mm))
      if (diff > (settings.check_interval || 15)) continue
      const tokens = await getTargetTokens(c, maxPD)
      if (tokens.length) await executeSend(c, tokens, 'scheduler')
    }
  }

  // Onboarding
  if (settings.onboarding_active) {
    const { rows: obCamps } = await query(
      "SELECT * FROM push_campaigns WHERE type = 'onboarding' AND is_active = 1 ORDER BY sort_order"
    )
    for (const camp of obCamps || []) {
      const c = parseConfig(camp)
      const tokens = await getTargetTokens(c, maxPD)
      if (tokens.length) await executeSend(c, tokens, 'scheduler')
    }
  }

  // VIP
  if (settings.vip_active) {
    const { rows: vipCamps } = await query(
      "SELECT * FROM push_campaigns WHERE type = 'vip' AND is_active = 1"
    )
    for (const camp of vipCamps || []) {
      const c = parseConfig(camp)
      const tokens = await getTargetTokens(c, maxPD)
      if (tokens.length) await executeSend(c, tokens, 'scheduler')
    }
  }
}
