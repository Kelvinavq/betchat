import { randomUUID } from 'crypto'
import { query, getPool } from '../config/database.js'
import { io } from '../app.js'
import { getAutoMessage } from '../controllers/autoMessagesController.js'
import { persistMessage, resetClientBot } from '../controllers/chatController.js'
import * as hgCashPayoutService from './hgCashPayoutService.js'

const INITIAL_STATUS_DELAY_MS = 7000
const STATUS_RETRY_DELAY_MS = 1000
const WITHDRAWAL_DEBIT_STATUSES = new Set(['initiated', 'processing', 'done'])
const REVIEW_RATE_LIMIT_EVENTS = ['withdrawal_review_approved', 'withdrawal_review_rejected']
const REFRESH_RATE_LIMIT_EVENTS = ['withdrawal_status_refreshed']
const RECONCILE_RATE_LIMIT_EVENTS = ['hg_cash_audit_reconciled']

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

// ─── Auditoría ───────────────────────────────────────────────────────────────────

async function insertAudit({ withdrawalRequestId, eventType, oldStatus = null, newStatus = null, actor = {}, requestContext = {}, details = null }) {
  if (!eventType) return
  try {
    await query(
      `INSERT INTO withdrawal_audit_log
         (withdrawal_request_id, event_type, actor_type, actor_id, actor_label,
          old_status, new_status, ip_address, device, user_agent, details_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        withdrawalRequestId ?? null, eventType,
        actor.type || 'system', actor.id ?? null, actor.label ?? null,
        oldStatus, newStatus,
        requestContext.ip ?? null, requestContext.device ?? null, requestContext.userAgent ?? null,
        details ? JSON.stringify(details) : null,
      ]
    )
  } catch (e) {
    console.error('[withdrawalAutoService] audit insert failed', { eventType, error: e.message })
  }
}

// ─── Rate limit para admins ──────────────────────────────────────────────────────

async function checkAdminRateLimit({ adminId, eventTypes, maxPerMinute }) {
  if (!adminId || !Array.isArray(eventTypes) || !maxPerMinute) return
  const rows = await dbQuery(
    `SELECT COUNT(*) AS total FROM withdrawal_audit_log
     WHERE actor_type = 'admin' AND actor_id = ? AND event_type IN (?)
       AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)`,
    [adminId, eventTypes]
  )
  if (Number(rows[0]?.total || 0) >= maxPerMinute) {
    const err = new Error('rate_limited')
    err.code = 'rate_limited'
    err.httpStatus = 429
    throw err
  }
}

// ─── Idempotencia (1 retiro cada 60 seg por chat) ────────────────────────────────

async function checkChatRateLimit(chatId) {
  const rows = await dbQuery(
    `SELECT id, amount, cbu, method, status, bank_transaction_id
     FROM withdrawal_requests
     WHERE chat_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 60 SECOND)
     ORDER BY id DESC LIMIT 1`,
    [chatId]
  )
  return rows[0] || null
}

async function findExistingByIdempotency(chatId, idempotencyKey) {
  if (!chatId || !idempotencyKey) return null
  return dbQueryOne(
    `SELECT id, amount, cbu, method, status, bank_transaction_id
     FROM withdrawal_requests WHERE chat_id = ? AND idempotency_key = ? LIMIT 1`,
    [chatId, idempotencyKey]
  )
}

function responseFromExisting(row) {
  return {
    status: String(row?.status || 'pending'),
    withdrawalId: Number(row?.id),
    bankTransactionId: row?.bank_transaction_id || null,
    idempotent: true,
    message: 'Esta solicitud de retiro ya fue registrada.',
  }
}

async function acquireWithdrawalLock(chatId) {
  const connection = await getPool().getConnection()
  const lockName = `hgcash-withdrawal:${Number(chatId)}`
  try {
    const [rows] = await connection.query('SELECT GET_LOCK(?, 2) AS acquired', [lockName])
    if (Number(rows?.[0]?.acquired) !== 1) {
      const err = new Error('withdrawal_in_progress')
      err.code = 'withdrawal_in_progress'
      err.httpStatus = 409
      err.status = 409
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

export async function createManualWithdrawal({ chatId, clientId, clientRow = null, formId, messageId, holderName, method, cbu, dni, amount, withdrawableBalance, formData, idempotencyKey, requestContext = {} }) {
  const normalizedIdempotencyKey = String(idempotencyKey || '').trim() || randomUUID()
  const releaseWithdrawalLock = await acquireWithdrawalLock(chatId)
  try {
    const existing = await findExistingByIdempotency(chatId, normalizedIdempotencyKey)
    if (existing) {
      if (Number(existing.amount) !== Number(amount) || String(existing.cbu || '') !== String(cbu || '') || String(existing.method || '') !== String(method || '')) {
        const err = new Error('idempotency_key_scope_mismatch')
        err.code = 'idempotency_key_scope_mismatch'
        err.httpStatus = 400
        err.status = 400
        throw err
      }
      return responseFromExisting(existing)
    }

    const recent = await checkChatRateLimit(chatId)
    if (recent) {
      if (Number(recent.amount) === Number(amount) && String(recent.cbu || '') === String(cbu || '') && String(recent.method || '') === String(method || '')) {
        return responseFromExisting(recent)
      }
      const err = new Error('withdrawal_rate_limited')
      err.code = 'withdrawal_rate_limited'
      err.httpStatus = 409
      err.status = 409
      throw err
    }

    const { rows, error } = await query(
      `INSERT INTO withdrawal_requests
         (chat_id, client_id, form_id, message_id, status, form_data, holder_name, method, cbu, dni,
          amount, withdrawable_balance, review_mode, idempotency_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, 'manual', ?, NOW(), NOW())`,
      [chatId, clientId, formId, messageId, formData, holderName || null, method, cbu || null, dni || null,
       amount, withdrawableBalance, normalizedIdempotencyKey]
    )
    if (error) throw error
    const withdrawalId = rows?.insertId
    await insertAudit({
      withdrawalRequestId: withdrawalId,
      eventType: 'withdrawal_manual_created',
      newStatus: 'pending',
      actor: { type: 'client', id: clientId, label: clientRow?.username || clientRow?.full_name || null },
      requestContext,
      details: {
        amount,
        method,
        cbuMasked: cbu ? `${String(cbu).slice(0, 4)}***` : null,
        formId: formId || null,
        messageId: messageId || null,
        idempotencyKey: normalizedIdempotencyKey,
      },
    })
    return { status: 'pending', withdrawalId, bankTransactionId: null }
  } finally {
    await releaseWithdrawalLock()
  }
}

// ─── Debit de saldo externo ──────────────────────────────────────────────────────

async function debitClientExternalBalance(chatId, amount) {
  const chatRow = await dbQueryOne('SELECT client_id FROM chats WHERE id = ? LIMIT 1', [chatId])
  if (!chatRow?.client_id) throw new Error('No se encontró el cliente asociado al chat.')

  const client = await dbQueryOne('SELECT external_id FROM clients WHERE id = ? LIMIT 1', [chatRow.client_id])
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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  })
  const data = await response.json()
  if (!data?.successMessage) throw new Error(data?.errorMessage || 'Error al descontar el saldo en la plataforma.')
  return data
}

// ─── Guards de idempotencia en columnas ─────────────────────────────────────────

async function claimDispatchedAt(withdrawalId, { bankTransactionId, bankExternalId, status, rawRequest, rawStatus }) {
  const result = await dbExecute(
    `UPDATE withdrawal_requests
       SET bank_transaction_id = ?, bank_external_id = ?, status = ?,
           raw_request = ?, raw_status = ?, dispatched_at = NOW(), updated_at = NOW()
     WHERE id = ? AND dispatched_at IS NULL`,
    [bankTransactionId, bankExternalId, status, rawRequest ? JSON.stringify(rawRequest) : null, rawStatus ? JSON.stringify(rawStatus) : null, withdrawalId]
  )
  return result?.affectedRows > 0
}

async function claimBalanceDebit(withdrawalId) {
  const result = await dbExecute(
    `UPDATE withdrawal_requests SET balance_debited_at = NOW(), updated_at = NOW() WHERE id = ? AND balance_debited_at IS NULL`,
    [withdrawalId]
  )
  return result?.affectedRows > 0
}

async function revertBalanceDebit(withdrawalId) {
  await query(`UPDATE withdrawal_requests SET balance_debited_at = NULL, updated_at = NOW() WHERE id = ?`, [withdrawalId])
}

async function markWithdrawalFailed(withdrawalId, lastError) {
  await query(
    `UPDATE withdrawal_requests SET status = 'failed', last_error = ?, updated_at = NOW() WHERE id = ? AND status = 'initiated'`,
    [String(lastError?.message || lastError).slice(0, 1000), withdrawalId]
  )
}

async function applyDebitIfApplicable({ withdrawalId, chatId, amount, status, actor, requestContext }) {
  if (!WITHDRAWAL_DEBIT_STATUSES.has(status)) return { applied: false, reason: 'non_debitable_status' }
  const claimed = await claimBalanceDebit(withdrawalId)
  if (!claimed) return { applied: false, reason: 'already_debited' }
  try {
    await debitClientExternalBalance(chatId, amount)
    await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_balance_debited', actor, requestContext, details: { amount, status } })
    return { applied: true }
  } catch (err) {
    await revertBalanceDebit(withdrawalId)
    await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_balance_debit_failed', actor, requestContext, details: { amount, error: String(err.message || err) } })
    return { applied: false, reason: 'debit_failed', error: err }
  }
}

// ─── Mensaje automático post-retiro ─────────────────────────────────────────────

async function sendCompletedMessage({ chatId, withdrawalId, actor, requestContext }) {
  const result = await dbExecute(
    `UPDATE withdrawal_requests SET auto_message_sent_at = NOW(), updated_at = NOW() WHERE id = ? AND auto_message_sent_at IS NULL`,
    [withdrawalId]
  )
  if (!result?.affectedRows) return { sent: false, reason: 'already_sent' }

  const autoMsg = await getAutoMessage('withdrawal_processed', {})
  if (autoMsg) {
    await persistMessage({ chatId, senderType: 'system', content: autoMsg, messageType: 'text' })
  }
  await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_completed_message_sent', actor, requestContext, details: { chatId } })
  return { sent: true }
}

// ─── Actualizar whitelist CBU del cliente ────────────────────────────────────────

async function ensureClientWithdrawalDestination({ clientId, cbu, source = 'approved_withdrawal', sourceRefId = null }) {
  if (!clientId || !cbu) return
  await query(
    `INSERT INTO client_cbu_whitelist (client_id, cbu, source, source_ref_id, verified_at, last_used_at, active)
     VALUES (?, ?, ?, ?, NOW(), NOW(), 1)
     ON DUPLICATE KEY UPDATE source = VALUES(source), source_ref_id = COALESCE(VALUES(source_ref_id), source_ref_id),
       verified_at = COALESCE(verified_at, VALUES(verified_at)), last_used_at = NOW(), active = 1`,
    [clientId, cbu, source, sourceRefId]
  )
}

async function updateClientCbuIfEmpty(clientId, cbu) {
  if (!clientId || !cbu) return
  await query(
    `UPDATE clients SET cbu_cvu = ?, cbu_cvu_locked_at = COALESCE(cbu_cvu_locked_at, NOW()), cbu_cvu_source = COALESCE(cbu_cvu_source, 'approved_withdrawal')
     WHERE id = ? AND (cbu_cvu IS NULL OR cbu_cvu = '')`,
    [cbu, clientId]
  )
}

// ─── Dispatch a HG Cash ──────────────────────────────────────────────────────────

async function dispatchToHgCash({ withdrawalId, chatId, clientId, accountRow, method, cbu, amount, correlationId, actor, requestContext }) {
  await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_initiated', newStatus: 'initiated', actor, requestContext, details: { amount, method, cbuMasked: cbu ? `${cbu.slice(0, 4)}***` : null, correlationId } })

  const debitResult = await applyDebitIfApplicable({
    withdrawalId, chatId, amount, status: 'initiated', actor, requestContext,
  })
  if (!debitResult.applied) {
    const debitError = debitResult.error instanceof Error
      ? debitResult.error
      : new Error('withdrawal_balance_debit_failed')
    await markWithdrawalFailed(withdrawalId, debitError)
    await insertAudit({
      withdrawalRequestId: withdrawalId,
      eventType: 'withdrawal_hg_failed_before_bank',
      oldStatus: 'initiated',
      newStatus: 'failed',
      actor,
      requestContext,
      details: { amount, method, correlationId, reason: debitResult.reason, error: String(debitError.message || debitError) },
    })
    throw debitError
  }

  let creation
  try {
    creation = await hgCashPayoutService.createTransaction({ accountRow, method, destinationCbu: cbu, amount, correlationId, withdrawalRequestId: withdrawalId, actor, requestContext })
  } catch (err) {
    await markWithdrawalFailed(withdrawalId, err)
    await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_hg_failed', oldStatus: 'initiated', newStatus: 'failed', actor, requestContext, details: { error: String(err.message || err), code: err.code } })
    throw err
  }

  const bankTransactionId = creation.transactionId || creation.data?.id || null
  const bankExternalId = creation.externalId || creation.data?.externalID || null
  const rejectionMsg = creation.message || creation.data?.message || creation.data?.error || `hgcash_rejected_${creation.httpStatus || 'unknown'}`

  if (!creation.ok) {
    await markWithdrawalFailed(withdrawalId, new Error(rejectionMsg))
    await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_hg_failed', oldStatus: 'initiated', newStatus: 'failed', actor, requestContext, details: { httpStatus: creation.httpStatus, response: creation.data } })
    const err = new Error(rejectionMsg)
    err.code = 'hgcash_rejected'
    err.httpStatus = 400
    throw err
  }

  await sleep(INITIAL_STATUS_DELAY_MS)
  let statusResp = null
  let finalStatus = String(creation.data?.status || 'processing').toLowerCase()
  try {
    statusResp = await hgCashPayoutService.getTransactionStatus({ accountRow, transactionId: bankTransactionId, correlationId, withdrawalRequestId: withdrawalId, actor, requestContext })
    if (statusResp.ok && statusResp.data?.status) {
      finalStatus = String(statusResp.data.status).toLowerCase()
    }
    if (finalStatus === 'pending' || finalStatus === 'processing') {
      await sleep(STATUS_RETRY_DELAY_MS)
      const retry = await hgCashPayoutService.getTransactionStatus({ accountRow, transactionId: bankTransactionId, correlationId, withdrawalRequestId: withdrawalId, actor, requestContext })
      if (retry.ok && retry.data?.status) { finalStatus = String(retry.data.status).toLowerCase(); statusResp = retry }
    }
  } catch (e) { console.error('[withdrawalAutoService] status check failed', e.message) }

  const claimed = await claimDispatchedAt(withdrawalId, { bankTransactionId, bankExternalId, status: finalStatus, rawRequest: creation.data, rawStatus: statusResp?.data || { status: finalStatus } })
  if (!claimed) {
    await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_hg_already_dispatched', actor, requestContext, details: { bankTransactionId } })
  } else {
    await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_hg_created', oldStatus: 'initiated', newStatus: finalStatus, actor, requestContext, details: { bankTransactionId, externalID: bankExternalId } })
  }

  if (clientId) {
    try {
      await updateClientCbuIfEmpty(clientId, cbu)
      await ensureClientWithdrawalDestination({ clientId, cbu, source: 'approved_withdrawal', sourceRefId: String(withdrawalId) })
    } catch (e) { console.error('[withdrawalAutoService] whitelist update failed', e.message) }
  }

  await applyDebitIfApplicable({ withdrawalId, chatId, amount, status: finalStatus, actor, requestContext })
  await sendCompletedMessage({ chatId, withdrawalId, actor, requestContext })
  await resetClientBot(chatId)

  try {
    io.to(`chat:${chatId}`).emit('withdrawal:completed', { chatId, withdrawalId, status: finalStatus, bankTransactionId })
    io.to('admins').emit('withdrawal:updated', { withdrawalId, status: finalStatus })
  } catch (e) { console.error('[withdrawalAutoService] socket emit failed', e.message) }

  return { finalStatus, bankTransactionId, bankExternalId, bankStatus: statusResp?.data || { status: finalStatus } }
}

// ─── Flujo auto (desde cliente) ──────────────────────────────────────────────────

export async function processAutoWithdrawal({ chatId, clientId, clientRow, holderName, dni, method, cbu, amount, withdrawableBalance, riskResult, requestContext, formId = null, messageId = null, formData = null, idempotencyKey = null }) {
  const normalizedIdempotencyKey = String(idempotencyKey || '').trim() || randomUUID()
  const releaseWithdrawalLock = await acquireWithdrawalLock(chatId)
  try {
  const existing = await findExistingByIdempotency(chatId, normalizedIdempotencyKey)
  if (existing) {
    if (Number(existing.amount) !== Number(amount) || String(existing.cbu || '') !== String(cbu || '') || String(existing.method || '') !== String(method || '')) {
      const err = new Error('idempotency_key_scope_mismatch')
      err.code = 'idempotency_key_scope_mismatch'
      err.httpStatus = 400
      err.status = 400
      throw err
    }
    return responseFromExisting(existing)
  }

  const recent = await checkChatRateLimit(chatId)
  if (recent) {
    if (Number(recent.amount) !== Number(amount) || String(recent.cbu || '') !== String(cbu || '') || String(recent.method || '') !== String(method || '')) {
      const err = new Error('withdrawal_rate_limited')
      err.code = 'withdrawal_rate_limited'
      err.httpStatus = 409
      err.status = 409
      throw err
    }
    return responseFromExisting(recent)
  }

  const correlationId = randomUUID()
  const actor = { type: 'client', id: clientId, label: clientRow?.username || null }

  const insertRow = async (status) => {
    const { rows, error } = await query(
      `INSERT INTO withdrawal_requests
         (chat_id, client_id, form_id, message_id, holder_name, method, cbu, dni,
          withdrawable_balance, correlation_id, idempotency_key, status, form_data,
          risk_score, fraud_alerts, review_mode,
          request_ip, request_device, request_user_agent,
          request_country_code, request_country_name, request_city, request_region,
          request_latitude, request_longitude, request_asn_number, request_asn_name,
          request_asn_org, request_timezone, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
               ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        chatId, clientId, formId ?? null, messageId ?? null,
        holderName, method, cbu, dni,
        withdrawableBalance, correlationId, normalizedIdempotencyKey, status,
        formData ? JSON.stringify(formData) : null,
        riskResult.riskScore, JSON.stringify(riskResult.riskFlags || []),
        riskResult.decision === 'AUTO_APPROVED' ? 'auto' : 'manual',
        requestContext.ip, requestContext.device, requestContext.userAgent,
        requestContext.geo?.country_code, requestContext.geo?.country_name,
        requestContext.geo?.city, requestContext.geo?.region,
        requestContext.geo?.latitude ?? null, requestContext.geo?.longitude ?? null,
        requestContext.geo?.asn_number ?? null, requestContext.geo?.asn_name,
        requestContext.geo?.asn_org, requestContext.geo?.timezone,
      ]
    )
    if (error) throw error
    return rows?.insertId
  }

  if (riskResult.decision === 'REJECTED') {
    const withdrawalId = await insertRow('rejected')
    await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_rejected_by_risk', newStatus: 'rejected', actor, requestContext, details: { riskScore: riskResult.riskScore, riskFlags: riskResult.riskFlags } })
    return { status: 'rejected', withdrawalId, message: 'Tu solicitud no pudo ser procesada en este momento.' }
  }

  if (riskResult.decision === 'REVIEW_PENDING') {
    const withdrawalId = await insertRow('review_pending')
    await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_review_required', newStatus: 'review_pending', actor, requestContext, details: { riskScore: riskResult.riskScore, riskFlags: riskResult.riskFlags } })
    const autoMsg = await getAutoMessage('withdrawal_review', {})
    if (autoMsg) await persistMessage({ chatId, senderType: 'system', content: autoMsg, messageType: 'text' })
    io.to('admins').emit('withdrawal:new_review', { chatId, clientId, amount, riskScore: riskResult.riskScore })
    return { status: 'review_pending', withdrawalId, message: 'Tu solicitud está siendo revisada, te notificaremos pronto.' }
  }

  // AUTO_APPROVED — dispatch inmediato
  const withdrawalId = await insertRow('initiated')
  const accountRow = await hgCashPayoutService.getActiveHgCashAccount()
  if (!accountRow?.account_id || !accountRow?.bearer) {
    await query(`UPDATE withdrawal_requests SET status = 'failed', last_error = 'hgcash_account_unavailable', updated_at = NOW() WHERE id = ?`, [withdrawalId])
    await insertAudit({
      withdrawalRequestId: withdrawalId,
      eventType: 'withdrawal_hg_account_unavailable',
      oldStatus: 'initiated',
      newStatus: 'failed',
      actor,
      requestContext,
      details: { correlationId },
    })
    return { status: 'failed', withdrawalId, message: 'Error interno al procesar el retiro.' }
  }

  try {
    const result = await dispatchToHgCash({ withdrawalId, chatId, clientId, accountRow, method, cbu, amount, correlationId, actor, requestContext })
    return { status: result.finalStatus, withdrawalId, bankTransactionId: result.bankTransactionId, message: 'Solicitud de retiro procesada correctamente.' }
  } catch (err) {
    return { status: 'failed', withdrawalId, message: 'Tu retiro no pudo procesarse. Por favor contactá a soporte.' }
  }
  } finally {
    await releaseWithdrawalLock()
  }
}

