import { query } from '../config/database.js'
import { hashPassword } from '../utils/password.js'

const ALLOWED_ROLES = ['admin', 'cashier']

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    is_active: Boolean(user.is_active),
    last_login_at: user.last_login_at ?? null,
    created_at: user.created_at ?? null,
  }
}

export async function createUser(req, res, next) {
  try {
    const { username, full_name, email, password, role, is_active } = req.body

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

    const { rows: insertResult, error: insertError } = await query(
      'INSERT INTO users (username, full_name, email, password_hash, role, is_active, registered_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, full_name || username, email, passwordHash, role, is_active ? 1 : 0, req.user?.sub ?? null]
    )

    if (insertError) {
      return next(insertError)
    }

    const insertId = insertResult?.insertId
    const { rows: [createdUser], error: fetchError } = await query(
      'SELECT id, username, full_name, email, role, is_active, last_login_at FROM users WHERE id = ? LIMIT 1',
      [insertId]
    )

    if (fetchError) {
      return next(fetchError)
    }

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
    const { rows, error } = await query(
      'SELECT id, username, full_name, email, role, is_active, last_login_at, created_at FROM users ORDER BY created_at DESC',
      []
    )
    if (error) return next(error)
    res.json({ users: rows.map(sanitizeUser) })
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

    const { username, full_name, email, password, role, is_active } = req.body

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
    if (role !== undefined && ALLOWED_ROLES.includes(role)) {
      updates.push('role = ?'); values.push(role)
    }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0) }
    if (password && typeof password === 'string' && password.length >= 8) {
      const hash = await hashPassword(password)
      updates.push('password_hash = ?'); values.push(hash)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar', code: 'NO_UPDATES' })
    }

    values.push(numericId)
    const { error: updateError } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    )
    if (updateError) return next(updateError)

    const { rows: [updatedUser], error: fetchError } = await query(
      'SELECT id, username, full_name, email, role, is_active, last_login_at, created_at FROM users WHERE id = ? LIMIT 1',
      [numericId]
    )
    if (fetchError) return next(fetchError)

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
