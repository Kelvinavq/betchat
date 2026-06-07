import { query } from '../config/database.js'
import { settleEventRewardPaid } from './eventRewardSettlement.js'
import { getAutoMessage } from '../controllers/autoMessagesController.js'
import { persistMessage } from '../controllers/chatController.js'

// These event types gate participation behind receipt payment but determine the
// winner at event end — receipt approval must NOT trigger immediate prize credit.
const DEFERRED_REWARD_TYPES = new Set(['briefcase', 'treasure_chest'])

function parseJsonSafe(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

export async function findClientEventParticipant({
  clientId,
  eventId = null,
  eventType = null,
  messageId = null,
  movementId = null,
  receiptLogId = null,
}) {
  if (!clientId) return null

  const where = ['ep.client_id = ?']
  const params = []
  const refClauses = []

  if (eventType) {
    params.push(eventType)
  }

  params.push(clientId)

  if (eventId != null) {
    where.push('ep.event_id = ?')
    params.push(eventId)
  }

  if (messageId != null) {
    refClauses.push("JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_message_id')) = CAST(? AS CHAR)")
    params.push(messageId)
  }

  if (movementId != null) {
    refClauses.push("JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) = CAST(? AS CHAR)")
    params.push(movementId)
  }

  if (receiptLogId != null) {
    refClauses.push("JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_log_id')) = CAST(? AS CHAR)")
    params.push(receiptLogId)
  }

  if (refClauses.length > 0) {
    where.push(`(${refClauses.join(' OR ')})`)
  }

  const rewardJoin = eventType
    ? `LEFT JOIN event_rewards er ON er.id = (
         SELECT id
         FROM event_rewards
         WHERE event_id = ep.event_id
           AND client_id = ep.client_id
           AND source = ?
         ORDER BY created_at DESC
         LIMIT 1
       )`
    : `LEFT JOIN event_rewards er ON er.id = (
         SELECT id
         FROM event_rewards
         WHERE event_id = ep.event_id
           AND client_id = ep.client_id
         ORDER BY created_at DESC
         LIMIT 1
       )`

  const orderBy = refClauses.length > 0
    ? 'ORDER BY ep.created_at DESC, ep.id DESC'
    : "ORDER BY CASE WHEN COALESCE(LOWER(JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_status'))), '') = 'paid' THEN 1 ELSE 0 END DESC, ep.created_at DESC, ep.id DESC"

  const { rows, error } = await query(
    `SELECT
       ep.id,
       ep.event_id,
       ep.client_id,
       ep.username,
       ep.payload_json,
       er.status AS reward_status
     FROM event_participants ep
     ${rewardJoin}
     WHERE ${where.join(' AND ')}
     ${orderBy}
     LIMIT 1`,
    params
  )

  if (error) throw error
  return rows?.[0] || null
}

export async function hasClientEventPaidParticipation({
  clientId,
  eventId = null,
  eventType = null,
}) {
  if (!clientId || eventId == null) return false

  const where = ['ep.client_id = ?', 'ep.event_id = ?']
  const params = [clientId, eventId]

  const rewardExists = eventType
    ? `EXISTS (
         SELECT 1
         FROM event_rewards er
         WHERE er.event_id = ep.event_id
           AND er.client_id = ep.client_id
           AND er.source = ?
           AND COALESCE(LOWER(er.status), '') = 'paid'
       )`
    : `EXISTS (
         SELECT 1
         FROM event_rewards er
         WHERE er.event_id = ep.event_id
           AND er.client_id = ep.client_id
           AND COALESCE(LOWER(er.status), '') = 'paid'
       )`

  const receiptLogExists = `EXISTS (
      SELECT 1
      FROM receipt_logs rl
      WHERE rl.client_id = ep.client_id
        AND COALESCE(LOWER(rl.result_status), '') = 'paid'
        AND (
          (
            JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_log_id')) NOT IN ('', 'null', '0')
            AND rl.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_log_id')) AS UNSIGNED)
          )
          OR (
            JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) NOT IN ('', 'null', '0')
            AND rl.movement_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) AS UNSIGNED)
          )
          OR (
            JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_message_id')) NOT IN ('', 'null', '0')
            AND rl.message_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_message_id')) AS UNSIGNED)
          )
        )
    )`

  const movementExists = `EXISTS (
      SELECT 1
      FROM manual_payment_movements mpm
      WHERE mpm.client_id = ep.client_id
        AND COALESCE(LOWER(mpm.status), '') = 'paid'
        AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) = CAST(mpm.id AS CHAR)
    )`

  if (eventType) {
    params.push(eventType)
  }

  const { rows, error } = await query(
    `SELECT 1
       FROM event_participants ep
      WHERE ${where.join(' AND ')}
        AND (
          COALESCE(LOWER(JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_status'))), '') = 'paid'
          OR ${rewardExists}
          OR ${receiptLogExists}
          OR ${movementExists}
        )
      LIMIT 1`,
    params
  )

  if (error) throw error
  return Boolean(rows?.length)
}

export async function syncClientEventReceiptPaid({
  clientId,
  eventId = null,
  eventType = null,
  messageId = null,
  movementId = null,
  receiptLogId = null,
  chatId = null,
  creditPanelBalance = null,
  processedAt = new Date().toISOString(),
  paymentAmount = null,
}) {
  let participant = await findClientEventParticipant({
    clientId,
    eventId,
    eventType,
    messageId,
    movementId,
    receiptLogId,
  })

  // Fallback: if reference-based lookup fails but we have eventId, search by clientId+eventId alone.
  // This handles cases where receipt_movement_id / receipt_message_id in the payload don't match
  // the movement being resolved (e.g. admin manually resolving a different movement record).
  if (!participant && eventId != null) {
    participant = await findClientEventParticipant({ clientId, eventId, eventType })
  }

  if (!participant) {
    console.warn('[EventParticipant] syncClientEventReceiptPaid — participant not found', { clientId, eventId, messageId, movementId, receiptLogId })
    return null
  }

  const { rows: eventRows } = await query(
    'SELECT type, title, min_deposit_amount FROM events WHERE id = ? LIMIT 1',
    [participant.event_id]
  ).catch(() => ({ rows: [] }))

  // Enforce event min_deposit_amount before crediting the reward.
  // paymentAmount must be provided (non-null) to trigger this check — callers that
  // don't know the amount (e.g. admin manual override) omit it to bypass.
  const eventMinDeposit = Number(eventRows?.[0]?.min_deposit_amount || 0)
  const numPaymentAmount = Number(paymentAmount || 0)
  if (paymentAmount != null && numPaymentAmount > 0 && eventMinDeposit > 0 && numPaymentAmount < eventMinDeposit) {
    const amountLowPayload = {
      ...parseJsonSafe(participant.payload_json),
      receipt_status: 'amount_low',
      receipt_pending: true,
      receipt_retryable: true,
      receipt_processed_at: processedAt,
    }
    await query(
      `UPDATE event_participants SET payload_json = ? WHERE event_id = ? AND client_id = ?`,
      [JSON.stringify(amountLowPayload), participant.event_id, participant.client_id]
    ).catch(() => {})
    console.warn('[EventParticipant] syncClientEventReceiptPaid — amount_low, reward not credited', {
      clientId, eventId: participant.event_id, numPaymentAmount, eventMinDeposit,
    })
    return {
      ...participant,
      payload_json: amountLowPayload,
      event_id: participant.event_id,
      eventId: participant.event_id,
      event_type: eventRows?.[0]?.type || null,
      eventType: eventRows?.[0]?.type || null,
      receiptStatus: 'amount_low',
      amountLow: true,
      reward_result: null,
      rewardResult: null,
    }
  }

  const payload = parseJsonSafe(participant.payload_json)
  const nextPayload = {
    ...payload,
    receipt_status: 'paid',
    receipt_pending: false,
    receipt_retryable: false,
    receipt_processed_at: processedAt,
  }

  await query(
    `UPDATE event_participants
        SET payload_json = ?
      WHERE event_id = ? AND client_id = ?`,
    [JSON.stringify(nextPayload), participant.event_id, participant.client_id]
  )

  const resolvedEventType = String(eventRows?.[0]?.type || participant.event_type || eventType || '').toLowerCase()

  let rewardResult = null
  if (typeof creditPanelBalance === 'function' && !DEFERRED_REWARD_TYPES.has(resolvedEventType)) {
    rewardResult = await settleEventRewardPaid({
      clientId,
      eventId: participant.event_id,
      eventType: resolvedEventType || null,
      username: participant.username || '',
      chatId,
      creditPanelBalance,
      processedAt,
    }).catch((rewardErr) => ({
      status: 'failed',
      reason: 'settlement_error',
      error: rewardErr?.message || 'Error acreditando premio del evento.',
    }))
  } else if (DEFERRED_REWARD_TYPES.has(resolvedEventType)) {
    console.log('[EventParticipant] syncClientEventReceiptPaid — skipping reward settlement for deferred type', { resolvedEventType, clientId, eventId: participant.event_id })
    rewardResult = { status: 'skipped', reason: 'deferred_reward_type' }

    // Send automatic "go vote" message — resolve chat if not provided by caller
    try {
      let resolvedChatId = chatId
      if (!resolvedChatId) {
        const { rows: chatRows } = await query(
          'SELECT id FROM chats WHERE client_id = ? AND is_archived = 0 ORDER BY id DESC LIMIT 1',
          [clientId]
        )
        resolvedChatId = chatRows?.[0]?.id ? Number(chatRows[0].id) : null
      }
      if (resolvedChatId) {
        const eventTitle = eventRows?.[0]?.title || resolvedEventType
        const voteMsg = await getAutoMessage('event_vote_prompt', {
          vars: { evento: eventTitle, nombre: participant.username || `Cliente #${clientId}` },
        })
        if (voteMsg) {
          await persistMessage({
            chatId: Number(resolvedChatId),
            senderType: 'system',
            content: voteMsg,
            extra: { eventVotePrompt: true, eventId: Number(participant.event_id) },
          })
        }
      }
    } catch (msgErr) {
      console.error('[EventParticipant] syncClientEventReceiptPaid — error enviando prompt de voto:', msgErr?.message)
    }
  }

  return {
    ...participant,
    payload_json: nextPayload,
    event_id: participant.event_id,
    eventId: participant.event_id,
    event_type: resolvedEventType || null,
    eventType: resolvedEventType || null,
    reward_result: rewardResult,
    rewardResult,
  }
}
