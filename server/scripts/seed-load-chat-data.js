import dotenv from 'dotenv'
import { initializePool, getPool, closePool } from '../config/database.js'

dotenv.config()

const DEFAULTS = {
  clients: 1000,
  messages: 100000,
  batchSize: 1000,
  prefix: `load_${Date.now()}`,
  password: 'test1234',
  daysBack: 30,
  archivedRate: 0.08,
  unreadRate: 0.35,
  adminReplyRate: 0.45,
}

const BOT_STATES = [
  { screen: 'screen-cargar', button: 'i2', label: 'Cargar' },
  { screen: 'screen-retirar', button: 'i3', label: 'Retirar' },
  { screen: 'screen-soporte', button: 'i4', label: 'Soporte' },
  { screen: 'screen-cuponera', button: 'i5', label: 'Cuponera' },
]

const CLIENT_TEXTS = [
  'Hola, necesito ayuda con mi cuenta',
  'Quiero cargar saldo',
  'Ya envie el comprobante',
  'Necesito retirar por favor',
  'Me podrian confirmar el estado?',
  'No me aparece el saldo todavia',
  'Me pasan los datos para transferir?',
  'Gracias, quedo atento',
]

const ADMIN_TEXTS = [
  'Hola, ya te ayudamos con eso',
  'Perfecto, revisamos el comprobante',
  'Indicanos el monto por favor',
  'Ya lo derivamos al area correspondiente',
  'En unos minutos te confirmamos',
  'Necesitamos un dato adicional para continuar',
  'Operacion procesada correctamente',
]

function parseArgs() {
  const args = { ...DEFAULTS }
  for (const rawArg of process.argv.slice(2)) {
    const [key, rawValue = 'true'] = rawArg.replace(/^--/, '').split('=')
    if (!key) continue
    if (['clients', 'messages', 'batchSize', 'daysBack'].includes(key)) {
      args[key] = Math.max(1, Number.parseInt(rawValue, 10) || DEFAULTS[key])
    } else if (['archivedRate', 'unreadRate', 'adminReplyRate'].includes(key)) {
      args[key] = Math.min(1, Math.max(0, Number.parseFloat(rawValue)))
    } else {
      args[key] = rawValue
    }
  }
  return args
}

function pick(items, index) {
  return items[index % items.length]
}

function randomDate(daysBack) {
  const now = Date.now()
  const spreadMs = daysBack * 24 * 60 * 60 * 1000
  return new Date(now - Math.floor(Math.random() * spreadMs))
}

