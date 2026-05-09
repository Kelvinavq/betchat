import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import moment from 'moment-timezone'
import { query, transaction } from '../config/database.js'
import { config } from '../config/config.js'
import { getCookieValue } from '../middlewares/authMiddleware.js'
import { io } from '../app.js'
import { deleteCache, deleteCachePattern, getCacheJson, setCacheJson } from '../utils/redisCache.js'
import { extractReceiptData } from '../services/receiptExtractor.js'
import { getAutoMessage } from '../controllers/autoMessagesController.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PUBLIC_DIR = path.resolve(__dirname, '../public')
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MESSAGE_DAY_TIMEZONE = process.env.MESSAGE_DAY_TIMEZONE || 'America/Caracas'
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
const AUDIO_TYPES = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
}

const emitChatUpdate = (chat) => {
  io.to('admins').emit('chat:updated', chat)
  io.to(`chat:${chat.id}`).emit('chat:updated', chat)
  void invalidateChatListCache('chat_updated')
}

export { emitChatUpdate }

export async function emitChatRefresh(chatId) {
  const chat = sanitizeChat(await getChat(chatId))
  emitChatUpdate(chat)
}

export async function resetClientBot(chatId) {
  const { rows: screenRows } = await query(
    'SELECT id FROM bot_screens WHERE is_root = 1 ORDER BY sort_order ASC, created_at ASC LIMIT 1'
  )
  let rootId = screenRows?.[0]?.id || null
  if (!rootId) {
    const { rows: first } = await query(
      'SELECT id FROM bot_screens ORDER BY sort_order ASC, created_at ASC LIMIT 1'
    )
    rootId = first?.[0]?.id || null
  }

  const { rows: chatRows } = await query(
    'SELECT client_id FROM chats WHERE id = ? LIMIT 1',
    [chatId]
  )
  const clientId = chatRows?.[0]?.client_id || null

  await query(
    'UPDATE chats SET bot_screen_id = ?, bot_last_button_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [rootId, chatId]
  )

  const chat = sanitizeChat(await getChat(chatId))
  emitChatUpdate(chat)

  if (clientId) {
    io.to(`client:${clientId}`).emit('bot:reset', { chatId: Number(chatId), screenId: rootId })
  }
}

export async function resetClientBotAdmin(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    await resetClientBot(chatId)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

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

function dayOf(date) {
  return moment(date).tz(MESSAGE_DAY_TIMEZONE).format('YYYY-MM-DD')
}

function dayOfDbUtc(value) {
  return moment.utc(value).tz(MESSAGE_DAY_TIMEZONE).format('YYYY-MM-DD')
}

function normalizeMessageDay(value) {
  const raw = String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return moment().tz(MESSAGE_DAY_TIMEZONE).format('YYYY-MM-DD')
}

async function resolveInitialMessageDay(chatId) {
  const { rows, error } = await query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at_utc
     FROM messages
     WHERE chat_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [chatId]
  )
  if (error) throw error
  return rows?.[0]?.created_at_utc ? dayOfDbUtc(rows[0].created_at_utc) : normalizeMessageDay()
}

function dayRangeUtc(day) {
  const start = moment.tz(day, 'YYYY-MM-DD', MESSAGE_DAY_TIMEZONE).utc()
  return {
    start: start.format('YYYY-MM-DD HH:mm:ss'),
    end: start.clone().add(1, 'day').format('YYYY-MM-DD HH:mm:ss'),
  }
}

function messageDayCacheKey(chatId, day) {
  return `messages:v4:chat:${Number(chatId)}:day:${day}`
}

function chatListCacheKey({ archived, search, labelId, page, limit }) {
  return `chats:v1:admin:archived:${archived ? 1 : 0}:label:${Number(labelId || 0)}:search:${encodeURIComponent(search.toLowerCase())}:page:${page}:limit:${limit}`
}

function logMessageCache(event, details) {
  if (!config.redis.logCache) return
  console.info(`[redis:messages] ${event}`, details)
}

function logChatListCache(event, details) {
  if (!config.redis.logCache) return
  console.info(`[redis:chat-list] ${event}`, details)
}

