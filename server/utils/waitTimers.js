// In-memory map of chatId → timeoutId for waiting-reply timers
const timers = new Map()

export function scheduleWaitReply(chatId, fn, delayMs = 60_000) {
  cancelWaitReply(chatId)
  const id = setTimeout(() => {
    timers.delete(chatId)
    fn()
  }, delayMs)
  timers.set(chatId, id)
}

export function cancelWaitReply(chatId) {
  const id = timers.get(chatId)
  if (id !== undefined) {
    clearTimeout(id)
    timers.delete(chatId)
  }
}
