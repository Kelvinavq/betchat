import { query } from '../config/database.js'
import { persistMessage, resetClientBot } from './chatController.js'
import { getAutoMessage } from './autoMessagesController.js'
import { updateReceiptLogForMovement } from './receiptLogController.js'
import { processReferralRewardForMovement } from './referralController.js'
import { syncClientEventReceiptPaid } from '../utils/eventParticipantStatus.js'
import { creditPanelBalance } from './mercadoPagoController.js'
import { io } from '../app.js'


const PROVIDERS = ['manual', 'hgcash', 'telepagos', 'mercadopago']
const MANUAL_STATUSES = ['pending', 'paid', 'rejected']

function parseJson(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeProvider(value) {
  const provider = normalizeText(value || 'all').toLowerCase()
  return PROVIDERS.includes(provider) ? provider : 'all'
}

function formatAmount(value) {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? amount : 0
}

function serializeAccount(row) {
  const data = parseJson(row.account_data) || {}
  return {
    id: Number(row.id),
    provider: row.provider,
    label: row.alias || data.alias || data.cbu || `${row.provider} #${row.id}`,
  }
}

function serializeMovement(row) {
  const aiExtractedText = parseJson(row.ai_extracted_text)
  return {
    id: Number(row.id),
    provider: row.provider,
    clientId: Number(row.client_id),
    chatId: Number(row.chat_id),
    messageId: row.message_id ? Number(row.message_id) : null,
    bankAccountId: row.bank_account_id ? Number(row.bank_account_id) : null,
    accountLabel: row.account_label || '',
    status: row.status || 'pending',
    amount: formatAmount(row.amount),
    cuit: row.cuit || '',
    receiptDate: row.receipt_date || null,
    receiptTime: row.receipt_time || null,
    cbuCvu: row.cbu_cvu || '',
    bankStatus: row.bank_status || '',
    coelsaId: row.coelsa_id || '',
    transactionId: row.transaction_id || '',
    transactionIdType: row.transaction_id_type || '',
    mercadopagoId: row.mercadopago_id || '',
    description: row.description || '',
    accountHolder: row.account_holder || '',
    aiExtractedText,
    aiStatus: row.ai_status || (row.provider === 'mercadopago' ? 'ok' : ''),
    aiModel: row.ai_model || '',
    isDuplicate: Boolean(row.is_duplicate),
    duplicateOfId: row.duplicate_of_id ? Number(row.duplicate_of_id) : null,
    duplicateSummary: row.duplicate_summary || '',
    processedBy: row.processed_by || '',
    processedAt: row.processed_at || null,
    gamePlatformLoadId: row.game_platform_load_id || '',
    gameLoadDate: row.game_load_date || null,
    gameLoadTime: row.game_load_time || null,
    gameLoadAmount: row.game_load_amount == null ? null : formatAmount(row.game_load_amount),
    syncStatus: row.sync_status || '',
    receiptUrl: row.receipt_url || '',
    eventReceipt: row.event_id ? {
      participantId: row.event_participant_id ? Number(row.event_participant_id) : null,
      eventId: Number(row.event_id),
      eventType: row.event_type || null,
      eventTitle: row.event_title || null,
      eventStatus: row.event_status || null,
      receiptStatus: row.event_receipt_status || null,
      receiptRetryable: ['1', 'true', 'yes'].includes(String(row.event_receipt_retryable || '').toLowerCase()),
      receiptPending: ['1', 'true', 'yes'].includes(String(row.event_receipt_pending || '').toLowerCase()),
      receiptSource: row.event_receipt_source || 'event',
      receiptReason: row.event_receipt_reason || null,
      receiptChatId: row.event_receipt_chat_id ? Number(row.event_receipt_chat_id) : null,
      receiptMessageId: row.event_receipt_message_id ? Number(row.event_receipt_message_id) : null,
      receiptMovementId: row.event_receipt_movement_id ? Number(row.event_receipt_movement_id) : null,
      receiptUrl: row.event_receipt_url || row.receipt_url || '',
      uploadedAt: row.event_receipt_uploaded_at || null,
      processedAt: row.event_receipt_processed_at || null,
      reward: row.event_reward_id ? {
        id: Number(row.event_reward_id),
        status: row.event_reward_status || null,
        type: row.event_reward_type || null,
        amount: row.event_reward_amount != null ? Number(row.event_reward_amount) : null,
        description: row.event_reward_description || null,
        paidAt: row.event_reward_paid_at || null,
        discardedAt: row.event_reward_discarded_at || null,
        discardReason: row.event_reward_discard_reason || null,
      } : null,
    } : null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
  }
}

function baseManualSelect(whereSql) {
  return `SELECT
    m.id, 'manual' AS provider, m.client_id, m.chat_id, m.message_id, m.bank_account_id,
    CONCAT(COALESCE(bp.name, 'Manual'), ' - ', COALESCE(ba.alias, JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.alias')), ba.id, '')) AS account_label,
    m.status, m.amount, NULL AS cuit, NULL AS receipt_date, NULL AS receipt_time,
    NULL AS cbu_cvu, NULL AS bank_status, m.transaction_id AS coelsa_id,
    m.transaction_id, NULL AS transaction_id_type, NULL AS mercadopago_id,
    NULL AS description, NULL AS account_holder,
    m.ai_extracted_text, m.ai_status, m.is_duplicate, m.duplicate_of_id,
    m.ai_model,
    IF(dup.id IS NULL, '', CONCAT('#', dup.id, ' - ', COALESCE(dup.transaction_id, 'sin transaction id'), ' - $', dup.amount)) AS duplicate_summary,
    COALESCE(u.full_name, u.username, '') AS processed_by, m.processed_at,
    NULL AS game_platform_load_id, NULL AS game_load_date, NULL AS game_load_time, NULL AS game_load_amount, NULL AS sync_status,
    m.created_at, m.updated_at,
    msg.file_url AS receipt_url,
    rl.id AS receipt_log_id,
    rl.message_id AS receipt_log_message_id,
    rl.movement_id AS receipt_log_movement_id,
    ep.id AS event_participant_id,
    ep.event_id AS event_id,
    e.type AS event_type,
    e.title AS event_title,
    e.status AS event_status,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_status')) AS event_receipt_status,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_retryable')) AS event_receipt_retryable,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_pending')) AS event_receipt_pending,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_source')) AS event_receipt_source,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_processing_reason')) AS event_receipt_reason,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_chat_id')) AS event_receipt_chat_id,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_message_id')) AS event_receipt_message_id,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) AS event_receipt_movement_id,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_url')) AS event_receipt_url,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.uploaded_at')) AS event_receipt_uploaded_at,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_processed_at')) AS event_receipt_processed_at,
    er.id AS event_reward_id,
    er.status AS event_reward_status,
    er.reward_type AS event_reward_type,
    er.reward_amount AS event_reward_amount,
    er.reward_description AS event_reward_description,
    er.paid_at AS event_reward_paid_at,
    er.discarded_at AS event_reward_discarded_at,
    er.discard_reason AS event_reward_discard_reason
    FROM manual_payment_movements m
    LEFT JOIN bank_accounts ba ON ba.id = m.bank_account_id
    LEFT JOIN bank_providers bp ON bp.id = ba.provider_id
    LEFT JOIN manual_payment_movements dup ON dup.id = m.duplicate_of_id
    LEFT JOIN users u ON u.id = m.processed_by_user_id
    LEFT JOIN messages msg ON msg.id = m.message_id
    LEFT JOIN receipt_logs rl ON rl.id = (
      SELECT id FROM receipt_logs
      WHERE movement_id = m.id OR message_id = m.message_id
      ORDER BY id DESC LIMIT 1
    )
    LEFT JOIN event_participants ep ON ep.client_id = m.client_id AND (
      JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) = CAST(m.id AS CHAR)
      OR (m.message_id IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_message_id')) = CAST(m.message_id AS CHAR))
      OR EXISTS (SELECT 1 FROM receipt_logs rl_ep WHERE rl_ep.movement_id = m.id AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_log_id')) NOT IN ('null','0','') AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_log_id')) IS NOT NULL AND rl_ep.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_log_id')) AS UNSIGNED))
    )
    LEFT JOIN events e ON e.id = ep.event_id
    LEFT JOIN event_rewards er ON er.id = (
      SELECT id
      FROM event_rewards
      WHERE event_id = ep.event_id
        AND client_id = ep.client_id
        AND source = e.type
      ORDER BY created_at DESC
      LIMIT 1
    )
    ${whereSql}`
}

function baseBankSelect(provider, table, whereSql) {
  const coelsaMatchExpr = provider === 'mercadopago'
    ? '(mpm.transaction_id = m.coelsa_id OR mpm.transaction_id = m.transaction_id)'
    : 'mpm.transaction_id = m.coelsa_id'
  const receiptIdMatchParts = [
    "JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) = CAST(m.id AS CHAR)",
    "OR (m.message_id IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_message_id')) = CAST(m.message_id AS CHAR))",
    "OR EXISTS (SELECT 1 FROM receipt_logs rl_ep WHERE rl_ep.movement_id = m.id AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_log_id')) NOT IN ('null','0','') AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_log_id')) IS NOT NULL AND rl_ep.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_log_id')) AS UNSIGNED))",
    `OR EXISTS (SELECT 1 FROM manual_payment_movements mpm WHERE JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) = CAST(mpm.id AS CHAR) AND mpm.transaction_id IS NOT NULL AND mpm.transaction_id != '' AND ${coelsaMatchExpr})`,
  ]

  return `SELECT
    m.id, '${provider}' AS provider, m.client_id, m.chat_id, m.message_id, m.bank_account_id,
    CONCAT(COALESCE(bp.name, '${provider}'), ' - ', COALESCE(ba.alias, JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.alias')), ba.id, '')) AS account_label,
    m.status, m.amount, m.cuit, m.receipt_date, m.receipt_time,
    ${provider === 'mercadopago' ? 'NULL' : 'm.cbu_cvu'} AS cbu_cvu,
    ${provider === 'mercadopago' ? 'NULL' : 'm.bank_status'} AS bank_status,
    m.coelsa_id,
    ${provider === 'mercadopago' ? 'm.transaction_id' : 'NULL'} AS transaction_id,
    ${provider === 'mercadopago' ? 'm.transaction_id_type' : 'NULL'} AS transaction_id_type,
    ${provider === 'mercadopago' ? 'm.mercadopago_id' : 'NULL'} AS mercadopago_id,
    ${provider === 'telepagos' ? 'm.description' : 'NULL'} AS description,
    ${provider === 'telepagos' ? 'm.account_holder' : 'NULL'} AS account_holder,
    NULL AS ai_extracted_text, NULL AS ai_status, 0 AS is_duplicate, NULL AS duplicate_of_id, ${provider === 'mercadopago' ? 'm.ai_model' : 'NULL'} AS ai_model, '' AS duplicate_summary,
    '' AS processed_by, NULL AS processed_at,
    m.game_platform_load_id, m.game_load_date, m.game_load_time, m.game_load_amount, m.sync_status,
    m.created_at, m.updated_at,
    msg.file_url AS receipt_url,
    rl.id AS receipt_log_id,
    rl.message_id AS receipt_log_message_id,
    rl.movement_id AS receipt_log_movement_id,
    ep.id AS event_participant_id,
    ep.event_id AS event_id,
    e.type AS event_type,
    e.title AS event_title,
    e.status AS event_status,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_status')) AS event_receipt_status,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_retryable')) AS event_receipt_retryable,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_pending')) AS event_receipt_pending,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_source')) AS event_receipt_source,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_processing_reason')) AS event_receipt_reason,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_chat_id')) AS event_receipt_chat_id,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_message_id')) AS event_receipt_message_id,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) AS event_receipt_movement_id,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_url')) AS event_receipt_url,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.uploaded_at')) AS event_receipt_uploaded_at,
    JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_processed_at')) AS event_receipt_processed_at,
    er.id AS event_reward_id,
    er.status AS event_reward_status,
    er.reward_type AS event_reward_type,
    er.reward_amount AS event_reward_amount,
    er.reward_description AS event_reward_description,
    er.paid_at AS event_reward_paid_at,
    er.discarded_at AS event_reward_discarded_at,
    er.discard_reason AS event_reward_discard_reason
    FROM ${table} m
    LEFT JOIN bank_accounts ba ON ba.id = m.bank_account_id
    LEFT JOIN bank_providers bp ON bp.id = ba.provider_id
    LEFT JOIN messages msg ON msg.id = m.message_id
    LEFT JOIN receipt_logs rl ON rl.id = (
      SELECT id FROM receipt_logs
      WHERE movement_id = m.id OR message_id = m.message_id
      ORDER BY id DESC LIMIT 1
    )
    LEFT JOIN event_participants ep ON ep.client_id = m.client_id AND (${receiptIdMatchParts.join('\n      ')})
    LEFT JOIN events e ON e.id = ep.event_id
    LEFT JOIN event_rewards er ON er.id = (
      SELECT id
      FROM event_rewards
      WHERE event_id = ep.event_id
        AND client_id = ep.client_id
        AND source = e.type
      ORDER BY created_at DESC
      LIMIT 1
    )
    ${whereSql}`
}

function buildProviderQuery(provider, filters) {
  const where = ['m.client_id = ?']
  const values = [filters.clientId]

  if (filters.accountId) {
    where.push('m.bank_account_id = ?')
    values.push(filters.accountId)
  }

  if (filters.search) {
    const like = `%${filters.search}%`
    const numeric = Number(filters.search.replace(',', '.'))
    const amountSearch = Number.isFinite(numeric) ? numeric : null
    const parts = ['m.status = ?']
    const searchValues = [filters.search]

    if (provider === 'manual') {
      parts.push('m.transaction_id LIKE ?')
      searchValues.push(like)
    } else {
      parts.push('m.coelsa_id LIKE ?')
      searchValues.push(like)
      if (provider === 'mercadopago') {
        parts.push('m.transaction_id LIKE ?', 'm.mercadopago_id LIKE ?')
        searchValues.push(like, like)
      }
    }

    if (amountSearch != null) {
      parts.push('m.amount = ?')
      searchValues.push(amountSearch)
    }

    where.push(`(${parts.join(' OR ')})`)
    values.push(...searchValues)
  }

  const whereSql = `WHERE ${where.join(' AND ')}`
  if (provider === 'manual') return { sql: baseManualSelect(whereSql), values }
  if (provider === 'hgcash') return { sql: baseBankSelect('hgcash', 'hgcash_movements', whereSql), values }
  if (provider === 'telepagos') return { sql: baseBankSelect('telepagos', 'telepagos_movements', whereSql), values }
  return { sql: baseBankSelect('mercadopago', 'mercadopago_movements', whereSql), values }
}

async function getChatContext(chatId) {
  const { rows, error } = await query(
    `SELECT ch.id, ch.client_id, ch.bot_last_button_id, bi.receipt_processing, bi.label AS process_label
     FROM chats ch
     LEFT JOIN bot_items bi ON bi.id = ch.bot_last_button_id
     WHERE ch.id = ?
     LIMIT 1`,
    [chatId]
  )
  if (error) throw error
  return rows?.[0] || null
}

async function getActiveAccount() {
  const { rows, error } = await query(
    `SELECT cpc.bank_account_id, bp.slug AS provider, ba.alias
     FROM chat_processing_config cpc
     LEFT JOIN bank_accounts ba ON ba.id = cpc.bank_account_id
     LEFT JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE cpc.id = 1
     LIMIT 1`
  )
  if (error) throw error
  return rows?.[0] || null
}

async function getClientAccounts(clientId) {
  const { rows, error } = await query(
    `SELECT DISTINCT ba.id, ba.alias, ba.account_data, bp.slug AS provider, bp.name AS provider_name
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE ba.is_active = 1
       AND (
        EXISTS (SELECT 1 FROM manual_payment_movements m WHERE m.client_id = ? AND m.bank_account_id = ba.id)
        OR EXISTS (SELECT 1 FROM hgcash_movements m WHERE m.client_id = ? AND m.bank_account_id = ba.id)
        OR EXISTS (SELECT 1 FROM telepagos_movements m WHERE m.client_id = ? AND m.bank_account_id = ba.id)
        OR EXISTS (SELECT 1 FROM mercadopago_movements m WHERE m.client_id = ? AND m.bank_account_id = ba.id)
       )
     ORDER BY provider_name ASC, ba.alias ASC`,
    [clientId, clientId, clientId, clientId]
  )
  if (error) throw error
  return (rows || []).map(serializeAccount)
}

export async function getChatMovements(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const chat = await getChatContext(chatId)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })

    const provider = normalizeProvider(req.query.provider)
    const selectedProviders = provider === 'all' ? PROVIDERS : [provider]
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1)
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || '12', 10) || 12))
    const offset = (page - 1) * limit
    const filters = {
      clientId: Number(chat.client_id),
      search: normalizeText(req.query.search),
      accountId: Number(req.query.accountId || 0) || null,
    }

    const parts = selectedProviders.map(item => buildProviderQuery(item, filters))
    const unionSql = parts.map(part => part.sql).join('\nUNION ALL\n')
    const values = parts.flatMap(part => part.values)

    const { rows: countRows, error: countError } = await query(
      `SELECT COUNT(*) AS total FROM (${unionSql}) movement_rows`,
      values
    )
    if (countError) return next(countError)

    const total = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const safeOffset = (safePage - 1) * limit

    const { rows, error } = await query(
      `SELECT * FROM (${unionSql}) movement_rows
       ORDER BY created_at DESC, id DESC
       LIMIT ${limit} OFFSET ${safeOffset}`,
      values
    )
    if (error) return next(error)

    const [activeAccount, accounts] = await Promise.all([
      getActiveAccount(),
      getClientAccounts(chat.client_id),
    ])

    res.json({
      movements: (rows || []).map(serializeMovement),
      accounts,
      currentProcessing: {
        mode: chat.receipt_processing || 'manual',
        lastButtonId: chat.bot_last_button_id || null,
        label: chat.process_label || '',
        activeProvider: activeAccount?.provider || 'manual',
        activeAccountId: activeAccount?.bank_account_id ? Number(activeAccount.bank_account_id) : null,
      },
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasMore: safePage < totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function updateManualMovementStatus(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const id = Number(req.params.id)
    const status = normalizeText(req.body?.status || '').toLowerCase()
    if (!MANUAL_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Estatus invalido', code: 'INVALID_STATUS' })
    }

    const chat = await getChatContext(chatId)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })

    const { rows: updateRows, error } = await query(
      `UPDATE manual_payment_movements
       SET status = ?, processed_by_user_id = ?, processed_at = CURRENT_TIMESTAMP, status_updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND chat_id = ? AND client_id = ?`,
      [status, req.user?.sub || null, id, chatId, chat.client_id]
    )
    if (error) return next(error)
    if (!updateRows?.affectedRows) {
      return res.status(404).json({ error: 'Movimiento no encontrado', code: 'MOVEMENT_NOT_FOUND' })
    }

    await updateReceiptLogForMovement(id, {
      resultStatus: status,
      resultReason: `manual_admin_set_${status}`,
      resultDetail: {
        action: status,
        processedByUserId: req.user?.sub || null,
      },
    })

    const filters = { clientId: Number(chat.client_id), search: '', accountId: null }
    const part = buildProviderQuery('manual', filters)
    const { rows, error: selectError } = await query(`${part.sql} AND m.id = ? LIMIT 1`, [...part.values, id])
    if (selectError) return next(selectError)

    res.json({ movement: rows?.[0] ? serializeMovement(rows[0]) : null })
  } catch (error) {
    next(error)
  }
}