// ─── Admin: aprobar con dispatch ─────────────────────────────────────────────────

export async function approveWithdrawalWithDispatch({ withdrawalId, adminUser, note = null, requestContext }) {
  const actor = { type: 'admin', id: String(adminUser?.id ?? ''), label: adminUser?.username || adminUser?.email || 'admin' }
  await checkAdminRateLimit({ adminId: actor.id, eventTypes: REVIEW_RATE_LIMIT_EVENTS, maxPerMinute: 10 })

  const row = await dbQueryOne(
    `SELECT wr.id, wr.chat_id, wr.client_id, wr.amount, wr.holder_name, wr.method, wr.cbu, wr.dni,
            wr.status, wr.bank_transaction_id, wr.correlation_id
     FROM withdrawal_requests wr WHERE wr.id = ? LIMIT 1`,
    [withdrawalId]
  )
  if (!row) { const e = new Error('withdrawal_not_found'); e.httpStatus = 404; throw e }

  const approvalStatuses = ['pending', 'review_pending', 'approved']
  if (!approvalStatuses.includes(row.status) || row.bank_transaction_id) {
    const e = new Error('withdrawal_not_in_review'); e.httpStatus = 409; throw e
  }

  const transition = await dbExecute(
    `UPDATE withdrawal_requests
       SET status = 'initiated', reviewed_by = ?, reviewed_by_username = ?, reviewed_at = NOW(),
           review_note = ?, updated_at = NOW()
     WHERE id = ? AND status IN ('pending','review_pending','approved') AND bank_transaction_id IS NULL`,
    [actor.label, actor.label, note, withdrawalId]
  )
  if (!transition?.affectedRows) { const e = new Error('withdrawal_review_race'); e.httpStatus = 409; throw e }

  await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_review_approved', oldStatus: row.status, newStatus: 'initiated', actor, requestContext, details: { note } })

  const accountRow = await hgCashPayoutService.getActiveHgCashAccount()
  if (!accountRow?.account_id || !accountRow?.bearer) {
    await markWithdrawalFailed(withdrawalId, new Error('hgcash_account_unavailable'))
    const e = new Error('hgcash_account_unavailable'); e.httpStatus = 503; throw e
  }

  try {
    const result = await dispatchToHgCash({
      withdrawalId, chatId: row.chat_id, clientId: row.client_id,
      accountRow, method: row.method || 'cbu', cbu: row.cbu,
      amount: row.amount, correlationId: row.correlation_id || randomUUID(),
      actor, requestContext,
    })
    return { withdrawalId, status: result.finalStatus, bankTransactionId: result.bankTransactionId }
  } catch (dispatchErr) {
    throw dispatchErr
  }
}

