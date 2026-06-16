import { randomUUID } from 'crypto'
import { query } from '../config/database.js'

const HG_CASH_BASE_URL = 'https://hg.cash/api/v1'
const SENSITIVE_KEYS = new Set(['authorization', 'bearer', 'token', 'api_token', 'apitoken', 'password'])
const MAX_LOG_BYTES = 4096
const AUDIT_RETRY_ATTEMPTS = 3
const AUDIT_RETRY_BASE_DELAY_MS = 50

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function redactSensitive(value) {
  if (value === null || value === undefined) return value
  if (Array.isArray(value)) return value.map(redactSensitive)
  if (typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEYS.has(String(k).toLowerCase()) ? '[REDACTED]' : redactSensitive(v)
    }
    return out
  }
  return value
}

function summarizeForLog(value) {
  const redacted = redactSensitive(value ?? null)
  const json = JSON.stringify(redacted)
  if (json && json.length > MAX_LOG_BYTES) {
    return { truncated: true, sizeBytes: json.length, preview: json.slice(0, MAX_LOG_BYTES) }
  }
  return redacted
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return null
}

function extractTransactionIdentifiers(body) {
  if (!body || typeof body !== 'object') return { transactionId: null, externalId: null, message: null }
  const nested = body.data && typeof body.data === 'object' ? body.data : null
  const result = body.result && typeof body.result === 'object' ? body.result : null

  const transactionId = firstDefined(
    body.id, body.transactionId, body.transaction_id, body.idtrxpago,
    nested?.id, nested?.transactionId, nested?.transaction_id, nested?.idtrxpago,
    result?.id, result?.transactionId, result?.transaction_id, result?.idtrxpago
  )
  const externalId = firstDefined(
    body.externalID, body.externalId, body.external_id,
    nested?.externalID, nested?.externalId, nested?.external_id,
    result?.externalID, result?.externalId, result?.external_id
  )
  const message = firstDefined(
    body.message, body.messageweb, body.error, body.detail, body.description,
    nested?.message, nested?.messageweb, nested?.error,
    result?.message, result?.messageweb, result?.error
  )
  return { transactionId, externalId, message }
}

async function withRetry(fn, attempts = AUDIT_RETRY_ATTEMPTS, baseDelayMs = AUDIT_RETRY_BASE_DELAY_MS) {
  let lastErr
  for (let i = 0; i < attempts; i++) {
    try { return await fn() } catch (err) {
      lastErr = err
      if (i < attempts - 1) await sleep(baseDelayMs * Math.pow(3, i))
    }
  }
  throw lastErr
}

function buildLogParams(event) {
  return [
    event.event_id, event.withdrawal_request_id ?? null, event.correlation_id ?? null,
    event.endpoint, event.http_method, event.phase,
    event.http_status ?? null, event.latency_ms ?? null,
    event.actor_type || 'system', event.actor_id ?? null, event.actor_label ?? null,
    event.ip_address ?? null, event.device ?? null, event.user_agent ?? null,
    event.payload_summary ? JSON.stringify(event.payload_summary) : null,
    event.response_summary ? JSON.stringify(event.response_summary) : null,
    event.error_message ?? null,
  ]
}

