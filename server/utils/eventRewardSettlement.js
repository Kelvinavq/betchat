import { query } from '../config/database.js'
import { persistMessage } from '../controllers/chatController.js'

function parseJsonSafe(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

export async function settleEventRewardPaid({
  clientId,
  eventId,
  eventType = null,
  username = '',
  chatId = null,
  creditPanelBalance,
  processedAt = new Date().toISOString(),
}) {
  if (!clientId) {
    return { status: 'skipped', reason: 'invalid_input' }
  }

  if (typeof creditPanelBalance !== 'function') {
    return { status: 'skipped', reason: 'credit_function_missing' }
  }

  const rewardWhere = ['event_id = ?', 'client_id = ?']
  const rewardParams = [Number(eventId), Number(clientId)]
  if (eventType) {
    rewardWhere.push('source = ?')
    rewardParams.push(String(eventType))
  }
  const { rows, error } = await query(
    `SELECT id, status, reward_type, reward_amount, reward_description
       FROM event_rewards
      WHERE ${rewardWhere.join(' AND ')}
      ORDER BY created_at DESC, id DESC
      LIMIT 1`,
    rewardParams,
  )
  if (error) throw error

  const reward = rows?.[0] || null
  let rewardRow = reward
  let rewardUsername = String(username || '').trim()
  if (!rewardUsername) {
    const { rows: clientRows } = await query(
      `SELECT username FROM clients WHERE id = ? LIMIT 1`,
      [Number(clientId)],
    )
    rewardUsername = String(clientRows?.[0]?.username || '').trim()
  }

  if (!rewardRow) {
    const { rows: fallbackRows, error: fallbackError } = await query(
      `SELECT id, status, reward_type, reward_amount, reward_description, event_id, source
         FROM event_rewards
        WHERE client_id = ?
          AND COALESCE(LOWER(status), '') IN ('pending', 'failed')
          AND COALESCE(LOWER(source), '') = 'sorteo'
        ORDER BY created_at DESC, id DESC
        LIMIT 1`,
      [Number(clientId)],
    )
    if (fallbackError) throw fallbackError
    rewardRow = fallbackRows?.[0] || null
    if (rewardRow && !eventId) {
      eventId = Number(rewardRow.event_id || eventId)
    }
  }

  if (!rewardRow) {
    const { rows: eventRows, error: eventError } = await query(
      `SELECT id, title, description, prize_type, prize_amount
         FROM events
        WHERE id = ?
        LIMIT 1`,
      [Number(eventId)],
    )
    if (eventError) throw eventError
    const event = eventRows?.[0] || null
    if (!event || Number(event.prize_amount || 0) <= 0) {
      return { status: 'skipped', reason: 'reward_not_found' }
    }

    const resolvedEventType = String(eventType || event.prize_type || 'sorteo').trim() || 'sorteo'
    const rewardType = String(event.prize_type || 'fichas').trim() || 'fichas'
    const rewardAmount = Number(event.prize_amount || 0)
    const rewardDescription = String(event.description || event.title || 'Premio del evento').trim()
    const { rows: insertRows, error: insertError } = await query(
      `INSERT INTO event_rewards
         (event_id, event_type, client_id, username, reward_type, reward_amount, reward_description, source, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        Number(eventId),
        resolvedEventType,
        Number(clientId),
        rewardUsername,
        rewardType,
        rewardAmount,
        rewardDescription,
        resolvedEventType,
      ],
    )
    if (insertError) throw insertError

    // Fetch the actual inserted row — avoids relying on insertId which can be 0
    // when the PK is assigned by a DB trigger instead of native AUTO_INCREMENT.
    const { rows: insertedRows } = await query(
      `SELECT id, status, reward_type, reward_amount, reward_description
         FROM event_rewards
        WHERE client_id = ? AND event_id = ? AND source = ?
        ORDER BY id DESC LIMIT 1`,
      [Number(clientId), Number(eventId), resolvedEventType],
    )
    rewardRow = insertedRows?.[0] || {
      id: Number(insertRows?.insertId) || null,
      status: 'pending',
      reward_type: rewardType,
      reward_amount: rewardAmount,
      reward_description: rewardDescription,
    }
    console.log('[EventReward] INSERT reward:', { rewardId: rewardRow.id, clientId, eventId, resolvedEventType })
  }

  if (!rewardRow.id) {
    console.error('[EventReward] settleEventRewardPaid — rewardRow.id is null after INSERT/SELECT, cannot update', { clientId, eventId })
    return { status: 'failed', reason: 'reward_id_missing' }
  }

  const currentStatus = String(rewardRow.status || '').toLowerCase()
  if (currentStatus === 'paid') {
    return { status: 'paid', rewardId: Number(rewardRow.id), alreadyPaid: true }
  }

  if (String(rewardRow.reward_type || '').toLowerCase() !== 'fichas') {
    return { status: 'skipped', reason: 'unsupported_reward_type', rewardId: Number(rewardRow.id) }
  }

  const amount = Number(rewardRow.reward_amount || 0)
  let effectiveAmount = Number.isFinite(amount) ? amount : 0
  if (effectiveAmount <= 0) {
    const { rows: eventRows, error: eventError } = await query(
      `SELECT prize_amount
         FROM events
        WHERE id = ?
        LIMIT 1`,
      [Number(eventId)],
    )
    if (eventError) throw eventError
    const eventAmount = Number(eventRows?.[0]?.prize_amount || 0)
    if (eventAmount > 0) {
      effectiveAmount = eventAmount
      await query(
        `UPDATE event_rewards
            SET reward_amount = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        [effectiveAmount, rewardRow.id],
      ).catch(() => {})
    }
  }

  if (!Number.isFinite(effectiveAmount) || effectiveAmount <= 0) {
    return { status: 'skipped', reason: 'invalid_reward_amount', rewardId: Number(rewardRow.id) }
  }

  console.log('[EventReward] calling creditPanelBalance:', { rewardId: rewardRow.id, clientId, amount: effectiveAmount })

  const panelResult = await creditPanelBalance({ clientId: Number(clientId), amountArs: effectiveAmount }).catch((panelErr) => ({
    ok: false,
    error: 'exception',
    message: panelErr?.message || 'error desconocido',
  }))

  console.log('[EventReward] panelResult:', { rewardId: rewardRow.id, ok: panelResult?.ok, mocked: panelResult?.mocked, error: panelResult?.error })

  if (!panelResult?.ok) {
    const { error: failUpdateErr } = await query(
      `UPDATE event_rewards
          SET status = 'pending',
              error_code = ?,
              error_message = ?,
              attempts = attempts + 1,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [
        panelResult?.error || 'PANEL_CREDIT_FAILED',
        panelResult?.message || 'No se pudo acreditar el premio automáticamente.',
        rewardRow.id,
      ],
    )
    if (failUpdateErr) console.error('[EventReward] Error updating reward to failed:', failUpdateErr?.message, { rewardId: rewardRow.id })
    return {
      status: 'failed',
      rewardId: Number(rewardRow.id),
    amount: effectiveAmount,
    panel: panelResult,
  }
}

  const { error: paidUpdateErr } = await query(
    `UPDATE event_rewards
        SET status = 'paid',
            paid_at = CURRENT_TIMESTAMP,
            error_code = NULL,
            error_message = NULL,
            attempts = attempts + 1,
            updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    [rewardRow.id],
  )
  if (paidUpdateErr) {
    console.error('[EventReward] Error updating reward to paid:', paidUpdateErr?.message, { rewardId: rewardRow.id })
    return { status: 'failed', reason: 'db_update_error', rewardId: Number(rewardRow.id) }
  }
  console.log('[EventReward] reward updated to paid:', { rewardId: rewardRow.id })

  const amountStr = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(effectiveAmount)
  if (chatId) {
    const { rows: eventTitleRows } = await query(
      `SELECT title FROM events WHERE id = ? LIMIT 1`,
      [Number(eventId)],
    )
    const eventName = String(eventTitleRows?.[0]?.title || rewardRow.reward_description || '').trim() || `evento #${eventId}`
    await persistMessage({
      chatId: Number(chatId),
      senderType: 'system',
      content: `¡Te acreditamos ${amountStr} en fichas por el evento "${eventName}"! ¡Buena suerte!`,
      extra: {
        eventRewardPaid: true,
        rewardId: Number(rewardRow.id),
        eventId: Number(eventId),
        depositEvent: 'fichas_credited',
        depositAmount: effectiveAmount,
      },
    }).catch(() => {})
  }

  return {
    status: 'paid',
    rewardId: Number(rewardRow.id),
    eventId: Number(eventId || rewardRow.event_id || 0),
    amount: effectiveAmount,
    panel: panelResult,
    processedAt,
  }
}
