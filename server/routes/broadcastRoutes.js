import express from 'express'
import { getIo } from '../socket/socketServer.js'
import { addBroadcast, cancelBroadcast, getActiveBroadcasts } from '../broadcast/broadcastManager.js'

const router = express.Router()

// Receive a new broadcast from FlowHG Support
router.post('/', (req, res) => {
  const { id, title, message, duration_minutes, expires_at, created_at } = req.body

  if (!id || !title || !message || !expires_at) {
    return res.status(400).json({ error: 'Payload incompleto.' })
  }

  const notif = { id: Number(id), title, message, duration_minutes, expires_at, created_at }
  addBroadcast(notif)

  const io = getIo()
  io?.to('admins').emit('broadcast:notification', notif)

  res.json({ ok: true })
})

// Cancel a broadcast from FlowHG Support
router.post('/:id/cancel', (req, res) => {
  const id = Number(req.params.id)
  cancelBroadcast(id)

  const io = getIo()
  io?.to('admins').emit('broadcast:cancelled', { id })

  res.json({ ok: true })
})

// BetChat admin frontend polls active broadcasts on mount (as fallback)
router.get('/active', (req, res) => {
  res.json(getActiveBroadcasts())
})

export default router