function mysqlDate(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function createPlaceholders(rows, columns) {
  return rows.map(() => `(${Array.from({ length: columns }, () => '?').join(',')})`).join(',')
}

async function insertRows(connection, table, columns, rows) {
  if (rows.length === 0) return { affectedRows: 0 }
  const sql = `INSERT INTO ${table} (${columns.map(column => `\`${column}\``).join(',')}) VALUES ${createPlaceholders(rows, columns.length)}`
  const values = rows.flat()
  const [result] = await connection.query(sql, values)
  return result
}

async function getAdminUserId(connection) {
  const [rows] = await connection.query(
    "SELECT id FROM users WHERE role IN ('admin','cashier') AND is_active = 1 ORDER BY id ASC LIMIT 1"
  )
  return rows?.[0]?.id || null
}

function buildClientRows({ prefix, password, clients }) {
  return Array.from({ length: clients }, (_, index) => {
    const number = String(index + 1).padStart(7, '0')
    const username = `${prefix}_cliente_${number}`.slice(0, 60)
    const registeredAt = mysqlDate(randomDate(90))
    return [
      username,
      `Cliente Prueba ${number}`,
      password,
      `Cliente generado para pruebas de carga. Lote ${prefix}.`,
      `20${String(index + 1).padStart(9, '0')}`,
      `EXT-${prefix}-${number}`.slice(0, 120),
      Math.random() > 0.5 ? 1 : 0,
      1,
      Math.random() > 0.85 ? 1 : 0,
      registeredAt,
    ]
  })
}

function buildChatRows({ clientIds, adminUserId, archivedRate }) {
  return clientIds.map((clientId, index) => {
    const botState = pick(BOT_STATES, index)
    const createdAt = mysqlDate(randomDate(45))
    return [
      clientId,
      Math.random() > 0.65 ? adminUserId : null,
      1,
      Math.random() < archivedRate ? 1 : 0,
      0,
      'Chat generado para pruebas',
      'text',
      createdAt,
      botState.screen,
      botState.button,
      createdAt,
    ]
  })
}

function buildMessageRows({ chatClientPairs, adminUserId, startIndex, count, options }) {
  const rows = []
  const lastByChat = new Map()
  const unreadByChat = new Map()

  for (let offset = 0; offset < count; offset += 1) {
    const messageIndex = startIndex + offset
    const pair = chatClientPairs[messageIndex % chatClientPairs.length]
    const isAdmin = Boolean(adminUserId) && Math.random() < options.adminReplyRate
    const createdAt = randomDate(options.daysBack)
    const createdAtSql = mysqlDate(createdAt)
    const isRead = isAdmin ? Math.random() > options.unreadRate : Math.random() > 0.12
    const deliveredAt = isAdmin && Math.random() > 0.08
      ? mysqlDate(new Date(createdAt.getTime() + 2000 + Math.floor(Math.random() * 120000)))
      : null
    const readAt = isAdmin && isRead && deliveredAt
      ? mysqlDate(new Date(createdAt.getTime() + 30000 + Math.floor(Math.random() * 900000)))
      : null
    const content = isAdmin
      ? `${pick(ADMIN_TEXTS, messageIndex)} #${messageIndex + 1}`
      : `${pick(CLIENT_TEXTS, messageIndex)} #${messageIndex + 1}`

    rows.push([
      pair.chatId,
      isAdmin ? null : pair.clientId,
      isAdmin ? 'admin' : 'client',
      isAdmin ? adminUserId : null,
      'text',
      content,
      isRead ? 1 : 0,
      deliveredAt,
      readAt,
      createdAtSql,
    ])

    const currentLast = lastByChat.get(pair.chatId)
    if (!currentLast || createdAt > currentLast.date) {
      lastByChat.set(pair.chatId, {
        date: createdAt,
        content,
        type: 'text',
      })
    }
    if (!isAdmin && !isRead) {
      unreadByChat.set(pair.chatId, (unreadByChat.get(pair.chatId) || 0) + 1)
    }
  }

  return { rows, lastByChat, unreadByChat }
}

function mergeChatStats(target, sourceLast, sourceUnread) {
  for (const [chatId, last] of sourceLast.entries()) {
    const current = target.lastByChat.get(chatId)
    if (!current || last.date > current.date) target.lastByChat.set(chatId, last)
  }
  for (const [chatId, unread] of sourceUnread.entries()) {
    target.unreadByChat.set(chatId, (target.unreadByChat.get(chatId) || 0) + unread)
  }
}

async function updateChatSummaries(connection, stats, batchSize) {
  const entries = Array.from(stats.lastByChat.entries())
  for (let index = 0; index < entries.length; index += batchSize) {
    const chunk = entries.slice(index, index + batchSize)
    for (const [chatId, last] of chunk) {
      const unread = stats.unreadByChat.get(chatId) || 0
      await connection.query(
        `UPDATE chats
         SET unread_count = ?, last_message = ?, last_message_type = ?, last_message_at = ?
         WHERE id = ?`,
        [unread, last.content.slice(0, 500), last.type, mysqlDate(last.date), chatId]
      )
    }
  }
}