// ─── Admin: rechazar ─────────────────────────────────────────────────────────────

export async function rejectWithdrawal({ withdrawalId, adminUser, note = null, requestContext }) {
  const actor = { type: 'admin', id: String(adminUser?.id ?? ''), label: adminUser?.username || adminUser?.email || 'admin' }
  await checkAdminRateLimit({ adminId: actor.id, eventTypes: REVIEW_RATE_LIMIT_EVENTS, maxPerMinute: 10 })

  const row = await dbQueryOne(`SELECT id, chat_id, client_id, status, bank_transaction_id FROM withdrawal_requests WHERE id = ? LIMIT 1`, [withdrawalId])
  if (!row) { const e = new Error('withdrawal_not_found'); e.httpStatus = 404; throw e }

  const rejectableStatuses = ['pending', 'review_pending', 'approved']
  if (!rejectableStatuses.includes(row.status)) { const e = new Error('withdrawal_not_rejectable'); e.httpStatus = 409; throw e }

  const transition = await dbExecute(
    `UPDATE withdrawal_requests
       SET status = 'rejected', reviewed_by = ?, reviewed_by_username = ?, reviewed_at = NOW(),
           review_note = ?, rejection_message = ?, updated_at = NOW()
     WHERE id = ? AND status IN ('pending','review_pending','approved') AND bank_transaction_id IS NULL`,
    [actor.label, actor.label, note, note, withdrawalId]
  )
  if (!transition?.affectedRows) { const e = new Error('withdrawal_review_race'); e.httpStatus = 409; throw e }

  await insertAudit({ withdrawalRequestId: withdrawalId, eventType: 'withdrawal_review_rejected', oldStatus: row.status, newStatus: 'rejected', actor, requestContext, details: { note } })
  io.to('admins').emit('withdrawal:updated', { withdrawalId, status: 'rejected' })
  return { withdrawalId, status: 'rejected' }
}

