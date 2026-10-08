import crypto from 'crypto'
import moment from 'moment-timezone'
import { getPool } from '../config/database.js'
import { insertCaudalPaymentAudit } from './caudalAuditService.js'
import { handleWithdrawalResolvedWebhook } from './caudalWithdrawalService.js'

const SUPPORTED_EVENTS = new Set([
  'transferencia.detectada',
  'transferencia.actualizada',
  'retiro.resuelto',
])

const jsonStringify = (value) => JSON.stringify(value ?? null)
const normalizeDigits = (value) => String(value ?? '').replace(/\D/g, '')

const buildStableEventId = (...parts) =>
  crypto
    .createHash('sha256')
    .update(parts.map((p) => String(p ?? '')).join('|'))
    .digest('hex')
    .slice(0, 32)

const safeAudit = async (data) => {
  try { await insertCaudalPaymentAudit(data) } catch (e) {
    console.warn('[caudal webhook] no se pudo guardar auditoria:', e?.message || e)
  }
}

const normalizeComparableName = (value) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokenizeComparableName = (value) =>
  Array.from(new Set(normalizeComparableName(value).split(' ').filter((t) => t.length >= 3)))

const canonicalComparableName = (value) => tokenizeComparableName(value).sort().join(' ')

const sameComparableNameTokens = (a, b) => {
  const l = tokenizeComparableName(a)
  const r = tokenizeComparableName(b)
  if (!l.length || !r.length || l.length !== r.length) return false
  const rs = new Set(r)
  return l.every((t) => rs.has(t))
}

const similarityScore = (a, b) => {
  const l = normalizeComparableName(a)
  const r = normalizeComparableName(b)
  if (!l || !r) return 0
  const lt = new Set(l.split(' ').filter((t) => t.length >= 3))
  const rt = new Set(r.split(' ').filter((t) => t.length >= 3))
  if (!lt.size || !rt.size) return 0
  let hits = 0
  for (const t of lt) { if (rt.has(t)) hits++ }
  return hits / Math.max(lt.size, rt.size)
}

const toUtcDatetime = (value) => {
  if (!value) return null
  const parsed = moment.utc(String(value))
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : null
}

const getRequestIp = (req) => {
  const raw = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] ||
    req.connection?.remoteAddress || req.socket?.remoteAddress || ''
  return String(raw).split(',')[0].trim().replace(/^::ffff:/, '') || null
}

const normalizePersistedMatchSource = (matchSource, hasClient) => {
  const allowed = new Set(['none', 'client_cuit_cuil', 'client_name_exact',
    'client_name_exact_ambiguous', 'client_name', 'manual'])
  if (allowed.has(matchSource)) return matchSource
  return hasClient ? 'manual' : 'none'
}

async function runQuery(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params)
  return rows
}

async function storeClientVerifiedTitularName(clientId, name, source) {
  const pool = getPool()
  await pool.query(
    `UPDATE clients SET verified_titular_name = ?, verified_titular_source = ?,
     verified_titular_updated_at = UTC_TIMESTAMP()
     WHERE id = ? AND (verified_titular_name IS NULL OR verified_titular_name = '')`,
    [name, source, clientId]
  )
}

async function getActiveWebhookAccounts() {
  const pool = getPool()
  const [rows] = await pool.query(
    `SELECT ba.id, ba.account_data
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE bp.slug = 'caudal' AND ba.is_active = 1
     ORDER BY ba.id ASC`
  )
  return (rows || []).map((row) => {
    const data = typeof row.account_data === 'object'
      ? row.account_data : JSON.parse(row.account_data || '{}')
    return {
      id: row.id,
      cbu: data.cbu || null,
      alias: data.alias || null,
      nombre_titular: data.nombre_titular || null,
      webhook_secret: data.webhook_secret || null,
      account_data: data,
    }
  })
}

const verifyWebhookSignature = (rawBodyBuffer, signatureHeader, secret) => {
  if (!rawBodyBuffer || !signatureHeader || !secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('hex')
  const received = String(signatureHeader).replace(/^sha256=/i, '').trim()
  if (!received || received.length !== expected.length) return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
  } catch { return false }
}

const getRawBodyBuffer = (req) => {
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody
  if (Buffer.isBuffer(req.body)) return req.body
  if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8')
  if (req.body && typeof req.body === 'object') return Buffer.from(JSON.stringify(req.body), 'utf8')
  return null
}

