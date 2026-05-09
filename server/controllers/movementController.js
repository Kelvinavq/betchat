import { query } from '../config/database.js'
import { persistMessage, resetClientBot } from './chatController.js'
import { getAutoMessage } from './autoMessagesController.js'

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
    aiStatus: row.ai_status || '',
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
    IF(dup.id IS NULL, '', CONCAT('#', dup.id, ' - ', COALESCE(dup.transaction_id, 'sin transaction id'), ' - $', dup.amount)) AS duplicate_summary,
    COALESCE(u.full_name, u.username, '') AS processed_by, m.processed_at,
    NULL AS game_platform_load_id, NULL AS game_load_date, NULL AS game_load_time, NULL AS game_load_amount, NULL AS sync_status,
    m.created_at, m.updated_at,
    msg.file_url AS receipt_url
    FROM manual_payment_movements m
    LEFT JOIN bank_accounts ba ON ba.id = m.bank_account_id
    LEFT JOIN bank_providers bp ON bp.id = ba.provider_id
    LEFT JOIN manual_payment_movements dup ON dup.id = m.duplicate_of_id
    LEFT JOIN users u ON u.id = m.processed_by_user_id
    LEFT JOIN messages msg ON msg.id = m.message_id
    ${whereSql}`
}

function baseBankSelect(provider, table, whereSql) {
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
    NULL AS ai_extracted_text, NULL AS ai_status, 0 AS is_duplicate, NULL AS duplicate_of_id, '' AS duplicate_summary,
    '' AS processed_by, NULL AS processed_at,
    m.game_platform_load_id, m.game_load_date, m.game_load_time, m.game_load_amount, m.sync_status,
    m.created_at, m.updated_at,
    NULL AS receipt_url
    FROM ${table} m
    LEFT JOIN bank_accounts ba ON ba.id = m.bank_account_id
    LEFT JOIN bank_providers bp ON bp.id = ba.provider_id
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

      await resetClientBot(chatId)

      const paidMsg = normalizeText(req.body?.message || '') || await getAutoMessage('deposit_completed')
      if (paidMsg) await persistMessage({ chatId, senderType: 'system', content: paidMsg })
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

      const rejectMsg = normalizeText(req.body?.message || '') || await getAutoMessage('deposit_failed')
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