async function invalidateMessageCache(chatId, day = '') {
  if (day) {
    await deleteCache(messageDayCacheKey(chatId, day))
    logMessageCache('DEL', { chatId: Number(chatId), day })
    return
  }
  await deleteCachePattern(`messages:v4:chat:${Number(chatId)}:day:*`)
  logMessageCache('DEL_PATTERN', { chatId: Number(chatId) })
}

async function invalidateChatListCache(reason = '') {
  await deleteCachePattern('chats:v1:admin:*')
  logChatListCache('DEL_PATTERN', { reason })
}

function previewFor(payload) {
  if (payload.messageType === 'image') return payload.fileName || 'Imagen'
  if (payload.messageType === 'pdf') return payload.fileName || 'Documento PDF'
  if (payload.messageType === 'audio') return 'Audio'
  if (payload.messageType === 'file') return payload.fileName || 'Archivo'
  return String(payload.content || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function publicUrl(filePath) {
  return filePath.replace(PUBLIC_DIR, '').replace(/\\/g, '/')
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;,]+)(?:;[^,]+)*;base64,(.+)$/)
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

  const ext = messageType === 'image'
    ? IMAGE_TYPES[parsed.mime]
    : messageType === 'audio'
      ? AUDIO_TYPES[parsed.mime]
      : parsed.mime === 'application/pdf' ? 'pdf' : null
  if (
    !ext
    || (messageType === 'image' && !parsed.mime.startsWith('image/'))
    || (messageType === 'pdf' && parsed.mime !== 'application/pdf')
    || (messageType === 'audio' && !parsed.mime.startsWith('audio/'))
  ) {
    const error = new Error('Solo se permiten imagenes, audios o archivos PDF')
    error.status = 400
    throw error
  }

  const folder = messageType === 'image' ? 'images' : messageType === 'audio' ? 'audios' : 'pdfs'
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
  const senderAvatarUrl = row.sender_avatar_url || row.avatar_url || ''
  const replyTo = row.reply_to_message_id ? {
    id: Number(row.reply_to_message_id),
    senderType: row.reply_sender_type || '',
    messageType: row.reply_message_type || 'text',
    content: row.reply_content || '',
    fileName: row.reply_file_name || '',
  } : null
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
    senderAvatarUrl,
    replyTo,
    createdAt: row.created_at,
    createdAtUtc: row.created_at_utc || null,
    time: timeOf(row.created_at),
  }
}

