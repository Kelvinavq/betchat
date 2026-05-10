import { runScheduledCampaigns } from '../controllers/pushController.js'

let _timer   = null
let _running = false

async function tick() {
  if (_running) return
  _running = true
  try {
    await runScheduledCampaigns()
  } catch (err) {
    console.error('[PushScheduler] Error:', err.message)
  } finally {
    _running = false
  }
}

export function startPushScheduler(intervalMinutes = 15) {
  if (_timer) return
  const ms = Math.max(1, intervalMinutes) * 60 * 1000
  tick() // run immediately on start
  _timer = setInterval(tick, ms)
  console.log(`[PushScheduler] Started — interval ${intervalMinutes}m`)
}

export function stopPushScheduler() {
  if (_timer) {
    clearInterval(_timer)
    _timer = null
    console.log('[PushScheduler] Stopped')
  }
}
