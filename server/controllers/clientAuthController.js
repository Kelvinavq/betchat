import jwt from 'jsonwebtoken'
import { randomUUID } from 'crypto'
import { query, transaction } from '../config/database.js'
import { config } from '../config/config.js'
import { getCookieValue } from '../middlewares/authMiddleware.js'
import { io } from '../app.js'
import { getSystemConfig } from './settingsController.js'

const normalizeUsername = (value) => String(value || '').trim()
const hasWhitespace = (value) => /\s/.test(value)
const hasUppercase = (value) => /[A-Z]/.test(value)
const getExternalErrorMessage = (data) => {
  const message = data?.errorMessage || data?.message || data?.error
  return typeof message === 'string' ? message.trim() : ''
}

const normalizeApiUrl = (value) => {
  const url = String(value || '').trim()
  if (!url) return ''
  return url.endsWith('/') ? url : `${url}/`
}

const clientCookieOptions = {
  ...config.jwtCookieOptions,
  maxAge: config.jwtCookieOptions.maxAge,
}

function sanitizeClient(client, chatId = null) {
  return {
    id: client.id,
    username: client.username,
    fullName: client.full_name || client.username,
    externalId: client.external_id || null,
    active: Boolean(client.is_active),
    online: Boolean(client.is_online),
    temporary: Boolean(client.is_temporary),
    tempSessionActive: client.temp_session_active !== 0,
    chatId,
  }
}

function signClientToken(clientId, username) {
  return jwt.sign(
    {
      sub: clientId,
      username,
      role: 'client',
      type: 'client',
      jti: randomUUID(),
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
      issuer: config.jwtIssuer,
      algorithm: 'HS256',
    }
  )
}

function setClientCookie(res, token) {
  res.cookie(config.clientJwtCookieName, token, clientCookieOptions)
}

function clearClientCookie(res) {
  res.clearCookie(config.clientJwtCookieName, {
    ...config.jwtCookieOptions,
    maxAge: 0,
  })
}

async function getCasinoConfig() {
  const { rows, error } = await query(
    'SELECT api_url, api_key FROM config_casino WHERE id = 1 LIMIT 1'
  )
  if (error) throw error

  const casinoConfig = rows?.[0]
  if (!casinoConfig?.api_url || !casinoConfig?.api_key) {
    const err = new Error('La configuracion de casino no esta completa.')
    err.status = 500
    throw err
  }

  return {
    apiUrl: normalizeApiUrl(casinoConfig.api_url),
    apiKey: casinoConfig.api_key,
  }
}

async function postCasinoForm(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const err = new Error('No se pudo consultar la plataforma externa.')
    err.status = response.status
    err.details = data
    throw err
  }

  return data
}

async function findExternalUser(username) {
  const { apiUrl, apiKey } = await getCasinoConfig()

  const usersForm = new URLSearchParams()
  usersForm.append('api_token', apiKey)

  const usersData = await postCasinoForm(
    `${apiUrl}index.php?act=admin&area=users&response=js&search=${encodeURIComponent(username)}&limit=1`,
    usersForm
  )

  if (!usersData || typeof usersData !== 'object' || !usersData.users) {
    if (usersData?.error === 'No access') {
      const err = new Error('Acceso denegado en la plataforma externa.')
      err.status = 401
      throw err
    }

    const err = new Error('Respuesta invalida de la plataforma externa.')
    err.status = 502
    throw err
  }

  const directUser = usersData.users.find(user =>
    String(user.login || '').toLowerCase() === username.toLowerCase() &&
    user.login !== 'En total'
  )

  if (directUser?.id) {
    return { apiUrl, apiKey, externalId: directUser.id, user: directUser }
  }

  const searchForm = new URLSearchParams()
  searchForm.append('api_token', apiKey)
  searchForm.append('search_login', username)
  searchForm.append('page', '1')

  const searchData = await postCasinoForm(
    `${apiUrl}index.php?act=admin&area=search&response=js`,
    searchForm
  )

  const altUser = searchData?.users?.find(user =>
    String(user.login || '').toLowerCase() === username.toLowerCase()
  )

  if (!altUser?.id) {
    const err = new Error('Usuario no encontrado en la plataforma externa.')
    err.status = 404
    throw err
  }

  return { apiUrl, apiKey, externalId: altUser.id, user: altUser }
}