async function insertHgCashLogRow(event) {
  const { error } = await query(
    `INSERT INTO hg_cash_api_log
       (event_id, withdrawal_request_id, correlation_id, endpoint, http_method, phase,
        http_status, latency_ms, actor_type, actor_id, actor_label, ip_address, device,
        user_agent, payload_summary, response_summary, error_message, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    buildLogParams(event)
  )
  if (error) throw error
}

async function enqueueOutbox(event, lastError) {
  try {
    await query(
      `INSERT INTO hg_cash_api_log_outbox
         (event_id, correlation_id, withdrawal_request_id, payload, attempts, last_error, created_at, last_attempt_at)
       VALUES (?, ?, ?, ?, 1, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE attempts = attempts + 1, last_attempt_at = NOW(), last_error = VALUES(last_error)`,
      [
        event.event_id, event.correlation_id ?? null, event.withdrawal_request_id ?? null,
        JSON.stringify(event), lastError ? String(lastError.message || lastError) : null,
      ]
    )
    return { enqueued: true }
  } catch (outboxErr) {
    console.error('[hgCashPayoutService] outbox enqueue failed', {
      event_id: event.event_id, original_error: lastError?.message, outbox_error: outboxErr.message,
    })
    return { enqueued: false, error: outboxErr }
  }
}

async function persistLogStrict(event) {
  await withRetry(() => insertHgCashLogRow(event))
}

async function persistLogWithOutbox(event) {
  try {
    await withRetry(() => insertHgCashLogRow(event))
    return { persisted: true, viaOutbox: false }
  } catch (err) {
    const outboxResult = await enqueueOutbox(event, err)
    return { persisted: outboxResult.enqueued, viaOutbox: true, error: err }
  }
}

function buildEvent({ endpoint, httpMethod, phase, correlationId, withdrawalRequestId, actor = {}, requestContext = {}, httpStatus = null, latencyMs = null, payloadSummary = null, responseSummary = null, errorMessage = null }) {
  return {
    event_id: randomUUID(),
    endpoint, http_method: httpMethod, phase,
    correlation_id: correlationId ?? null,
    withdrawal_request_id: withdrawalRequestId ?? null,
    http_status: httpStatus, latency_ms: latencyMs,
    actor_type: actor.type || 'system',
    actor_id: actor.id ?? null, actor_label: actor.label ?? null,
    ip_address: requestContext.ip ?? null, device: requestContext.device ?? null,
    user_agent: requestContext.userAgent ?? null,
    payload_summary: payloadSummary, response_summary: responseSummary, error_message: errorMessage,
  }
}

async function logPreCall(event, { failClosed }) {
  try {
    await persistLogStrict(event)
    return { ok: true }
  } catch (err) {
    if (failClosed) {
      const wrapped = new Error('hgcash_audit_pre_failed')
      wrapped.code = 'audit_pre_failed'
      wrapped.cause = err
      throw wrapped
    }
    return { ok: false, error: err }
  }
}

async function parseResponseBody(response) {
  const text = await response.text().catch(() => '')
  if (!text) return null
  try { return JSON.parse(text) } catch { return { raw: text.slice(0, MAX_LOG_BYTES) } }
}

export async function getActiveHgCashAccount() {
  const { rows, error } = await query(
    `SELECT ba.id,
            JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.api_token')) AS bearer,
            JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.account_id')) AS account_id
     FROM bank_accounts ba
     JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE bp.slug = 'hgcash' AND ba.is_active = 1
     ORDER BY ba.id ASC LIMIT 1`
  )
  if (error) throw error
  return rows?.[0] || null
}

export async function createTransaction({ accountRow, method, destinationCbu, amount, concept = 'pagobetchat', correlationId, withdrawalRequestId, actor, requestContext }) {
  if (!accountRow?.bearer) {
    const err = new Error('hgcash_account_unavailable')
    err.code = 'account_unavailable'
    throw err
  }

  const endpoint = `${HG_CASH_BASE_URL}/transactions`
  const payloadKey = method === 'cbu' ? 'toCBU' : 'toCVU'
  const payload = { [payloadKey]: destinationCbu, amount, concept }
  if (accountRow.account_id) payload.accountId = accountRow.account_id

  const requestEvent = buildEvent({ endpoint, httpMethod: 'POST', phase: 'request', correlationId, withdrawalRequestId, actor, requestContext, payloadSummary: summarizeForLog(payload) })
  await logPreCall(requestEvent, { failClosed: true })

  const startedAt = Date.now()
  let response, parsedBody = null, networkError = null
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accountRow.bearer}` },
      body: JSON.stringify(payload),
    })
    parsedBody = await parseResponseBody(response)
  } catch (err) { networkError = err }
  const latencyMs = Date.now() - startedAt

  if (networkError) {
    await persistLogWithOutbox(buildEvent({ endpoint, httpMethod: 'POST', phase: 'error', correlationId, withdrawalRequestId, actor, requestContext, latencyMs, payloadSummary: summarizeForLog(payload), errorMessage: String(networkError.message || networkError) }))
    const wrapped = new Error('hgcash_network_error')
    wrapped.code = 'network_error'
    wrapped.cause = networkError
    throw wrapped
  }

  await persistLogWithOutbox(buildEvent({ endpoint, httpMethod: 'POST', phase: 'response', correlationId, withdrawalRequestId, actor, requestContext, httpStatus: response.status, latencyMs, payloadSummary: summarizeForLog(payload), responseSummary: summarizeForLog(parsedBody) }))

  const identifiers = extractTransactionIdentifiers(parsedBody)
  return {
    ok: response.ok && Boolean(identifiers.transactionId),
    httpStatus: response.status,
    data: parsedBody,
    transactionId: identifiers.transactionId,
    externalId: identifiers.externalId,
    message: identifiers.message,
    latencyMs,
  }
}

