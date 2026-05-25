import { query } from '../config/database.js'

const PROVIDERS = ['hgcash', 'mercadopago', 'telepagos', 'manual']

function parseAccountData(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeBoolean(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function requireFields(body, fields, errors) {
  fields.forEach((field) => {
    if (!normalizeText(body[field])) errors.push(`El campo ${field} es requerido`)
  })
}

function sanitizeAccount(row) {
  const data = parseAccountData(row.account_data)

  return {
    id: row.id,
    provider: row.provider_slug,
    nombre_titular: data.nombre_titular || '',
    email: data.email || '',
    cuit: data.cuit || '',
    alias: row.alias || data.alias || '',
    cbu: data.cbu || '',
    token: data.token || '',
    cookie: data.cookie || '',
    cookie_expires_at: data.cookie_expires_at || null,
    webhook_enabled: Boolean(data.webhook_enabled),
    webhook_mode: data.webhook_mode || 'hmac',
    webhook_secret: data.webhook_secret || '',
    gateway_signing_secret: data.gateway_signing_secret || data.flowhg_signing_secret || data.signing_secret || '',
    expires_at: data.expires_at || null,
    currency: row.currency || 'ARS',
    estatus: row.is_active ? 'activa' : 'inactiva',
    has_api_token: Boolean(data.api_token),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}

async function getProvider(slug) {
  const { rows, error } = await query(
    'SELECT id, slug, name FROM bank_providers WHERE slug = ? AND is_active = 1 LIMIT 1',
    [slug]
  )
  if (error) throw error
  return rows?.[0] || null
}

async function getAccountRow(id) {
  const { rows, error } = await query(
    `SELECT ba.*, bp.slug AS provider_slug
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE ba.id = ?
     LIMIT 1`,
    [id]
  )
  if (error) throw error
  return rows?.[0] || null
}

function validatePayload(body, provider, { editing = false, previousData = {} } = {}) {
  const errors = []
  const password = normalizeText(body.password)
  const webhookEnabled = normalizeBoolean(body.webhook_enabled)
  const webhookMode = normalizeText(body.webhook_mode).toLowerCase()
    || (editing ? normalizeText(previousData.webhook_mode).toLowerCase() : '')
    || 'hmac'
  const normalizedWebhookMode = ['hmac', 'flowhg'].includes(webhookMode) ? webhookMode : 'hmac'
  const gatewaySigningSecret = normalizeText(body.gateway_signing_secret)
    || (editing && normalizedWebhookMode === 'flowhg' ? normalizeText(previousData.gateway_signing_secret || previousData.flowhg_signing_secret || previousData.signing_secret) : '')
  const payload = {
    nombre_titular: normalizeText(body.nombre_titular),
    email: normalizeText(body.email),
    cuit: normalizeText(body.cuit),
    alias: normalizeText(body.alias),
    cbu: normalizeText(body.cbu),
    token: normalizeText(body.token),
    cookie: normalizeText(body.cookie),
    cookie_expires_at: normalizeText(body.cookie_expires_at) || null,
    webhook_enabled: webhookEnabled,
    webhook_mode: normalizedWebhookMode,
    webhook_secret: webhookEnabled ? normalizeText(body.webhook_secret) : '',
    gateway_signing_secret: webhookEnabled && normalizedWebhookMode === 'flowhg' ? gatewaySigningSecret : '',
    expires_at: normalizeText(body.expires_at) || null,
  }

  if (password) payload.password = password
  else if (editing && previousData.password) payload.password = previousData.password

  const apiToken = normalizeText(body.api_token)
  if (apiToken) payload.api_token = apiToken
  else if (editing && previousData.api_token) payload.api_token = previousData.api_token

  if (provider === 'mercadopago') {
    requireFields(payload, ['nombre_titular', 'alias', 'cbu', 'token'], errors)
  }

  if (provider === 'manual') {
    requireFields(payload, ['nombre_titular', 'alias', 'cbu'], errors)
  }

  if (provider === 'hgcash') {
    requireFields(payload, ['nombre_titular', 'email', 'cuit', 'alias', 'cbu'], errors)
    if (!editing && !password) errors.push('El campo password es requerido')
    if (webhookEnabled && payload.webhook_mode === 'hmac' && !payload.webhook_secret) {
      errors.push('El webhook secret es requerido cuando el modo webhook es HMAC')
    }
    if (webhookEnabled && payload.webhook_mode === 'flowhg' && !payload.webhook_secret) {
      errors.push('El destination token de FlowHG es requerido')
    }
    if (webhookEnabled && payload.webhook_mode === 'flowhg' && !payload.gateway_signing_secret) {
      errors.push('El gateway signing secret de FlowHG es requerido')
    }
  }

  if (provider === 'telepagos') {
    requireFields(payload, ['nombre_titular', 'email', 'cuit', 'alias', 'cbu', 'token', 'expires_at'], errors)
    if (!editing && !password) errors.push('El campo password es requerido')
  }

  return { errors, payload }
}

async function getCounts() {
  const { rows, error } = await query(
    `SELECT bp.slug, COUNT(ba.id) AS total
     FROM bank_providers bp
     LEFT JOIN bank_accounts ba ON ba.provider_id = bp.id
     WHERE bp.slug IN ('hgcash', 'mercadopago', 'telepagos', 'manual')
     GROUP BY bp.slug`,
    []
  )
  if (error) throw error

  return rows.reduce((acc, row) => {
    acc[row.slug] = Number(row.total || 0)
    return acc
  }, { hgcash: 0, mercadopago: 0, telepagos: 0, manual: 0 })
}

export async function getBankAccounts(req, res, next) {
  try {
    const providerSlug = String(req.query.provider || 'hgcash')
    if (!PROVIDERS.includes(providerSlug)) {
      return res.status(400).json({ error: 'Proveedor invalido', code: 'INVALID_PROVIDER' })
    }

    const provider = await getProvider(providerSlug)
    if (!provider) return res.status(404).json({ error: 'Proveedor no encontrado', code: 'PROVIDER_NOT_FOUND' })

    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '8', 10) || 8))
    const search = normalizeText(req.query.search)
    const status = String(req.query.status || 'all')

    const where = ['ba.provider_id = ?']
    const values = [provider.id]

    if (search) {
      where.push(`(
        ba.alias LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.nombre_titular')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.email')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.cbu')) LIKE ?
        OR JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.cuit')) LIKE ?
      )`)
      const like = `%${search}%`
      values.push(like, like, like, like, like)
    }

    if (status === 'activa' || status === 'inactiva') {
      where.push('ba.is_active = ?')
      values.push(status === 'activa' ? 1 : 0)
    }

    const whereSql = `WHERE ${where.join(' AND ')}`

    const { rows: countRows, error: countError } = await query(
      `SELECT COUNT(*) AS total
       FROM bank_accounts ba
       ${whereSql}`,
      values
    )
    if (countError) return next(countError)

    const total = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const offset = (safePage - 1) * limit

    const { rows, error } = await query(
      `SELECT ba.*, bp.slug AS provider_slug
       FROM bank_accounts ba
       INNER JOIN bank_providers bp ON bp.id = ba.provider_id
       ${whereSql}
       ORDER BY ba.updated_at DESC, ba.id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      values
    )
    if (error) return next(error)

    const counts = await getCounts()

    res.json({
      accounts: rows.map(sanitizeAccount),
      counts,
      pagination: { page: safePage, limit, total, totalPages },
    })
  } catch (err) {
    next(err)
  }
}

export async function createBankAccount(req, res, next) {
  try {
    const providerSlug = String(req.body.provider || '')
    if (!PROVIDERS.includes(providerSlug)) {
      return res.status(400).json({ error: 'Proveedor invalido', code: 'INVALID_PROVIDER' })
    }

    const provider = await getProvider(providerSlug)
    if (!provider) return res.status(404).json({ error: 'Proveedor no encontrado', code: 'PROVIDER_NOT_FOUND' })

    const { errors, payload } = validatePayload(req.body, providerSlug)
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Datos de cuenta invalidos', details: errors, code: 'INVALID_BANK_ACCOUNT_PAYLOAD' })
    }

    const isActive = req.body.estatus !== 'inactiva' && req.body.is_active !== false
    const { rows: result, error: insertError } = await query(
      'INSERT INTO bank_accounts (provider_id, alias, account_data, currency, is_active) VALUES (?, ?, ?, ?, ?)',
      [provider.id, payload.alias, JSON.stringify(payload), req.body.currency || 'ARS', isActive ? 1 : 0]
    )
    if (insertError) return next(insertError)

    const row = await getAccountRow(result.insertId)
    res.status(201).json({ account: sanitizeAccount(row), counts: await getCounts() })
  } catch (err) {
    next(err)
  }
}

export async function updateBankAccount(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de cuenta invalido', code: 'INVALID_ID' })
    }

    const current = await getAccountRow(id)
    if (!current) return res.status(404).json({ error: 'Cuenta no encontrada', code: 'BANK_ACCOUNT_NOT_FOUND' })

    const providerSlug = current.provider_slug
    const previousData = parseAccountData(current.account_data)
    const { errors, payload } = validatePayload(req.body, providerSlug, { editing: true, previousData })
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Datos de cuenta invalidos', details: errors, code: 'INVALID_BANK_ACCOUNT_PAYLOAD' })
    }

    const isActive = req.body.estatus !== 'inactiva' && req.body.is_active !== false
    const { error: updateError } = await query(
      'UPDATE bank_accounts SET alias = ?, account_data = ?, currency = ?, is_active = ? WHERE id = ?',
      [payload.alias, JSON.stringify(payload), req.body.currency || current.currency || 'ARS', isActive ? 1 : 0, id]
    )
    if (updateError) return next(updateError)

    const row = await getAccountRow(id)
    res.json({ account: sanitizeAccount(row), counts: await getCounts() })
  } catch (err) {
    next(err)
  }
}

export async function fetchHgCashBalance(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const row = await getAccountRow(id)
    if (!row) return res.status(404).json({ error: 'Cuenta no encontrada' })
    if (row.provider_slug !== 'hgcash') {
      return res.status(400).json({ error: 'Solo disponible para cuentas HGCash' })
    }

    const data     = parseAccountData(row.account_data)
    const apiToken = data.api_token
    if (!apiToken) {
      return res.status(400).json({ error: 'Esta cuenta no tiene token API configurado' })
    }

    let hgRes
    try {
      hgRes = await fetch('https://hg.cash/api/v1/accounts', {
        headers: { Authorization: `Bearer ${apiToken}` },
      })
    } catch (fetchErr) {
      return res.status(502).json({ error: 'No se pudo conectar con HGCash', detail: fetchErr.message })
    }

    if (!hgRes.ok) {
      const txt = await hgRes.text().catch(() => '')
      return res.status(502).json({ error: `HGCash respondió ${hgRes.status}`, detail: txt.slice(0, 300) })
    }

    const hgData   = await hgRes.json()
    const accounts = Array.isArray(hgData.data) ? hgData.data : []

    const storedAlias = data.alias || ''
    const storedCbu   = data.cbu   || ''
    const match = accounts.find(a =>
      (storedAlias && a.alias  === storedAlias) ||
      (storedCbu   && a.number === storedCbu)
    ) || accounts[0] || null

    if (!match) {
      return res.status(404).json({ error: 'No se encontraron cuentas en HGCash para este token' })
    }

    res.json({
      account: {
        id:       match.id,
        name:     match.name,
        balance:  Number(match.balance ?? 0),
        currency: match.currency,
        number:   match.number,
        alias:    match.alias,
        platform: match.platform,
        company:  match.company,
      },
    })
  } catch (err) { next(err) }
}

export async function getBankAccountMovements(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const row = await getAccountRow(id)
    if (!row) return res.status(404).json({ error: 'Cuenta no encontrada' })

    const provider = row.provider_slug
    const page    = Math.max(1, parseInt(req.query.page   || '1',  10) || 1)
    const limit   = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10) || 20))
    const status  = String(req.query.status || 'all')
    const search  = normalizeText(req.query.search)
    const dateFrom = req.query.dateFrom || null
    const dateTo   = req.query.dateTo   || null

    const tableMap = {
      hgcash:      { table: 'hgcash_movements',         refField: 'coelsa_id' },
      mercadopago: { table: 'mercadopago_movements',    refField: 'transaction_id' },
      telepagos:   { table: 'telepagos_movements',      refField: 'coelsa_id' },
      manual:      { table: 'manual_payment_movements', refField: 'transaction_id' },
    }

    const cfg = tableMap[provider]
    if (!cfg) return res.status(400).json({ error: 'Proveedor no soportado' })

    const { rows: balRows } = await query(
      `SELECT COALESCE(SUM(amount), 0) AS balance
       FROM ${cfg.table} WHERE bank_account_id = ? AND status = 'paid'`,
      [id]
    )
    const balance = Number(balRows?.[0]?.balance || 0)

    const where  = ['m.bank_account_id = ?']
    const values = [id]
    const supportsMovementCuit = provider !== 'manual'
    const clientMatchJoin = supportsMovementCuit
      ? `LEFT JOIN clients matched_client
         ON REPLACE(REPLACE(REPLACE(COALESCE(matched_client.cuil, ''), '.', ''), '-', ''), ' ', '') = REPLACE(REPLACE(REPLACE(COALESCE(m.cuit, ''), '.', ''), '-', ''), ' ', '')`
      : ''
    const resolvedClientIdSql = supportsMovementCuit ? 'COALESCE(c.id, matched_client.id)' : 'c.id'
    const clientUsernameSql = supportsMovementCuit ? 'COALESCE(c.username, matched_client.username)' : 'c.username'
    const clientNameSql = supportsMovementCuit ? 'COALESCE(c.full_name, matched_client.full_name, c.username, matched_client.username)' : 'COALESCE(c.full_name, c.username)'

    if (['pending', 'paid', 'rejected'].includes(status)) {
      where.push('m.status = ?'); values.push(status)
    }
    if (search) {
      where.push(`(
        c.username LIKE ?
        OR c.full_name LIKE ?
        ${supportsMovementCuit ? 'OR matched_client.username LIKE ? OR matched_client.full_name LIKE ?' : ''}
        OR COALESCE(m.${cfg.refField}, '') LIKE ?
        ${provider === 'hgcash' ? 'OR COALESCE(m.coelsa_id, \'\') LIKE ? OR COALESCE(m.bank_status, \'\') LIKE ? OR COALESCE(m.cuit, \'\') LIKE ?' : ''}
      )`)
      const like = `%${search}%`
      values.push(like, like)
      if (supportsMovementCuit) values.push(like, like)
      values.push(like)
      if (provider === 'hgcash') values.push(like, like, like)
    }
    if (dateFrom) { where.push('DATE(m.created_at) >= ?'); values.push(dateFrom) }
    if (dateTo)   { where.push('DATE(m.created_at) <= ?'); values.push(dateTo) }

    const whereSql = `WHERE ${where.join(' AND ')}`

    const { rows: countRows, error: cntErr } = await query(
      `SELECT COUNT(*) AS total FROM ${cfg.table} m
       LEFT JOIN clients c ON c.id = m.client_id
       ${clientMatchJoin}
       ${whereSql}`,
      values
    )
    if (cntErr) throw cntErr

    const total      = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage   = Math.min(page, totalPages)
    const offset     = (safePage - 1) * limit

    const { rows, error } = await query(
      `SELECT m.id, m.amount, m.status, m.${cfg.refField} AS ref_id,
              m.client_id,
              ${resolvedClientIdSql} AS resolved_client_id,
              ${clientUsernameSql} AS client_username,
              ${clientNameSql} AS client_name,
              ${provider === 'hgcash' ? 'm.bank_status, m.coelsa_id, m.cuit, m.received_from_gateway_at, m.gateway_event_id, m.provider_event_id, m.provider_status,' : 'NULL AS bank_status, NULL AS coelsa_id, NULL AS cuit, NULL AS received_from_gateway_at, NULL AS gateway_event_id, NULL AS provider_event_id, NULL AS provider_status,'}
              m.created_at
       FROM ${cfg.table} m
       LEFT JOIN clients c ON c.id = m.client_id
       ${clientMatchJoin}
       ${whereSql}
       ORDER BY m.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      values
    )
    if (error) throw error

    res.json({
      account:    sanitizeAccount(row),
      balance,
      movements:  (rows || []).map(r => ({
        id:             Number(r.id),
        amount:         Number(r.amount || 0),
        status:         r.status,
        refId:          r.ref_id || null,
        bankStatus:     r.bank_status || null,
        coelsaId:       r.coelsa_id || r.ref_id || null,
        source:         provider === 'hgcash' && (r.received_from_gateway_at || r.gateway_event_id || r.provider_event_id || r.provider_status) ? 'gateway' : 'bank',
        sourceLabel:    provider === 'hgcash' && (r.received_from_gateway_at || r.gateway_event_id || r.provider_event_id || r.provider_status) ? 'Gateway' : 'Banco',
        cuit:           r.cuit || null,
        clientId:       r.resolved_client_id ? Number(r.resolved_client_id) : (r.client_id ? Number(r.client_id) : null),
        clientUsername: r.client_username || null,
        clientName:     r.client_name || r.client_username || null,
        createdAt:      r.created_at || null,
      })),
      pagination: { page: safePage, limit, total, totalPages },
    })
  } catch (err) { next(err) }
}

export async function deleteBankAccount(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de cuenta invalido', code: 'INVALID_ID' })
    }

    const { error } = await query('DELETE FROM bank_accounts WHERE id = ?', [id])
    if (error) {
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
          error: 'La cuenta esta en uso y no se puede eliminar. Puedes desactivarla.',
          code: 'BANK_ACCOUNT_IN_USE',
        })
      }
      return next(error)
    }

    res.json({ success: true, counts: await getCounts() })
  } catch (err) {
    next(err)
  }
}
