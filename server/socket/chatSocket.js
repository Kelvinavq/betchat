import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { query } from '../config/database.js'
import { assignChatIfUnassigned, persistMessage, setClientOnlineStatus } from '../controllers/chatController.js'

const recentMessages = new Map()
const RECENT_TTL_MS = 60_000
const clientSockets = new Map()

function getCookie(cookieHeader, name) {
  if (!cookieHeader) return null
  return cookieHeader
    .split(';')
    .map(part => part.trim())
    .reduce((found, part) => {
      if (found) return found
      const [key, ...value] = part.split('=')
      return key === name ? decodeURIComponent(value.join('=')) : null
    }, null)
}

function verifyToken(token) {
  if (!token) return null
  try {
    return jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
    })
  } catch {
    return null
  }
}

async function canAccessChat({ payload, chatId }) {
  if (!payload) return false
  if (payload.type === 'client') {
    const { rows, error } = await query('SELECT id FROM chats WHERE id = ? AND client_id = ? LIMIT 1', [chatId, payload.sub])
    if (error) throw error
    return Boolean(rows?.length)
  }
  return payload.role === 'admin' || payload.role === 'cashier'
}

function cleanupRecent() {
  const now = Date.now()
  for (const [key, value] of recentMessages.entries()) {
    if (now - value.createdAt > RECENT_TTL_MS) recentMessages.delete(key)
  }
}

export function setupChatSockets(io) {
  io.on('connection', (socket) => {
    const cookie = socket.handshake.headers.cookie || ''
    const adminToken = getCookie(cookie, config.jwtCookieName) || getCookie(cookie, 'auth_token')
    const clientToken = getCookie(cookie, config.clientJwtCookieName)
    const adminPayload = verifyToken(adminToken)
    const clientPayload = verifyToken(clientToken)
    const requestedMode = socket.handshake.auth?.mode
    const payload = requestedMode === 'admin'
      ? adminPayload
      : requestedMode === 'client'
        ? clientPayload
        : clientPayload || adminPayload

    socket.data.user = payload

    if (payload?.role === 'admin' || payload?.role === 'cashier') {
      socket.join('admins')
    }
    if (payload?.type === 'client' && payload?.sub) {
      socket.join(`client:${payload.sub}`)
      const clientId = Number(payload.sub)
      const count = clientSockets.get(clientId) || 0
      clientSockets.set(clientId, count + 1)
      if (count === 0) {
        setClientOnlineStatus(clientId, true).catch(error => {
          console.warn('[Socket.IO] No se pudo actualizar presencia online:', error.message)
        })
      }
    }

    socket.on('chat:join', async ({ chatId } = {}, ack) => {
      try {
        const numericChatId = Number(chatId)
        if (!numericChatId || !(await canAccessChat({ payload, chatId: numericChatId }))) {
          ack?.({ ok: false, error: 'No autorizado' })
          return
        }
        socket.join(`chat:${numericChatId}`)
        if ((payload?.role === 'admin' || payload?.role === 'cashier') && payload?.sub) {
          await assignChatIfUnassigned(numericChatId, payload.sub)
        }
        ack?.({ ok: true })
      } catch (error) {
        ack?.({ ok: false, error: error.message })
      }
    })

    socket.on('chat:leave', ({ chatId } = {}) => {
      const numericChatId = Number(chatId)
      if (numericChatId) socket.leave(`chat:${numericChatId}`)
    })

    socket.on('typing', async ({ chatId, isTyping } = {}) => {
      try {
        const numericChatId = Number(chatId)
        if (!numericChatId || !(await canAccessChat({ payload, chatId: numericChatId }))) return
        const senderType = payload?.type === 'client' ? 'client' : payload?.role === 'cashier' ? 'cashier' : 'admin'
        const event = {
          chatId: numericChatId,
          senderType,
          userId: payload?.sub || null,
          username: payload?.username || '',
          isTyping: Boolean(isTyping),
        }

        socket.to(`chat:${numericChatId}`).emit('typing', event)

        if (senderType === 'client') {
          socket.to('admins').emit('typing', event)
          return
        }

        const { rows, error } = await query('SELECT client_id FROM chats WHERE id = ? LIMIT 1', [numericChatId])
        if (error) throw error
        const clientId = rows?.[0]?.client_id
        if (clientId) {
          socket.to(`client:${clientId}`).emit('typing', event)
        }
      } catch {
        // Typing indicators are ephemeral; ignore authorization races.
      }
    })

    socket.on('message:send', async (payloadData = {}, ack) => {
      try {
        cleanupRecent()
        const chatId = Number(payloadData.chatId)
        const clientMessageId = String(payloadData.clientMessageId || '')
        if (!chatId || !(await canAccessChat({ payload, chatId }))) {
          ack?.({ ok: false, error: 'No autorizado' })
          return
        }

        const dedupeKey = `${payload?.type || payload?.role}:${payload?.sub}:${clientMessageId}`
        if (clientMessageId && recentMessages.has(dedupeKey)) {
          ack?.({ ok: true, duplicate: true, ...recentMessages.get(dedupeKey).result })
          return
        }

        const senderType = payload?.type === 'client'
          ? 'client'
          : payload?.role === 'cashier' ? 'cashier' : 'admin'

        const result = await persistMessage({
          chatId,
          senderType,
          senderUserId: senderType === 'admin' || senderType === 'cashier' ? payload.sub : null,
          content: String(payloadData.content || '').trim(),
          messageType: payloadData.messageType || 'text',
          dataUrl: payloadData.dataUrl || '',
          fileName: payloadData.fileName || '',
          clientMessageId,
        })

        if (clientMessageId) {
          recentMessages.set(dedupeKey, { createdAt: Date.now(), result })
        }

        ack?.({ ok: true, ...result })
      } catch (error) {
        ack?.({ ok: false, error: error.message })
      }
    })

    socket.on('disconnect', () => {
      if (payload?.type !== 'client' || !payload?.sub) return
      const clientId = Number(payload.sub)
      const nextCount = Math.max((clientSockets.get(clientId) || 1) - 1, 0)
      if (nextCount > 0) {
        clientSockets.set(clientId, nextCount)
        return
      }
      clientSockets.delete(clientId)
      setClientOnlineStatus(clientId, false).catch(error => {
        console.warn('[Socket.IO] No se pudo actualizar presencia offline:', error.message)
      })
    })
  })
}
