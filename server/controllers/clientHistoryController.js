import { query } from '../config/database.js'
import { getValidatedClientPayload } from '../utils/clientSession.js'

const GAME_HISTORY_LIMIT = 20

const ARGENTINA_OFFSET_MS = -3 * 60 * 60 * 1000  // UTC-3

function toArgentinaDate(utcMs) {
  return new Date(utcMs + ARGENTINA_OFFSET_MS)
}

function buildDateRange() {
  const nowArg  = toArgentinaDate(Date.now())
  const fromArg = toArgentinaDate(Date.now())
  fromArg.setUTCDate(fromArg.getUTCDate() - 7)
  const pad = (n) => String(n).padStart(2, '0')
  const fmt = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
  return { from: `${fmt(fromArg)} 00:00:00`, to: `${fmt(nowArg)} 23:59:59` }
}

async function getCasinoApiConfig() {
  const { rows, error } = await query('SELECT api_url, api_key FROM config_casino WHERE id = 1 LIMIT 1')
  if (error) throw error
  const cfg = rows?.[0]
  if (!cfg?.api_url || !cfg?.api_key) {
    const err = new Error('Casino API no configurada')
    err.status = 503
    throw err
  }
  const url = String(cfg.api_url).trim()
  return { apiUrl: url.endsWith('/') ? url : `${url}/`, apiKey: cfg.api_key }
}

async function getClientFromCookie(req) {
  try {
    const payload = await getValidatedClientPayload(req)
    if (!payload?.sub) return null
    return { clientId: Number(payload.sub), username: payload.username || '' }
  } catch {
    return null
  }
}

const PAGE_LIMIT = 20

/**
 * GET /api/client/history/movements?type=deposits&page=1
 * Returns paginated deposit or withdrawal history for the authenticated client.
 * Response: { items, total, page, limit, hasMore }
 */
