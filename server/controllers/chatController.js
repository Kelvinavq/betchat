import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import moment from 'moment-timezone'
import { query, transaction } from '../config/database.js'
import { config } from '../config/config.js'
import { io } from '../app.js'
import { deleteCache, deleteCachePattern, getCacheJson, setCacheJson } from '../utils/redisCache.js'
import { extractReceiptData } from '../services/receiptExtractor.js'
import { getAutoMessage } from '../controllers/autoMessagesController.js'
import { insertReceiptLog, finalizeReceiptLog } from '../controllers/receiptLogController.js'
import { getValidatedClientPayload } from '../utils/clientSession.js'

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

export async function resetClientBotSelf(req, res, next) {
  try {
    const client = await getClientFromRequest(req)
    if (!client) return res.status(401).json({ error: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })
    const chatId = Number(req.params.chatId)
    const chat = await getChat(chatId)
    if (!chat || Number(chat.client_id) !== Number(client.sub)) {
      return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })
    }
    await resetClientBot(chatId)
    res.json({ success: true })
  } catch (error) {
    next(error)
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

const emitMessage = (chatId, message, extra = {}) => {
  const payload = Object.keys(extra).length > 0 ? { ...message, ...extra } : message
  io.to(`chat:${chatId}`).emit('message:new', payload)
  io.to('admins').emit('message:new', payload)
}

const emitMessageStatus = (chatId, statuses) => {
  io.to(`chat:${chatId}`).emit('messages:status', { chatId: Number(chatId), statuses })
  io.to('admins').emit('messages:status', { chatId: Number(chatId), statuses })
}

function timeOf(date) {
  return moment.utc(date).tz(MESSAGE_DAY_TIMEZONE).format('HH:mm')
}

function toUtcIso(value) {
  if (!value) return null
  const raw = String(value).trim()
  if (!raw) return null
  const parsed = raw.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(raw)
    ? moment(raw)
    : /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
      ? moment.utc(raw, 'YYYY-MM-DD HH:mm:ss', true)
      : moment.utc(raw)
  return parsed.isValid() ? parsed.toISOString() : null
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

function normalizeMessageText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const FICHAS_CREDITED_PATTERN = /en fichas por el evento/i

async function decorateDepositMessages(messages) {
  const hasSystemMessages = (messages || []).some(message => message?.senderType === 'system' && message?.messageType === 'text')
  if (!hasSystemMessages) return messages

  const depositText = await getAutoMessage('deposit_completed')
  const targetText = depositText ? normalizeMessageText(depositText) : null

  return (messages || []).map(message => {
    if (message?.senderType !== 'system' || message?.messageType !== 'text') return message
    if (targetText && normalizeMessageText(message.content) === targetText) {
      return { ...message, depositEvent: 'deposit_completed' }
    }
    if (FICHAS_CREDITED_PATTERN.test(message.content || '')) {
      return { ...message, depositEvent: 'fichas_credited' }
    }
    return message
  })
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
    deliveredAt: toUtcIso(row.delivered_at),
    readAt: toUtcIso(row.read_at),
    senderAvatarUrl,
    senderDisplayName: row.sender_display_name || '',
    replyTo,
    receiptLogId: row.receipt_log_id ? Number(row.receipt_log_id) : null,
    receiptLogProvider: row.receipt_log_provider || null,
    receiptLogMovementId: row.receipt_log_movement_id ? Number(row.receipt_log_movement_id) : null,
    receiptLogResultStatus: row.receipt_log_result_status || null,
    receiptLogResultReason: row.receipt_log_result_reason || null,
    receiptLogResultDetail: row.receipt_log_result_detail || null,
    depositEvent: row.receipt_log_result_reason === 'report_payment_paid' ? 'deposit_completed_report' : null,
    eventReceipt: row.event_id ? {
      participantId: row.event_participant_id ? Number(row.event_participant_id) : null,
      eventId: Number(row.event_id),
      eventType: row.event_type || null,
      eventTitle: row.event_title || null,
      eventStatus: row.event_status || null,
      receiptStatus: row.event_receipt_status || null,
      receiptRetryable: ['1', 'true', 'yes'].includes(String(row.event_receipt_retryable || '').toLowerCase()),
      receiptPending: ['1', 'true', 'yes'].includes(String(row.event_receipt_pending || '').toLowerCase()),
      receiptSource: row.event_receipt_source || 'event',
      receiptReason: row.event_receipt_reason || null,
      receiptChatId: row.event_receipt_chat_id ? Number(row.event_receipt_chat_id) : null,
      receiptMessageId: row.event_receipt_message_id ? Number(row.event_receipt_message_id) : null,
      receiptUrl: row.event_receipt_url || null,
      uploadedAt: row.event_receipt_uploaded_at || null,
      processedAt: row.event_receipt_processed_at || null,
      reward: row.event_reward_id ? {
        id: Number(row.event_reward_id),
        status: row.event_reward_status || null,
        type: row.event_reward_type || null,
        amount: row.event_reward_amount != null ? Number(row.event_reward_amount) : null,
        description: row.event_reward_description || null,
        paidAt: row.event_reward_paid_at || null,
        discardedAt: row.event_reward_discarded_at || null,
        discardReason: row.event_reward_discard_reason || null,
      } : null,
    } : null,
    createdAt: toUtcIso(row.created_at),
    createdAtUtc: toUtcIso(row.created_at_utc || row.created_at),
    time: timeOf(row.created_at_utc || row.created_at),
  }
}

function messageSelectSql(whereClause) {
  return `SELECT m.*, DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') AS created_at_utc,
                 u.avatar_url AS sender_avatar_url,
                 COALESCE(u.full_name, u.username, '') AS sender_display_name,
                 rl.id AS receipt_log_id,
                 rl.provider AS receipt_log_provider,
                 rl.movement_id AS receipt_log_movement_id,
                 rl.result_status AS receipt_log_result_status,
                 rl.result_reason AS receipt_log_result_reason,
                 rl.result_detail AS receipt_log_result_detail,
                 ep.id AS event_participant_id,
                 ep.event_id AS event_id,
                 e.type AS event_type,
                 e.title AS event_title,
                 e.status AS event_status,
                 ep.client_id AS event_client_id,
                 JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_status')) AS event_receipt_status,
                 JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_retryable')) AS event_receipt_retryable,
                 JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_pending')) AS event_receipt_pending,
                 JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_source')) AS event_receipt_source,
                 JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_processing_reason')) AS event_receipt_reason,
                 JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_chat_id')) AS event_receipt_chat_id,
                 JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_message_id')) AS event_receipt_message_id,
                 JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_url')) AS event_receipt_url,
                 JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.uploaded_at')) AS event_receipt_uploaded_at,
                 JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_processed_at')) AS event_receipt_processed_at,
                 er.id AS event_reward_id,
                 er.status AS event_reward_status,
                 er.reward_type AS event_reward_type,
                 er.reward_amount AS event_reward_amount,
                 er.reward_description AS event_reward_description,
                 er.paid_at AS event_reward_paid_at,
                 er.discarded_at AS event_reward_discarded_at,
                 er.discard_reason AS event_reward_discard_reason,
                 r.sender_type AS reply_sender_type,
                 r.message_type AS reply_message_type,
                 r.content AS reply_content,
                 r.file_name AS reply_file_name
          FROM messages m
          LEFT JOIN users u ON u.id = m.sender_user_id
          LEFT JOIN receipt_logs rl ON rl.id = (
            SELECT id FROM receipt_logs
            WHERE message_id = m.id
            ORDER BY id DESC
            LIMIT 1
          )
          LEFT JOIN event_participants ep ON ep.client_id = m.client_id AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_message_id')) = CAST(m.id AS CHAR)
          LEFT JOIN events e ON e.id = ep.event_id
          LEFT JOIN event_rewards er ON er.id = (
            SELECT id
            FROM event_rewards
            WHERE event_id = ep.event_id
              AND client_id = ep.client_id
              AND source = e.type
            ORDER BY created_at DESC
            LIMIT 1
          )
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
    createdAt: toUtcIso(row.created_at),
    lastMessageAt: toUtcIso(row.last_message_at),
    time: row.last_message_at ? timeOf(row.last_message_at) : '',
    joinDate: toUtcIso(row.registered_at),
    files: [],
    clientTags,
  }
}

export async function getClientFromRequest(req) {
  const payload = await getValidatedClientPayload(req)
  if (!payload?.sub) return null
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
    date: toUtcIso(row.created_at),
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
        messages: await decorateDepositMessages((rows || []).map(sanitizeMessage)),
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
    res.json({ messages: await decorateDepositMessages((rows || []).map(sanitizeMessage)) })
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
  extra = {},
}) {
  const normalizedContent = String(content || '').trim()
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
        normalizedContent || null,
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
    const isClientSender = senderType === 'client'
    await connection.execute(
      `UPDATE chats
       SET unread_count = unread_count + ?, client_unread_count = client_unread_count + ?, last_message = ?, last_message_type = ?, last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [isClientSender ? 1 : 0, isClientSender ? 0 : 1, preview.slice(0, 500), messageType, chatId]
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
  const chatRow = await getChat(chatId)
  const chat = sanitizeChat(chatRow)
  emitMessage(chatId, message, extra)
  if (chatRow?.client_id && message.senderType !== 'client') {
    io.to(`client:${chatRow.client_id}`).emit('message:notify', {
      id: message.id,
      chatId: Number(chatId),
      senderType: message.senderType,
      content: message.content || '',
      messageType: message.messageType || 'text',
      fileName: message.fileName || '',
    })
  }
  emitChatUpdate(chat)
  return { message, chat }
}

export async function triggerHybridAiBotRouting({
  chatId,
  clientId,
  messageId,
  clientMessageId,
  content,
}) {
  try {
    const { processHybridBotTextMessage } = await import('../services/aiBotRouter.js')
    return await processHybridBotTextMessage({
      chatId,
      clientId,
      messageId,
      clientMessageId,
      content,
    })
  } catch (error) {
    console.error('[BotAI] No se pudo ejecutar el router híbrido:', error.message)
    return { handled: false, error: error.message }
  }
}

async function runManualAiPipeline({ chatId, clientId, messageId, dataUrl, bankAccountId }) {
  console.log(`[Receipt] Pipeline manual — chatId=${chatId} messageId=${messageId} bankAccountId=${bankAccountId}`)

  let logId = null
  const logSteps = []
  const ts = () => new Date().toISOString()

  try {
    logId = await insertReceiptLog({ provider: 'manual', messageId, chatId, clientId })
  } catch (e) {
    console.error('[Receipt][Log] Error creando log manual:', e.message)
  }

  const receivedMsg = await getAutoMessage('receipt_received', { clientId, bankAccountId })
  if (receivedMsg) {
    await persistMessage({ chatId, senderType: 'system', content: receivedMsg })
  }

  let extracted = null
  let aiModel = null
  let aiStatus = 'error'
  logSteps.push({ step: 'ai_extraction_start', ts: ts(), detail: {} })
  try {
    extracted = await extractReceiptData(dataUrl)
    aiModel = extracted?.model || null
    aiStatus = 'ok'
    logSteps.push({
      step: 'ai_extraction_complete',
      ts: ts(),
      detail: { model: aiModel, extracted: { amount: extracted?.amount, transaction_id: extracted?.transaction_id, id_type: extracted?.id_type } },
    })
  } catch (err) {
    console.error('[Receipt] Error extracción IA:', err.message)
    logSteps.push({ step: 'ai_extraction_error', ts: ts(), detail: { error: err.message } })
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
      logSteps.push({ step: 'duplicate_found', ts: ts(), detail: { duplicateOfId } })
    } else {
      logSteps.push({ step: 'duplicate_check_ok', ts: ts(), detail: {} })
    }
  }

  const { rows: insertRows } = await query(
    `INSERT INTO manual_payment_movements
     (client_id, chat_id, message_id, bank_account_id, status, amount, ai_extracted_text, ai_status, ai_model, transaction_id, is_duplicate, duplicate_of_id)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
    [
      clientId, chatId, messageId, bankAccountId,
      extracted?.amount ?? 0,
      JSON.stringify(extracted),
      aiStatus, aiModel,
      extracted?.transaction_id ?? null,
      isDuplicate ? 1 : 0,
      duplicateOfId ?? null,
    ]
  )
  const movementDbId = insertRows?.insertId || null
  logSteps.push({ step: 'movement_created', ts: ts(), detail: { movementId: movementDbId, status: 'pending' } })

  let followUpEvent = null
  if (isDuplicate) {
    followUpEvent = 'receipt_duplicate'
  } else if (aiStatus === 'error') {
    followUpEvent = 'receipt_invalid'
  } else if (!extracted?.amount || !extracted?.transaction_id) {
    followUpEvent = 'receipt_insufficient_info'
  }

  if (followUpEvent) {
    const followMsg = await getAutoMessage(followUpEvent, { clientId, bankAccountId })
    if (followMsg) {
      await persistMessage({ chatId, senderType: 'system', content: followMsg })
    }
  }

  const resultStatus = isDuplicate ? 'duplicate' : aiStatus === 'error' ? 'error' : (!extracted?.amount || !extracted?.transaction_id) ? 'insufficient_info' : 'pending'
  const resultReason = isDuplicate ? 'duplicate_transaction_id' : aiStatus === 'error' ? 'ai_extraction_failed' : (!extracted?.transaction_id ? 'missing_transaction_id' : !extracted?.amount ? 'missing_amount' : 'pending_admin_review')
  try {
    await finalizeReceiptLog(logId, {
      movementId: movementDbId,
      aiModel,
      aiRawResponse: extracted?.rawResponse || null,
      aiExtractedJson: extracted ? { amount: extracted.amount, transaction_id: extracted.transaction_id, id_type: extracted.id_type } : null,
      processingSteps: logSteps,
      resultStatus,
      resultReason,
      resultDetail: { isDuplicate, duplicateOfId, aiStatus, bankAccountId },
    })
  } catch (e) {
    console.error('[Receipt][Log] Error finalizando log manual:', e.message)
  }
  return { status: resultStatus, resultReason, receiptLogId: logId, movementId: movementDbId, extractedData: extracted }
}

export async function processManualClientReceipt({ chatId, clientId, messageId, dataUrl, bankAccountId = null, eventMinDepositAmount = null }) {
  return runManualAiPipeline({ chatId, clientId, messageId, dataUrl, bankAccountId, eventMinDepositAmount })
}

export async function processReceiptAsync({ chatId, clientId, messageId, dataUrl, eventMinDepositAmount = null }) {
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

    if (active_provider === 'mercadopago') {
      const { processMercadoPagoClientReceipt } = await import('./mercadoPagoController.js')
      const result = await processMercadoPagoClientReceipt({
        chatId,
        clientId,
        messageId,
        dataUrl,
        fileName: '',
        eventMinDepositAmount,
      })
      const amount = result?.extractedData?.amount ? Number(result.extractedData.amount) : null
      if (result?.status) {
        io.to(`chat:${chatId}`).emit('receipt:result', {
          chatId: Number(chatId),
          messageId: Number(messageId),
          receiptLogId: result.receiptLogId || null,
          status: result.status,
          amount,
          date: result?.extractedData?.date || null,
          time: result?.extractedData?.time || null,
          transactionId: result?.extractedData?.transaction_id || null,
          resultReason: result.resultReason || null,
        })
      }
      if (result?.status === 'paid') {
        await new Promise(resolve => setTimeout(resolve, 250))
        await resetClientBot(chatId)
      }
      return result
    }

    if (active_provider === 'hgcash') {
      const { processHgCashClientReceipt } = await import('./hgCashController.js')
      const result = await processHgCashClientReceipt({
        chatId,
        clientId,
        messageId,
        dataUrl,
        fileName: '',
        eventMinDepositAmount,
      })
      const amount = result?.extractedData?.amount ? Number(result.extractedData.amount) : null
      if (result?.status) {
        io.to(`chat:${chatId}`).emit('receipt:result', {
          chatId: Number(chatId),
          messageId: result.autoMessageId ? Number(result.autoMessageId) : Number(messageId),
          status: result.status,
          amount,
          date: result?.extractedData?.date || null,
          time: result?.extractedData?.time || null,
          transactionId: result?.extractedData?.transaction_id || null,
          resultReason: result.resultReason || null,
        })
      }
      if (result?.status === 'paid') {
        await new Promise(resolve => setTimeout(resolve, 1500))
        await resetClientBot(chatId)
      }
      return result
    }

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
    const receivedMsg = await getAutoMessage('receipt_received', { clientId, bankAccountId })
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

    if (messageType === 'text') {
      void triggerHybridAiBotRouting({
        chatId,
        clientId: client.sub,
        messageId: result.message.id,
        clientMessageId: req.body?.clientMessageId || result.message.clientMessageId || '',
        content: String(req.body?.content || '').trim(),
      })
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

export async function getPendingCounts(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    if (!chatId) return res.status(400).json({ error: 'Chat inválido' })

    const [{ rows: movRows }, { rows: wrRows }] = await Promise.all([
      query(
        `SELECT COUNT(*) AS cnt FROM manual_payment_movements WHERE chat_id = ? AND status = 'pending'`,
        [chatId]
      ),
      query(
        `SELECT COUNT(*) AS cnt FROM withdrawal_requests WHERE chat_id = ? AND status = 'pending'`,
        [chatId]
      ),
    ])

    res.json({
      movements:   Number(movRows?.[0]?.cnt  || 0),
      withdrawals: Number(wrRows?.[0]?.cnt   || 0),
    })
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

async function getCasinoConfig() {
  const { rows } = await query('SELECT api_url, api_key FROM config_casino WHERE id = 1')
  if (!rows || rows.length === 0) throw new Error('Configuración de casino no encontrada.')
  const cfg = rows[0]
  if (!cfg.api_url || !cfg.api_key) throw new Error('URL de API o clave de API no configuradas.')
  return cfg
}

async function getChatExternalClient(chatId) {
  const { rows, error } = await query(
    `SELECT c.id AS client_id, c.external_id, c.username
     FROM chats ch
     JOIN clients c ON c.id = ch.client_id
     WHERE ch.id = ?`,
    [chatId]
  )
  if (error) throw error
  if (!rows?.length) {
    const err = new Error('Cliente no encontrado.')
    err.status = 404
    throw err
  }
  return rows[0]
}

function parseExternalAmount(val) {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return val
  let s = String(val).trim()
  if (s.indexOf(',') > -1 && s.indexOf('.') > -1 && s.indexOf(',') > s.indexOf('.')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else {
    s = s.replace(/[^0-9.,-]/g, '')
    if (s.indexOf('.') === -1 && s.indexOf(',') !== -1) {
      s = s.replace(',', '.')
    } else {
      s = s.replace(/,/g, '')
    }
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

export async function getChatTransactions(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    if (!chatId) return res.status(400).json({ error: 'ID de chat inválido.' })

    const page       = Math.max(1, parseInt(req.query.page  || '1',  10) || 1)
    const limit      = Math.max(1, Math.min(100, parseInt(req.query.limit || '20', 10) || 20))
    const offset     = (page - 1) * limit
    const search     = String(req.query.search || '').trim()
    const kindFilter = ['deposit', 'withdrawal'].includes(req.query.kind) ? req.query.kind : null
    const dateFrom   = req.query.dateFrom ? String(req.query.dateFrom).slice(0, 10) : null
    const dateTo     = req.query.dateTo   ? String(req.query.dateTo).slice(0, 10)   : null

    // Resolve client_id for balance_adjustments (keyed by client_id, not chat_id)
    const { rows: chatRows } = await query('SELECT client_id FROM chats WHERE id = ? LIMIT 1', [chatId])
    const clientId = chatRows?.[0]?.client_id ?? null

    // ── Main UNION (for list + count) ────────────────────────────────────
    // balance_adjustments: in → deposit/paid, out → withdrawal/approved
    const mainArgs = [chatId, chatId, chatId, chatId, chatId]
    if (clientId) { mainArgs.push(clientId, clientId) }

    const adjustmentRows = clientId ? `
        UNION ALL
        SELECT 'deposit'    AS kind, CAST(id AS CHAR) AS row_id, amount, 'paid'     AS status,
               created_at, 'adjustment' AS source, NULL AS form_data, '' AS transaction_id
          FROM balance_adjustments WHERE client_id = ? AND operation = 'in'
        UNION ALL
        SELECT 'withdrawal' AS kind, CAST(id AS CHAR) AS row_id, amount, 'approved' AS status,
               created_at, 'adjustment' AS source, NULL AS form_data, '' AS transaction_id
          FROM balance_adjustments WHERE client_id = ? AND operation = 'out'` : ''

    const innerSql = `
      SELECT kind, row_id, amount, status, created_at, source, form_data, transaction_id
      FROM (
        SELECT 'deposit' AS kind, CAST(id AS CHAR) AS row_id, amount, status, created_at,
               'manual' AS source, NULL AS form_data, COALESCE(transaction_id, '') AS transaction_id
          FROM manual_payment_movements WHERE chat_id = ?
        UNION ALL
        SELECT 'deposit', CAST(id AS CHAR), amount, status, created_at, 'hgcash', NULL, ''
          FROM hgcash_movements WHERE chat_id = ?
        UNION ALL
        SELECT 'deposit', CAST(id AS CHAR), amount, status, created_at, 'mercadopago', NULL, ''
          FROM mercadopago_movements WHERE chat_id = ?
        UNION ALL
        SELECT 'deposit', CAST(id AS CHAR), amount, status, created_at, 'telepagos', NULL, ''
          FROM telepagos_movements WHERE chat_id = ?
        UNION ALL
        SELECT 'withdrawal', CAST(id AS CHAR), NULL AS amount, status, created_at, 'withdrawal', form_data, ''
          FROM withdrawal_requests WHERE chat_id = ?
        ${adjustmentRows}
      ) AS all_txns`

    // ── Filter conditions ────────────────────────────────────────────────
    const conditions  = []
    const filterArgs  = []
    if (kindFilter) {
      conditions.push('kind = ?')
      filterArgs.push(kindFilter)
    }
    if (dateFrom) {
      conditions.push('created_at >= ?')
      filterArgs.push(`${dateFrom} 00:00:00`)
    }
    if (dateTo) {
      conditions.push('created_at <= ?')
      filterArgs.push(`${dateTo} 23:59:59`)
    }
    if (search) {
      conditions.push('(row_id LIKE ? OR CAST(COALESCE(amount, 0) AS CHAR) LIKE ? OR transaction_id LIKE ? OR COALESCE(form_data, \'\') LIKE ?)')
      const s = `%${search}%`
      filterArgs.push(s, s, s, s)
    }
    const whereSQL = conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''

    // ── Stats UNION (simpler — no row_id / form_data needed) ────────────
    // Stats respect kind + date filters but NOT search (so counts stay accurate).
    const statsArgs = [chatId, chatId, chatId, chatId, chatId]
    if (clientId) { statsArgs.push(clientId, clientId) }

    const statsAdjRows = clientId ? `
        UNION ALL
        SELECT 'deposit'    AS kind, amount, 'paid'     AS status, created_at FROM balance_adjustments WHERE client_id = ? AND operation = 'in'
        UNION ALL
        SELECT 'withdrawal' AS kind, amount, 'approved' AS status, created_at FROM balance_adjustments WHERE client_id = ? AND operation = 'out'` : ''

    const statsInnerSql = `
      SELECT kind, amount, status, created_at FROM (
        SELECT 'deposit'    AS kind, amount, status, created_at FROM manual_payment_movements WHERE chat_id = ?
        UNION ALL
        SELECT 'deposit',                    amount, status, created_at FROM hgcash_movements    WHERE chat_id = ?
        UNION ALL
        SELECT 'deposit',                    amount, status, created_at FROM mercadopago_movements WHERE chat_id = ?
        UNION ALL
        SELECT 'deposit',                    amount, status, created_at FROM telepagos_movements  WHERE chat_id = ?
        UNION ALL
        SELECT 'withdrawal', NULL AS amount, status, created_at FROM withdrawal_requests WHERE chat_id = ?
        ${statsAdjRows}
      ) AS _s`

    const statsConditions = []
    const statsFilterArgs = []
    if (kindFilter) { statsConditions.push('kind = ?');        statsFilterArgs.push(kindFilter) }
    if (dateFrom)   { statsConditions.push('created_at >= ?'); statsFilterArgs.push(`${dateFrom} 00:00:00`) }
    if (dateTo)     { statsConditions.push('created_at <= ?'); statsFilterArgs.push(`${dateTo} 23:59:59`) }
    const statsWhereSQL = statsConditions.length ? ' WHERE ' + statsConditions.join(' AND ') : ''

    const [countResult, dataResult, statsResult] = await Promise.all([
      query(
        `SELECT COUNT(*) AS total FROM (${innerSql}${whereSQL}) AS cnt`,
        [...mainArgs, ...filterArgs]
      ),
      query(
        `${innerSql}${whereSQL} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        [...mainArgs, ...filterArgs]
      ),
      query(`
        SELECT
          COUNT(CASE WHEN kind = 'deposit'    THEN 1 END) AS deposit_count,
          COUNT(CASE WHEN kind = 'withdrawal' THEN 1 END) AS withdrawal_count,
          COUNT(*)                                         AS total_count,
          COALESCE(SUM(CASE WHEN kind = 'deposit'    AND status = 'paid'     THEN COALESCE(amount, 0) END), 0) AS total_deposited,
          COALESCE(SUM(CASE WHEN kind = 'withdrawal' AND status = 'approved' THEN COALESCE(amount, 0) END), 0) AS total_withdrawn
        FROM (${statsInnerSql}${statsWhereSQL}) AS agg
      `, [...statsArgs, ...statsFilterArgs]),
    ])

    if (countResult.error) throw countResult.error
    if (dataResult.error)  throw dataResult.error
    if (statsResult.error) throw statsResult.error

    const total      = Number(countResult.rows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))

    const transactions = (dataResult.rows || []).map(r => {
      let amount = r.amount !== null && r.amount !== undefined ? Number(r.amount) : null
      if (r.kind === 'withdrawal' && amount === null && r.form_data) {
        try {
          const fd = JSON.parse(r.form_data)
          amount = Number(fd.monto ?? fd.amount ?? 0) || null
        } catch {
          for (const line of String(r.form_data).split('\n')) {
            if (/monto|importe|amount/i.test(line)) {
              const idx = line.indexOf(':')
              if (idx >= 0) {
                const n = parseFloat(line.slice(idx + 1).replace(/[^0-9.]/g, ''))
                if (!isNaN(n)) { amount = n; break }
              }
            }
          }
        }
      }
      return {
        kind:          r.kind,
        id:            r.row_id,
        amount,
        status:        r.status,
        source:        r.source,
        transactionId: r.transaction_id || null,
        createdAt:     r.created_at,
      }
    })

    const s = statsResult.rows?.[0] || {}
    res.json({
      transactions,
      pagination: { page, limit, total, totalPages, hasMore: page < totalPages },
      stats: {
        totalCount:      Number(s.total_count      || 0),
        depositCount:    Number(s.deposit_count    || 0),
        withdrawalCount: Number(s.withdrawal_count || 0),
        totalDeposited:  Number(s.total_deposited  || 0),
        totalWithdrawn:  Number(s.total_withdrawn  || 0),
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function getChatClientBalance(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    if (!chatId) return res.status(400).json({ error: 'ID de chat inválido.' })

    const client = await getChatExternalClient(chatId)
    if (!client.external_id) return res.status(400).json({ error: 'El cliente no tiene ID externo asignado.' })

    const { api_url: apiUrl, api_key: apiKey } = await getCasinoConfig()

    const url = `${apiUrl}index.php?act=admin&area=balance&id=${client.external_id}&response=js`
    const formData = new URLSearchParams()
    formData.append('api_token', apiKey)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })

    const data = await response.json()

    const arsBalance = parseExternalAmount(data.currencies?.ARS ?? data.dataList?.currencies?.ARS)
    const wager = parseExternalAmount(data.wager ?? data.dataList?.wager)
    const withdrawable = arsBalance !== null
      ? (wager !== null && wager > 0 ? Math.max(0, arsBalance - wager) : arsBalance)
      : null

    res.json({
      username: client.username,
      balance: arsBalance,
      wager,
      withdrawable,
    })
  } catch (error) {
    next(error)
  }
}