async function getExternalPassword(apiUrl, apiKey, externalId) {
  const buttonsForm = new URLSearchParams()
  buttonsForm.append('api_token', apiKey)

  const buttonsData = await postCasinoForm(
    `${apiUrl}index.php?act=admin&area=buttons&id=${externalId}`,
    buttonsForm
  )

  const copyAuth = buttonsData?.buttons?.find(button => button.name === 'copy_auth')
  const copyLink = copyAuth?.copy_link
  const passwordMatch = String(copyLink || '').match(/(?:Contraseña|Password):\s*([^\s].*)/i)

  if (!passwordMatch) {
    const err = new Error('No se pudo obtener la contrasena desde la plataforma externa.')
    err.status = 502
    throw err
  }

  return passwordMatch[1].trim()
}

async function createExternalUser(apiUrl, apiKey, username, password) {
  const createForm = new URLSearchParams()
  createForm.append('sended', 'true')
  createForm.append('group', '5')
  createForm.append('login', username)
  createForm.append('password', password)
  createForm.append('balance', '0')
  createForm.append('api_token', apiKey)

  const data = await postCasinoForm(
    `${apiUrl}index.php?act=admin&area=createuser&response=js`,
    createForm
  )

  if (data?.error === 'Sin derechos') {
    const err = new Error('La caja no tiene permisos suficientes para crear usuarios.')
    err.status = 403
    throw err
  }

  if (!data?.success) {
    const externalMessage = getExternalErrorMessage(data)
    const isUnavailable = /existe|exist|disponible|available/i.test(externalMessage)
    const err = new Error(isUnavailable
      ? 'Ese usuario no esta disponible.'
      : externalMessage || 'No se pudo crear el usuario en la plataforma externa.'
    )
    err.status = isUnavailable ? 409 : 502
    err.code = isUnavailable ? 'USERNAME_UNAVAILABLE' : 'EXTERNAL_CREATE_FAILED'
    err.details = data
    throw err
  }

  if (!data.id) {
    const err = new Error('No se pudo obtener el ID del usuario creado.')
    err.status = 502
    err.details = data
    throw err
  }

  return { externalId: data.id, data }
}

async function findLocalClient(username) {
  const { rows, error } = await query(
    `SELECT id, username, full_name, password, external_id, is_active, is_online
     FROM clients
     WHERE LOWER(username) = LOWER(?)
     LIMIT 1`,
    [username]
  )
  if (error) throw error
  return rows?.[0] || null
}

