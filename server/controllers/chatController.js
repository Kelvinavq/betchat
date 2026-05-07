import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { query, transaction } from '../config/database.js'
import { config } from '../config/config.js'
import { getCookieValue } from '../middlewares/authMiddleware.js'
import { io } from '../app.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const MAX_FILE_BYTES = 10 * 1024 * 1024
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const emitChatUpdate = (chat) => {
  io.to('admins').emit('chat:updated', chat)
  io.to(`chat:${chat.id}`).emit('chat:updated', chat)
}

export { emitChatUpdate }

const emitMessage = (chatId, message) => {
  io.to(`chat:${chatId}`).emit('message:new', message)
  io.to('admins').emit('message:new', message)
}

const emitMessageStatus = (chatId, statuses) => {
  io.to(`chat:${chatId}`).emit('messages:status', { chatId: Number(chatId), statuses })
  io.to('admins').emit('messages:status', { chatId: Number(chatId), statuses })
}

function timeOf(date) {
  return new Date(date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function previewFor(payload) {
  if (payload.messageType === 'image') return payload.fileName || 'Imagen'
  if (payload.messageType === 'pdf') return payload.fileName || 'Documento PDF'
  if (payload.messageType === 'file') return payload.fileName || 'Archivo'
  return payload.content || ''
}

function publicUrl(filePath) {
  return filePath.replace(PUBLIC_DIR, '').replace(/\\/g, '/')
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') }
}

async function saveMedia({ dataUrl, messageType, fileName }) {
  const parsed = parseDataUrl(dataUrl)
  if (!parsed) {
    const error = new Error('Archivo invalido')
    error.status = 400
    throw error
  }
  if (parsed.buffer.length > MAX_FILE_BYTES) {
    const error = new Error('El archivo no puede superar 10 MB')
    error.status = 400
    throw error
  }

  const ext = messageType === 'image' ? IMAGE_TYPES[parsed.mime] : parsed.mime === 'application/pdf' ? 'pdf' : null
  if (!ext || (messageType === 'image' && !parsed.mime.startsWith('image/')) || (messageType === 'pdf' && parsed.mime !== 'application/pdf')) {
    const error = new Error('Solo se permiten imagenes o archivos PDF')
    error.status = 400
    throw error
  }

  const folder = messageType === 'image' ? 'images' : 'pdfs'
  const dir = path.join(PUBLIC_DIR, folder)
  await mkdir(dir, { recursive: true })
  const safeName = `${Date.now()}-${randomUUID()}.${ext}`
  const fullPath = path.join(dir, safeName)
  await writeFile(fullPath, parsed.buffer)

  return {
    fileUrl: publicUrl(fullPath),
    fileName: String(fileName || safeName).slice(0, 255),
    fileSize: parsed.buffer.length,
  }
}

function sanitizeMessage(row) {
  return {
    id: Number(row.id),
    chatId: Number(row.chat_id),
    clientId: row.client_id ? Number(row.client_id) : null,
    senderType: row.sender_type,
    senderUserId: row.sender_user_id ? Number(row.sender_user_id) : null,
    messageType: row.message_type,
    content: row.content || '',
    fileUrl: row.file_url || '',
    fileName: row.file_name || '',
    fileSize: row.file_size ? Number(row.file_size) : null,
    isRead: Boolean(row.is_read),
    deliveredAt: row.delivered_at || null,
    readAt: row.read_at || null,
    createdAt: row.created_at,
    time: timeOf(row.created_at),
  }
}

function sanitizeMessageStatus(row) {
  return {
    id: Number(row.id),
    chatId: Number(row.chat_id),
    isRead: Boolean(row.is_read),
    deliveredAt: row.delivered_at || null,
    readAt: row.read_at || null,
  }
}

function sanitizeChat(row) {
  return {
    id: Number(row.id),
    clientId: Number(row.client_id),
    username: row.username,
    fullName: row.full_name || row.username,
    cuil: row.cuil || '',
    externalId: row.external_id || '',
    active: Boolean(row.is_active),
    online: Boolean(row.is_online),
    assignedUserId: row.assigned_user_id ? Number(row.assigned_user_id) : null,
    assignedUsername: row.assigned_username || '',
    assignedFullName: row.assigned_full_name || row.assigned_username || '',
    isOpen: Boolean(row.is_open),
    isArchived: Boolean(row.is_archived),
    unread: Number(row.unread_count || 0),
    lastMsg: row.last_message || '',
    lastMessageType: row.last_message_type || 'text',
    lastMessageAt: row.last_message_at,
    botScreenId: row.bot_screen_id || null,
    botLastButtonId: row.bot_last_button_id || null,
    createdAt: row.created_at,
    time: row.last_message_at ? timeOf(row.last_message_at) : '',
    joinDate: row.registered_at,
    files: [],
    clientTags: [],
  }
}

async function getClientFromRequest(req) {
  const token = getCookieValue(req, config.clientJwtCookieName)
  if (!token) return null
  const payload = jwt.verify(token, config.jwtSecret, {
    algorithms: ['HS256'],
    issuer: config.jwtIssuer,
  })
  if (payload?.type !== 'client' || !payload?.sub) return null
  return payload
}

export async function getAdminChats(req, res, next) {
  try {
    const archived = String(req.query.archived || 'false') === 'true'
    const search = String(req.query.search || '').trim()
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10) || 50))
    const offset = (page - 1) * limit
    const params = [archived ? 1 : 0]
    let where = 'WHERE ch.is_archived = ?'
    if (search) {
      where += ' AND LOWER(c.username) LIKE LOWER(?)'
      params.push(`%${search}%`)
    }

    const { rows, error } = await query(
      `SELECT ch.*, c.username, c.full_name, c.cuil, c.external_id, c.is_active, c.is_online, c.registered_at,
              u.username AS assigned_username, u.full_name AS assigned_full_name
       FROM chats ch
       JOIN clients c ON c.id = ch.client_id
       LEFT JOIN users u ON u.id = ch.assigned_user_id
       ${where}
       ORDER BY COALESCE(ch.last_message_at, ch.created_at) DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    )
    if (error) return next(error)

    const { rows: totalRows, error: totalError } = await query(
      `SELECT COUNT(*) AS total
       FROM chats ch
       JOIN clients c ON c.id = ch.client_id
       ${where}`,
      params
    )
    if (totalError) return next(totalError)

    const total = Number(totalRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))

    res.json({
      chats: (rows || []).map(sanitizeChat),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function getMessages(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const { rows, error } = await query(
      `SELECT * FROM messages
       WHERE chat_id = ?
       ORDER BY created_at ASC, id ASC
       LIMIT 500`,
      [chatId]
    )
    if (error) return next(error)
    res.json({ messages: (rows || []).map(sanitizeMessage) })
  } catch (error) {
    next(error)
  }
}

export async function getClientMessages(req, res, next) {
  try {
    const client = await getClientFromRequest(req)
    if (!client) return res.status(401).json({ error: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })

    const chatId = Number(req.params.chatId)
    const chat = await getChat(chatId)
    if (!chat || Number(chat.client_id) !== Number(client.sub)) {
      return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })
    }

    await markOutboundMessagesDelivered(chatId)
    return getMessages(req, res, next)
  } catch (error) {
    next(error)
  }
}

async function markOutboundMessagesViewed(chatId) {
  await query(
    `UPDATE messages
     SET delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP),
         read_at = COALESCE(read_at, CURRENT_TIMESTAMP),
         is_read = 1
     WHERE chat_id = ?
       AND sender_type IN ('admin','cashier','system')
       AND (delivered_at IS NULL OR read_at IS NULL OR is_read = 0)`,
    [chatId]
  )

  const { rows, error } = await query(
    `SELECT id, chat_id, is_read, delivered_at, read_at
     FROM messages
     WHERE chat_id = ? AND sender_type IN ('admin','cashier','system')`,
    [chatId]
  )
  if (error) throw error
  const statuses = (rows || []).map(sanitizeMessageStatus)
  if (statuses.length > 0) emitMessageStatus(chatId, statuses)
  return statuses
}

async function markOutboundMessagesDelivered(chatId) {
  await query(
    `UPDATE messages
     SET delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)
     WHERE chat_id = ?
       AND sender_type IN ('admin','cashier','system')
       AND delivered_at IS NULL`,
    [chatId]
  )

  const { rows, error } = await query(
    `SELECT id, chat_id, is_read, delivered_at, read_at
     FROM messages
     WHERE chat_id = ? AND sender_type IN ('admin','cashier','system')`,
    [chatId]
  )
  if (error) throw error
  const statuses = (rows || []).map(sanitizeMessageStatus)
  if (statuses.length > 0) emitMessageStatus(chatId, statuses)
  return statuses
}

async function getChat(chatId) {
  const { rows, error } = await query(
    `SELECT ch.*, c.username, c.full_name, c.cuil, c.external_id, c.is_active, c.is_online, c.registered_at,
            u.username AS assigned_username, u.full_name AS assigned_full_name
     FROM chats ch
     JOIN clients c ON c.id = ch.client_id
     LEFT JOIN users u ON u.id = ch.assigned_user_id
     WHERE ch.id = ?
     LIMIT 1`,
    [chatId]
  )
  if (error) throw error
  return rows?.[0] || null
}

export async function persistMessage({
  chatId,
  senderType,
  clientId = null,
  senderUserId = null,
  content = '',
  messageType = 'text',
  dataUrl = '',
  fileName = '',
  clientMessageId = '',
}) {
  if (messageType === 'text' && !String(content || '').trim()) {
    const error = new Error('El mensaje no puede estar vacio')
    error.status = 400
    throw error
  }

  let filePayload = {}
  if (messageType === 'image' || messageType === 'pdf') {
    filePayload = await saveMedia({ dataUrl, messageType, fileName })
  }

  const result = await transaction(async (connection) => {
    const [chatRows] = await connection.execute('SELECT client_id FROM chats WHERE id = ? LIMIT 1', [chatId])
    const chat = chatRows?.[0]
    if (!chat) {
      const error = new Error('Chat no encontrado')
      error.status = 404
      throw error
    }

    const isAdminSender = senderType === 'admin' || senderType === 'cashier'
    const [insertResult] = await connection.execute(
      `INSERT INTO messages
        (chat_id, client_id, sender_type, sender_user_id, message_type, content, file_url, file_name, file_size, is_read)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chatId,
        senderType === 'client' ? chat.client_id : clientId,
        senderType,
        senderUserId,
        messageType,
        messageType === 'text' ? content : null,
        filePayload.fileUrl || null,
        filePayload.fileName || null,
        filePayload.fileSize || null,
        isAdminSender ? 0 : 0,
      ]
    )

    const preview = previewFor({
      messageType,
      content,
      fileName: filePayload.fileName,
    })
    await connection.execute(
      `UPDATE chats
       SET unread_count = unread_count + ?, last_message = ?, last_message_type = ?, last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [senderType === 'client' ? 1 : 0, preview.slice(0, 500), messageType, chatId]
    )

    const [messageRows] = await connection.execute('SELECT * FROM messages WHERE id = ? LIMIT 1', [insertResult.insertId])
    return messageRows[0]
  })

  const message = sanitizeMessage(result)
  message.clientMessageId = clientMessageId || ''
  const chat = sanitizeChat(await getChat(chatId))
  emitMessage(chatId, message)
  emitChatUpdate(chat)
  return { message, chat }
}

export async function sendClientMessage(req, res, next) {
  try {
    const client = await getClientFromRequest(req)
    if (!client) return res.status(401).json({ error: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })

    const chatId = Number(req.params.chatId)
    const chat = await getChat(chatId)
    if (!chat || Number(chat.client_id) !== Number(client.sub)) {
      return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })
    }

    const result = await persistMessage({
      chatId,
      senderType: 'client',
      content: String(req.body?.content || '').trim(),
      messageType: req.body?.messageType || 'text',
      dataUrl: req.body?.dataUrl || '',
      fileName: req.body?.fileName || '',
      clientMessageId: req.body?.clientMessageId || '',
    })
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function sendAdminMessage(req, res, next) {
  try {
    const result = await persistMessage({
      chatId: Number(req.params.chatId),
      senderType: req.user?.role === 'cashier' ? 'cashier' : 'admin',
      senderUserId: req.user?.sub || null,
      content: String(req.body?.content || '').trim(),
      messageType: req.body?.messageType || 'text',
      dataUrl: req.body?.dataUrl || '',
      fileName: req.body?.fileName || '',
      clientMessageId: req.body?.clientMessageId || '',
    })
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function markChatRead(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    await query(
      'UPDATE messages SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE chat_id = ? AND sender_type = "client"',
      [chatId]
    )
    await query('UPDATE chats SET unread_count = 0 WHERE id = ?', [chatId])
    const chat = sanitizeChat(await getChat(chatId))
    emitChatUpdate(chat)
    res.json({ success: true, chat })
  } catch (error) {
    next(error)
  }
}

export async function markClientChatRead(req, res, next) {
  try {
    const client = await getClientFromRequest(req)
    if (!client) return res.status(401).json({ error: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })

    const chatId = Number(req.params.chatId)
    const chat = await getChat(chatId)
    if (!chat || Number(chat.client_id) !== Number(client.sub)) {
      return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })
    }

    const statuses = await markOutboundMessagesViewed(chatId)
    res.json({ success: true, statuses })
  } catch (error) {
    next(error)
  }
}

export async function markClientChatDelivered(req, res, next) {
  try {
    const client = await getClientFromRequest(req)
    if (!client) return res.status(401).json({ error: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })

    const chatId = Number(req.params.chatId)
    const chat = await getChat(chatId)
    if (!chat || Number(chat.client_id) !== Number(client.sub)) {
      return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })
    }

    const statuses = await markOutboundMessagesDelivered(chatId)
    res.json({ success: true, statuses })
  } catch (error) {
    next(error)
  }
}

export async function archiveChat(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const archived = req.body?.archived !== false
    await query('UPDATE chats SET is_archived = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [archived ? 1 : 0, chatId])
    const chat = sanitizeChat(await getChat(chatId))
    emitChatUpdate(chat)
    res.json({ success: true, chat })
  } catch (error) {
    next(error)
  }
}

export async function setClientOnlineStatus(clientId, online) {
  const id = Number(clientId)
  if (!id) return
  await query(
    'UPDATE clients SET is_online = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?',
    [online ? 1 : 0, id]
  )
  io.emit('client:online-status', {
    clientId: id,
    online: Boolean(online),
  })

  const { rows, error } = await query(
    `SELECT ch.*, c.username, c.full_name, c.cuil, c.external_id, c.is_active, c.is_online, c.registered_at,
            u.username AS assigned_username, u.full_name AS assigned_full_name
     FROM chats ch
     JOIN clients c ON c.id = ch.client_id
     LEFT JOIN users u ON u.id = ch.assigned_user_id
     WHERE ch.client_id = ?`,
    [id]
  )
  if (error) throw error
  for (const row of rows || []) emitChatUpdate(sanitizeChat(row))
}

export async function assignChatIfUnassigned(chatId, userId) {
  const numericChatId = Number(chatId)
  const numericUserId = Number(userId)
  if (!numericChatId || !numericUserId) return null

  await query(
    `UPDATE chats
     SET assigned_user_id = COALESCE(assigned_user_id, ?), updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [numericUserId, numericChatId]
  )
  const chat = sanitizeChat(await getChat(numericChatId))
  emitChatUpdate(chat)
  return chat
}
