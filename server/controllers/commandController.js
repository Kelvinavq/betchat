import { query } from '../config/database.js'

const ALLOWED_MATCH_TYPES = ['exact', 'contains', 'starts_with']

function normalizeTrigger(value) {
  return String(value || '')
    .trim()
    .replace(/^\/+/, '')
    .toLowerCase()
}

function sanitizeCommand(command) {
  return {
    id: command.id,
    trigger: command.trigger,
    response: command.response,
    match_type: command.match_type,
    is_active: Boolean(command.is_active),
    created_at: command.created_at ?? null,
    updated_at: command.updated_at ?? null,
  }
}

function validatePayload(body, { partial = false } = {}) {
  const errors = []
  const payload = {}

  if (!partial || body.trigger !== undefined) {
    payload.trigger = normalizeTrigger(body.trigger)
    if (!payload.trigger) {
      errors.push('El comando es requerido')
    } else if (!/^[a-z0-9_-]+$/i.test(payload.trigger)) {
      errors.push('El comando solo puede contener letras, números, guiones y guiones bajos')
    }
  }

  if (!partial || body.response !== undefined) {
    payload.response = String(body.response || '').trim()
    if (!payload.response) {
      errors.push('La respuesta es requerida')
    }
  }

  if (!partial || body.match_type !== undefined) {
    payload.match_type = body.match_type || 'contains'
    if (!ALLOWED_MATCH_TYPES.includes(payload.match_type)) {
      errors.push('Tipo de coincidencia inválido')
    }
  }

  if (!partial || body.is_active !== undefined) {
    payload.is_active = Boolean(body.is_active !== false && body.is_active !== 0)
  }

  return { errors, payload }
}

export async function getCommands(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '12', 10) || 12))
    const search = String(req.query.search || '').trim()
    const status = String(req.query.status || 'all')
    const matchType = String(req.query.match_type || 'all')

    const where = []
    const values = []

    if (search) {
      where.push('(`trigger` LIKE ? OR `response` LIKE ?)')
      const like = `%${search}%`
      values.push(like, like)
    }

    if (status === 'active' || status === 'inactive') {
      where.push('`is_active` = ?')
      values.push(status === 'active' ? 1 : 0)
    }

    if (ALLOWED_MATCH_TYPES.includes(matchType)) {
      where.push('`match_type` = ?')
      values.push(matchType)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const { rows: countRows, error: countError } = await query(
      `SELECT COUNT(*) AS total FROM commands ${whereSql}`,
      values
    )
    if (countError) return next(countError)

    const total = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const offset = (safePage - 1) * limit

    const { rows, error } = await query(
      `SELECT id, \`trigger\`, \`response\`, \`match_type\`, \`is_active\`, created_at, updated_at
       FROM commands
       ${whereSql}
       ORDER BY updated_at DESC, id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      values
    )
    if (error) return next(error)

    res.json({
      commands: rows.map(sanitizeCommand),
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

export async function createCommand(req, res, next) {
  try {
    const { errors, payload } = validatePayload(req.body)
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Datos de comando inválidos', details: errors, code: 'INVALID_COMMAND_PAYLOAD' })
    }

    const { rows: existingRows, error: existingError } = await query(
      'SELECT id FROM commands WHERE `trigger` = ? LIMIT 1',
      [payload.trigger]
    )
    if (existingError) return next(existingError)

    if (existingRows?.length) {
      return res.status(409).json({ error: 'El comando ya existe', code: 'COMMAND_CONFLICT' })
    }

    const { rows: result, error: insertError } = await query(
      'INSERT INTO commands (`trigger`, `response`, `match_type`, `is_active`) VALUES (?, ?, ?, ?)',
      [payload.trigger, payload.response, payload.match_type, payload.is_active ? 1 : 0]
    )
    if (insertError) return next(insertError)

    const { rows, error } = await query(
      'SELECT id, `trigger`, `response`, `match_type`, `is_active`, created_at, updated_at FROM commands WHERE id = ? LIMIT 1',
      [result.insertId]
    )
    if (error) return next(error)

    res.status(201).json({ command: sanitizeCommand(rows[0]) })
  } catch (err) {
    next(err)
  }
}

export async function updateCommand(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de comando inválido', code: 'INVALID_ID' })
    }

    const { errors, payload } = validatePayload(req.body, { partial: true })
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Datos de comando inválidos', details: errors, code: 'INVALID_COMMAND_PAYLOAD' })
    }

    if (payload.trigger) {
      const { rows: conflicts, error: conflictError } = await query(
        'SELECT id FROM commands WHERE `trigger` = ? AND id != ? LIMIT 1',
        [payload.trigger, id]
      )
      if (conflictError) return next(conflictError)
      if (conflicts?.length) {
        return res.status(409).json({ error: 'El comando ya existe', code: 'COMMAND_CONFLICT' })
      }
    }

    const updates = []
    const values = []

    if (payload.trigger !== undefined) { updates.push('`trigger` = ?'); values.push(payload.trigger) }
    if (payload.response !== undefined) { updates.push('`response` = ?'); values.push(payload.response) }
    if (payload.match_type !== undefined) { updates.push('`match_type` = ?'); values.push(payload.match_type) }
    if (payload.is_active !== undefined) { updates.push('`is_active` = ?'); values.push(payload.is_active ? 1 : 0) }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No se enviaron campos para actualizar', code: 'NO_UPDATES' })
    }

    const { error: updateError } = await query(
      `UPDATE commands SET ${updates.join(', ')} WHERE id = ?`,
      [...values, id]
    )
    if (updateError) return next(updateError)

    const { rows, error } = await query(
      'SELECT id, `trigger`, `response`, `match_type`, `is_active`, created_at, updated_at FROM commands WHERE id = ? LIMIT 1',
      [id]
    )
    if (error) return next(error)
    if (!rows?.length) {
      return res.status(404).json({ error: 'Comando no encontrado', code: 'COMMAND_NOT_FOUND' })
    }

    res.json({ command: sanitizeCommand(rows[0]) })
  } catch (err) {
    next(err)
  }
}

export async function deleteCommand(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de comando inválido', code: 'INVALID_ID' })
    }

    const { error } = await query('DELETE FROM commands WHERE id = ?', [id])
    if (error) return next(error)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