export async function resolveManualMovement(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const id = Number(req.params.id)
    const action = normalizeText(req.body?.action || '').toLowerCase()

    if (!['paid', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Acción inválida', code: 'INVALID_ACTION' })
    }

    const chat = await getChatContext(chatId)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })
    const clientId = Number(chat.client_id)

    if (action === 'paid') {
      const newAmount = Number(req.body?.amount)
      if (!Number.isFinite(newAmount) || newAmount <= 0) {
        return res.status(400).json({ error: 'Monto inválido', code: 'INVALID_AMOUNT' })
      }

      const { rows: updateRows, error } = await query(
        `UPDATE manual_payment_movements
         SET status = 'paid', amount = ?, processed_by_user_id = ?, processed_at = CURRENT_TIMESTAMP, status_updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND chat_id = ? AND client_id = ?`,
        [newAmount, req.user?.sub || null, id, chatId, clientId]
      )
      if (error) return next(error)
      if (!updateRows?.affectedRows) {
        return res.status(404).json({ error: 'Movimiento no encontrado', code: 'MOVEMENT_NOT_FOUND' })
      }

      const receiptLogId = await updateReceiptLogForMovement(id, {
        resultStatus: 'paid',
        resultReason: 'manual_admin_paid',
        resultDetail: {
          action: 'paid',
          amount: newAmount,
          processedByUserId: req.user?.sub || null,
        },
      })

      const paidMsg = normalizeText(req.body?.message || '') || await getAutoMessage('deposit_completed', { clientId, amount: newAmount })
      if (paidMsg) {
        await persistMessage({
          chatId,
          senderType: 'system',
          content: paidMsg,
          extra: {
            depositEvent: 'deposit_completed',
            depositAmount: newAmount,
          },
        })
      }

      // Fire referral reward check asynchronously – don't block the response
      processReferralRewardForMovement({ sourceTable: 'manual_payment_movements', sourceMovementId: id, clientId, chatId, amount: newAmount }).catch(() => {})

      // Update event_participants if this movement is linked to an event receipt
      try {
        const { rows: movRows } = await query(
          'SELECT message_id FROM manual_payment_movements WHERE id = ? LIMIT 1',
          [id]
        )
        const movMessageId = movRows?.[0]?.message_id || null
        const { rows: epRows } = await query(
          `SELECT id, client_id, event_id FROM event_participants
           WHERE client_id = ?
             AND (
               JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.receipt_movement_id')) = CAST(? AS CHAR)
               OR (? IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.receipt_message_id')) = CAST(? AS CHAR))
           )
           ORDER BY created_at DESC, id DESC
           LIMIT 1`,
          [clientId, id, movMessageId, movMessageId]
        )
        const targetParticipant = epRows?.[0] || null
        const targetClientId = targetParticipant?.client_id || clientId
        const targetEventId = targetParticipant?.event_id ? Number(targetParticipant.event_id) : null

        // Check min_deposit_amount for the linked event before crediting
        let eventMinDeposit = 0
        if (targetEventId) {
          const { rows: evMinRows } = await query(
            'SELECT min_deposit_amount FROM events WHERE id = ? LIMIT 1',
            [targetEventId]
          )
          eventMinDeposit = Number(evMinRows?.[0]?.min_deposit_amount || 0)
        }
        const amountBelowMin = eventMinDeposit > 0 && newAmount < eventMinDeposit

        if (amountBelowMin && targetParticipant) {
          await query(
            `UPDATE event_participants
             SET payload_json = JSON_SET(COALESCE(payload_json, '{}'),
               '$.receipt_status', 'amount_low',
               '$.receipt_pending', 'true',
               '$.receipt_processed_at', ?)
             WHERE id = ?`,
            [new Date().toISOString(), targetParticipant.id]
          ).catch(() => {})
          io.to(`client:${targetClientId}`).emit('event:receipt_result', {
            eventId: targetEventId,
            clientId: Number(targetClientId),
            participantId: Number(targetParticipant.id),
            receiptStatus: 'amount_low',
            receiptRetryable: true,
            receiptPending: true,
            resultReason: `amount_below_event_min_${eventMinDeposit}`,
          })
        }

        let syncResult = null
        if (!amountBelowMin) {
          syncResult = await syncClientEventReceiptPaid({
            clientId: targetClientId,
            eventId: targetEventId,
            movementId: id,
            messageId: movMessageId,
            receiptLogId,
            chatId,
            creditPanelBalance,
            processedAt: new Date().toISOString(),
          }).catch((syncErr) => {
            console.error('[Movement] Error sincronizando evento pagado:', syncErr?.message || syncErr)
            return null
          })

          const rewardResult = syncResult?.rewardResult || syncResult?.reward_result || null
          if (rewardResult?.status === 'paid' && !rewardResult?.alreadyPaid) {
            io.to(`client:${targetClientId}`).emit('event:reward_paid', {
              rewardId: rewardResult.rewardId,
              eventId: Number(syncResult?.event_id || rewardResult.eventId || 0),
              clientId: Number(targetClientId),
              status: 'paid',
            })
          }

          if (targetParticipant) {
            io.to(`client:${targetClientId}`).emit('event:receipt_result', {
              eventId: null,
              clientId: Number(targetParticipant.client_id),
              participantId: Number(targetParticipant.id),
              receiptStatus: 'paid',
              receiptRetryable: false,
              receiptPending: false,
              resultReason: 'manual_admin_paid',
            })
          }
        }

        // Fallback: client played event but deposited via normal banking chat (no receipt linkage in payload_json).
        // Find any pending event reward for this client and pay it directly.
        if (!targetParticipant) {
          const { rows: fallbackRewardRows } = await query(
            `SELECT er.id, er.event_id, er.client_id, er.reward_type, er.reward_amount,
                    ep.id AS participant_id,
                    e.title AS event_title, e.type AS event_type,
                    e.min_deposit_amount AS min_deposit_amount
             FROM event_rewards er
             INNER JOIN event_participants ep ON ep.event_id = er.event_id AND ep.client_id = er.client_id
             LEFT JOIN events e ON e.id = er.event_id
             WHERE er.client_id = ?
               AND COALESCE(LOWER(er.status), '') IN ('pending', 'failed')
             ORDER BY er.created_at DESC, er.id DESC
             LIMIT 1`,
            [clientId]
          )
          const fallbackReward = fallbackRewardRows?.[0] || null
          const fbMinDeposit = Number(fallbackReward?.min_deposit_amount || 0)
          if (fallbackReward && String(fallbackReward.reward_type || '').toLowerCase() === 'fichas') {
            if (fbMinDeposit > 0 && newAmount < fbMinDeposit) {
              // Amount too low — mark participant retryable, do not credit reward
              await query(
                `UPDATE event_participants
                 SET payload_json = JSON_SET(COALESCE(payload_json, '{}'),
                   '$.receipt_status', 'amount_low',
                   '$.receipt_pending', 'true',
                   '$.receipt_processed_at', ?)
                 WHERE id = ?`,
                [new Date().toISOString(), fallbackReward.participant_id]
              ).catch(() => {})
              io.to(`client:${clientId}`).emit('event:receipt_result', {
                eventId: Number(fallbackReward.event_id),
                clientId: Number(clientId),
                participantId: Number(fallbackReward.participant_id),
                receiptStatus: 'amount_low',
                receiptRetryable: true,
                receiptPending: true,
                resultReason: `amount_below_event_min_${fbMinDeposit}`,
              })
            } else {
            console.log('[Movement] Fallback: direct event reward pay', { clientId, rewardId: fallbackReward.id, eventId: fallbackReward.event_id })
            const fbPanelResult = await creditPanelBalance({
              clientId: Number(clientId),
              amountArs: Number(fallbackReward.reward_amount || 0),
            }).catch(err => ({ ok: false, error: 'exception', message: err?.message }))

            if (fbPanelResult?.ok) {
              await query(
                `UPDATE event_rewards
                 SET status = 'paid', paid_at = CURRENT_TIMESTAMP, error_code = NULL, error_message = NULL, attempts = attempts + 1
                 WHERE id = ?`,
                [fallbackReward.id]
              )
              await query(
                `UPDATE event_participants
                 SET payload_json = JSON_SET(COALESCE(payload_json, '{}'),
                   '$.receipt_status', 'paid',
                   '$.receipt_pending', 'false',
                   '$.receipt_movement_id', CAST(? AS CHAR),
                   '$.receipt_processed_at', ?)
                 WHERE id = ?`,
                [id, new Date().toISOString(), fallbackReward.participant_id]
              )
              io.to(`client:${clientId}`).emit('event:reward_paid', {
                rewardId: Number(fallbackReward.id),
                eventId: Number(fallbackReward.event_id),
                clientId: Number(clientId),
                status: 'paid',
              })
              io.to(`client:${clientId}`).emit('event:receipt_result', {
                eventId: Number(fallbackReward.event_id),
                clientId: Number(clientId),
                participantId: Number(fallbackReward.participant_id),
                receiptStatus: 'paid',
                receiptRetryable: false,
                receiptPending: false,
                resultReason: 'manual_admin_paid',
              })
              const amountStr = new Intl.NumberFormat('es-AR', {
                style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
              }).format(Number(fallbackReward.reward_amount || 0))
              const eventName = fallbackReward.event_title || fallbackReward.event_type || `evento #${fallbackReward.event_id}`
              await persistMessage({
                chatId,
                senderType: 'system',
                content: `¡Tus fichas del evento "${eventName}" ya fueron acreditadas! Se te acreditaron ${amountStr} en fichas. ¡Buena suerte!`,
                extra: { eventRewardPaid: true, rewardId: Number(fallbackReward.id), eventId: Number(fallbackReward.event_id) },
              }).catch(() => {})
            } else {
              console.warn('[Movement] Fallback: panel credit failed for event reward', { rewardId: fallbackReward.id })
              await query(
                `UPDATE event_rewards SET status = 'pending', error_code = ?, error_message = ?, attempts = attempts + 1 WHERE id = ?`,
                [fbPanelResult?.error || 'PANEL_CREDIT_FAILED', fbPanelResult?.message || 'No se pudo acreditar el premio.', fallbackReward.id]
              ).catch(() => {})
            }
            } // end else (amount ok)
          }
        }
      } catch (epErr) {
        console.error('[Movement] Error actualizando event_participant al pagar:', epErr.message)
      }

      await new Promise(resolve => setTimeout(resolve, 250))
      await resetClientBot(chatId)
    } else {
      const { rows: updateRows, error } = await query(
        `UPDATE manual_payment_movements
         SET status = 'rejected', processed_by_user_id = ?, processed_at = CURRENT_TIMESTAMP, status_updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND chat_id = ? AND client_id = ?`,
        [req.user?.sub || null, id, chatId, clientId]
      )
      if (error) return next(error)
      if (!updateRows?.affectedRows) {
        return res.status(404).json({ error: 'Movimiento no encontrado', code: 'MOVEMENT_NOT_FOUND' })
      }

      await updateReceiptLogForMovement(id, {
        resultStatus: 'rejected',
        resultReason: 'manual_admin_rejected',
        resultDetail: {
          action: 'rejected',
          message: normalizeText(req.body?.message || '') || null,
          processedByUserId: req.user?.sub || null,
        },
      })

      const rejectMsg = normalizeText(req.body?.message || '') || await getAutoMessage('deposit_failed', { clientId })
      if (rejectMsg) await persistMessage({ chatId, senderType: 'system', content: rejectMsg })
    }

    const filters = { clientId, search: '', accountId: null }
    const part = buildProviderQuery('manual', filters)
    const { rows, error: selectError } = await query(`${part.sql} AND m.id = ? LIMIT 1`, [...part.values, id])
    if (selectError) return next(selectError)

    res.json({ movement: rows?.[0] ? serializeMovement(rows[0]) : null })
  } catch (error) {
    next(error)
  }
}