async function main() {
  const options = parseArgs()
  const startedAt = Date.now()
  await initializePool()
  const connection = await getPool().getConnection()

  try {
    console.log('Generando data de carga...')
    console.log(`Clientes: ${options.clients.toLocaleString('es-AR')}`)
    console.log(`Mensajes: ${options.messages.toLocaleString('es-AR')}`)
    console.log(`Batch: ${options.batchSize.toLocaleString('es-AR')}`)
    console.log(`Prefijo: ${options.prefix}`)

    const adminUserId = await getAdminUserId(connection)
    if (!adminUserId) {
      console.warn('No hay admin/cajero activo. Los mensajes de respuesta admin se omitiran.')
      options.adminReplyRate = 0
    }

    const clientColumns = [
      'username',
      'full_name',
      'password_hash',
      'note',
      'cuil',
      'external_id',
      'is_new',
      'is_active',
      'is_online',
      'registered_at',
    ]
    const clientRows = buildClientRows(options)
    const clientIds = []

    for (let index = 0; index < clientRows.length; index += options.batchSize) {
      const chunk = clientRows.slice(index, index + options.batchSize)
      const result = await insertRows(connection, 'clients', clientColumns, chunk)
      for (let id = Number(result.insertId); id < Number(result.insertId) + result.affectedRows; id += 1) {
        clientIds.push(id)
      }
      console.log(`Clientes insertados: ${Math.min(index + chunk.length, clientRows.length).toLocaleString('es-AR')}`)
    }

    const chatColumns = [
      'client_id',
      'assigned_user_id',
      'is_open',
      'is_archived',
      'unread_count',
      'last_message',
      'last_message_type',
      'last_message_at',
      'bot_screen_id',
      'bot_last_button_id',
      'created_at',
    ]
    const chatRows = buildChatRows({ clientIds, adminUserId, archivedRate: options.archivedRate })
    const chatClientPairs = []

    for (let index = 0; index < chatRows.length; index += options.batchSize) {
      const chunk = chatRows.slice(index, index + options.batchSize)
      const result = await insertRows(connection, 'chats', chatColumns, chunk)
      for (let offset = 0; offset < result.affectedRows; offset += 1) {
        chatClientPairs.push({
          chatId: Number(result.insertId) + offset,
          clientId: clientIds[index + offset],
        })
      }
      console.log(`Chats insertados: ${Math.min(index + chunk.length, chatRows.length).toLocaleString('es-AR')}`)
    }

    const messageColumns = [
      'chat_id',
      'client_id',
      'sender_type',
      'sender_user_id',
      'message_type',
      'content',
      'is_read',
      'delivered_at',
      'read_at',
      'created_at',
    ]
    const stats = {
      lastByChat: new Map(),
      unreadByChat: new Map(),
    }

    for (let inserted = 0; inserted < options.messages; inserted += options.batchSize) {
      const count = Math.min(options.batchSize, options.messages - inserted)
      const { rows, lastByChat, unreadByChat } = buildMessageRows({
        chatClientPairs,
        adminUserId,
        startIndex: inserted,
        count,
        options,
      })
      await insertRows(connection, 'messages', messageColumns, rows)
      mergeChatStats(stats, lastByChat, unreadByChat)
      if ((inserted + count) % (options.batchSize * 10) === 0 || inserted + count === options.messages) {
        console.log(`Mensajes insertados: ${(inserted + count).toLocaleString('es-AR')}`)
      }
    }

    console.log('Actualizando resumen de chats...')
    await updateChatSummaries(connection, stats, Math.min(options.batchSize, 500))

    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log('Carga finalizada.')
    console.log(`Prefijo usado: ${options.prefix}`)
    console.log(`Tiempo: ${elapsedSeconds}s`)
    console.log(`Para borrar este lote:`)
    console.log(`DELETE FROM clients WHERE username LIKE '${options.prefix}_cliente_%';`)
  } catch (error) {
    console.error('Error generando data de carga:', error.message || error)
    process.exitCode = 1
  } finally {
    connection.release()
    await closePool()
  }
}

main()
