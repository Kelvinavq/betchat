import { query } from '../config/database.js'
import { io } from '../app.js'

async function tick() {
  try {
    // Auto-activate scheduled events whose starts_at has arrived
    const { rows: toActivate } = await query(
      `SELECT id, type, title, prize_type, prize_amount, min_deposit_amount,
              duration_minutes, starts_at, ends_at, config_json
       FROM events
       WHERE status = 'scheduled' AND starts_at IS NOT NULL AND starts_at <= NOW()`
    )
    for (const ev of (toActivate || [])) {
      await query(`UPDATE events SET status = 'active' WHERE id = ?`, [ev.id])
      io?.emit('event:new', { event: { ...ev, status: 'active' } })
      console.log(`[EventScheduler] Auto-activated event ${ev.id}: "${ev.title}"`)
    }

    // Auto-finish active events whose ends_at has passed
    const { rows: toFinish } = await query(
      `SELECT id, title FROM events
       WHERE status = 'active'
         AND (
           (ends_at IS NOT NULL AND ends_at <= NOW())
           OR (
             ends_at IS NULL
             AND duration_minutes IS NOT NULL
             AND DATE_ADD(COALESCE(starts_at, created_at), INTERVAL duration_minutes MINUTE) <= NOW()
           )
         )`
    )
    for (const ev of (toFinish || [])) {
      await query(`UPDATE events SET status = 'finished' WHERE id = ?`, [ev.id])
      io?.emit('event:finished', { eventId: ev.id, status: 'finished' })
      console.log(`[EventScheduler] Auto-finished event ${ev.id}: "${ev.title}"`)
    }
  } catch (err) {
    console.error('[EventScheduler] tick error:', err.message)
  }
}

let _interval = null

export function startEventScheduler() {
  if (_interval) return
  tick()
  _interval = setInterval(tick, 60_000)
  console.log('[EventScheduler] started (60s interval)')
}

export function stopEventScheduler() {
  if (_interval) { clearInterval(_interval); _interval = null }
}