export async function adjustChatClientBalance(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    const amount = Number(req.body?.amount)
    const operation = String(req.body?.operation || '')

    if (!chatId) return res.status(400).json({ error: 'ID de chat inválido.' })
    if (!amount || amount <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0.' })
    if (!['in', 'out'].includes(operation)) return res.status(400).json({ error: 'Operación inválida.' })

    const client = await getChatExternalClient(chatId)
    if (!client.external_id) return res.status(400).json({ error: 'El cliente no tiene ID externo asignado.' })

    const { api_url: apiUrl, api_key: apiKey } = await getCasinoConfig()

    const url = `${apiUrl}index.php?act=admin&area=balance&type=frame&id=${client.external_id}&response=js`
    const formData = new URLSearchParams()
    formData.append('operation', operation)
    formData.append('send', 'true')
    formData.append('amount', String(amount))
    formData.append('balance_currency', 'ARS')
    formData.append('api_token', apiKey)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    })

    const data = await response.json()

    if (!data?.successMessage) {
      const msg = (data?.errorMessage || data?.message || data?.error || '').trim()
      return res.status(502).json({ error: msg || 'Error al modificar el saldo en la plataforma.' })
    }

    res.json({
      success: true,
      message: data.successMessage,
      balance: data.currencies?.ARS ?? null,
    })
    io?.to(`chat:${chatId}`).emit('balance:updated', {
      chatId,
      balance: data.currencies?.ARS ?? null,
    })

    // Log the adjustment locally so it appears in client history
    query(
      `INSERT INTO balance_adjustments (client_id, chat_id, amount, operation, performed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [client.client_id, chatId, amount, operation, req.user?.id ?? null]
    ).catch(e => console.error('[adjustBalance] log error:', e?.message))

    // Send configurable auto-message to client
    const msgKey = operation === 'in' ? 'balance_added' : 'balance_removed'
    getAutoMessage(msgKey, { amount })
      .then(msg => {
        if (msg) {
          return persistMessage({ chatId, senderType: 'system', content: msg })
        }
      })
      .catch(e => console.error('[adjustBalance] auto-message error:', e?.message))
  } catch (error) {
    next(error)
  }
}


