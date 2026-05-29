import { query } from '../config/database.js'
import { getReferralDetails } from './referralController.js'

const hasWhitespace = (value) => /\s/.test(value)
const hasUppercase = (value) => /[A-Z]/.test(value)
const getExternalErrorMessage = (data) => {
  const message = data?.errorMessage || data?.message || data?.error
  return typeof message === 'string' ? message.trim() : ''
}

// Función para buscar usuario en API externa
async function searchUserInExternalAPI(apiUrl, apiKey, username) {
  try {
    // Primera búsqueda: users endpoint
    const checkUrl = `${apiUrl}index.php?act=admin&area=users&response=js&search=${encodeURIComponent(username)}&limit=1`
    const checkFormData = new URLSearchParams()
    checkFormData.append('api_token', apiKey)

    const checkResponse = await fetch(checkUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: checkFormData,
    })

    const checkData = await checkResponse.json()

    if (!checkData || typeof checkData !== 'object' || !checkData.users) {
      console.error('Respuesta de la API externa no contiene users:', checkData)
      if (checkData && checkData.error === 'No access') {
        throw new Error('Acceso denegado. Verifique el token de API.')
      }
      throw new Error('Error al verificar el usuario en la API externa.')
    }

    // Buscar usuario ignorando mayúsculas
    const existingUser = checkData.users.find(
      (user) => user.login.toLowerCase() === username.toLowerCase() && user.login !== 'En total'
    )

    if (existingUser && existingUser.id) {
      return { found: true, externalId: existingUser.id, user: existingUser }
    }

    // Búsqueda alternativa si no se encuentra
    const searchUrl = `${apiUrl}index.php?act=admin&area=search&response=js`
    const searchFormData = new URLSearchParams()
    searchFormData.append('api_token', apiKey)
    searchFormData.append('search_login', username)
    searchFormData.append('page', '1')

    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: searchFormData,
    })

    const searchData = await searchResponse.json()

    if (!searchData || typeof searchData !== 'object' || !searchData.users || searchData.users.length === 0) {
      return { found: false }
    }

    const altUser = searchData.users.find(
      (user) => user.login.toLowerCase() === username.toLowerCase()
    )

    if (altUser && altUser.id) {
      return { found: true, externalId: altUser.id, user: altUser }
    }

    return { found: false }
  } catch (error) {
    console.error('Error al buscar usuario en API externa:', error)
    throw error
  }
}

// Función para crear usuario en API externa
async function createUserInExternalAPI(apiUrl, apiKey, username, password, balance = 0) {
  try {
    const createUrl = `${apiUrl}index.php?act=admin&area=createuser&response=js`
    const createFormData = new URLSearchParams()
    createFormData.append('sended', 'true')
    createFormData.append('group', '5')
    createFormData.append('login', username)
    createFormData.append('password', password)
    createFormData.append('balance', String(balance ?? 0))
    createFormData.append('api_token', apiKey)

    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: createFormData,
    })

    const createData = await createResponse.json()

    // Verificar si hay error de permisos
    if (createData && createData.error === 'Sin derechos') {
      throw new Error('La caja no tiene permisos suficientes para crear usuarios.')
    }

    // Verificar si la creación fue exitosa
    if (!createData || !createData.success) {
      const externalMessage = getExternalErrorMessage(createData)
      const isUnavailable = /existe|exist|disponible|available/i.test(externalMessage)
      const error = new Error(isUnavailable
        ? 'Ese usuario no esta disponible.'
        : externalMessage || 'Error al crear usuario en la plataforma externa.'
      )
      error.status = isUnavailable ? 409 : 502
      error.code = isUnavailable ? 'USERNAME_UNAVAILABLE' : 'EXTERNAL_CREATE_FAILED'
      throw error
    }

    // Extraer el ID del usuario creado
    const externalId = createData.id
    if (!externalId) {
      throw new Error('No se pudo obtener el ID del usuario creado.')
    }

    return { success: true, externalId, data: createData }
  } catch (error) {
    console.error('Error al crear usuario en API externa:', error)
    throw error
  }
}