export async function getTransactionStatus({ accountRow, transactionId, correlationId, withdrawalRequestId, actor, requestContext }) {
  if (!accountRow?.bearer) {
    const err = new Error('hgcash_account_unavailable')
    err.code = 'account_unavailable'
    throw err
  }
  const endpoint = `${HG_CASH_BASE_URL}/transaction/${encodeURIComponent(transactionId)}/status`

  const requestEvent = buildEvent({ endpoint, httpMethod: 'GET', phase: 'request', correlationId, withdrawalRequestId, actor, requestContext, payloadSummary: summarizeForLog({ transactionId }) })
  await logPreCall(requestEvent, { failClosed: false })

  const startedAt = Date.now()
  let response, parsedBody = null, networkError = null
  try {
    response = await fetch(endpoint, { method: 'GET', headers: { Authorization: `Bearer ${accountRow.bearer}` } })
    parsedBody = await parseResponseBody(response)
  } catch (err) { networkError = err }
  const latencyMs = Date.now() - startedAt

  if (networkError) {
    await persistLogWithOutbox(buildEvent({ endpoint, httpMethod: 'GET', phase: 'error', correlationId, withdrawalRequestId, actor, requestContext, latencyMs, errorMessage: String(networkError.message || networkError) }))
    const wrapped = new Error('hgcash_network_error')
    wrapped.code = 'network_error'
    wrapped.cause = networkError
    throw wrapped
  }

  await persistLogWithOutbox(buildEvent({ endpoint, httpMethod: 'GET', phase: 'response', correlationId, withdrawalRequestId, actor, requestContext, httpStatus: response.status, latencyMs, payloadSummary: summarizeForLog({ transactionId }), responseSummary: summarizeForLog(parsedBody) }))

  return { ok: response.ok, httpStatus: response.status, data: parsedBody, latencyMs }
}

export async function reconcileOutbox({ batchSize = 100 } = {}) {
  const { rows: pending = [] } = await query(
    `SELECT id, event_id, correlation_id, withdrawal_request_id, payload, attempts
     FROM hg_cash_api_log_outbox
     WHERE processed_at IS NULL ORDER BY id ASC LIMIT ?`,
    [batchSize]
  )

  let processed = 0, errors = 0
  for (const row of pending) {
    let event
    try { event = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload } catch (e) {
      errors++
      await query(`UPDATE hg_cash_api_log_outbox SET attempts = attempts + 1, last_attempt_at = NOW(), last_error = ? WHERE id = ?`, [`payload_parse_error: ${e.message}`, row.id])
      continue
    }
    try {
      await query(
        `INSERT INTO hg_cash_api_log
           (event_id, withdrawal_request_id, correlation_id, endpoint, http_method, phase,
            http_status, latency_ms, actor_type, actor_id, actor_label, ip_address, device,
            user_agent, payload_summary, response_summary, error_message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE id = id`,
        buildLogParams(event)
      )
      await query(`UPDATE hg_cash_api_log_outbox SET processed_at = NOW() WHERE id = ?`, [row.id])
      processed++
    } catch (insertErr) {
      errors++
      await query(`UPDATE hg_cash_api_log_outbox SET attempts = attempts + 1, last_attempt_at = NOW(), last_error = ? WHERE id = ?`, [String(insertErr.message || insertErr), row.id])
    }
  }
  return { scanned: pending.length, processed, errors }
}
