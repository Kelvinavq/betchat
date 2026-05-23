/**
 * In-memory store for active broadcast notifications from FlowHG Support.
 * Survives server restarts only until the process restarts — on reconnect
 * BetChat admins will receive whatever is still in memory.
 */

/** @type {Map<number, object>} */
const active = new Map()

function addBroadcast(notif) {
  const msUntilExpiry = new Date(notif.expires_at).getTime() - Date.now()
  if (msUntilExpiry <= 0) return

  active.set(notif.id, { ...notif })

  setTimeout(() => {
    active.delete(notif.id)
  }, msUntilExpiry + 500)
}

function cancelBroadcast(id) {
  active.delete(Number(id))
}

function getActiveBroadcasts() {
  const now = Date.now()
  const result = []
  for (const [id, notif] of active.entries()) {
    if (new Date(notif.expires_at).getTime() > now) {
      result.push(notif)
    } else {
      active.delete(id)
    }
  }
  return result
}

export { addBroadcast, cancelBroadcast, getActiveBroadcasts }