// Obtener configuración de casino
async function getCasinoConfig() {
  const { rows } = await query('SELECT api_url, api_key FROM config_casino WHERE id = 1')
  if (!rows || rows.length === 0) {
    throw new Error('Configuración de casino no encontrada.')
  }
  const config = rows[0]
  if (!config.api_url || !config.api_key) {
    throw new Error('URL de API o clave de API no configuradas.')
  }
  return config
}

export async function getClients(req, res, next) {
  try {
    const {
      page = '1',
      limit = '10',
      search = '',
      status = 'all',
    } = req.query

    const pageNum = Math.max(parseInt(page, 10) || 1, 1)
    const limitNum = Math.max(parseInt(limit, 10) || 10, 1)
    const offset = (pageNum - 1) * limitNum

    let whereClause = '1=1'
    const params = []

    const safeSearch = String(search || '').trim()

    if (safeSearch) {
      whereClause += `
        AND (
          LOWER(username) LIKE LOWER(?)
          OR LOWER(external_id) LIKE LOWER(?)
          OR REPLACE(cuil, "-", "") LIKE REPLACE(?, "-", "")
        )
      `
      const searchPattern = `%${safeSearch}%`
      params.push(searchPattern, searchPattern, searchPattern)
    }

    if (status === 'active') {
      whereClause += ' AND is_active = 1'
    } else if (status === 'inactive') {
      whereClause += ' AND is_active = 0'
    }

    const { rows: countRows, error: countError } = await query(
      `SELECT COUNT(*) AS total FROM clients WHERE ${whereClause}`,
      params
    )
    if (countError) return next(countError)

    const total = Number(countRows?.[0]?.total || 0)

    const { rows, error } = await query(`
      SELECT
        id,
        username,
        full_name,
        cuil,
        external_id,
        is_active,
        is_online,
        last_seen_at,
        registered_at,
        updated_at
      FROM clients
      WHERE ${whereClause}
      ORDER BY registered_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `, params)
    if (error) return next(error)

    const clients = (rows || []).map(client => ({
      id: client.id,
      username: client.username,
      fullName: client.full_name || '',
      cuil: client.cuil || '',
      externalId: client.external_id || '',
      active: Boolean(client.is_active),
      online: Boolean(client.is_online),
      lastSeenAt: client.last_seen_at,
      registeredAt: client.registered_at,
      updatedAt: client.updated_at,
    }))

    res.json({
      clients,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function getClientStats(req, res, next) {
  try {
    const { rows, error } = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN COALESCE(is_active, 1) = 1 THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN COALESCE(is_active, 1) = 0 THEN 1 ELSE 0 END) AS inactive
      FROM clients
    `)

    if (error) throw error

    const r = rows?.[0] || {}

    res.json({
      total: Number(r.total) || 0,
      active: Number(r.active) || 0,
      inactive: Number(r.inactive) || 0,
    })
  } catch (error) {
    next(error)
  }
}

export async function getClientReferralDetails(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID de cliente invalido.' })

    const details = await getReferralDetails(id)
    if (!details) {
      return res.status(404).json({ error: 'Cliente no encontrado.' })
    }

    res.json(details)
  } catch (error) {
    next(error)
  }
}

export async function createClient(req, res, next) {
  try {
    const username = String(req.body?.username || '').trim()
    const password = String(req.body?.password || '')
    const balance  = Math.max(0, Number(req.body?.balance) || 0)

    if (!username || !password) {
      return res.status(400).json({
        error: 'El nombre de usuario y la contraseña son obligatorios.',
      })
    }

    if (hasWhitespace(username) || hasUppercase(username)) {
      return res.status(400).json({
        error: 'El usuario no puede tener espacios ni mayusculas.',
      })
    }

    if (password.length < 4 || hasWhitespace(password) || hasUppercase(password)) {
      return res.status(400).json({
        error: 'La contrasena debe tener minimo 4 caracteres, sin espacios ni mayusculas.',
      })
    }

    // Verificar si el cliente ya existe localmente
    const { rows: existingRows } = await query(
      'SELECT id FROM clients WHERE LOWER(username) = LOWER(?)',
      [username]
    )

    if (existingRows && existingRows.length > 0) {
      return res.status(409).json({
        error: 'Ese usuario no esta disponible.',
      })
    }

    // Obtener configuración de casino
    const { api_url: apiUrl, api_key: apiKey } = await getCasinoConfig()

    // Verificar si el usuario ya existe en la API externa
    const searchResult = await searchUserInExternalAPI(apiUrl, apiKey, username)
    if (searchResult.found) {
      return res.status(409).json({
        error: 'Ese usuario no esta disponible.',
      })
    }

    // Crear usuario en la API externa
    const createResult = await createUserInExternalAPI(apiUrl, apiKey, username, password, balance)

    const { rows, error: insertError } = await query(`
      INSERT INTO clients (username, full_name, password, external_id, is_active)
      VALUES (?, ?, ?, ?, 1)
    `, [username, username, password, createResult.externalId])
    if (insertError) return next(insertError)

    const clientId = rows.insertId

    res.status(201).json({
      message: 'Cliente creado exitosamente.',
      client: {
        id: clientId,
        username,
        externalId: createResult.externalId,
        active: true,
      },
    })
  } catch (error) {
    console.error('Error al crear cliente:', error)
    next(error)
  }
}

export async function updateClient(req, res, next) {
  try {
    const { id } = req.params
    const { fullName, cuil, isActive } = req.body

    const { rows } = await query(`
      UPDATE clients
      SET full_name = ?, cuil = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [fullName || '', cuil || null, isActive ? 1 : 0, id])

    if (rows.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado.' })
    }

    res.json({ message: 'Cliente actualizado exitosamente.' })
  } catch (error) {
    next(error)
  }
}

export async function deleteClient(req, res, next) {
  try {
    const { id } = req.params

    const { rows } = await query('DELETE FROM clients WHERE id = ?', [id])

    if (rows.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado.' })
    }

    res.json({ message: 'Cliente eliminado exitosamente.' })
  } catch (error) {
    next(error)
  }
}

export async function updateClientPassword(req, res, next) {
  try {
    const { id } = req.params
    const password = String(req.body?.password || '')

    if (!password) {
      return res.status(400).json({ error: 'La contraseña es obligatoria.' })
    }

    if (password.length < 4 || hasWhitespace(password) || hasUppercase(password)) {
      return res.status(400).json({
        error: 'La contrasena debe tener minimo 4 caracteres, sin espacios ni mayusculas.',
      })
    }

    const { rows } = await query(`
      UPDATE clients
      SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [password, id])

    if (rows.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado.' })
    }

    res.json({ message: 'Contraseña actualizada exitosamente.' })
  } catch (error) {
    next(error)
  }
}

export async function adjustClientBalance(req, res, next) {
  try {
    const id        = Number(req.params.id)
    const amount    = Number(req.body?.amount)
    const operation = String(req.body?.operation || '')

    if (!id) return res.status(400).json({ error: 'ID de cliente inválido.' })
    if (!amount || amount <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0.' })
    if (!['in', 'out'].includes(operation)) return res.status(400).json({ error: 'Operación inválida.' })

    const { rows: clientRows, error: clientErr } = await query(
      'SELECT external_id FROM clients WHERE id = ?', [id]
    )
    if (clientErr) throw clientErr
    if (!clientRows?.length) return res.status(404).json({ error: 'Cliente no encontrado.' })

    const externalId = clientRows[0].external_id
    if (!externalId) return res.status(400).json({ error: 'El cliente no tiene ID externo asignado.' })

    const { api_url: apiUrl, api_key: apiKey } = await getCasinoConfig()

    const url = `${apiUrl}index.php?act=admin&area=balance&type=frame&id=${externalId}&response=js`
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
      const msg = getExternalErrorMessage(data) || 'Error al modificar el saldo en la plataforma.'
      return res.status(502).json({ error: msg })
    }

    res.json({
      success: true,
      message: data.successMessage,
      balance: data.currencies?.ARS ?? null,
    })
  } catch (error) {
    next(error)
  }
}