// ─── Admin: refrescar estado desde HG Cash ───────────────────────────────────────

export async function refreshWithdrawalStatus({ withdrawalId, adminUser, requestContext }) {
  const actor = { type: 'admin', id: String(adminUser?.id ?? ''), label: adminUser?.username || adminUser?.email || 'admin' }
  await checkAdminRateLimit({ adminId: actor.id, eventTypes: REFRESH_RATE_LIMIT_EVENTS, maxPerMinute: 30 })

  const row = await dbQueryOne(
    `SELECT id, chat_id, amount, status, bank_transaction_id, correlation_id, balance_debited_at, auto_message_sent_at FROM withdrawal_requests WHERE id = ? LIMIT 1`,
    [withdrawalId]
  )
  if (!row) { const e = new Error('withdrawal_not_found'); e.httpStatus = 404; throw e }
  if (!row.bank_transaction_id) { const e = new Error('withdrawal_not_dispatched'); e.httpStatus = 409; throw e }

  const accountRow = await hgCashPayoutService.getActiveHgCashAccount()
  if (!accountRow?.account_id || !accountRow?.bearer) { const e = new Error('hgcash_account_unavailable'); e.httpStatus = 503; throw e }

  const statusResp = await hgCashPayoutService.getTransactionStatus({ accountRow, transactionId: row.bank_transaction_id, correlationId: row.correlation_id, withdrawalRequestId: row.id, actor, requestContext })
  const nextStatus = String(statusResp.data?.status || row.status || 'processing').toLowerCase()

  await applyDebitIfApplicable({ withdrawalId: row.id, chatId: row.chat_id, amount: row.amount, status: nextStatus, actor, requestContext })
  if (nextStatus === 'done') await sendCompletedMessage({ chatId: row.chat_id, withdrawalId: row.id, actor, requestContext })

  if (nextStatus !== row.status) {
    await query(`UPDATE withdrawal_requests SET status = ?, raw_status = ?, updated_at = NOW() WHERE id = ?`, [nextStatus, JSON.stringify(statusResp.data || {}), row.id])
    await insertAudit({ withdrawalRequestId: row.id, eventType: 'withdrawal_status_refreshed', oldStatus: row.status, newStatus: nextStatus, actor, requestContext, details: { bankTransactionId: row.bank_transaction_id } })
  }

  return { withdrawalId: row.id, status: nextStatus, bankStatus: statusResp.data || null }
}

// ─── Admin: reconciliar outbox del log ───────────────────────────────────────────

export async function reconcileHgCashLog({ adminUser, requestContext, batchSize = 100 }) {
  const actor = { type: 'admin', id: String(adminUser?.id ?? ''), label: adminUser?.username || adminUser?.email || 'admin' }
  await checkAdminRateLimit({ adminId: actor.id, eventTypes: RECONCILE_RATE_LIMIT_EVENTS, maxPerMinute: 5 })

  const result = await hgCashPayoutService.reconcileOutbox({ batchSize })
  await query(
    `INSERT INTO withdrawal_audit_log (withdrawal_request_id, event_type, actor_type, actor_id, actor_label, ip_address, device, user_agent, details_json, created_at)
     VALUES (NULL, 'hg_cash_audit_reconciled', 'admin', ?, ?, ?, ?, ?, ?, NOW())`,
    [actor.id, actor.label, requestContext?.ip ?? null, requestContext?.device ?? null, requestContext?.userAgent ?? null, JSON.stringify(result)]
  )
  return result
}