async function resolveWebhookAccount({ rawBodyBuffer, signatureHeader }) {
  const activeAccounts = await getActiveWebhookAccounts()
  if (!activeAccounts.length) {
    const err = new Error('No hay cuentas Caudal activas configuradas.')
    err.httpStatus = 500; err.code = 'caudal_account_unavailable'; throw err
  }
  for (const account of activeAccounts) {
    const secret = String(account.webhook_secret || '').trim()
    if (!secret) continue
    if (verifyWebhookSignature(rawBodyBuffer, signatureHeader, secret)) return account
  }
  return null
}

const parseWebhookPayload = (rawBodyBuffer) => {
  let payload
  try { payload = JSON.parse(rawBodyBuffer.toString('utf8')) } catch (e) {
    const err = new Error('Webhook JSON inválido.')
    err.httpStatus = 400; err.code = 'caudal_invalid_json'; throw err
  }
  const eventName = String(payload?.event || '').trim()
  if (!eventName) {
    const err = new Error('Webhook incompleto: falta event.')
    err.httpStatus = 400; err.code = 'caudal_invalid_payload'; throw err
  }
  const retiro = payload?.retiro && typeof payload.retiro === 'object' ? payload.retiro : null
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : null

  if (!SUPPORTED_EVENTS.has(eventName)) {
    return {
      supported: false, payload, eventName,
      eventId: String(payload?.event_id || retiro?.external_id || data?.id || '').trim() || null,
      occurredAt: String(payload?.occurred_at || payload?.timestamp || '').trim() || null,
      retiro, data,
    }
  }
  const eventId = String(payload?.event_id || '').trim() ||
    String(retiro?.external_id || retiro?.client_reference_id || data?.id || '').trim() ||
    buildStableEventId(eventName, payload?.timestamp || payload?.occurred_at || '', JSON.stringify(retiro || data || {}))
  const occurredAt = String(payload?.occurred_at || payload?.timestamp || retiro?.updated_at || retiro?.created_at || '').trim()
  const dataObject = data || retiro || null

  if (!eventId || !occurredAt || !dataObject) {
    const err = new Error('Webhook incompleto: faltan event, event_id, occurred_at o data.')
    err.httpStatus = 400; err.code = 'caudal_invalid_payload'; throw err
  }

  if (eventName === 'retiro.resuelto') {
    const source = retiro || data || {}
    const withdrawalExternalId = String(source.external_id || source.externalId || source.id || source.client_reference_id || '').trim()
    const amount = source.amount === null || source.amount === undefined ? null : Number(source.amount)
    if (Number.isNaN(amount)) {
      const err = new Error('Webhook inválido: amount no es numérico.')
      err.httpStatus = 400; err.code = 'caudal_invalid_amount'; throw err
    }
    return {
      supported: true, kind: 'withdrawal', payload, eventName, eventId, occurredAt,
      occurredAtSql: toUtcDatetime(occurredAt), data: source,
      externalTransactionId: withdrawalExternalId || null,
      accountExternalId: String(source.accountId || source.account_external_id || '').trim() || null,
      status: String(source.estado || source.status || '').trim() || null,
      amount, currency: String(source.currency || '').trim() || 'ARS',
      transferDate: String(source.date || occurredAt || '').trim() || null,
      transferDateSql: toUtcDatetime(String(source.date || occurredAt || '').trim() || null),
      coelsaCode: source.coelsa_id != null ? String(source.coelsa_id).trim() : source.coelsaId != null ? String(source.coelsaId).trim() : null,
      fromName: String(source.fromName || source.from_name || '').trim() || null,
      fromCuit: normalizeDigits(source.fromCUIT || source.from_cuit),
      fromCbu: normalizeDigits(source.fromCBU || source.from_cbu),
      clientReferenceId: String(source.client_reference_id || source.clientReferenceId || '').trim() || null,
      destination: {
        cbu: String(source.destino?.cbu || source.destination?.cbu || '').trim() || null,
        name: String(source.destino?.nombre || source.destination?.nombre || '').trim() || null,
        cuit: String(source.destino?.cuit || source.destination?.cuit || '').trim() || null,
        alias: String(source.destino?.alias || source.destination?.alias || '').trim() || null,
        bank: String(source.destino?.banco || source.destination?.banco || '').trim() || null,
      },
      providerReason: source.razon_fallo || source.reason || source.provider_reason || null,
    }
  }

  const externalTransactionId = String(data.id || '').trim()
  if (!externalTransactionId) {
    const err = new Error('Webhook inválido: falta data.id.')
    err.httpStatus = 400; err.code = 'caudal_missing_transaction_id'; throw err
  }
  const amount = data.amount === null || data.amount === undefined ? null : Number(data.amount)
  if (Number.isNaN(amount)) {
    const err = new Error('Webhook inválido: amount no es numérico.')
    err.httpStatus = 400; err.code = 'caudal_invalid_amount'; throw err
  }
  return {
    supported: true, kind: 'transfer', payload, eventName, eventId, occurredAt,
    occurredAtSql: toUtcDatetime(occurredAt), data,
    externalTransactionId,
    accountExternalId: String(data.accountId || '').trim() || null,
    direction: String(data.direction || '').trim() || null,
    status: String(data.status || '').trim() || null,
    amount, currency: String(data.currency || '').trim() || null,
    transferDate: String(data.date || '').trim() || null,
    transferDateSql: toUtcDatetime(String(data.date || '').trim() || null),
    coelsaCode: data.coelsaCode != null ? String(data.coelsaCode).trim() : null,
    fromName: String(data.fromName || '').trim() || null,
    fromCuit: normalizeDigits(data.fromCUIT) || null,
    fromCbu: normalizeDigits(data.fromCBU) || null,
  }
}

