import { query, transaction } from '../config/database.js'
import { hashPassword } from '../utils/password.js'
import { fetchPermissions, normalizePermissions, replacePermissions, rowsToPermissions } from '../utils/userPermissions.js'

const ALLOWED_ROLES = ['admin', 'cashier']

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    is_active: Boolean(user.is_active),
    online: Boolean(user.online),
    last_login_at: user.last_login_at ?? null,
    created_at: user.created_at ?? null,
    permissions: user.permissions,
  }
}

export async function createUser(req, res, next) {
  try {
    const { username, full_name, email, password, role, is_active, permissions } = req.body

    const { rows: existingRows, error: existingError } = await query(
      'SELECT id, username, email FROM users WHERE username = ? OR email = ? LIMIT 1',
      [username, email]
    )

    if (existingError) {
      return next(existingError)
    }

    if (existingRows?.length > 0) {
      const existing = existingRows[0]
      const conflict = existing.username === username ? 'usuario' : 'correo'
      return res.status(409).json({
        error: `El ${conflict} ya está en uso`,
        code: 'USER_CONFLICT',
      })
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        error: 'Rol de usuario inválido',
        code: 'INVALID_ROLE',
      })
    }

    const passwordHash = await hashPassword(password)

    const createdUser = await transaction(async (connection) => {
      const [insertResult] = await connection.execute(
        'INSERT INTO users (username, full_name, email, password_hash, role, is_active, registered_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username, full_name || username, email, passwordHash, role, is_active ? 1 : 0, req.user?.sub ?? null]
      )

      const insertId = insertResult?.insertId
      await replacePermissions(connection, insertId, permissions, role)

      const [[created]] = await connection.execute(
        `SELECT
          u.id, u.username, u.full_name, u.email, u.role, u.is_active, u.last_login_at, u.created_at,
          0 AS online
         FROM users u
         WHERE u.id = ?
         LIMIT 1`,
        [insertId]
      )

      const createdPermissions = await fetchPermissions(connection, insertId, created.role)
      return { ...created, permissions: createdPermissions }
    })

    if (!createdUser) {
      return res.status(500).json({
        error: 'No se pudo recuperar el usuario creado',
        code: 'USER_CREATE_FAILED',
      })
    }

    res.status(201).json({ user: sanitizeUser(createdUser) })
  } catch (error) {
    next(error)
  }
}

