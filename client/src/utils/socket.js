import { io } from 'socket.io-client'

const BASE_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000'

const sockets = new Map()

export function getSocket(mode = 'auto') {
  const socketMode = mode || 'auto'
  if (!sockets.has(socketMode)) {
    const socket = io(BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 400,
      reconnectionDelayMax: 3500,
      timeout: 8000,
      auth: { mode: socketMode },
    })

    socket.on('connect', () => {
      console.debug(`[socket] connected (${socketMode}) -> ${BASE_URL}`)
    })
    socket.on('disconnect', (reason) => {
      console.debug(`[socket] disconnected (${socketMode}) reason=${reason}`)
    })
    socket.on('connect_error', (error) => {
      console.warn(`[socket] connect_error (${socketMode}):`, error?.message || error)
    })
    socket.on('reconnect_attempt', (attempt) => {
      console.debug(`[socket] reconnect_attempt (${socketMode}) #${attempt}`)
    })
    socket.on('reconnect_failed', () => {
      console.warn(`[socket] reconnect_failed (${socketMode})`)
    })
    sockets.set(socketMode, socket)
  }
  return sockets.get(socketMode)
}

export function makeClientMessageId(prefix = 'msg') {
  const cryptoId = crypto?.randomUUID?.()
  return `${prefix}-${cryptoId || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
}