async function findClientMatch(conn, { fromCuit, fromName, amount } = {}) {
  const targetName = String(fromName || '').trim()
  const normalizedTargetName = normalizeComparableName(targetName)
  const canonicalTargetName = canonicalComparableName(targetName)
  const targetTokens = tokenizeComparableName(targetName)
  const normalized = normalizeDigits(fromCuit)

  if (!normalizedTargetName && !/^\d{11}$/.test(normalized)) {
    return { client: null, ambiguous: false, matchSource: 'none' }
  }

  const candidateFilters = []
  const candidateParams = []

  for (const token of targetTokens) {
    candidateFilters.push(
      `(COALESCE(verified_titular_name,'') LIKE ? OR COALESCE(full_name,'') LIKE ?)`
    )
    const like = `%${token}%`
    candidateParams.push(like, like)
  }
  if (/^\d{11}$/.test(normalized)) {
    candidateFilters.push("REPLACE(REPLACE(REPLACE(COALESCE(cuil,''),'-',''),' ',''),'.','' ) = ?")
    candidateParams.push(normalized)
  }

  const whereClause = candidateFilters.length ? `WHERE (${candidateFilters.join(' OR ')})` : ''
  const [rows] = await conn.query(
    `SELECT id, username, full_name, verified_titular_name, cuil AS cuit_cuil FROM clients ${whereClause} ORDER BY id DESC LIMIT 1000`,
    candidateParams
  )
  if (!rows?.length) return { client: null, ambiguous: false, matchSource: 'none' }

  const cuitMatches = /^\d{11}$/.test(normalized)
    ? rows.filter((c) => normalizeDigits(c.cuit_cuil) === normalized) : []

  if (normalizedTargetName) {
    const exactNameMatches = rows.filter((c) =>
      canonicalComparableName(c.verified_titular_name || c.full_name || '') === canonicalTargetName
    )
    if (exactNameMatches.length === 1) {
      const c = exactNameMatches[0]
      return { client: { id: Number(c.id), username: c.username || null, name: c.full_name || null, cuit_cuil: normalizeDigits(c.cuit_cuil) || null }, ambiguous: false, matchSource: 'client_name_exact' }
    }
    if (exactNameMatches.length > 1) return { client: null, ambiguous: true, matchSource: 'client_name_exact_ambiguous' }
  }

  if (cuitMatches.length === 1) {
    const c = cuitMatches[0]
    return { client: { id: Number(c.id), username: c.username || null, name: c.full_name || null, cuit_cuil: normalizeDigits(c.cuit_cuil) || normalized }, ambiguous: false, matchSource: 'client_cuit_cuil' }
  }

  if (!normalizedTargetName) return { client: null, ambiguous: false, matchSource: 'none' }

  const ranked = rows.map((c) => {
    const candidateName = c.verified_titular_name || c.full_name || ''
    let score = similarityScore(targetName, candidateName)
    if (sameComparableNameTokens(candidateName, targetName)) score += 2
    if (Number.isFinite(Number(amount)) && Number(amount) > 0) score += 0.05
    if (cuitMatches.some((m) => Number(m.id) === Number(c.id))) score += 0.15
    return { client: c, score }
  }).sort((a, b) => b.score - a.score)

  const best = ranked[0]
  if (!best || best.score < 0.45) return { client: null, ambiguous: false, matchSource: 'none' }
  const c = best.client
  return {
    client: { id: Number(c.id), username: c.username || null, name: c.full_name || null, cuit_cuil: normalizeDigits(c.cuit_cuil) || null },
    ambiguous: ranked.length > 1 && ranked[1].score >= best.score - 0.05,
    matchSource: 'client_name',
  }
}