export async function getClientMovements(req, res, next) {
  try {
    const client = await getClientFromCookie(req)
    if (!client) return res.status(401).json({ error: 'Sesión requerida', code: 'AUTH_REQUIRED' })

    const cid   = client.clientId
    const type  = req.query.type === 'withdrawals' ? 'withdrawals' : 'deposits'
    const page  = Math.max(1, parseInt(req.query.page  || '1',              10) || 1)
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || String(PAGE_LIMIT), 10) || PAGE_LIMIT))
    const offset = (page - 1) * limit

    if (type === 'deposits') {
      // ── Count ────────────────────────────────────────────────
      const { rows: cntRows, error: cntErr } = await query(
        `SELECT COUNT(*) AS total FROM (
           SELECT id FROM manual_payment_movements WHERE client_id = ?
           UNION ALL SELECT id FROM hgcash_movements    WHERE client_id = ?
           UNION ALL SELECT id FROM mercadopago_movements WHERE client_id = ?
           UNION ALL SELECT id FROM telepagos_movements  WHERE client_id = ?
           UNION ALL SELECT id FROM balance_adjustments  WHERE client_id = ? AND operation = 'in'
         ) AS _c`,
        [cid, cid, cid, cid, cid]
      )
      if (cntErr) throw cntErr
      const total = Number(cntRows?.[0]?.total || 0)

      // ── Page ─────────────────────────────────────────────────
      const { rows: movRows, error: movErr } = await query(
        `SELECT
           sub.id, sub.amount, sub.status, sub.created_at, sub.src, sub.label,
           ep.event_id, e.title AS event_title, e.type AS event_type
         FROM (
           SELECT id, amount, status, created_at, 'manual'      AS src, NULL               AS label
             FROM manual_payment_movements  WHERE client_id = ?
           UNION ALL
           SELECT id, amount, status, created_at, 'hgcash'      AS src, NULL               AS label
             FROM hgcash_movements          WHERE client_id = ?
           UNION ALL
           SELECT id, amount, IF(LOWER(status)='error','rejected',status) AS status,
                  created_at, 'mercadopago' AS src, NULL AS label
             FROM mercadopago_movements     WHERE client_id = ?
           UNION ALL
           SELECT id, amount, status, created_at, 'telepagos'   AS src, NULL               AS label
             FROM telepagos_movements       WHERE client_id = ?
           UNION ALL
           SELECT id, amount, 'paid' AS status, created_at, 'admin' AS src, 'Ajuste de saldo' AS label
             FROM balance_adjustments WHERE client_id = ? AND operation = 'in'
         ) sub
         LEFT JOIN event_participants ep ON (
           sub.src = 'manual'
           AND ep.client_id = ?
           AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) = CAST(sub.id AS CHAR)
         )
         LEFT JOIN events e ON e.id = ep.event_id
         ORDER BY sub.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        [cid, cid, cid, cid, cid, cid]
      )
      if (movErr) throw movErr

      const items = (movRows || []).map(row => ({
        id:         Number(row.id),
        type:       'deposit',
        amount:     Number(row.amount || 0),
        status:     String(row.status || 'pending').toLowerCase(),
        created_at: row.created_at,
        label:      row.label || null,
        event: row.event_id
          ? { id: Number(row.event_id), title: row.event_title || '', type: row.event_type || '' }
          : null,
      }))

      return res.json({ items, total, page, limit, hasMore: offset + items.length < total })
    }

    // ── Withdrawals ───────────────────────────────────────────
    const { rows: cntRows, error: cntErr } = await query(
      `SELECT COUNT(*) AS total FROM (
         SELECT id FROM withdrawal_requests WHERE client_id = ?
         UNION ALL SELECT id FROM balance_adjustments WHERE client_id = ? AND operation = 'out'
       ) AS _c`,
      [cid, cid]
    )
    if (cntErr) throw cntErr
    const total = Number(cntRows?.[0]?.total || 0)

    const { rows: wdRows, error: wdErr } = await query(
      `SELECT id, 'request' AS kind, status, form_data AS meta, NULL AS direct_amount,
              created_at, processed_at, rejection_message
         FROM withdrawal_requests WHERE client_id = ?
       UNION ALL
       SELECT id, 'adjustment' AS kind, 'approved' AS status, NULL AS meta, amount AS direct_amount,
              created_at, NULL AS processed_at, NULL AS rejection_message
         FROM balance_adjustments WHERE client_id = ? AND operation = 'out'
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [cid, cid]
    )
    if (wdErr) throw wdErr

    const items = (wdRows || []).map(row => {
      let amount = Number(row.direct_amount || 0)
      if (!amount && row.kind === 'request' && row.meta) {
        try {
          const fd = JSON.parse(row.meta)
          amount = Number(fd.monto ?? fd.amount ?? 0)
        } catch {}
      }
      return {
        id:                Number(row.id),
        type:              'withdrawal',
        kind:              row.kind,
        amount,
        status:            String(row.status || 'pending').toLowerCase(),
        created_at:        row.created_at,
        processed_at:      row.processed_at || null,
        rejection_message: row.rejection_message || null,
      }
    })

    return res.json({ items, total, page, limit, hasMore: offset + items.length < total })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/client/history/games?page=1&limit=20
 * Returns paginated casino game rounds for the authenticated client.
 * Proxies to the external casino API using the client's external_id.
 * Response: { items, pageCount, page, limit, hasMore }
 */
export async function getClientGameHistory(req, res, next) {
  try {
    const client = await getClientFromCookie(req)
    if (!client) return res.status(401).json({ error: 'Sesión requerida', code: 'AUTH_REQUIRED' })

    const page  = Math.max(1, parseInt(req.query.page  || '1',  10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || String(GAME_HISTORY_LIMIT), 10) || GAME_HISTORY_LIMIT))

    const [clientRow, casinoConfig] = await Promise.all([
      query('SELECT external_id FROM clients WHERE id = ? LIMIT 1', [client.clientId]),
      getCasinoApiConfig(),
    ])
    if (clientRow.error) throw clientRow.error

    const externalId = clientRow.rows?.[0]?.external_id
    if (!externalId) {
      return res.json({ items: [], pageCount: 0, page, limit, hasMore: false })
    }

    const { from, to } = buildDateRange()
    const form = new URLSearchParams()
    form.append('api_token', casinoConfig.apiKey)
    form.append('from',   from)
    form.append('to',     to)
    form.append('limit',  String(limit))
    form.append('offset', String(page))

    const casinoUrl = `${casinoConfig.apiUrl}index.php?act=admin&area=history&response=js&id=${externalId}`
    const casinoRes = await fetch(casinoUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    form.toString(),
    })

    const rawText = await casinoRes.text()

    if (!casinoRes.ok) {
      const err = new Error(`Casino API respondió ${casinoRes.status}`)
      err.status = 502
      throw err
    }

    let data
    try {
      data = JSON.parse(rawText)
    } catch {
      console.error('[GameHistory] respuesta no-JSON del casino:', rawText.slice(0, 200))
      const err = new Error('Respuesta inválida del casino')
      err.status = 502
      throw err
    }

    if (data.error || data.errorMessage) {
      const msg = data.errorMessage || data.error || 'Error del casino'
      const err = new Error(String(msg))
      err.status = 502
      throw err
    }

    const pageCount = Number(data.pageCount || 0)

    const parseAmount = (v) => {
      const n = Number(String(v ?? '0').replace(/,/g, ''))
      return isNaN(n) ? 0 : n
    }

    const items = (data.history || []).map(h => ({
      id:             String(h.id),
      game:           h.game     || '',
      game_id:        h.game_id  || '',
      provider:       h.provider || '',
      label:          h.label    || '',
      bet:            parseAmount(h.bet),
      win:            parseAmount(h.win),
      profit:         parseAmount(h.profit),
      currency:       h.currency || '',
      round_finished: h.round_finished === '1',
      datetime_open:  h.datetime_open  || null,
      datetime_close: h.datetime_close || null,
    }))

    return res.json({ items, pageCount, page, limit, hasMore: page < pageCount })
  } catch (err) {
    next(err)
  }
}
