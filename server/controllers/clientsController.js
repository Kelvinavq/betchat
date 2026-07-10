import { query, transaction } from '../config/database.js'
import { io } from '../app.js'
import { getReferralDetails } from './referralController.js'

const hasWhitespace = (value) => /\s/.test(value)
const hasUppercase = (value) => /[A-Z]/.test(value)
const getExternalErrorMessage = (data) => {
  const message = data?.errorMessage || data?.message || data?.error
  return typeof message === 'string' ? message.trim() : ''
}

const normalizeText = (value) => String(value ?? '').trim()
const isTruthyTransferPermission = (user) => Boolean(
  user?.role === 'superadmin' || user?.canTransferClientData || user?.can_transfer_client_data
)

function formatClientProfile(row) {
  if (!row) return null
  return {
    id: Number(row.id),
    username: row.username || '',
    fullName: row.full_name || '',
    cuil: row.cuil || '',
    cbuCvu: row.cbu_cvu || '',
    cbuCvuLockedAt: row.cbu_cvu_locked_at || null,
    cbuCvuSource: row.cbu_cvu_source || null,
    externalId: row.external_id || '',
    note: row.note || '',
    active: Boolean(row.is_active),
    online: Boolean(row.is_online),
    temporary: Boolean(row.is_temporary),
    tempSessionActive: Boolean(row.temp_session_active),
    pushBlocked: Boolean(row.push_blocked),
    lastSeenAt: row.last_seen_at || null,
    registeredAt: row.registered_at || null,
    updatedAt: row.updated_at || null,
  }
}