const buildRawHeaders = (req) => ({
  content_type: req.headers['content-type'] || null,
  x_caudal_webhook_signature: req.headers['x-caudal-webhook-signature'] || null,
  x_caudal_event_type: req.headers['x-caudal-event-type'] || null,
  x_caudal_event_id: req.headers['x-caudal-event-id'] || null,
  x_caudal_delivery_id: req.headers['x-caudal-delivery-id'] || null,
  user_agent: req.headers['user-agent'] || null,
  x_forwarded_for: req.headers['x-forwarded-for'] || null,
  x_real_ip: req.headers['x-real-ip'] || null,
  request_ip: getRequestIp(req),
})

export async function persistDetectedEvent(req) {
  const rawBodyBuffer = getRawBodyBuffer(req)
  if (!rawBodyBuffer) {
    const err = new Error('No se pudo leer el body crudo del webhook.')
    err.httpStatus = 400; err.code = 'caudal_missing_raw_body'; throw err
  }

  const signatureHeader = req.headers['x-caudal-webhook-signature']
  const matchedAccount = await resolveWebhookAccount({ rawBodyBuffer, signatureHeader })
  if (!matchedAccount) {
    const err = new Error('Firma Caudal inválida.')
    err.httpStatus = 401; err.code = 'caudal_invalid_signature'; throw err
  }

  const parsed = parseWebhookPayload(rawBodyBuffer)
  if (!parsed.supported) {
    return { ignored: true, eventName: parsed.eventName, eventId: parsed.eventId, reason: 'unsupported_event' }
  }

  if (parsed.kind === 'withdrawal') {
    return handleWithdrawalResolvedWebhook({
      req,
      parsed: {
        ...parsed,
        destinationName: parsed.destination?.name || null,
        destinationCuit: parsed.destination?.cuit || null,
        destinationAlias: parsed.destination?.alias || null,
        destinationBank: parsed.destination?.bank || null,
      },
      matchedAccount,
      rawHeaders: buildRawHeaders(req),
    })
  }

  const pool = getPool()
  const conn = await pool.getConnection()
  await conn.beginTransaction()
  try {
    const rawHeaders = buildRawHeaders(req)
    const matchedClient = await findClientMatch(conn, {
      fromCuit: parsed.fromCuit,
      fromName: parsed.fromName,
      amount: parsed.amount,
    })
    const now = moment.utc().format('YYYY-MM-DD HH:mm:ss')

    const [inheritedRows] = await conn.query(
      `SELECT our_status FROM caudal_transaction_events WHERE external_transaction_id = ? AND our_status IS NOT NULL AND our_status <> 'pending' ORDER BY id DESC LIMIT 1`,
      [parsed.externalTransactionId]
    )
    const inheritedOurStatus = String(inheritedRows?.[0]?.our_status || 'pending').toLowerCase()

    const clientId = matchedClient?.client?.id || null
    const clientCuit = matchedClient?.client?.cuit_cuil || null
    const matchSource = matchedClient?.matchSource || (matchedClient?.client ? 'client_cuit_cuil' : 'none')
    const persistedMatchSource = normalizePersistedMatchSource(matchSource, Boolean(matchedClient?.client))
    const matchedAt = matchedClient?.client ? now : null

    await conn.query(
      `INSERT INTO caudal_transaction_events
         (event_id, event_name, occurred_at, external_transaction_id, bank_account_id,
          account_external_id, direction, status, amount, currency, transfer_date,
          coelsa_code, from_name, from_cuit, from_cbu, client_id, client_cuit_cuil,
          match_source, our_status, matched_at, raw_payload, raw_headers, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         event_name=VALUES(event_name), occurred_at=VALUES(occurred_at),
         external_transaction_id=VALUES(external_transaction_id),
         bank_account_id=VALUES(bank_account_id),
         account_external_id=VALUES(account_external_id),
         direction=VALUES(direction), status=VALUES(status),
         amount=VALUES(amount), currency=VALUES(currency),
         transfer_date=VALUES(transfer_date), coelsa_code=VALUES(coelsa_code),
         from_name=VALUES(from_name), from_cuit=VALUES(from_cuit), from_cbu=VALUES(from_cbu),
         client_id=VALUES(client_id), client_cuit_cuil=VALUES(client_cuit_cuil),
         match_source=VALUES(match_source), our_status=VALUES(our_status),
         matched_at=VALUES(matched_at), raw_payload=VALUES(raw_payload),
         raw_headers=VALUES(raw_headers), updated_at=VALUES(updated_at)`,
      [
        parsed.eventId, parsed.eventName, parsed.occurredAtSql || parsed.occurredAt,
        parsed.externalTransactionId, matchedAccount.id,
        parsed.accountExternalId, parsed.direction, parsed.status,
        parsed.amount, parsed.currency, parsed.transferDateSql || parsed.transferDate,
        parsed.coelsaCode, parsed.fromName, parsed.fromCuit, parsed.fromCbu,
        clientId, clientCuit, persistedMatchSource, inheritedOurStatus, matchedAt,
        jsonStringify(parsed.payload), jsonStringify(rawHeaders), now, now,
      ]
    )

    if (parsed.eventName === 'transferencia.actualizada') {
      await conn.query(
        `UPDATE caudal_transaction_events SET status=?, coelsa_code=?,
         client_id=COALESCE(?,client_id), client_cuit_cuil=COALESCE(?,client_cuit_cuil),
         matched_at=COALESCE(?,matched_at), updated_at=UTC_TIMESTAMP()
         WHERE external_transaction_id=? AND event_name='transferencia.detectada'`,
        [parsed.status, parsed.coelsaCode, clientId, clientCuit, matchedAt, parsed.externalTransactionId]
      )
    }

    await conn.commit()
    conn.release()

    if (clientId && parsed.fromName) {
      try { await storeClientVerifiedTitularName(clientId, parsed.fromName, 'caudal_transactions') }
      catch (e) { console.warn('[caudal webhook] No se pudo guardar verified_titular_name:', e?.message || e) }
    }

    await safeAudit({
      source: req.headers['x-caudal-simulation'] === '1' ? 'admin_action' : 'webhook',
      decision: 'accepted',
      reasonCode: matchedClient?.client ? 'webhook_persisted_matched' : 'webhook_persisted_unmatched',
      reasonDetail: matchedClient?.client ? 'Evento Caudal persistido y asociado a cliente.' : 'Evento Caudal persistido sin cliente asociado.',
      clientId, externalTransactionId: parsed.externalTransactionId,
      amount: parsed.amount, currency: parsed.currency,
      fromName: parsed.fromName, fromCuit: parsed.fromCuit,
      coelsaCode: parsed.coelsaCode, matchSource,
      requestIp: getRequestIp(req), userAgent: req.headers['user-agent'] || null,
      payload: parsed.payload,
      metadata: { eventName: parsed.eventName, accountExternalId: parsed.accountExternalId, direction: parsed.direction, status: parsed.status },
    })

    return {
      ignored: false, eventName: parsed.eventName, eventId: parsed.eventId,
      externalTransactionId: parsed.externalTransactionId, status: parsed.status,
      matchedClientId: clientId, matchedClientUsername: matchedClient?.client?.username || null,
      matchedClientAmbiguous: matchedClient?.ambiguous || false,
      coelsaCode: parsed.coelsaCode, accountExternalId: parsed.accountExternalId,
    }
  } catch (e) {
    await conn.rollback()
    conn.release()
    throw e
  }
}

export { SUPPORTED_EVENTS }