export async function getUsers(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '8', 10) || 8))
    const offset = (page - 1) * limit
    const search = String(req.query.search || '').trim()
    const status = String(req.query.status || 'all')
    const role = String(req.query.role || 'all')

    const where = []
    const values = []

    if (search) {
      where.push('(u.username LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)')
      const like = `%${search}%`
      values.push(like, like, like)
    }

    if (status === 'active' || status === 'inactive') {
      where.push('u.is_active = ?')
      values.push(status === 'active' ? 1 : 0)
    }

    if (ALLOWED_ROLES.includes(role)) {
      where.push('u.role = ?')
      values.push(role)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const { rows: countRows, error: countError } = await query(
      `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
      values
    )
    if (countError) return next(countError)

    const total = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const safeOffset = (safePage - 1) * limit

    const { rows, error } = await query(
      `SELECT
        u.id, u.username, u.full_name, u.email, u.role, u.is_active, u.last_login_at, u.created_at,
        EXISTS(
          SELECT 1 FROM user_sessions us
          WHERE us.user_id = u.id AND us.is_active = 1
            AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
        ) AS online
       FROM users u
       ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT ${limit} OFFSET ${safeOffset}`,
      values
    )
    if (error) return next(error)

    let permissionRows = []
    if (rows.length > 0) {
      const userIds = rows.map(user => user.id)
      const placeholders = userIds.map(() => '?').join(', ')
      const permissionsResult = await query(
        `SELECT user_id, module, can_view, can_create, can_edit, can_delete
         FROM user_permissions
         WHERE user_id IN (${placeholders})`,
        userIds
      )
      if (permissionsResult.error) return next(permissionsResult.error)
      permissionRows = permissionsResult.rows
    }

    const permissionsByUser = permissionRows.reduce((acc, row) => {
      if (!acc[row.user_id]) acc[row.user_id] = []
      acc[row.user_id].push(row)
      return acc
    }, {})

    res.json({
      users: rows.map((user) => sanitizeUser({
        ...user,
        permissions: rowsToPermissions(permissionsByUser[user.id] || [], user.role),
      })),
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    })
  } catch (err) {
    next(err)
  }
}

export async function updateUser(req, res, next) {
  try {
    const numericId = parseInt(req.params.id, 10)
    if (!numericId || isNaN(numericId)) {
      return res.status(400).json({ error: 'ID de usuario inválido', code: 'INVALID_ID' })
    }

    const { username, full_name, email, password, role, is_active, permissions } = req.body

    if (username || email) {
      const { rows: conflicts } = await query(
        'SELECT id, username, email FROM users WHERE (username = ? OR email = ?) AND id != ? LIMIT 1',
        [username || '', email || '', numericId]
      )
      if (conflicts?.length > 0) {
        const c = conflicts[0]
        const field = c.username === username ? 'usuario' : 'correo'
        return res.status(409).json({ error: `El ${field} ya está en uso`, code: 'USER_CONFLICT' })
      }
    }

    const updates = []
    const values = []

    if (username !== undefined)  { updates.push('username = ?');  values.push(String(username).trim()) }
    if (full_name !== undefined) { updates.push('full_name = ?'); values.push(String(full_name).trim()) }
    if (email !== undefined)     { updates.push('email = ?');     values.push(String(email).trim().toLowerCase()) }
    if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Rol de usuario inválido', code: 'INVALID_ROLE' })
    }
    if (role !== undefined && ALLOWED_ROLES.includes(role)) {
      updates.push('role = ?'); values.push(role)
    }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0) }
    if (password && typeof password === 'string' && password.length >= 8) {
      const hash = await hashPassword(password)
      updates.push('password_hash = ?'); values.push(hash)
    }

    const hasPermissions = permissions !== undefined
    if (updates.length === 0 && !hasPermissions) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar', code: 'NO_UPDATES' })
    }

    const updatedUser = await transaction(async (connection) => {
      if (updates.length > 0) {
        await connection.execute(
          `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
          [...values, numericId]
        )
      }

      const [[updated]] = await connection.execute(
        `SELECT
          u.id, u.username, u.full_name, u.email, u.role, u.is_active, u.last_login_at, u.created_at,
          EXISTS(
            SELECT 1 FROM user_sessions us
            WHERE us.user_id = u.id AND us.is_active = 1
              AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
          ) AS online
         FROM users u
         WHERE u.id = ?
         LIMIT 1`,
        [numericId]
      )

      const updatedPermissions = hasPermissions
        ? await replacePermissions(connection, numericId, normalizePermissions(permissions, updated.role), updated.role)
        : await fetchPermissions(connection, numericId, updated.role)

      return { ...updated, permissions: updatedPermissions }
    })

    res.json({ user: sanitizeUser(updatedUser) })
  } catch (err) {
    next(err)
  }
}

export async function deleteUser(req, res, next) {
  try {
    const numericId = parseInt(req.params.id, 10)
    if (!numericId || isNaN(numericId)) {
      return res.status(400).json({ error: 'ID de usuario inválido', code: 'INVALID_ID' })
    }

    if (numericId === req.user?.sub) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta', code: 'SELF_DELETE' })
    }

    const { error } = await query('DELETE FROM users WHERE id = ?', [numericId])
    if (error) return next(error)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function logoutUserSessions(req, res, next) {
  try {
    const numericId = parseInt(req.params.id, 10)
    if (!numericId || isNaN(numericId)) {
      return res.status(400).json({ error: 'ID de usuario inválido', code: 'INVALID_ID' })
    }

    const { error } = await query(
      'UPDATE user_sessions SET is_active = 0, last_activity_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_active = 1',
      [numericId]
    )
    if (error) return next(error)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getUserSessions(req, res, next) {
  try {
    const numericId = parseInt(req.params.id, 10)
    if (!numericId || isNaN(numericId)) {
      return res.status(400).json({ error: 'ID de usuario inválido', code: 'INVALID_ID' })
    }

    const { rows, error } = await query(
      `SELECT
        id,
        ip_address,
        browser,
        browser_version,
        os,
        device_type,
        is_active,
        last_activity_at,
        expires_at,
        created_at
       FROM user_sessions
       WHERE user_id = ?
       ORDER BY is_active DESC, last_activity_at DESC, created_at DESC
       LIMIT 30`,
      [numericId]
    )
    if (error) return next(error)

    res.json({
      sessions: rows.map(session => ({
        id: session.id,
        ip_address: session.ip_address,
        browser: session.browser,
        browser_version: session.browser_version,
        os: session.os,
        device_type: session.device_type,
        is_active: Boolean(session.is_active),
        last_activity_at: session.last_activity_at,
        expires_at: session.expires_at,
        created_at: session.created_at,
      })),
    })
  } catch (err) {
    next(err)
  }
}
