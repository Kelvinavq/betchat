import { query } from '../config/database.js'

export async function insertReceiptLog({ provider, messageId, chatId, clientId }) {
  const { rows, error } = await query(
    'INSERT INTO receipt_logs (provider, message_id, chat_id, client_id) VALUES (?, ?, ?, ?)',
    [provider, messageId || null, chatId || null, clientId || null],
  )
  if (error) throw error
  return rows?.insertId || null
}

export async function finalizeReceiptLog(logId, {
  movementId = null,
  aiModel = null,
  aiRawResponse = null,
  aiExtractedJson = null,
  processingSteps = [],
  resultStatus = null,
  resultReason = null,
  resultDetail = null,
} = {}) {
  if (!logId) return
  const { error } = await query(
    `UPDATE receipt_logs
     SET movement_id = ?, ai_model = ?, ai_raw_response = ?,
         ai_extracted_json = ?, processing_steps = ?,
         result_status = ?, result_reason = ?, result_detail = ?
     WHERE id = ?`,
    [
      movementId || null,
      aiModel || null,
      aiRawResponse || null,
      aiExtractedJson !== null ? JSON.stringify(aiExtractedJson) : null,
      processingSteps.length ? JSON.stringify(processingSteps) : null,
      resultStatus || null,
      resultReason || null,
      resultDetail !== null ? JSON.stringify(resultDetail) : null,
      logId,
    ],
  )
  if (error) console.error('[ReceiptLog] Error finalizando log:', error)
}

function parseJsonSafe(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try { return JSON.parse(value) } catch { return null }
}

function serializeLog(row) {
  return {
    id: Number(row.id),
    messageId: row.message_id ? Number(row.message_id) : null,
    chatId: row.chat_id ? Number(row.chat_id) : null,
    clientId: row.client_id ? Number(row.client_id) : null,
    provider: row.provider,
    movementId: row.movement_id ? Number(row.movement_id) : null,
    aiModel: row.ai_model || null,
    aiRawResponse: row.ai_raw_response || null,
    aiExtractedJson: parseJsonSafe(row.ai_extracted_json),
    processingSteps: parseJsonSafe(row.processing_steps) || [],
    resultStatus: row.result_status || null,
    resultReason: row.result_reason || null,
    resultDetail: parseJsonSafe(row.result_detail),
    createdAt: row.created_at || null,
  }
}

export async function getReceiptLogByMessage(req, res, next) {
  try {
    const messageId = Number(req.params.messageId)
    if (!messageId) return res.status(400).json({ error: 'messageId inválido' })

    const { rows, error } = await query(
      'SELECT * FROM receipt_logs WHERE message_id = ? ORDER BY id DESC LIMIT 1',
      [messageId],
    )
    if (error) return next(error)
    if (!rows?.length) return res.status(404).json({ error: 'Log no encontrado' })

    res.json({ log: serializeLog(rows[0]) })
  } catch (error) {
    next(error)
  }
}

export async function getChatReceiptLogs(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)))
    const offset = Math.max(0, Number(req.query.offset || 0))

    const [{ rows, error }, { rows: countRows }] = await Promise.all([
      query(
        'SELECT * FROM receipt_logs WHERE chat_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
        [chatId, limit, offset],
      ),
      query('SELECT COUNT(*) AS total FROM receipt_logs WHERE chat_id = ?', [chatId]),
    ])

    if (error) return next(error)

    res.json({
      logs: (rows || []).map(serializeLog),
      total: Number(countRows?.[0]?.total || 0),
    })
  } catch (error) {
    next(error)
  }
}