async function ensureClientAndChat({ username, password, externalId }) {
  return transaction(async (connection) => {
    const [clientRows] = await connection.execute(
      `SELECT id, username, full_name, password, external_id, is_active, is_online
       FROM clients
       WHERE LOWER(username) = LOWER(?)
       LIMIT 1`,
      [username]
    )

    let client = clientRows?.[0]

    if (!client) {
      const [clientResult] = await connection.execute(
        `INSERT INTO clients (username, full_name, password, external_id, is_active, is_online, registered_at)
         VALUES (?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)`,
        [username, username, password, externalId || null]
      )

      client = {
        id: clientResult.insertId,
        username,
        full_name: username,
        password: password,
        external_id: externalId || null,
        is_active: 1,
        is_online: 1,
      }
    } else {
      await connection.execute(
        `UPDATE clients
         SET external_id = COALESCE(external_id, ?), is_online = 1, last_seen_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [externalId || null, client.id]
      )
      client = {
        ...client,
        external_id: client.external_id || externalId || null,
        is_online: 1,
      }
    }

    const [chatRows] = await connection.execute(
      'SELECT id FROM chats WHERE client_id = ? AND is_archived = 0 ORDER BY id DESC LIMIT 1',
      [client.id]
    )

    let chatId = chatRows?.[0]?.id
    if (!chatId) {
      const [chatResult] = await connection.execute(
        `INSERT INTO chats (client_id, is_open, is_archived, unread_count, created_at)
         VALUES (?, 1, 0, 0, CURRENT_TIMESTAMP)`,
        [client.id]
      )
      chatId = chatResult.insertId
    }

    return { client, chatId }
  })
}

async function startClientSession(res, client, chatId) {
  const token = signClientToken(client.id, client.username)
  setClientCookie(res, token)

  await query(
    'UPDATE clients SET is_online = 1, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?',
    [client.id]
  )

  io.emit('client:online-status', {
    clientId: client.id,
    username: client.username,
    online: true,
  })

  return {
    expiresIn: config.jwtExpiresIn,
    client: sanitizeClient({ ...client, is_online: 1 }, chatId),
  }
}

const HELP_REASONS = {
  forgot_user: 'Olvido usuario',
  forgot_password: 'Olvido contrasena',
  register: 'Quiere registrarse',
  other: 'Otra consulta',
}

export async function createHelpSession(req, res, next) {
  try {
    const rawReason = String(req.body?.reason || 'other').trim()
    const reason = HELP_REASONS[rawReason] ? rawReason : 'other'
    const note = String(req.body?.note || '').trim().slice(0, 1000)
    if (reason === 'other' && !note) {
      return res.status(400).json({ error: 'Contanos que necesitas para abrir el chat de ayuda.', code: 'HELP_NOTE_REQUIRED' })
    }

    const username = `ayuda_${Date.now()}_${randomUUID().slice(0, 6)}`
    const fullName = `Ayuda - ${HELP_REASONS[reason]}`
    const initialText = reason === 'other'
      ? `Solicitud de ayuda: ${HELP_REASONS[reason]}\n${note}`
      : `Solicitud de ayuda: ${HELP_REASONS[reason]}`

    const result = await transaction(async (connection) => {
      const [clientResult] = await connection.execute(
        `INSERT INTO clients
          (username, full_name, password, external_id, is_active, is_online, is_temporary, temp_session_active, registered_at)
         VALUES (?, ?, ?, NULL, 1, 1, 1, 1, CURRENT_TIMESTAMP)`,
        [username, fullName, randomUUID()]
      )
      const clientId = clientResult.insertId

      const [chatResult] = await connection.execute(
        `INSERT INTO chats
          (client_id, is_open, is_archived, is_help_request, help_reason, help_note, unread_count, last_message, last_message_type, last_message_at, created_at)
         VALUES (?, 1, 0, 1, ?, ?, 1, ?, 'text', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [clientId, reason, note || null, initialText]
      )
      const chatId = chatResult.insertId

      await connection.execute(
        `INSERT INTO messages (chat_id, client_id, sender_type, message_type, content, is_read, created_at)
         VALUES (?, ?, 'client', 'text', ?, 0, CURRENT_TIMESTAMP)`,
        [chatId, clientId, initialText]
      )

      return {
        client: {
          id: clientId,
          username,
          full_name: fullName,
          external_id: null,
          is_active: 1,
          is_online: 1,
          is_temporary: 1,
          temp_session_active: 1,
        },
        chatId,
      }
    })

    io.to('admins').emit('chat:updated', {
      id: Number(result.chatId),
      clientId: Number(result.client.id),
      username: result.client.username,
      fullName: result.client.full_name,
      isHelpRequest: true,
      helpReason: reason,
      helpNote: note,
      active: true,
      online: true,
      isOpen: true,
      isArchived: false,
      unread: 1,
      lastMsg: initialText,
      lastMessageType: 'text',
      lastMessageAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      files: [],
      clientTags: [],
    })

    res.status(201).json(await startClientSession(res, result.client, result.chatId))
  } catch (error) {
    next(error)
  }
}

export async function autoLoginClient(req, res, next) {
  try {
    const username = normalizeUsername(req.body?.username)
    if (!username) {
      return res.status(400).json({ error: 'El nombre de usuario es obligatorio.' })
    }

    const localClient = await findLocalClient(username)
    if (localClient) {
      if (!localClient.is_active) {
        return res.status(403).json({ error: 'Cliente desactivado.', code: 'CLIENT_INACTIVE' })
      }

      const { client, chatId } = await ensureClientAndChat({
        username: localClient.username,
        password: randomUUID(),
        externalId: localClient.external_id,
      })
      return res.json(await startClientSession(res, client, chatId))
    }

    const external = await findExternalUser(username)
    const externalPassword = await getExternalPassword(external.apiUrl, external.apiKey, external.externalId)
    const { client, chatId } = await ensureClientAndChat({
      username,
      password: externalPassword,
      externalId: external.externalId,
    })

    res.json(await startClientSession(res, client, chatId))
  } catch (error) {
    next(error)
  }
}

export async function loginClient(req, res, next) {
  try {
    const username = normalizeUsername(req.body?.username)
    const password = String(req.body?.password || '')

    if (!username || !password) {
      return res.status(400).json({
        error: 'El nombre de usuario y la contrasena son obligatorios.',
      })
    }

    const external = await findExternalUser(username)
    const externalPassword = await getExternalPassword(external.apiUrl, external.apiKey, external.externalId)

    if (password !== externalPassword) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' })
    }

    const localClient = await findLocalClient(username)
    const { client, chatId } = await ensureClientAndChat({
      username: localClient?.username || username,
      password,
      externalId: external.externalId,
    })

    if (!client.is_active) {
      return res.status(403).json({ error: 'Cliente desactivado.', code: 'CLIENT_INACTIVE' })
    }

    res.json(await startClientSession(res, client, chatId))
  } catch (error) {
    next(error)
  }
}

