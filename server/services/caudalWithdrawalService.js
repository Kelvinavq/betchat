import axios from 'axios'
import moment from 'moment-timezone'
import { randomUUID } from 'crypto'
import { query, getPool } from '../config/database.js'
import { insertCaudalWithdrawalAudit } from './caudalAuditService.js'
import { getAutoMessage } from '../controllers/autoMessagesController.js'
import { persistMessage } from '../controllers/chatController.js'
import { evaluateWithdrawalRisk, buildRequestContext, getRequestIp } from '../utils/withdrawalRiskEngine.js'
import { getIo } from '../socket/socketServer.js'

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires'
const CAUDAL_API_BASE_URL = String(
  process.env.CAUDAL_API_BASE_URL || process.env.CAUDAL_API_URL || 'https://caudal.cash/api/v1'
).trim().replace(/\/+$/, '')

const MAX_WITHDRAWAL_AMOUNT = 300000
const PROVIDER_REASON_MAX_LENGTH = 255

const truncateText = (value, max = PROVIDER_REASON_MAX_LENGTH) => {
  if (value == null) return null
  const t = String(value).trim()
  return t ? (t.length > max ? t.slice(0, max) : t) : null
}

const normalizeCbu = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.length === 22 ? digits : null
}

const normalizeCuit = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return /^\d{11}$/.test(digits) ? digits : null
}

const extractDniFromCuit = (cuit) => {
  const digits = String(cuit ?? '').replace(/\D/g, '')
  if (digits.length !== 11) return null
  return digits.slice(2, 10)
}

const isValidHumanFullName = (value) => {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ')
  if (!normalized || normalized.length < 5) return false
  const parts = normalized.split(' ').filter(Boolean)
  if (parts.length < 2) return false
  const nameRe = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ''-]{2,}$/
  const connectors = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'das'])
  let meaningful = 0
  for (const p of parts) {
    if (connectors.has(p.toLowerCase())) continue
    meaningful++
    if (!nameRe.test(p)) return false
  }
  return meaningful >= 2
}

const serializeError = (err, max = 1000) => {
  if (err == null) return null
  if (typeof err === 'string') return truncateText(err, max)
  const parts = []
  if (err instanceof Error) {
    if (err.name) parts.push(err.name)
    if (err.message) parts.push(err.message)
    if (err.code) parts.push(`code=${err.code}`)
    if (err.response?.status) parts.push(`http=${err.response.status}`)
    if (err.response?.data != null) {
      try { parts.push(`response=${typeof err.response.data === 'string' ? err.response.data : JSON.stringify(err.response.data)}`) } catch {}
    }
  } else {
    try { const j = JSON.stringify(err); if (j && j !== '{}') parts.push(j) } catch {}
    if (!parts.length) parts.push(String(err))
  }
  return truncateText(parts.filter(Boolean).join(' | '), max)
}

async function dbQuery(sql, params = []) {
  const { rows, error } = await query(sql, params)
  if (error) throw error
  return rows || []
}

async function dbQueryOne(sql, params = []) {
  const rows = await dbQuery(sql, params)
  return rows[0] || null
}

async function dbExecute(sql, params = []) {
  const { rows, error } = await query(sql, params)
  if (error) throw error
  return rows
}

async function acquireWithdrawalLock(chatId) {
  const connection = await getPool().getConnection()
  const lockName = `caudal-withdrawal:${Number(chatId)}`
  try {
    const [rows] = await connection.query('SELECT GET_LOCK(?, 2) AS acquired', [lockName])
    if (Number(rows?.[0]?.acquired) !== 1) {
      const err = new Error('Ya hay una solicitud de retiro en proceso. Intentá nuevamente en unos segundos.')
      err.httpStatus = 409
      err.code = 'withdrawal_form_already_claimed'
      throw err
    }
  } catch (error) {
    connection.release()
    throw error
  }

  return async () => {
    try { await connection.query('SELECT RELEASE_LOCK(?)', [lockName]) } finally { connection.release() }
  }
}

async function getActiveCaudalAccount() {
  const row = await dbQueryOne(
    `SELECT ba.id, ba.account_data
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE bp.slug = 'caudal' AND ba.is_active = 1
     ORDER BY ba.id ASC LIMIT 1`
  )
  if (!row) return null
  const data = typeof row.account_data === 'object' ? row.account_data : JSON.parse(row.account_data || '{}')
  return {
    id: row.id,
    api_token: data.api_token || null,
    account_external_id: data.account_external_id || null,
    webhook_secret: data.webhook_secret || null,
    cbu: data.cbu || null,
    alias: data.alias || null,
    nombre_titular: data.nombre_titular || null,
    account_data: data,
  }
}

async function debitClientExternalBalance(chatId, amount) {
  const chat = await dbQueryOne('SELECT client_id FROM chats WHERE id = ? LIMIT 1', [chatId])
  if (!chat?.client_id) throw new Error('No se encontró el cliente asociado al chat.')
  const client = await dbQueryOne('SELECT external_id FROM clients WHERE id = ? LIMIT 1', [chat.client_id])
  if (!client?.external_id) throw new Error('El cliente no tiene ID externo asignado.')
  const platformToken = await dbQueryOne('SELECT token, api_url FROM platform_tokens WHERE id = 1 LIMIT 1')
  if (!platformToken?.token || !platformToken?.api_url) throw new Error('No se encontraron token o api_url en platform_tokens.')

  const url = `${platformToken.api_url}index.php?act=admin&area=balance&type=frame&id=${client.external_id}&response=js`
  const formData = new URLSearchParams()
  formData.append('operation', 'out')
  formData.append('send', 'true')
  formData.append('amount', String(amount))
  formData.append('balance_currency', 'ARS')
  formData.append('api_token', platformToken.token)

  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData })
  const data = await resp.json()
  if (!data?.successMessage) throw new Error(data?.errorMessage || 'Error al descontar el saldo en la plataforma.')
  return data
}

