import { query } from '../config/database.js'
import { getAutoMessage } from './autoMessagesController.js'
import { persistMessage, resetClientBot } from './chatController.js'

function sanitizeWithdrawal(row) {
  if (!row) return null
  return {
    id:                Number(row.id),
    chatId:            Number(row.chat_id),
    clientId:          Number(row.client_id),
    formId:            row.form_id || null,
    messageId:         row.message_id ? Number(row.message_id) : null,
    status:            row.status,
    formData:          row.form_data || '',
    rejectionMessage:  row.rejection_message || null,
    processedBy:       row.processed_by || null,
    processedAt:       row.processed_at || null,
    createdAt:         row.created_at || null,
    updatedAt:         row.updated_at || null,
  }
}

export async function listWithdrawals(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    if (!chatId) return res.status(400).json({ error: 'Chat inválido' })

    const { rows, error } = await query(
      `SELECT id, chat_id, client_id, form_id, message_id, status, form_data,
              rejection_message, processed_by, processed_at, created_at, updated_at
       FROM withdrawal_requests
       WHERE chat_id = ?
       ORDER BY created_at DESC`,
      [chatId]
    )
    if (error) throw error

    res.json({ withdrawals: (rows || []).map(sanitizeWithdrawal) })
  } catch (error) {
    next(error)
  }
}

export async function resolveWithdrawal(req, res, next) {
  try {
    const id = Number(req.params.id)
    const { action, message } = req.body || {}
    if (!id || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Datos inválidos' })
    }

    const { rows: wrRows, error: wrErr } = await query(
      'SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1',
      [id]
    )
    if (wrErr) throw wrErr
    const wr = wrRows?.[0]
    if (!wr) return res.status(404).json({ error: 'Solicitud no encontrada' })

    const chatId = Number(wr.chat_id)
    const processedBy = req.user?.username || 'Admin'

    const { error: updErr } = await query(
      `UPDATE withdrawal_requests
       SET status = ?, rejection_message = ?, processed_by = ?, processed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [action, action === 'rejected' ? (message?.trim() || null) : null, processedBy, id]
    )
    if (updErr) throw updErr

    if (action === 'approved') {
      const autoMsg = await getAutoMessage('withdrawal_approved')
      if (autoMsg) {
        await persistMessage({ chatId, senderType: 'system', content: autoMsg, messageType: 'text' })
      }
      await resetClientBot(chatId)
    } else {
      const msgContent = message?.trim()
      if (msgContent) {
        await persistMessage({ chatId, senderType: 'system', content: msgContent, messageType: 'text' })
      } else {
        const autoMsg = await getAutoMessage('withdrawal_rejected')
        if (autoMsg) {
          await persistMessage({ chatId, senderType: 'system', content: autoMsg, messageType: 'text' })
        }
      }
    }

    const { rows: updated } = await query(
      'SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1',
      [id]
    )
    res.json({ withdrawal: sanitizeWithdrawal(updated?.[0] || wr) })
  } catch (error) {
    next(error)
  }
}

export async function setWithdrawalPending(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const { error: updErr } = await query(
      `UPDATE withdrawal_requests
       SET status = 'pending', rejection_message = NULL, processed_by = NULL, processed_at = NULL, updated_at = NOW()
       WHERE id = ?`,
      [id]
    )
    if (updErr) throw updErr

    const { rows: updated } = await query(
      'SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1',
      [id]
    )
    if (!updated?.length) return res.status(404).json({ error: 'Solicitud no encontrada' })
    res.json({ withdrawal: sanitizeWithdrawal(updated[0]) })
  } catch (error) {
    next(error)
  }
}