function buildTransferNote(source, target, reason = '') {
  const parts = [
    `Transferencia desde ${source.username} (#${source.id}) a ${target.username} (#${target.id}).`,
    reason ? `Motivo: ${reason}` : '',
  ].filter(Boolean)
  return parts.join(' ')
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

export async function getClientDetail(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID de cliente invalido.' })

    const { rows: clientRows, error: clientError } = await query(
      `SELECT
        id, username, full_name, note, cuil, cbu_cvu, cbu_cvu_locked_at, cbu_cvu_source,
        external_id, is_new, is_active, push_blocked, is_online, is_temporary, temp_session_active,
        last_seen_at, registered_at, updated_at
       FROM clients
       WHERE id = ?
       LIMIT 1`,
      [id]
    )
    if (clientError) return next(clientError)

    const client = clientRows?.[0]
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado.' })
    }

    const [
      withdrawalsResult,
      sessionsResult,
      cbusResult,
      adjustmentsResult,
      labelsResult,
      summaryResult,
    ] = await Promise.all([
      query(
        `SELECT *
         FROM withdrawal_requests
         WHERE client_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 25`,
        [id]
      ),
      query(
        `SELECT id, ip_address, device_type, browser, os, country, city, fingerprint, created_at
         FROM client_sessions
         WHERE client_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 25`,
        [id]
      ),
      query(
        `SELECT id, cbu, label, source, source_ref_id, verified_by, verified_at, last_used_at, active, created_at
         FROM client_cbu_whitelist
         WHERE client_id = ?
         ORDER BY COALESCE(last_used_at, verified_at, created_at) DESC, id DESC
         LIMIT 50`,
        [id]
      ),
      query(
        `SELECT id, chat_id, amount, operation, performed_by, note, created_at
         FROM balance_adjustments
         WHERE client_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 25`,
        [id]
      ),
      query(
        `SELECT l.id, l.name, l.color, cl.assigned_at
         FROM client_labels cl
         INNER JOIN labels l ON l.id = cl.label_id
         WHERE cl.client_id = ?
         ORDER BY l.name ASC`,
        [id]
      ),
      query(
        `SELECT
          (SELECT COUNT(*) FROM chats WHERE client_id = c.id) AS chat_count,
          (SELECT COUNT(*) FROM withdrawal_requests WHERE client_id = c.id) AS withdrawal_count,
          (SELECT COUNT(*) FROM withdrawal_requests WHERE client_id = c.id AND status = 'pending') AS pending_withdrawal_count,
          (SELECT COUNT(*) FROM client_sessions WHERE client_id = c.id) AS session_count,
          (SELECT COUNT(*) FROM client_cbu_whitelist WHERE client_id = c.id) AS cbu_count,
          (SELECT COUNT(*) FROM balance_adjustments WHERE client_id = c.id) AS balance_adjustment_count
         FROM clients c
         WHERE c.id = ?
         LIMIT 1`,
        [id]
      ),
    ])

    if (withdrawalsResult.error) return next(withdrawalsResult.error)
    if (sessionsResult.error) return next(sessionsResult.error)
    if (cbusResult.error) return next(cbusResult.error)
    if (adjustmentsResult.error) return next(adjustmentsResult.error)
    if (labelsResult.error) return next(labelsResult.error)
    if (summaryResult.error) return next(summaryResult.error)

    const summary = summaryResult.rows?.[0] || {}

    res.json({
      client: {
        ...formatClientProfile(client),
        chatCount: Number(summary.chat_count || 0),
        withdrawalCount: Number(summary.withdrawal_count || 0),
        pendingWithdrawalCount: Number(summary.pending_withdrawal_count || 0),
        sessionCount: Number(summary.session_count || 0),
        cbuCount: Number(summary.cbu_count || 0),
        balanceAdjustmentCount: Number(summary.balance_adjustment_count || 0),
      },
      withdrawals: (withdrawalsResult.rows || []).map(row => ({
        id: Number(row.id),
        chatId: row.chat_id ? Number(row.chat_id) : null,
        status: row.status || 'pending',
        amount: row.amount ?? null,
        method: row.method || null,
        alias: row.alias || row.cbu_alias || null,
        cbu: row.cbu || null,
        dni: row.dni || null,
        holderName: row.holder_name || row.account_holder || null,
        processedAt: row.processed_at || null,
        createdAt: row.created_at || null,
        updatedAt: row.updated_at || null,
      })),
      sessions: (sessionsResult.rows || []).map(row => ({
        id: Number(row.id),
        ipAddress: row.ip_address || null,
        deviceType: row.device_type || null,
        browser: row.browser || null,
        os: row.os || null,
        country: row.country || null,
        city: row.city || null,
        fingerprint: row.fingerprint || null,
        createdAt: row.created_at || null,
      })),
      cbus: (cbusResult.rows || []).map(row => ({
        id: Number(row.id),
        cbu: row.cbu || '',
        label: row.label || '',
        source: row.source || 'manual',
        sourceRefId: row.source_ref_id || null,
        verifiedBy: row.verified_by || null,
        verifiedAt: row.verified_at || null,
        lastUsedAt: row.last_used_at || null,
        active: Boolean(row.active),
        createdAt: row.created_at || null,
      })),
      adjustments: (adjustmentsResult.rows || []).map(row => ({
        id: Number(row.id),
        chatId: row.chat_id ? Number(row.chat_id) : null,
        amount: row.amount ?? null,
        operation: row.operation || '',
        performedBy: row.performed_by ?? null,
        note: row.note || null,
        createdAt: row.created_at || null,
      })),
      labels: (labelsResult.rows || []).map(row => ({
        id: Number(row.id),
        name: row.name || '',
        color: row.color || '#2563eb',
        assignedAt: row.assigned_at || null,
      })),
    })
  } catch (error) {
    next(error)
  }
}