async function ensureClientWithdrawalDestination({ clientId, cbu, source = 'caudal_withdrawal', sourceRefId = null }) {
  if (!clientId || !cbu) return
  await query(
    `INSERT INTO client_cbu_whitelist (client_id, cbu, source, source_ref_id, verified_at, last_used_at, active)
     VALUES (?, ?, ?, ?, NOW(), NOW(), 1)
     ON DUPLICATE KEY UPDATE source=VALUES(source), source_ref_id=COALESCE(VALUES(source_ref_id), source_ref_id),
       verified_at=COALESCE(verified_at, VALUES(verified_at)), last_used_at=NOW(), active=1`,
    [clientId, cbu, source, sourceRefId]
  )
}

async function updateClientCbuIfEmpty(clientId, cbu) {
  if (!clientId || !cbu) return
  await query(
    `UPDATE clients SET cbu_cvu=?, cbu_cvu_locked_at=COALESCE(cbu_cvu_locked_at, NOW()), cbu_cvu_source=COALESCE(cbu_cvu_source, 'caudal_withdrawal')
     WHERE id=? AND (cbu_cvu IS NULL OR cbu_cvu='')`,
    [cbu, clientId]
  )
}

async function getClientRow(chatId) {
  return dbQueryOne(
    `SELECT c.id, c.username, c.full_name, c.cuil AS cuit_cuil, c.cbu_cvu, c.external_id, c.verified_titular_name
     FROM chats ch INNER JOIN clients c ON c.id = ch.client_id WHERE ch.id = ? LIMIT 1`,
    [chatId]
  )
}

async function claimBalanceDebit(withdrawalId) {
  const result = await dbExecute(
    `UPDATE caudal_withdrawal_requests SET balance_debited_at=UTC_TIMESTAMP(), updated_at=UTC_TIMESTAMP() WHERE id=? AND balance_debited_at IS NULL`,
    [withdrawalId]
  )
  return result?.affectedRows > 0
}

async function claimWebhookStatusMessage(withdrawalId) {
  const result = await dbExecute(
    `UPDATE caudal_withdrawal_requests SET status_message_sent_at=UTC_TIMESTAMP(), updated_at=UTC_TIMESTAMP() WHERE id=? AND status_message_sent_at IS NULL`,
    [withdrawalId]
  )
  return result?.affectedRows > 0
}

async function markFailed(withdrawalId, error) {
  await dbExecute(
    `UPDATE caudal_withdrawal_requests SET status='FAILED', last_error=?, updated_at=UTC_TIMESTAMP() WHERE id=?`,
    [serializeError(error), withdrawalId]
  )
}