function messageSelectSql(whereClause) {
  return `SELECT m.*, DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') AS created_at_utc,
                 u.avatar_url AS sender_avatar_url,
                 r.sender_type AS reply_sender_type,
                 r.message_type AS reply_message_type,
                 r.content AS reply_content,
                 r.file_name AS reply_file_name
          FROM messages m
          LEFT JOIN users u ON u.id = m.sender_user_id
          LEFT JOIN messages r ON r.id = m.reply_to_message_id
          ${whereClause}`
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
  const clientTags = String(row.client_labels || '')
    .split('||')
    .map(item => {
      const [id, name, color] = item.split('::')
      return name ? { id: Number(id), name, color: color || '#2563eb' } : null
    })
    .filter(Boolean)

  return {
    id: Number(row.id),
    clientId: Number(row.client_id),
    username: row.username,
    fullName: row.full_name || '',
    cuil: row.cuil || '',
    externalId: row.external_id || '',
    active: Boolean(row.is_active),
    online: Boolean(row.is_online),
    assignedUserId: row.assigned_user_id ? Number(row.assigned_user_id) : null,
    assignedUsername: row.assigned_username || '',
    assignedFullName: row.assigned_full_name || row.assigned_username || '',
    isOpen: Boolean(row.is_open),
    isArchived: Boolean(row.is_archived),
    isPinned: Boolean(row.is_pinned),
    isHelpRequest: Boolean(row.is_help_request),
    helpReason: row.help_reason || null,
    helpNote: row.help_note || '',
    temporaryClient: Boolean(row.is_temporary),
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
    clientTags,
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
  const { rows, error } = await query(
    'SELECT is_temporary, temp_session_active FROM clients WHERE id = ? LIMIT 1',
    [payload.sub]
  )
  if (error) throw error
  const client = rows?.[0]
  if (!client) return null
  if (client.is_temporary && !client.temp_session_active) return null
  return payload
}

export async function getAdminChats(req, res, next) {
  try {
    const archived = String(req.query.archived || 'false') === 'true'
    const search = String(req.query.search || '').trim()
    const labelId = Math.max(0, parseInt(req.query.labelId || '0', 10) || 0)
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '50', 10) || 50))
    const offset = (page - 1) * limit
    const params = [archived ? 1 : 0]
    let where = 'WHERE ch.is_archived = ?'
    if (search) {
      where += ' AND LOWER(c.username) LIKE LOWER(?)'
      params.push(`%${search}%`)
    }
    if (labelId) {
      where += ` AND EXISTS (
        SELECT 1
        FROM client_labels clf
        WHERE clf.client_id = c.id AND clf.label_id = ?
      )`
      params.push(labelId)
    }

    const cacheKey = chatListCacheKey({ archived, search, labelId, page, limit })
    const cached = await getCacheJson(cacheKey)
    if (cached) {
      logChatListCache('HIT', { archived, search, labelId, page, limit, source: 'redis' })
      return res.json(cached)
    }
    logChatListCache('MISS', { archived, search, labelId, page, limit, source: 'mysql' })

    const { rows, error } = await query(
      `SELECT ch.*, c.username, c.full_name, c.cuil, c.external_id, c.is_active, c.is_online, c.is_temporary, c.registered_at,
              u.username AS assigned_username, u.full_name AS assigned_full_name,
              (
                SELECT GROUP_CONCAT(CONCAT(l.id, '::', l.name, '::', COALESCE(l.color, '#2563eb')) ORDER BY l.name SEPARATOR '||')
                FROM client_labels cl
                INNER JOIN labels l ON l.id = cl.label_id
                WHERE cl.client_id = c.id
              ) AS client_labels
       FROM chats ch
       JOIN clients c ON c.id = ch.client_id
       LEFT JOIN users u ON u.id = ch.assigned_user_id
       ${where}
       ORDER BY ch.is_pinned DESC, COALESCE(ch.last_message_at, ch.created_at) DESC
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

    const payload = {
      chats: (rows || []).map(sanitizeChat),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    }
    await setCacheJson(cacheKey, payload, config.redis.chatListTtlSeconds)
    logChatListCache('SET', { archived, search, labelId, page, limit, chats: payload.chats.length, ttlSeconds: config.redis.chatListTtlSeconds })
    res.json(payload)
  } catch (error) {
    next(error)
  }
}

export async function getChatLabels(req, res, next) {
  try {
    const { rows, error } = await query(
      `SELECT l.id, l.name, l.color, COUNT(DISTINCT cl.client_id) AS clients
       FROM labels l
       LEFT JOIN client_labels cl ON cl.label_id = l.id
       GROUP BY l.id, l.name, l.color
       ORDER BY l.name ASC`
    )
    if (error) return next(error)
    res.json({ labels: (rows || []).map(row => ({ ...sanitizeClientLabel(row), clients: Number(row.clients || 0) })) })
  } catch (error) {
    next(error)
  }
}

export async function createChatLabel(req, res, next) {
  try {
    const name = String(req.body?.name || '').trim().slice(0, 80)
    const color = /^#[0-9a-f]{6}$/i.test(String(req.body?.color || '')) ? req.body.color : '#2563eb'
    if (!name) return res.status(400).json({ error: 'El nombre de la etiqueta es requerido', code: 'LABEL_NAME_REQUIRED' })

    const { error } = await query(
      `INSERT INTO labels (name, color)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE color = VALUES(color)`,
      [name, color]
    )
    if (error) return next(error)

    const { rows, error: selectError } = await query(
      'SELECT id, name, color FROM labels WHERE name = ? LIMIT 1',
      [name]
    )
    if (selectError) return next(selectError)

    res.status(201).json({ label: sanitizeClientLabel(rows?.[0] || { id: 0, name, color }) })
  } catch (error) {
    next(error)
  }
}

function formatPanelFile(row) {
  return {
    id: Number(row.id),
    type: row.message_type === 'image' ? 'image' : 'pdf',
    name: row.file_name || (row.message_type === 'image' ? 'Imagen' : 'Documento PDF'),
    url: row.file_url || '',
    date: row.created_at ? new Date(row.created_at).toISOString() : null,
  }
}

function sanitizeClientLabel(row) {
  return {
    id: Number(row.id),
    name: row.name,
    color: row.color || '#2563eb',
  }
}

function validateClientPanelPayload(body = {}) {
  const fullName = String(body.fullName ?? '').trim()
  const cuil = String(body.cuil ?? '').replace(/\D/g, '')
  const note = String(body.note ?? '')

  if (fullName.length > 50) {
    const error = new Error('El nombre del titular no puede superar 50 caracteres')
    error.status = 400
    throw error
  }

  if (cuil && cuil.length !== 11) {
    const error = new Error('El CUIL debe tener 11 digitos o quedar vacio')
    error.status = 400
    throw error
  }

  if (note.length > 5000) {
    const error = new Error('La nota no puede superar 5000 caracteres')
    error.status = 400
    throw error
  }

  return { fullName, cuil, note }
}

export async function getMessages(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const dayMode = req.query.mode === 'day' || req.query.date

    if (dayMode) {
      const date = req.query.date ? normalizeMessageDay(req.query.date) : await resolveInitialMessageDay(chatId)
      const cached = await getCacheJson(messageDayCacheKey(chatId, date))
      if (cached) {
        logMessageCache('HIT', { chatId, date, source: 'redis' })
        return res.json(cached)
      }
      logMessageCache('MISS', { chatId, date, source: 'mysql' })

      const range = dayRangeUtc(date)
      const { rows, error } = await query(
        `${messageSelectSql('WHERE m.chat_id = ? AND m.created_at >= ? AND m.created_at < ?')}
         ORDER BY m.created_at ASC, m.id ASC`,
        [chatId, range.start, range.end]
      )
      if (error) return next(error)

      const { rows: previousRows, error: previousError } = await query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at_utc
         FROM messages
         WHERE chat_id = ? AND created_at < ?
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [chatId, range.start]
      )
      if (previousError) return next(previousError)

      const previousDate = previousRows?.[0]?.created_at_utc ? dayOfDbUtc(previousRows[0].created_at_utc) : null
      const payload = {
        messages: (rows || []).map(sanitizeMessage),
        pagination: {
          mode: 'day',
          date,
          previousDate,
          hasPrevious: Boolean(previousDate),
          timezone: MESSAGE_DAY_TIMEZONE,
        },
      }
      await setCacheJson(messageDayCacheKey(chatId, date), payload)
      logMessageCache('SET', { chatId, date, messages: payload.messages.length, ttlSeconds: config.redis.messageTtlSeconds })
      return res.json(payload)
    }

    const { rows, error } = await query(
      `${messageSelectSql('WHERE m.chat_id = ?')}
       ORDER BY m.created_at ASC, m.id ASC
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
  const { rows: updateResult } = await query(
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
  if (Number(updateResult?.affectedRows || 0) > 0) await invalidateMessageCache(chatId)
  return statuses
}

export async function getChatClientDetails(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const chat = await getChat(chatId)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })

    const clientId = Number(chat.client_id)
    const [labelResult, fileResult] = await Promise.all([
      query(
        `SELECT l.id, l.name, l.color
         FROM client_labels cl
         INNER JOIN labels l ON l.id = cl.label_id
         WHERE cl.client_id = ?
         ORDER BY l.name ASC`,
        [clientId]
      ),
      query(
        `SELECT m.id, m.message_type, m.file_name, m.file_url, m.created_at
         FROM messages m
         INNER JOIN chats ch ON ch.id = m.chat_id
         WHERE ch.client_id = ? AND m.message_type IN ('image','pdf') AND m.file_url IS NOT NULL
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT 200`,
        [clientId]
      ),
    ])
    if (labelResult.error) return next(labelResult.error)
    if (fileResult.error) return next(fileResult.error)

    res.json({
      client: {
        id: clientId,
        username: chat.username,
        fullName: chat.full_name || '',
        cuil: chat.cuil || '',
        note: chat.note || '',
        registeredAt: chat.registered_at,
        labels: (labelResult.rows || []).map(sanitizeClientLabel),
        files: (fileResult.rows || []).map(formatPanelFile),
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function updateChatClientDetails(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const chat = await getChat(chatId)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })

    const payload = validateClientPanelPayload(req.body)
    const { error } = await query(
      `UPDATE clients
       SET full_name = ?, cuil = NULLIF(?, ''), note = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [payload.fullName, payload.cuil, payload.note, chat.client_id]
    )
    if (error) return next(error)

    res.json({ success: true, client: { ...payload, id: Number(chat.client_id) } })
  } catch (error) {
    next(error)
  }
}

export async function updateChatClientLabels(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const chat = await getChat(chatId)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })

    const labels = Array.isArray(req.body?.labels) ? req.body.labels : []
    const normalized = labels
      .map(label => ({
        name: String(label.name || label.label || '').trim().slice(0, 80),
        color: /^#[0-9a-f]{6}$/i.test(String(label.color || '')) ? label.color : '#2563eb',
      }))
      .filter(label => label.name)
      .slice(0, 20)

    await transaction(async (connection) => {
      await connection.execute('DELETE FROM client_labels WHERE client_id = ?', [chat.client_id])
      for (const label of normalized) {
        await connection.execute(
          `INSERT INTO labels (name, color)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE color = VALUES(color)`,
          [label.name, label.color]
        )
        const [rows] = await connection.execute('SELECT id FROM labels WHERE name = ? LIMIT 1', [label.name])
        const labelId = rows?.[0]?.id
        if (labelId) {
          await connection.execute(
            'INSERT IGNORE INTO client_labels (client_id, label_id) VALUES (?, ?)',
            [chat.client_id, labelId]
          )
        }
      }
    })
    await invalidateChatListCache('client_labels_updated')

    const { rows, error } = await query(
      `SELECT l.id, l.name, l.color
       FROM client_labels cl
       INNER JOIN labels l ON l.id = cl.label_id
       WHERE cl.client_id = ?
       ORDER BY l.name ASC`,
      [chat.client_id]
    )
    if (error) return next(error)
    emitChatUpdate(sanitizeChat(await getChat(chatId)))
    res.json({ labels: (rows || []).map(sanitizeClientLabel) })
  } catch (error) {
    next(error)
  }
}

async function markOutboundMessagesDelivered(chatId) {
  const { rows: updateResult } = await query(
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
  if (Number(updateResult?.affectedRows || 0) > 0) await invalidateMessageCache(chatId)
  return statuses
}

async function getChat(chatId) {
  const { rows, error } = await query(
    `SELECT ch.*, c.username, c.full_name, c.cuil, c.note, c.external_id, c.is_active, c.is_online, c.is_temporary, c.registered_at,
            u.username AS assigned_username, u.full_name AS assigned_full_name,
            (
              SELECT GROUP_CONCAT(CONCAT(l.id, '::', l.name, '::', COALESCE(l.color, '#2563eb')) ORDER BY l.name SEPARATOR '||')
              FROM client_labels cl
              INNER JOIN labels l ON l.id = cl.label_id
              WHERE cl.client_id = c.id
            ) AS client_labels
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
  replyToMessageId = null,
}) {
  if (messageType === 'text' && !String(content || '').trim()) {
    const error = new Error('El mensaje no puede estar vacio')
    error.status = 400
    throw error
  }

  let filePayload = {}
  if (messageType === 'image' || messageType === 'pdf' || messageType === 'audio') {
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

    const chatClientId = Number(chat.client_id) || null
    const payloadClientId = Number(clientId) || null
    if (senderType === 'client' && payloadClientId && payloadClientId !== chatClientId) {
      const error = new Error('El cliente no pertenece a este chat')
      error.status = 403
      throw error
    }
    const messageClientId = senderType === 'client' ? (payloadClientId || chatClientId) : null

    const numericReplyToMessageId = Number(replyToMessageId) || null
    if (numericReplyToMessageId) {
      const [replyRows] = await connection.execute(
        'SELECT id FROM messages WHERE id = ? AND chat_id = ? LIMIT 1',
        [numericReplyToMessageId, chatId]
      )
      if (!replyRows?.length) {
        const error = new Error('Mensaje a responder no encontrado')
        error.status = 400
        throw error
      }
    }

    const isAdminSender = senderType === 'admin' || senderType === 'cashier'
    const [insertResult] = await connection.execute(
      `INSERT INTO messages
        (chat_id, client_id, sender_type, sender_user_id, message_type, content, file_url, file_name, file_size, is_read, reply_to_message_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        chatId,
        messageClientId,
        senderType,
        senderUserId,
        messageType,
        messageType === 'text' ? content : null,
        filePayload.fileUrl || null,
        filePayload.fileName || null,
        filePayload.fileSize || null,
        isAdminSender ? 0 : 0,
        numericReplyToMessageId,
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

    const [messageRows] = await connection.execute(
      `${messageSelectSql('WHERE m.id = ?')}
       LIMIT 1`,
      [insertResult.insertId]
    )
    return messageRows[0]
  })

  const messageDay = result?.created_at_utc ? dayOfDbUtc(result.created_at_utc) : dayOf(result.created_at)
  const message = sanitizeMessage(result)
  message.clientMessageId = clientMessageId || ''
  await invalidateMessageCache(chatId, messageDay)
  const chat = sanitizeChat(await getChat(chatId))
  emitMessage(chatId, message)
  emitChatUpdate(chat)
  return { message, chat }
}

async function runManualAiPipeline({ chatId, clientId, messageId, dataUrl, bankAccountId }) {
  console.log(`[Receipt] Pipeline manual — chatId=${chatId} messageId=${messageId} bankAccountId=${bankAccountId}`)
  const receivedMsg = await getAutoMessage('receipt_received')
  if (receivedMsg) {
    await persistMessage({ chatId, senderType: 'system', content: receivedMsg })
  }

  let extracted = null
  let aiStatus = 'error'
  try {
    extracted = await extractReceiptData(dataUrl)
    aiStatus = 'ok'
  } catch (err) {
    console.error('[Receipt] Error extracción IA:', err.message)
  }

  let isDuplicate = false
  let duplicateOfId = null
  if (extracted?.transaction_id) {
    const { rows: dupRows } = await query(
      'SELECT id FROM manual_payment_movements WHERE transaction_id = ? LIMIT 1',
      [extracted.transaction_id]
    )
    if (dupRows?.length) {
      isDuplicate = true
      duplicateOfId = dupRows[0].id
    }
  }

  await query(
    `INSERT INTO manual_payment_movements
     (client_id, chat_id, message_id, bank_account_id, status, amount, ai_extracted_text, ai_status, transaction_id, is_duplicate, duplicate_of_id)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
    [
      clientId,
      chatId,
      messageId,
      bankAccountId,
      extracted?.amount ?? 0,
      JSON.stringify(extracted),
      aiStatus,
      extracted?.transaction_id ?? null,
      isDuplicate ? 1 : 0,
      duplicateOfId ?? null,
    ]
  )

  let followUpEvent = null
  if (isDuplicate) {
    followUpEvent = 'receipt_duplicate'
  } else if (aiStatus === 'error') {
    followUpEvent = 'receipt_invalid'
  } else if (!extracted?.amount || !extracted?.transaction_id) {
    followUpEvent = 'receipt_insufficient_info'
  }

  if (followUpEvent) {
    const followMsg = await getAutoMessage(followUpEvent)
    if (followMsg) {
      await persistMessage({ chatId, senderType: 'system', content: followMsg })
    }
  }
}

export async function processReceiptAsync({ chatId, clientId, messageId, dataUrl }) {
  try {
    console.log(`[Receipt] Iniciando procesamiento — chatId=${chatId} clientId=${clientId} messageId=${messageId}`)

    const { rows, error } = await query(
      `SELECT bi.receipt_processing, cpc.bank_account_id, bp.slug AS active_provider
       FROM chats ch
       LEFT JOIN bot_items bi ON bi.id = ch.bot_last_button_id
       LEFT JOIN chat_processing_config cpc ON cpc.id = 1
       LEFT JOIN bank_accounts ba ON ba.id = cpc.bank_account_id
       LEFT JOIN bank_providers bp ON bp.id = ba.provider_id
       WHERE ch.id = ?
       LIMIT 1`,
      [chatId]
    )
    if (error) {
      console.error('[Receipt] Error al consultar contexto del chat:', error.message)
      return
    }
    if (!rows?.length) {
      console.warn('[Receipt] Chat no encontrado para chatId=', chatId)
      return
    }

    const { receipt_processing, bank_account_id, active_provider } = rows[0]
    const bankAccountId = bank_account_id || null

    console.log(`[Receipt] Contexto — receipt_processing=${receipt_processing} active_provider=${active_provider} bankAccountId=${bankAccountId}`)

    // Manual por operador, o sin botón seleccionado (null → tratar como manual)
    if (!receipt_processing || receipt_processing === 'manual') {
      return await runManualAiPipeline({ chatId, clientId, messageId, dataUrl, bankAccountId })
    }

    // Automático: si el banco activo es "manual" o no hay banco → fallback al pipeline de IA
    if (!active_provider || active_provider === 'manual') {
      return await runManualAiPipeline({ chatId, clientId, messageId, dataUrl, bankAccountId })
    }

    // Banco activo es HGCash / Telepagos / MercadoPago → notificar y delegar al banco
    console.log(`[Receipt] Modo automático con banco ${active_provider} — enviando mensaje de recepción`)
    const receivedMsg = await getAutoMessage('receipt_received')
    if (receivedMsg) {
      await persistMessage({ chatId, senderType: 'system', content: receivedMsg })
    }

    // TODO: integración específica por banco
    // switch (active_provider) {
    //   case 'hgcash':      await processHgCashReceipt(...)     ; break
    //   case 'telepagos':   await processTelePageReceipt(...)   ; break
    //   case 'mercadopago': await processMercadopagoReceipt(...); break
    // }
  } catch (err) {
    console.error('[Receipt] Error inesperado en procesamiento background:', err)
  }
}

export async function sendClientMessage(req, res, next) {
  try {
    const client = await getClientFromRequest(req)
    if (!client) return res.status(401).json({ error: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })

    const chatId = Number(req.params.chatId)

    // ── LOG: entrada a sendClientMessage ────────────────────────────────────
    const _msgType = req.body?.messageType || 'text'
    const _hasDataUrl = !!req.body?.dataUrl
    const _dataUrlLen = req.body?.dataUrl?.length || 0
    console.log(`[Chat] sendClientMessage — chatId=${chatId} messageType=${_msgType} hasDataUrl=${_hasDataUrl} dataUrlLen=${_dataUrlLen}`)
    // ────────────────────────────────────────────────────────────────────────

    const chat = await getChat(chatId)
    if (!chat || Number(chat.client_id) !== Number(client.sub)) {
      return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })
    }

    const messageType = _msgType
    const dataUrl = req.body?.dataUrl || ''

    const result = await persistMessage({
      chatId,
      senderType: 'client',
      clientId: client.sub,
      content: String(req.body?.content || '').trim(),
      messageType,
      dataUrl,
      fileName: req.body?.fileName || '',
      clientMessageId: req.body?.clientMessageId || '',
      replyToMessageId: req.body?.replyToMessageId || null,
    })

    if ((messageType === 'image' || messageType === 'pdf') && dataUrl) {
      console.log(`[Receipt] Disparando procesamiento async — chatId=${chatId} messageType=${messageType} messageId=${result.message.id}`)
      void processReceiptAsync({
        chatId,
        clientId: client.sub,
        messageId: result.message.id,
        dataUrl,
      })
    } else if (messageType === 'image' || messageType === 'pdf') {
      console.warn(`[Receipt] Imagen/PDF recibido pero sin dataUrl en body — messageType=${messageType} hasDataUrl=${_hasDataUrl}`)
    }

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
      replyToMessageId: req.body?.replyToMessageId || null,
    })
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function completeWithdrawal(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const chat = await getChat(chatId)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })

    const result = await persistMessage({
      chatId,
      senderType: 'system',
      content: 'Retiro completado. Ya procesamos tu solicitud.',
      messageType: 'text',
      clientMessageId: String(req.body?.clientMessageId || ''),
    })
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function markChatRead(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const { rows: updateResult } = await query(
      'UPDATE messages SET is_read = 1, read_at = COALESCE(read_at, CURRENT_TIMESTAMP) WHERE chat_id = ? AND sender_type = "client"',
      [chatId]
    )
    await query('UPDATE chats SET unread_count = 0 WHERE id = ?', [chatId])
    if (Number(updateResult?.affectedRows || 0) > 0) await invalidateMessageCache(chatId)
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

export async function pinChat(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const { rows: current } = await query('SELECT is_pinned FROM chats WHERE id = ? LIMIT 1', [chatId])
    if (!current?.length) return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })
    const newPinned = current[0].is_pinned ? 0 : 1
    await query('UPDATE chats SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newPinned, chatId])
    await invalidateChatListCache('pin_chat')
    const chat = sanitizeChat(await getChat(chatId))
    emitChatUpdate(chat)
    res.json({ success: true, chat })
  } catch (error) {
    next(error)
  }
}

