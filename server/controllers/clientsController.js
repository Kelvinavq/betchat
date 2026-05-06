import { query } from '../config/database.js'
import { hashPassword } from '../utils/password.js'

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
async function createUserInExternalAPI(apiUrl, apiKey, username, password) {
  try {
    const createUrl = `${apiUrl}index.php?act=admin&area=createuser&response=js`
    const createFormData = new URLSearchParams()
    createFormData.append('sended', 'true')
    createFormData.append('group', '5')
    createFormData.append('login', username)
    createFormData.append('password', password)
    createFormData.append('balance', '0')
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
      throw new Error('Error al crear usuario en la plataforma externa.')
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

export async function createClient(req, res, next) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        error: 'El nombre de usuario y la contraseña son obligatorios.',
      })
    }

    // Verificar si el cliente ya existe localmente
    const { rows: existingRows } = await query(
      'SELECT id FROM clients WHERE LOWER(username) = LOWER(?)',
      [username]
    )

    if (existingRows && existingRows.length > 0) {
      return res.status(409).json({
        error: 'El cliente ya existe en la base de datos local.',
      })
    }

    // Obtener configuración de casino
    const { api_url: apiUrl, api_key: apiKey } = await getCasinoConfig()

    // Verificar si el usuario ya existe en la API externa
    const searchResult = await searchUserInExternalAPI(apiUrl, apiKey, username)
    if (searchResult.found) {
      return res.status(409).json({
        error: 'El usuario ya existe en la plataforma externa.',
      })
    }

    // Crear usuario en la API externa
    const createResult = await createUserInExternalAPI(apiUrl, apiKey, username, password)

    const passwordHash = await hashPassword(password)

    const { rows, error: insertError } = await query(`
      INSERT INTO clients (username, full_name, password_hash, external_id, is_active)
      VALUES (?, ?, ?, ?, 1)
    `, [username, username, passwordHash, createResult.externalId])
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
    const { password } = req.body

    if (!password) {
      return res.status(400).json({ error: 'La contraseña es obligatoria.' })
    }

    const passwordHash = await hashPassword(password)

    const { rows } = await query(`
      UPDATE clients
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [passwordHash, id])

    if (rows.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado.' })
    }

    res.json({ message: 'Contraseña actualizada exitosamente.' })
  } catch (error) {
    next(error)
  }
}