export async function transferClientData(req, res, next) {
  try {
    if (!isTruthyTransferPermission(req.user)) {
      return res.status(403).json({ error: 'No tienes permiso para transferir datos de clientes.' })
    }

    const sourceId = Number(req.params.id)
    const targetId = Number(req.body?.targetClientId || req.body?.target_id || req.body?.targetId)
    const reason = normalizeText(req.body?.reason || req.body?.note || '')

    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'Debes indicar el cliente origen y el destino.' })
    }
    if (sourceId === targetId) {
      return res.status(400).json({ error: 'El cliente origen y destino no pueden ser el mismo.' })
    }
    if (!reason) {
      return res.status(400).json({ error: 'El motivo administrativo es obligatorio.' })
    }

    const result = await transaction(async (connection) => {
      const [sourceRows] = await connection.execute(
        `SELECT id, username, full_name, note, cuil, cbu_cvu, cbu_cvu_locked_at, cbu_cvu_source,
                external_id, is_active, is_online, is_temporary, temp_session_active, push_blocked,
                last_seen_at, registered_at, updated_at
         FROM clients
         WHERE id = ?
         FOR UPDATE`,
        [sourceId]
      )
      const [targetRows] = await connection.execute(
        `SELECT id, username, full_name, note, cuil, cbu_cvu, cbu_cvu_locked_at, cbu_cvu_source,
                external_id, is_active, is_online, is_temporary, temp_session_active, push_blocked,
                last_seen_at, registered_at, updated_at
         FROM clients
         WHERE id = ?
         FOR UPDATE`,
        [targetId]
      )

      const source = sourceRows?.[0]
      const target = targetRows?.[0]

      if (!source) {
        const error = new Error('Cliente origen no encontrado.')
        error.status = 404
        throw error
      }
      if (!target) {
        const error = new Error('Cliente destino no encontrado.')
        error.status = 404
        throw error
      }
      if (!Boolean(target.is_active)) {
        const error = new Error('El cliente destino debe estar activo.')
        error.status = 409
        throw error
      }

      const nextFullName = normalizeText(source.full_name) || normalizeText(target.full_name) || target.username
      const nextCuil = normalizeText(source.cuil) || normalizeText(target.cuil) || null
      const nextCbu = normalizeText(source.cbu_cvu) || normalizeText(target.cbu_cvu) || null
      const nextNote = buildTransferNote(source, target, reason)

      const counters = {
        chats: 0,
        messages: 0,
        withdrawals: 0,
        balances: 0,
        manualMovements: 0,
        hgcashMovements: 0,
        telepagosMovements: 0,
        mercadopagoMovements: 0,
        sessions: 0,
        pushTokens: 0,
        pushSubscriptions: 0,
        labels: 0,
        cbus: 0,
      }

      const tablesToMove = [
        ['chats', 'chats'],
        ['messages', 'messages'],
        ['withdrawal_requests', 'withdrawals'],
        ['balance_adjustments', 'balances'],
        ['manual_payment_movements', 'manualMovements'],
        ['hgcash_movements', 'hgcashMovements'],
        ['telepagos_movements', 'telepagosMovements'],
        ['mercadopago_movements', 'mercadopagoMovements'],
        ['client_sessions', 'sessions'],
        ['push_tokens', 'pushTokens'],
        ['push_subscriptions', 'pushSubscriptions'],
      ]

      for (const [table, counterKey] of tablesToMove) {
        const [updateResult] = await connection.execute(
          `UPDATE ${table} SET client_id = ? WHERE client_id = ?`,
          [targetId, sourceId]
        )
        counters[counterKey] += Number(updateResult?.affectedRows || 0)
      }

      const [labelInsertResult] = await connection.execute(
        `INSERT IGNORE INTO client_labels (client_id, label_id, assigned_at)
         SELECT ?, label_id, assigned_at
         FROM client_labels
         WHERE client_id = ?`,
        [targetId, sourceId]
      )
      counters.labels += Number(labelInsertResult?.affectedRows || 0)
      await connection.execute('DELETE FROM client_labels WHERE client_id = ?', [sourceId])

      const [cbuInsertResult] = await connection.execute(
        `INSERT INTO client_cbu_whitelist
          (client_id, cbu, label, source, source_ref_id, verified_by, verified_at, last_used_at, active, created_at)
         SELECT ?, cbu, label, source, source_ref_id, verified_by, verified_at, last_used_at, active, created_at
         FROM client_cbu_whitelist
         WHERE client_id = ?
         ON DUPLICATE KEY UPDATE
           label = COALESCE(VALUES(label), label),
           source = VALUES(source),
           source_ref_id = COALESCE(VALUES(source_ref_id), source_ref_id),
           verified_by = COALESCE(VALUES(verified_by), verified_by),
           verified_at = GREATEST(COALESCE(verified_at, '1970-01-01 00:00:00'), COALESCE(VALUES(verified_at), '1970-01-01 00:00:00')),
           last_used_at = GREATEST(COALESCE(last_used_at, '1970-01-01 00:00:00'), COALESCE(VALUES(last_used_at), '1970-01-01 00:00:00')),
           active = GREATEST(active, VALUES(active))`,
        [targetId, sourceId]
      )
      counters.cbus += Number(cbuInsertResult?.affectedRows || 0)
      await connection.execute('DELETE FROM client_cbu_whitelist WHERE client_id = ?', [sourceId])

      await connection.execute(
        `UPDATE clients
         SET full_name = ?,
             cuil = ?,
             cbu_cvu = ?,
             cbu_cvu_locked_at = CASE WHEN ? IS NOT NULL AND ? <> '' THEN COALESCE(cbu_cvu_locked_at, CURRENT_TIMESTAMP) ELSE cbu_cvu_locked_at END,
             cbu_cvu_source = CASE WHEN ? IS NOT NULL AND ? <> '' THEN COALESCE(cbu_cvu_source, 'transfer') ELSE cbu_cvu_source END,
             note = CONCAT_WS('\n\n', NULLIF(note, ''), ?),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          nextFullName,
          nextCuil,
          nextCbu,
          nextCbu,
          nextCbu,
          nextCbu,
          nextCbu,
          nextNote,
          targetId,
        ]
      )

      await connection.execute(
        `UPDATE clients
         SET is_active = 0,
             is_online = 0,
             temp_session_active = 0,
             push_blocked = 1,
             session_version = COALESCE(session_version, 0) + 1,
             last_seen_at = CURRENT_TIMESTAMP,
             cuil = NULL,
             cbu_cvu = NULL,
             cbu_cvu_locked_at = NULL,
             cbu_cvu_source = NULL,
             note = CONCAT_WS('\n\n', NULLIF(note, ''), ?),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [buildTransferNote(source, target, `Datos movidos al cliente #${target.id} (${target.username}).`), sourceId]
      )

      await connection.execute(
        `INSERT INTO client_transfer_audit_log
          (source_client_id, target_client_id, actor_user_id, actor_username, reason, moved_chats, moved_messages, moved_withdrawals,
           moved_balance_adjustments, moved_manual_movements, moved_hgcash_movements, moved_telepagos_movements,
           moved_mercadopago_movements, moved_sessions, moved_push_tokens, moved_push_subscriptions, moved_labels, moved_cbus, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          sourceId,
          targetId,
          req.user?.sub ?? null,
          req.user?.username || null,
          reason,
          counters.chats,
          counters.messages,
          counters.withdrawals,
          counters.balances,
          counters.manualMovements,
          counters.hgcashMovements,
          counters.telepagosMovements,
          counters.mercadopagoMovements,
          counters.sessions,
          counters.pushTokens,
          counters.pushSubscriptions,
          counters.labels,
          counters.cbus,
        ]
      )

      const [updatedRows] = await connection.execute(
        `SELECT
          id, username, full_name, note, cuil, cbu_cvu, cbu_cvu_locked_at, cbu_cvu_source,
          external_id, is_new, is_active, push_blocked, is_online, is_temporary, temp_session_active,
          last_seen_at, registered_at, updated_at
         FROM clients
         WHERE id = ?
         LIMIT 1`,
        [targetId]
      )

      return {
        source: formatClientProfile(source),
        target: formatClientProfile(updatedRows?.[0] || target),
        moved: counters,
      }
    })

    res.json({
      message: 'Los datos del cliente fueron transferidos correctamente.',
      ...result,
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

export async function forceLogoutClient(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID de cliente invalido.' })

    const { rows, error } = await query(
      `SELECT id, username, is_temporary
       FROM clients
       WHERE id = ?
       LIMIT 1`,
      [id]
    )
    if (error) return next(error)

    const client = rows?.[0]
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado.' })
    }

    await query(
      `UPDATE clients
       SET session_version = COALESCE(session_version, 0) + 1,
           is_online = 0,
           last_seen_at = CURRENT_TIMESTAMP
           ${client.is_temporary ? ', temp_session_active = 0' : ''}
       WHERE id = ?`,
      [id]
    )

    io.to(`client:${id}`).emit('session:force-logout', {
      reason: 'admin_force_logout',
    })
    io.emit('client:online-status', {
      clientId: id,
      username: client.username,
      online: false,
    })

    res.json({
      success: true,
      message: 'La sesion del cliente fue cerrada correctamente.',
    })
  } catch (error) {
    next(error)
  }
}
