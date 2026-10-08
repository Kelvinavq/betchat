import { query } from '../config/database.js'

export async function insertCaudalPaymentAudit({
  source, decision, reasonCode, reasonDetail = null,
  clientId = null, chatId = null, userId = null,
  comprobanteId = null, caudalTransactionEventId = null,
  externalTransactionId = null, amount = null, currency = null,
  fromName = null, fromCuit = null, coelsaCode = null,
  matchSource = null, aiConfidence = null,
  requestIp = null, userAgent = null,
  payload = null, metadata = null,
}) {
  const { rows, error } = await query(
    `INSERT INTO caudal_payment_audit_log
       (source, decision, reason_code, reason_detail,
        client_id, chat_id, user_id,
        comprobante_id, caudal_transaction_event_id,
        external_transaction_id, amount, currency,
        from_name, from_cuit, coelsa_code,
        match_source, ai_confidence,
        request_ip, user_agent,
        payload, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      source, decision, reasonCode, reasonDetail || null,
      clientId || null, chatId || null, userId || null,
      comprobanteId || null, caudalTransactionEventId || null,
      externalTransactionId || null,
      amount !== null && amount !== undefined ? Number(amount) : null,
      currency || null,
      fromName || null, fromCuit || null, coelsaCode || null,
      matchSource || null, aiConfidence || null,
      requestIp || null, userAgent || null,
      payload ? JSON.stringify(payload) : null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  )
  if (error) throw error
  return rows?.insertId || null
}

export async function insertCaudalWithdrawalAudit({
  source, decision, reasonCode, reasonDetail = null,
  withdrawalRequestId = null, clientId = null, chatId = null,
  userId = null, bankAccountId = null,
  externalId = null, clientReferenceId = null,
  amount = null, currency = null,
  destinationCbu = null, providerStatus = null,
  requestIp = null, userAgent = null,
  payload = null, metadata = null,
}) {
  const { rows, error } = await query(
    `INSERT INTO caudal_withdrawal_audit_log
       (source, decision, reason_code, reason_detail,
        caudal_withdrawal_request_id, client_id, chat_id, user_id, bank_account_id,
        external_id, client_reference_id,
        amount, currency, destination_cbu, provider_status,
        request_ip, user_agent,
        payload, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      source, decision, reasonCode, reasonDetail || null,
      withdrawalRequestId || null, clientId || null, chatId || null,
      userId || null, bankAccountId || null,
      externalId || null, clientReferenceId || null,
      amount !== null && amount !== undefined ? Number(amount) : null,
      currency || null, destinationCbu || null, providerStatus || null,
      requestIp || null, userAgent || null,
      payload ? JSON.stringify(payload) : null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  )
  if (error) throw error
  return rows?.insertId || null
}