export async function registerClient(req, res, next) {
  try {
    const systemConfig = await getSystemConfig()
    if (!systemConfig.clientRegistrationEnabled) {
      return res.status(403).json({
        error: 'El registro de clientes esta deshabilitado.',
        code: 'CLIENT_REGISTRATION_DISABLED',
      })
    }

    const username = normalizeUsername(req.body?.username)
    const password = String(req.body?.password || '')

    if (!username || !password) {
      return res.status(400).json({
        error: 'El nombre de usuario y la contrasena son obligatorios.',
      })
    }

    if (hasWhitespace(username) || hasUppercase(username)) {
      return res.status(400).json({
        error: 'El usuario no puede tener espacios ni mayusculas.',
        code: 'INVALID_USERNAME',
      })
    }

    if (password.length < 4 || hasWhitespace(password) || hasUppercase(password)) {
      return res.status(400).json({
        error: 'La contrasena debe tener minimo 4 caracteres, sin espacios ni mayusculas.',
        code: 'INVALID_PASSWORD',
      })
    }

    const localClient = await findLocalClient(username)
    if (localClient) {
      return res.status(409).json({
        error: 'Ese usuario no esta disponible.',
        code: 'USERNAME_UNAVAILABLE',
      })
    }

    const { apiUrl, apiKey } = await getCasinoConfig()

    try {
      await findExternalUser(username)
      return res.status(409).json({
        error: 'Ese usuario no esta disponible.',
        code: 'USERNAME_UNAVAILABLE',
      })
    } catch (error) {
      if (error.status !== 404) throw error
    }

    const created = await createExternalUser(apiUrl, apiKey, username, password)
    const { client, chatId } = await ensureClientAndChat({
      username,
      password,
      externalId: created.externalId,
    })

    res.status(201).json(await startClientSession(res, client, chatId))
  } catch (error) {
    next(error)
  }
}

export async function logoutClient(req, res, next) {
  try {
    const token = getCookieValue(req, config.clientJwtCookieName)

    if (token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret, {
          algorithms: ['HS256'],
          issuer: config.jwtIssuer,
        })

        if (payload?.type === 'client' && payload?.sub) {
          await query(
            'UPDATE clients SET is_online = 0, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?',
            [payload.sub]
          )

          io.emit('client:online-status', {
            clientId: payload.sub,
            username: payload.username,
            online: false,
          })
        }
      } catch {
        // Clear the cookie even if it is already invalid.
      }
    }

    clearClientCookie(res)
    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

export async function meClient(req, res, next) {
  try {
    const token = getCookieValue(req, config.clientJwtCookieName)
    if (!token) {
      return res.status(401).json({ error: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })
    }

    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
    })

    if (payload?.type !== 'client' || !payload?.sub) {
      return res.status(401).json({ error: 'Sesion de cliente invalida.', code: 'INVALID_CLIENT_TOKEN' })
    }

    const { rows, error } = await query(
      `SELECT id, username, full_name, external_id, is_active, is_online, is_temporary, temp_session_active
       FROM clients
       WHERE id = ?
       LIMIT 1`,
      [payload.sub]
    )
    if (error) return next(error)

    const client = rows?.[0]
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado.', code: 'CLIENT_NOT_FOUND' })
    }
    if (client.is_temporary && !client.temp_session_active) {
      clearClientCookie(res)
      return res.status(401).json({ error: 'La sesion temporal fue cerrada.', code: 'TEMP_CLIENT_SESSION_CLOSED' })
    }

    const { rows: chatRows, error: chatError } = await query(
      'SELECT id FROM chats WHERE client_id = ? AND is_archived = 0 ORDER BY id DESC LIMIT 1',
      [client.id]
    )
    if (chatError) return next(chatError)

    res.json({ client: sanitizeClient(client, chatRows?.[0]?.id || null) })
  } catch (error) {
    const status = error.name === 'TokenExpiredError' ? 401 : error.status || 500
    if (status === 401) {
      clearClientCookie(res)
      return res.status(401).json({
        error: error.name === 'TokenExpiredError' ? 'La sesion expiro.' : 'Sesion de cliente invalida.',
        code: error.name === 'TokenExpiredError' ? 'CLIENT_TOKEN_EXPIRED' : 'INVALID_CLIENT_TOKEN',
      })
    }
    next(error)
  }
}