export async function clearChatMessages(req, res, next) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Solo administradores', code: 'FORBIDDEN' })
    const chatId = Number(req.params.chatId)
    await query('UPDATE manual_payment_movements SET message_id = NULL WHERE chat_id = ?', [chatId])
    await query('DELETE FROM messages WHERE chat_id = ?', [chatId])
    await query(
      `UPDATE chats SET last_message = NULL, last_message_type = 'text', last_message_at = NULL,
       unread_count = 0, bot_screen_id = NULL, bot_last_button_id = NULL,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [chatId]
    )
    await invalidateMessageCache(chatId)
    await invalidateChatListCache('clear_messages')
    const chat = sanitizeChat(await getChat(chatId))
    emitChatUpdate(chat)
    res.json({ success: true, chat })
  } catch (error) {
    next(error)
  }
}

export async function deleteChat(req, res, next) {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Solo administradores', code: 'FORBIDDEN' })
    const chatId = Number(req.params.chatId)
    const { rows: chatRows } = await query('SELECT client_id FROM chats WHERE id = ? LIMIT 1', [chatId])
    const clientId = chatRows?.[0]?.client_id
    await query('UPDATE manual_payment_movements SET message_id = NULL WHERE chat_id = ?', [chatId])
    await query('DELETE FROM messages WHERE chat_id = ?', [chatId])
    await query('DELETE FROM chats WHERE id = ?', [chatId])
    await invalidateMessageCache(chatId)
    await invalidateChatListCache('delete_chat')
    io.to('admins').emit('chat:deleted', { chatId })
    if (clientId) {
      io.to(`client:${clientId}`).emit('session:force-logout', { reason: 'chat_deleted' })
    }
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

export async function closeHelpChat(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const chat = await getChat(chatId)
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })
    if (!chat.is_help_request) {
      return res.status(400).json({ error: 'Este chat no es una solicitud de ayuda', code: 'NOT_HELP_CHAT' })
    }

    await query(
      `UPDATE chats
       SET is_open = 0, is_archived = 1, closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [chatId]
    )
    await query(
      `UPDATE clients
       SET temp_session_active = 0, is_online = 0, last_seen_at = CURRENT_TIMESTAMP
       WHERE id = ? AND is_temporary = 1`,
      [chat.client_id]
    )
    await invalidateChatListCache('close_help')
    await invalidateMessageCache(chatId)
    const updated = sanitizeChat(await getChat(chatId))
    io.to(`client:${chat.client_id}`).emit('temp-session:closed', { chatId, reason: 'help_closed' })
    emitChatUpdate(updated)
    res.json({ success: true, chat: updated })
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
    `SELECT ch.*, c.username, c.full_name, c.cuil, c.external_id, c.is_active, c.is_online, c.is_temporary, c.registered_at,
            u.username AS assigned_username, u.full_name AS assigned_full_name,
            (
              SELECT GROUP_CONCAT(CONCAT(l.id, '::', l.name, '::', COALESCE(l.color, '#2563eb')) ORDER BY l.name SEPARATOR '||')
              FROM client_labels cl
              INNER JOIN labels l ON l.id = cl.label_id
              WHERE cl.client_id = c.id
            ) AS client_labels
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