async function insertWithdrawalRow({
  chatId, bankAccountId, accountExternalId, clientRow,
  clientReferenceId, correlationId, amount,
  destinationCbu, destinationName, destinationCuit, destinationAlias, destinationBank,
  status, providerStatus = null, providerReason = null, coelsaId = null,
  rawRequest = null, rawResponse = null, rawWebhook = null, lastError = null,
  dispatchedAt = null, balanceDebitedAt = null,
  risk, requestContext,
  reviewedBy = null, reviewedAt = null, reviewNote = null,
}) {
  const result = await dbExecute(
    `INSERT INTO caudal_withdrawal_requests
       (bank_account_id, account_external_id, client_id, client_cuit_cuil, client_username, client_name,
        chat_id, correlation_id, client_reference_id, external_id,
        amount, destination_cbu, destination_alias, destination_name, destination_cuit, destination_bank, concept,
        status, provider_status, provider_reason, coelsa_id,
        raw_request, raw_response, raw_webhook, last_error,
        dispatched_at, balance_debited_at,
        risk_score, risk_flags, risk_reason,
        request_ip, request_device, request_user_agent,
        request_country_code, request_country_name, request_city, request_region,
        request_latitude, request_longitude, request_asn_number, request_asn_name, request_asn_org, request_timezone,
        reviewed_by, reviewed_at, review_note,
        created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
    [
      bankAccountId || null, accountExternalId,
      clientRow?.id || null,
      normalizeCuit(clientRow?.cuit_cuil) || null,
      clientRow?.username || null,
      clientRow?.full_name || null,
      chatId || null, correlationId, clientReferenceId, null,
      Number(amount), destinationCbu,
      destinationAlias || null, destinationName || null,
      destinationCuit || null, destinationBank || null, 'VAR',
      status, providerStatus,
      truncateText(providerReason, PROVIDER_REASON_MAX_LENGTH),
      coelsaId || null,
      rawRequest ? JSON.stringify(rawRequest) : null,
      rawResponse ? JSON.stringify(rawResponse) : null,
      rawWebhook ? JSON.stringify(rawWebhook) : null,
      lastError ? String(lastError).slice(0, 1000) : null,
      dispatchedAt || null, balanceDebitedAt || null,
      Number(risk?.riskScore || 0),
      JSON.stringify(risk?.riskFlags || []),
      risk?.riskReason || null,
      requestContext?.ip || null, requestContext?.device || null,
      requestContext?.userAgent || null,
      requestContext?.geo?.country_code || null,
      requestContext?.geo?.country_name || null,
      requestContext?.geo?.city || null,
      requestContext?.geo?.region || null,
      requestContext?.geo?.latitude ?? null,
      requestContext?.geo?.longitude ?? null,
      requestContext?.geo?.asn_number ?? null,
      requestContext?.geo?.asn_name || null,
      requestContext?.geo?.asn_org || null,
      requestContext?.geo?.timezone || null,
      reviewedBy || null, reviewedAt || null, reviewNote || null,
    ]
  )
  return result?.insertId
}

function emitBannerUpdate({ chatId, banner }) {
  try { getIo()?.to(`chat:${chatId}`)?.emit('updateChatState', { chatId, caudalWithdrawalBanner: banner || null }) }
  catch (e) { console.warn('[caudalWithdrawalService] no se pudo emitir banner:', e?.message || e) }
}

function buildBanner({ withdrawalId, amount, status, providerStatus, providerReason, externalId, clientReferenceId, destinationCbu, destinationName, destinationAlias, destinationBank, createdAt, updatedAt, resolvedAt }) {
  const s = String(status || '').trim().toUpperCase()
  const ps = String(providerStatus || '').trim().toLowerCase()
  const isProcessing = s === 'INITIATED' || ps === 'en_proceso'
  const isResolved = s === 'DONE' || s === 'FAILED'
  if (!isProcessing && !isResolved) return null
  return {
    withdrawalId: Number(withdrawalId) || null,
    amount: Number.isFinite(Number(amount)) ? Number(amount) : null,
    status: s, providerStatus: providerStatus || null, providerReason: providerReason || null,
    externalId: externalId || null, clientReferenceId: clientReferenceId || null,
    destinationCbu: destinationCbu || null, destinationName: destinationName || null,
    destinationAlias: destinationAlias || null, destinationBank: destinationBank || null,
    createdAt: createdAt || null, updatedAt: updatedAt || null, resolvedAt: resolvedAt || null,
    canClose: isResolved,
    title: isResolved ? (s === 'DONE' ? 'Retiro completado' : 'Retiro fallido') : 'Retiro en proceso',
    message: isResolved ? (s === 'DONE' ? 'Tu retiro fue completado correctamente.' : 'Tu retiro no pudo completarse. Si hace falta, contactá soporte.') : 'Tu retiro quedó en proceso. Te avisaremos apenas esté resuelto.',
  }
}

async function sendAutoMsg(chatId, event, fallback, context = {}) {
  try {
    const msg = await getAutoMessage(event, context)
    if (msg) await persistMessage({ chatId, senderType: 'system', content: msg, messageType: 'text' })
  } catch (e) {
    console.warn('[caudalWithdrawalService] no se pudo enviar auto mensaje:', e?.message || e)
  }
}

async function resetChatPostWithdrawal(chatId) {
  await dbExecute('UPDATE chats SET updated_at=NOW() WHERE id=?', [chatId])
  try {
    getIo()?.to(chatId)?.emit('updateChatState', {
      chatId, ticketStatus: null, depositAttemptsExhausted: false,
      showOptionButtons: true, showUploadButton: false, showCbuAliasButtons: false,
      hideImageUploadButton: false, showMessageBox: true, showYesNoButtons: false, showWithdrawalForm: false,
    })
  } catch (e) { console.warn('[caudalWithdrawalService] no se pudo emitir updateChatState:', e?.message || e) }
}

async function getIdempotentExisting({ accountExternalId, clientReferenceId }) {
  if (!accountExternalId || !clientReferenceId) return null
  return dbQueryOne(
    `SELECT id, status, provider_status, provider_reason, external_id, client_reference_id,
            amount, destination_cbu, destination_name, destination_cuit, destination_alias, destination_bank
     FROM caudal_withdrawal_requests WHERE account_external_id=? AND client_reference_id=? LIMIT 1`,
    [accountExternalId, clientReferenceId]
  )
}

function buildResponseFromExisting(existing) {
  const base = {
    withdrawalId: existing.id, status: existing.status,
    providerStatus: existing.provider_status || null, providerReason: existing.provider_reason || null,
    externalId: existing.external_id || null, clientReferenceId: existing.client_reference_id || null,
    destinationCbu: existing.destination_cbu || null, destinationName: existing.destination_name || null,
    destinationCuit: existing.destination_cuit || null, destinationAlias: existing.destination_alias || null,
    destinationBank: existing.destination_bank || null, idempotent: true,
  }
  if (existing.status === 'REVIEW_PENDING') return { httpStatus: 200, body: { ...base, message: 'Tu solicitud está siendo revisada.', showWithdrawalForm: false } }
  if (existing.status === 'REJECTED') return { httpStatus: 200, body: { ...base, message: 'Tu solicitud no pudo ser procesada.', showWithdrawalForm: false } }
  if (existing.status === 'DONE') return { httpStatus: 200, body: { ...base, message: 'Tu retiro fue completado correctamente.', showWithdrawalForm: false } }
  if (existing.status === 'FAILED') return { httpStatus: 200, body: { ...base, message: 'Tu solicitud terminó en un estado no procesable.', showWithdrawalForm: false } }
  return { httpStatus: 202, body: { ...base, message: 'Tu solicitud se está procesando.', showWithdrawalForm: false } }
}

export async function createWithdrawalRequest({ req, chatId, amount, holderName, method, cbu, dni, clientReferenceId = null }) {
  let normalizedChatId = Number(chatId)
  const normalizedAmount = Number(amount)
  const normalizedHolderName = String(holderName || '').trim().replace(/\s+/g, ' ')
  const normalizedMethod = String(method || '').trim().toLowerCase()
  const normalizedCbu = normalizeCbu(cbu)
  const normalizedDni = String(dni || '').trim()
  const idempotencyKey = String(clientReferenceId || req?.headers?.['idempotency-key'] || '').trim() || randomUUID()

  if (!normalizedChatId) {
    const err = new Error('ID de chat inválido.'); err.httpStatus = 400; err.code = 'caudal_invalid_chat'; throw err
  }
  if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
    const err = new Error('El monto es obligatorio.'); err.httpStatus = 400; throw err
  }
  if (normalizedAmount > MAX_WITHDRAWAL_AMOUNT) {
    const err = new Error('El monto máximo permitido para retiro es $300.000.'); err.httpStatus = 400; throw err
  }
  if (!isValidHumanFullName(normalizedHolderName)) {
    const err = new Error('El nombre del titular es obligatorio y debe ser válido.'); err.httpStatus = 400; throw err
  }
  if (!['cbu', 'cvu'].includes(normalizedMethod)) {
    const err = new Error('Por el momento solo se aceptan retiros por CBU o CVU.'); err.httpStatus = 400; throw err
  }
  if (!normalizedCbu) {
    const err = new Error('El CBU/CVU debe tener 22 dígitos numéricos.'); err.httpStatus = 400; throw err
  }
  if (!/^\d{8}$/.test(normalizedDni)) {
    const err = new Error('El DNI debe tener 8 dígitos.'); err.httpStatus = 400; throw err
  }

  const chatConfig = await dbQueryOne(
    `SELECT c.id, c.client_id
     FROM chats c WHERE c.id=? AND c.is_archived=0 LIMIT 1`,
    [normalizedChatId]
  )
  if (!chatConfig) { const err = new Error('Chat no encontrado.'); err.httpStatus = 404; throw err }

  const clientRow = await getClientRow(normalizedChatId)
  if (!clientRow) { const err = new Error('No se encontró el cliente asociado al chat.'); err.httpStatus = 404; throw err }

  const clientCuit = normalizeCuit(clientRow.cuit_cuil)
  const dniFromCuit = extractDniFromCuit(clientCuit)
  if (!clientCuit || !dniFromCuit) {
    const err = new Error('El cliente no tiene CUIT/CUIL válido.'); err.httpStatus = 400; throw err
  }
  if (dniFromCuit !== normalizedDni) {
    const err = new Error('El DNI ingresado no coincide con el CUIT/CUIL del cliente.'); err.httpStatus = 400; throw err
  }

  const requestContext = await buildRequestContext(req)
  const caudalAccount = await getActiveCaudalAccount()
  if (!caudalAccount?.api_token) {
    const err = new Error('No hay una cuenta Caudal activa.'); err.httpStatus = 503; err.code = 'caudal_account_unavailable'; throw err
  }
  const accountExternalId = String(caudalAccount.account_external_id || '').trim()
  if (!accountExternalId) {
    const err = new Error('La cuenta Caudal activa no tiene account_external_id configurado.'); err.httpStatus = 503; err.code = 'caudal_account_missing_external_id'; throw err
  }

  const releaseWithdrawalLock = await acquireWithdrawalLock(normalizedChatId)
  try {
  const existing = await getIdempotentExisting({ accountExternalId, clientReferenceId: idempotencyKey })
  if (existing) {
    if (Number(existing?.amount || 0) !== Number(normalizedAmount) || String(existing?.destination_cbu || '') !== String(normalizedCbu || '')) {
      const err = new Error('idempotency_key_scope_mismatch'); err.code = 'idempotency_key_scope_mismatch'; err.httpStatus = 400; throw err
    }
    return buildResponseFromExisting(existing)
  }

  const risk = await evaluateWithdrawalRisk({
    clientId: clientRow.id, clientRow, destinationCbu: normalizedCbu,
    holderName: normalizedHolderName, amount: normalizedAmount, requestContext,
  })

  const actor = { type: 'client', id: clientRow.id, label: clientRow.username || clientRow.full_name || null }
  const createdAt = moment.utc().format('YYYY-MM-DD HH:mm:ss')

  if (risk.decision === 'REJECTED') {
    const withdrawalId = await insertWithdrawalRow({
      chatId: normalizedChatId, bankAccountId: caudalAccount.id, accountExternalId, clientRow,
      clientReferenceId: idempotencyKey, correlationId: randomUUID(),
      amount: normalizedAmount, destinationCbu: normalizedCbu, destinationName: normalizedHolderName,
      destinationCuit: clientCuit, destinationAlias: null, destinationBank: null,
      status: 'REJECTED', providerStatus: 'rejected', providerReason: 'risk_rejected', risk, requestContext,
    })
    const auditId = await insertCaudalWithdrawalAudit({
      source: 'client_withdrawal', decision: 'rejected', reasonCode: 'risk_rejected', reasonDetail: risk.riskReason,
      withdrawalRequestId: withdrawalId, clientId: clientRow.id, chatId: normalizedChatId, userId: clientRow.id,
      bankAccountId: caudalAccount.id, clientReferenceId: idempotencyKey,
      amount: normalizedAmount, currency: 'ARS', destinationCbu: normalizedCbu, providerStatus: 'rejected',
      requestIp: requestContext.ip || null, userAgent: requestContext.userAgent || null,
      payload: { risk }, metadata: { actor },
    })
    await sendAutoMsg(normalizedChatId, 'caudal_withdrawal_rejected', 'Tu solicitud de retiro no pudo procesarse en este momento.')
    return {
      httpStatus: 200,
      body: { withdrawalId, status: 'REJECTED', providerStatus: 'rejected', providerReason: 'risk_review_required', clientReferenceId: idempotencyKey, message: 'Tu solicitud no pudo ser procesada en este momento.', showWithdrawalForm: false },
    }
  }

  if (risk.decision === 'REVIEW_PENDING') {
    const withdrawalId = await insertWithdrawalRow({
      chatId: normalizedChatId, bankAccountId: caudalAccount.id, accountExternalId, clientRow,
      clientReferenceId: idempotencyKey, correlationId: randomUUID(),
      amount: normalizedAmount, destinationCbu: normalizedCbu, destinationName: normalizedHolderName,
      destinationCuit: clientCuit, destinationAlias: null, destinationBank: null,
      status: 'REVIEW_PENDING', providerStatus: 'review_pending', providerReason: risk.riskReason, risk, requestContext,
    })
    await insertCaudalWithdrawalAudit({
      source: 'client_withdrawal', decision: 'review_pending', reasonCode: 'risk_review_required', reasonDetail: risk.riskReason,
      withdrawalRequestId: withdrawalId, clientId: clientRow.id, chatId: normalizedChatId, userId: clientRow.id,
      bankAccountId: caudalAccount.id, clientReferenceId: idempotencyKey,
      amount: normalizedAmount, currency: 'ARS', destinationCbu: normalizedCbu, providerStatus: 'review_pending',
      requestIp: requestContext.ip || null, userAgent: requestContext.userAgent || null,
      payload: { risk }, metadata: { actor },
    })
    await sendAutoMsg(normalizedChatId, 'caudal_withdrawal_review', 'Tu solicitud quedó en revisión manual. Un administrador la va a revisar y te va a contactar si hace falta.')
    return {
      httpStatus: 200,
      body: { withdrawalId, status: 'REVIEW_PENDING', providerStatus: 'review_pending', providerReason: risk.riskReason, clientReferenceId: idempotencyKey, message: 'Tu solicitud quedó en revisión manual.', showWithdrawalForm: false },
    }
  }

  // AUTO_APPROVED
  const withdrawalId = await insertWithdrawalRow({
    chatId: normalizedChatId, bankAccountId: caudalAccount.id, accountExternalId, clientRow,
    clientReferenceId: idempotencyKey, correlationId: randomUUID(),
    amount: normalizedAmount, destinationCbu: normalizedCbu, destinationName: normalizedHolderName,
    destinationCuit: clientCuit, destinationAlias: null, destinationBank: null,
    status: 'INITIATED', providerStatus: 'en_proceso', providerReason: null,
    rawRequest: {
      client_reference_id: idempotencyKey, account_external_id: accountExternalId,
      monto: normalizedAmount, destino_cbu: normalizedCbu, destino_nombre: normalizedHolderName,
      destino_cuit: clientCuit, concepto: 'VAR',
    },
    risk, requestContext,
  })

  const requestBody = {
    client_reference_id: idempotencyKey, account_external_id: accountExternalId,
    monto: normalizedAmount, destino_cbu: normalizedCbu, destino_nombre: normalizedHolderName,
    destino_cuit: clientCuit, concepto: 'VAR',
  }

  const auditId = await insertCaudalWithdrawalAudit({
    source: 'client_withdrawal', decision: 'accepted', reasonCode: 'withdrawal_created', reasonDetail: 'Se creó la solicitud de retiro Caudal.',
    withdrawalRequestId: withdrawalId, clientId: clientRow.id, chatId: normalizedChatId, userId: clientRow.id,
    bankAccountId: caudalAccount.id, clientReferenceId: idempotencyKey,
    amount: normalizedAmount, currency: 'ARS', destinationCbu: normalizedCbu, providerStatus: 'en_proceso',
    requestIp: requestContext.ip || null, userAgent: requestContext.userAgent || null,
    payload: requestBody, metadata: { actor, risk },
  })

  let apiResponse
  try {
    apiResponse = await axios.post(`${CAUDAL_API_BASE_URL}/retiros`, requestBody, {
      headers: { Authorization: `Bearer ${caudalAccount.api_token}`, 'Content-Type': 'application/json' },
      timeout: 30000, validateStatus: () => true,
    })
  } catch (e) {
    await markFailed(withdrawalId, e)
    await insertCaudalWithdrawalAudit({
      source: 'client_withdrawal', decision: 'rejected', reasonCode: 'provider_request_failed', reasonDetail: serializeError(e, 500),
      withdrawalRequestId: withdrawalId, clientId: clientRow.id, chatId: normalizedChatId, userId: clientRow.id,
      bankAccountId: caudalAccount.id, clientReferenceId: idempotencyKey,
      amount: normalizedAmount, currency: 'ARS', destinationCbu: normalizedCbu, providerStatus: 'failed',
      requestIp: requestContext.ip || null, userAgent: requestContext.userAgent || null,
      payload: requestBody, metadata: { actor },
    })
    throw e
  }

  const providerData = apiResponse?.data || {}
  const providerStatus = String(providerData?.data?.estado || providerData?.estado || providerData?.status || 'en_proceso').trim()
  const externalId = providerData?.data?.external_id || providerData?.data?.externalId || providerData?.data?.id || providerData?.external_id || null
  const coelsaId = providerData?.data?.coelsa_id || providerData?.data?.coelsaId || providerData?.coelsa_id || null
  const destination = providerData?.data?.destino || providerData?.destino || {}

  if (apiResponse.status < 200 || apiResponse.status >= 300) {
    const errText = providerData?.message || providerData?.error || providerData?.errors?.message || providerData?.errors?.[0] || providerData?.detail || `caudal_http_${apiResponse.status}`
    await dbExecute(
      `UPDATE caudal_withdrawal_requests SET provider_status=?, provider_reason=?, raw_response=?, last_error=?, updated_at=UTC_TIMESTAMP() WHERE id=?`,
      [providerStatus, truncateText(errText, PROVIDER_REASON_MAX_LENGTH), JSON.stringify(providerData), serializeError(errText), withdrawalId]
    )
    await markFailed(withdrawalId, new Error(errText))
    await insertCaudalWithdrawalAudit({
      source: 'client_withdrawal', decision: 'rejected', reasonCode: 'provider_rejected', reasonDetail: truncateText(errText, 500),
      withdrawalRequestId: withdrawalId, clientId: clientRow.id, chatId: normalizedChatId, userId: clientRow.id,
      bankAccountId: caudalAccount.id, externalId, clientReferenceId: idempotencyKey,
      amount: normalizedAmount, currency: 'ARS', destinationCbu: normalizedCbu, providerStatus,
      requestIp: requestContext.ip || null, userAgent: requestContext.userAgent || null,
      payload: requestBody, metadata: { response: providerData, httpStatus: apiResponse.status },
    })
    const err = new Error(errText || 'Caudal rechazó la creación del retiro.')
    err.httpStatus = apiResponse.status || 400; err.code = 'caudal_rejected'; throw err
  }

  await dbExecute(
    `UPDATE caudal_withdrawal_requests SET external_id=COALESCE(external_id,?), provider_status=?, provider_reason=?,
     coelsa_id=COALESCE(coelsa_id,?), destination_name=COALESCE(destination_name,?), destination_cuit=COALESCE(destination_cuit,?),
     destination_alias=COALESCE(destination_alias,?), destination_bank=COALESCE(destination_bank,?),
     raw_response=?, dispatched_at=COALESCE(dispatched_at,UTC_TIMESTAMP()), updated_at=UTC_TIMESTAMP()
     WHERE id=?`,
    [
      externalId || null, providerStatus,
      providerData?.message || providerData?.status || null,
      coelsaId || null,
      destination?.nombre || normalizedHolderName,
      destination?.cuit || clientCuit,
      destination?.alias || null,
      destination?.banco || null,
      JSON.stringify(providerData), withdrawalId,
    ]
  )

  await insertCaudalWithdrawalAudit({
    source: 'provider_response', decision: 'accepted', reasonCode: 'provider_withdrawal_created',
    reasonDetail: providerData?.message || 'Caudal aceptó la solicitud de retiro.',
    withdrawalRequestId: withdrawalId, clientId: clientRow.id, chatId: normalizedChatId,
    userId: clientRow.id, bankAccountId: caudalAccount.id, externalId,
    clientReferenceId: idempotencyKey, amount: normalizedAmount, currency: 'ARS',
    destinationCbu: normalizedCbu, providerStatus,
    requestIp: requestContext.ip || null, userAgent: requestContext.userAgent || null,
    payload: requestBody, metadata: { response: providerData, httpStatus: apiResponse.status, auditId },
  })

  const debitClaimed = await claimBalanceDebit(withdrawalId)
  if (debitClaimed) {
    try {
      await debitClientExternalBalance(normalizedChatId, normalizedAmount)
      await insertCaudalWithdrawalAudit({
        source: 'system', decision: 'accepted', reasonCode: 'withdrawal_balance_debited',
        reasonDetail: 'El saldo externo del cliente fue debitado.',
        withdrawalRequestId: withdrawalId, clientId: clientRow.id, chatId: normalizedChatId,
        bankAccountId: caudalAccount.id, externalId, clientReferenceId: idempotencyKey,
        amount: normalizedAmount, currency: 'ARS', destinationCbu: normalizedCbu, providerStatus,
        metadata: { actor },
      })
    }
    catch (e) {
      await dbExecute(
        `UPDATE caudal_withdrawal_requests SET balance_debited_at=NULL, last_error=?, updated_at=UTC_TIMESTAMP() WHERE id=?`,
        [serializeError(e), withdrawalId]
      )
      await insertCaudalWithdrawalAudit({
        source: 'system', decision: 'error', reasonCode: 'withdrawal_balance_debit_failed',
        reasonDetail: serializeError(e, 500),
        withdrawalRequestId: withdrawalId, clientId: clientRow.id, chatId: normalizedChatId,
        bankAccountId: caudalAccount.id, externalId, clientReferenceId: idempotencyKey,
        amount: normalizedAmount, currency: 'ARS', destinationCbu: normalizedCbu, providerStatus,
        metadata: { actor },
      })
      console.error('[caudalWithdrawalService] debit failed:', e?.message || e)
    }
  }

  await resetChatPostWithdrawal(normalizedChatId)
  await sendAutoMsg(normalizedChatId, 'caudal_withdrawal_processing', 'Tu retiro quedó en proceso. Te avisaremos apenas esté resuelto.')

  emitBannerUpdate({
    chatId: normalizedChatId,
    banner: buildBanner({
      withdrawalId, amount: normalizedAmount, status: 'INITIATED', providerStatus,
      providerReason: providerData?.message || null, externalId, clientReferenceId: idempotencyKey,
      destinationCbu: normalizedCbu, destinationName: destination?.nombre || normalizedHolderName,
      destinationAlias: destination?.alias || null, destinationBank: destination?.banco || null,
      createdAt, updatedAt: createdAt, resolvedAt: null,
    }),
  })

  await ensureClientWithdrawalDestination({ clientId: clientRow.id, cbu: normalizedCbu, source: 'caudal_withdrawal', sourceRefId: String(withdrawalId) })
  try { await updateClientCbuIfEmpty(clientRow.id, normalizedCbu) } catch (e) { console.warn('[caudalWithdrawalService] no se pudo actualizar cbu_cvu:', e?.message) }

  return {
    httpStatus: 200,
    body: {
      withdrawalId, status: 'INITIATED', providerStatus, providerReason: providerData?.message || null,
      externalId, clientReferenceId: idempotencyKey, coelsaId,
      message: 'Tu solicitud de retiro fue enviada correctamente.', showWithdrawalForm: false,
    },
  }
  } finally {
    await releaseWithdrawalLock()
  }
}

export async function handleWithdrawalResolvedWebhook({ req, parsed, matchedAccount, rawHeaders }) {
  const externalId = parsed.externalTransactionId
  const clientReferenceId = parsed.clientReferenceId

  if (!externalId && !clientReferenceId) {
    const err = new Error('Webhook de retiro sin external_id ni client_reference_id.')
    err.httpStatus = 400; err.code = 'caudal_withdrawal_missing_reference'; throw err
  }

  const requestRow = await dbQueryOne(
    `SELECT wr.* FROM caudal_withdrawal_requests wr
     WHERE (? IS NOT NULL AND wr.external_id=?) OR (? IS NOT NULL AND wr.client_reference_id=?)
     ORDER BY wr.id DESC LIMIT 1`,
    [externalId, externalId, clientReferenceId, clientReferenceId]
  )

  const normalizedStatus = String(parsed.status || '').toLowerCase()
  const finalStatus = (normalizedStatus === 'completado' || normalizedStatus === 'done' || normalizedStatus === 'completed') ? 'DONE' : 'FAILED'
  const eventOurStatus = finalStatus === 'DONE' ? 'paid' : 'pending'
  const auditDecision = finalStatus === 'DONE' ? 'accepted' : 'rejected'

  await dbExecute(
    `INSERT INTO caudal_transaction_events
       (event_id, event_name, occurred_at, external_transaction_id, bank_account_id, account_external_id,
        direction, status, amount, currency, transfer_date, coelsa_code,
        from_name, from_cuit, from_cbu, client_id, client_cuit_cuil,
        match_source, our_status, matched_at, raw_payload, raw_headers, created_at, updated_at)
     VALUES (?, 'retiro.resuelto', ?, ?, ?, ?, 'Outbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE event_name=VALUES(event_name), occurred_at=VALUES(occurred_at),
       external_transaction_id=VALUES(external_transaction_id), bank_account_id=VALUES(bank_account_id),
       account_external_id=VALUES(account_external_id), direction=VALUES(direction), status=VALUES(status),
       amount=VALUES(amount), currency=VALUES(currency), transfer_date=VALUES(transfer_date),
       coelsa_code=VALUES(coelsa_code), from_name=VALUES(from_name), from_cuit=VALUES(from_cuit),
       from_cbu=VALUES(from_cbu), client_id=VALUES(client_id), client_cuit_cuil=VALUES(client_cuit_cuil),
       match_source=VALUES(match_source), our_status=VALUES(our_status), matched_at=VALUES(matched_at),
       raw_payload=VALUES(raw_payload), raw_headers=VALUES(raw_headers), updated_at=VALUES(updated_at)`,
    [
      parsed.eventId || randomUUID(),
      parsed.occurredAtSql,
      externalId || clientReferenceId || randomUUID(),
      matchedAccount?.id || null,
      parsed.accountExternalId || requestRow?.account_external_id || null,
      String(parsed.status || 'fallado').toLowerCase(),
      parsed.amount, parsed.currency || 'ARS',
      parsed.occurredAtSql,
      parsed.coelsaCode || null,
      parsed.destinationName || null,
      parsed.destinationCuit || null,
      parsed.destinationCbu || null,
      requestRow?.client_id || null,
      requestRow?.client_cuit_cuil || null,
      requestRow ? 'manual' : 'none',
      eventOurStatus,
      requestRow ? parsed.occurredAtSql : null,
      JSON.stringify(parsed.payload || {}),
      JSON.stringify(rawHeaders || {}),
    ]
  )

  if (!requestRow) {
    return { ignored: true, eventName: parsed.eventName || 'retiro.resuelto', eventId: parsed.eventId || null, reason: 'withdrawal_request_not_found' }
  }

  await dbExecute(
    `UPDATE caudal_withdrawal_requests SET status=?, provider_status=?, provider_reason=?,
     coelsa_id=COALESCE(coelsa_id,?), external_id=COALESCE(external_id,?),
     destination_name=COALESCE(destination_name,?), destination_cuit=COALESCE(destination_cuit,?),
     destination_alias=COALESCE(destination_alias,?), destination_bank=COALESCE(destination_bank,?),
     raw_webhook=?, resolved_at=UTC_TIMESTAMP(), updated_at=UTC_TIMESTAMP() WHERE id=?`,
    [
      finalStatus, parsed.status || null,
      truncateText(parsed.providerReason || parsed.status || null, PROVIDER_REASON_MAX_LENGTH),
      parsed.coelsaCode || null, externalId || null,
      parsed.destinationName || null, parsed.destinationCuit || null,
      parsed.destinationAlias || null, parsed.destinationBank || null,
      JSON.stringify(parsed.payload || {}),
      requestRow.id,
    ]
  )

  if (finalStatus === 'DONE' && !requestRow.balance_debited_at) {
    try {
      await debitClientExternalBalance(requestRow.chat_id, requestRow.amount)
      await dbExecute(
        `UPDATE caudal_withdrawal_requests SET balance_debited_at=UTC_TIMESTAMP(), updated_at=UTC_TIMESTAMP() WHERE id=?`,
        [requestRow.id]
      )
      await insertCaudalWithdrawalAudit({
        source: 'webhook', decision: 'accepted', reasonCode: 'withdrawal_balance_debited',
        reasonDetail: 'El saldo externo del cliente fue debitado al resolver el webhook.',
        withdrawalRequestId: requestRow.id, clientId: requestRow.client_id || null,
        chatId: requestRow.chat_id || null, bankAccountId: requestRow.bank_account_id || matchedAccount?.id || null,
        externalId: externalId || null, clientReferenceId: clientReferenceId || requestRow.client_reference_id || null,
        amount: requestRow.amount, currency: parsed.currency || 'ARS',
        destinationCbu: requestRow.destination_cbu || parsed.destinationCbu || null,
        providerStatus: parsed.status || null, requestIp: getRequestIp(req),
        userAgent: req?.headers?.['user-agent'] || null,
        metadata: { eventName: parsed.eventName },
      })
    } catch (e) {
      await dbExecute(
        `UPDATE caudal_withdrawal_requests SET last_error=?, updated_at=UTC_TIMESTAMP() WHERE id=?`,
        [serializeError(e), requestRow.id]
      )
      await insertCaudalWithdrawalAudit({
        source: 'webhook', decision: 'error', reasonCode: 'withdrawal_balance_debit_failed',
        reasonDetail: serializeError(e, 500), withdrawalRequestId: requestRow.id,
        clientId: requestRow.client_id || null, chatId: requestRow.chat_id || null,
        bankAccountId: requestRow.bank_account_id || matchedAccount?.id || null,
        externalId: externalId || null, clientReferenceId: clientReferenceId || requestRow.client_reference_id || null,
        amount: requestRow.amount, currency: parsed.currency || 'ARS',
        destinationCbu: requestRow.destination_cbu || parsed.destinationCbu || null,
        providerStatus: parsed.status || null, requestIp: getRequestIp(req),
        userAgent: req?.headers?.['user-agent'] || null,
        metadata: { eventName: parsed.eventName },
      })
    }
  }

  const auditId = await insertCaudalWithdrawalAudit({
    source: 'webhook', decision: auditDecision,
    reasonCode: finalStatus === 'DONE' ? 'withdrawal_resolved' : 'withdrawal_failed',
    reasonDetail: parsed.providerReason || parsed.status || 'Webhook de retiro resuelto.',
    withdrawalRequestId: requestRow.id, clientId: requestRow.client_id || null,
    chatId: requestRow.chat_id || null, userId: requestRow.client_id || null,
    bankAccountId: requestRow.bank_account_id || matchedAccount?.id || null,
    externalId: externalId || null, clientReferenceId: clientReferenceId || null,
    amount: requestRow.amount || parsed.amount || null, currency: parsed.currency || 'ARS',
    destinationCbu: requestRow.destination_cbu || parsed.destinationCbu || null,
    providerStatus: parsed.status || null,
    requestIp: getRequestIp(req), userAgent: req?.headers?.['user-agent'] || null,
    payload: parsed.payload || {},
    metadata: { eventName: parsed.eventName, matchedAccountId: matchedAccount?.id || null },
  })

  if (await claimWebhookStatusMessage(requestRow.id)) {
    await sendAutoMsg(
      requestRow.chat_id,
      finalStatus === 'DONE' ? 'withdrawal_approved' : 'withdrawal_rejected',
      finalStatus === 'DONE' ? 'Tu retiro fue completado correctamente.' : 'Tu retiro no pudo completarse. Contactá soporte si hace falta.',
    )
  }

  emitBannerUpdate({
    chatId: requestRow.chat_id,
    banner: buildBanner({
      withdrawalId: requestRow.id, amount: requestRow.amount, status: finalStatus,
      providerStatus: parsed.status || null, providerReason: parsed.providerReason || null,
      externalId: externalId || requestRow.external_id || null,
      clientReferenceId: clientReferenceId || requestRow.client_reference_id || null,
      destinationCbu: requestRow.destination_cbu || parsed.destinationCbu || null,
      destinationName: requestRow.destination_name || parsed.destinationName || null,
      destinationAlias: requestRow.destination_alias || parsed.destinationAlias || null,
      destinationBank: requestRow.destination_bank || parsed.destinationBank || null,
      createdAt: requestRow.created_at || null,
      updatedAt: requestRow.updated_at || null,
      resolvedAt: moment.utc().format('YYYY-MM-DD HH:mm:ss'),
    }),
  })

  return {
    ignored: false, eventName: parsed.eventName || 'retiro.resuelto', eventId: parsed.eventId || null,
    externalId: externalId || null, status: finalStatus,
    matchedWithdrawalId: requestRow.id, clientId: requestRow.client_id || null,
    clientReferenceId: clientReferenceId || null,
  }
}

export async function getWithdrawalStatusFromProvider({ externalId }) {
  const withdrawalExternalId = String(externalId || '').trim()
  if (!withdrawalExternalId) {
    const err = new Error('El retiro no tiene external_id.'); err.httpStatus = 400; err.code = 'caudal_withdrawal_missing_external_id'; throw err
  }
  const caudalAccount = await getActiveCaudalAccount()
  if (!caudalAccount?.api_token) {
    const err = new Error('No hay una cuenta Caudal activa con api_token.'); err.httpStatus = 500; err.code = 'caudal_account_unavailable'; throw err
  }
  let response
  try {
    response = await axios.get(`${CAUDAL_API_BASE_URL}/retiros/${encodeURIComponent(withdrawalExternalId)}`, {
      headers: { Authorization: `Bearer ${caudalAccount.api_token}`, 'Content-Type': 'application/json' },
      timeout: 20000, validateStatus: () => true,
    })
  } catch (e) {
    const err = new Error('No se pudo consultar el retiro en Caudal.'); err.httpStatus = 502; err.code = 'caudal_provider_request_failed'; throw err
  }
  const providerData = response?.data || {}
  if (response.status === 404) { const err = new Error('El retiro no existe.'); err.httpStatus = 404; err.code = 'caudal_withdrawal_not_found'; throw err }
  if (response.status < 200 || response.status >= 300) {
    const err = new Error(providerData?.message || providerData?.error || `caudal_http_${response.status}`)
    err.httpStatus = response.status; err.code = 'caudal_provider_error'; throw err
  }
  const d = providerData?.data || providerData
  return {
    httpStatus: 200,
    providerStatus: String(d?.estado || d?.status || '').trim() || null,
    providerReason: d?.razon_fallo || d?.reason || d?.provider_reason || null,
    externalId: String(d?.external_id || d?.externalId || d?.id || withdrawalExternalId).trim(),
    clientReferenceId: String(d?.client_reference_id || d?.clientReferenceId || '').trim() || null,
    amount: Number.isFinite(Number(d?.monto ?? d?.amount)) ? Number(d?.monto ?? d?.amount) : null,
    currency: String(d?.currency || 'ARS').trim(),
    coelsaId: String(d?.coelsa_id || d?.coelsaId || d?.coelsa_code || '').trim() || null,
    rawResponse: providerData,
  }
}
