import { query } from '../config/database.js'
import { getIo } from '../socket/socketServer.js'

const ALLOWED_TYPES = ['info', 'promo', 'alert', 'form']
const ALLOWED_TRIGGERS = ['on_login', 'on_deposit', 'manual', 'scheduled']
const ALLOWED_STATUSES = ['enviada', 'programada', 'borrador']

function parseConfig(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function normalizeStatus(value, scheduledFor) {
  if (ALLOWED_STATUSES.includes(value)) return value
  return scheduledFor ? 'programada' : 'borrador'
}

function sanitizeModal(row) {
  const config = parseConfig(row.config)
  const scheduledFor = config.scheduledFor || null
  const status = normalizeStatus(config.status, scheduledFor)

  return {
    id: row.id,
    name: row.name,
    title: row.title || '',
    body: row.content || '',
    type: row.type,
    trigger: row.trigger,
    img: config.img || '',
    audience: config.audience || 'all',
    status,
    sentAt: config.sentAt || null,
    scheduledFor,
    dismissible: config.dismissible !== false,
    ctaLabel: config.ctaLabel || '',
    ctaUrl: config.ctaUrl || '',
    ctaAction: config.ctaAction || '',
    viewsCount: Number(config.viewsCount || 0),
    isTemplate: Boolean(config.isTemplate),
    design: config.design || 'gold',
    is_active: Boolean(row.is_active),
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
  }
}

function validatePayload(body, { partial = false } = {}) {
  const errors = []
  const payload = {}

  if (!partial || body.title !== undefined) {
    payload.title = String(body.title || '').trim()
    if (!payload.title) errors.push('El título es requerido')
  }

  if (!partial || body.body !== undefined) {
    payload.body = String(body.body || '').trim()
  }

  if (!partial || body.name !== undefined) {
    payload.name = String(body.name || body.title || '').trim()
    if (!payload.name && !partial) payload.name = payload.title
  }

  payload.type = body.type || 'promo'
  if (body.type !== undefined && !ALLOWED_TYPES.includes(payload.type)) {
    errors.push('Tipo de ventana inválido')
  }

  const scheduledFor = body.scheduledFor || null
  payload.trigger = scheduledFor ? 'scheduled' : (body.trigger || 'manual')
  if (body.trigger !== undefined && !ALLOWED_TRIGGERS.includes(payload.trigger)) {
    errors.push('Disparador inválido')
  }

  payload.config = {
    img: String(body.img || ''),
    audience: body.audience || 'all',
    status: normalizeStatus(body.status, scheduledFor),
    sentAt: body.sentAt || null,
    scheduledFor,
    dismissible: body.dismissible !== false,
    ctaLabel: String(body.ctaLabel || ''),
    ctaUrl: String(body.ctaUrl || ''),
    ctaAction: String(body.ctaAction || ''),
    viewsCount: Number(body.viewsCount || 0),
    isTemplate: Boolean(body.isTemplate),
    design: ['gold', 'neon', 'fire', 'diamond'].includes(body.design) ? body.design : 'gold',
  }
  payload.is_active = payload.config.status !== 'borrador'

  return { errors, payload }
}

export async function getModals(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit || '8', 10) || 8))
    const search = String(req.query.search || '').trim()
    const status = String(req.query.status || '')

    const where = []
    const values = []

    if (search) {
      where.push('(name LIKE ? OR title LIKE ? OR content LIKE ?)')
      const like = `%${search}%`
      values.push(like, like, like)
    }

    if (ALLOWED_STATUSES.includes(status)) {
      where.push("JSON_UNQUOTE(JSON_EXTRACT(config, '$.status')) = ?")
      values.push(status)
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const { rows: countRows, error: countError } = await query(
      `SELECT COUNT(*) AS total FROM modals ${whereSql}`,
      values
    )
    if (countError) return next(countError)

    const total = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const offset = (safePage - 1) * limit

    const { rows, error } = await query(
      `SELECT id, name, title, content, type, \`trigger\`, config, is_active, created_at, updated_at
       FROM modals
       ${whereSql}
       ORDER BY updated_at DESC, id DESC
       LIMIT ${limit} OFFSET ${offset}`,
      values
    )
    if (error) return next(error)

    const { rows: statRows, error: statError } = await query(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(config, '$.status')) AS status, COUNT(*) AS total
       FROM modals
       GROUP BY JSON_UNQUOTE(JSON_EXTRACT(config, '$.status'))`,
      []
    )
    if (statError) return next(statError)

    const stats = { enviadas: 0, programadas: 0, borradores: 0 }
    statRows.forEach(row => {
      if (row.status === 'enviada') stats.enviadas = Number(row.total)
      if (row.status === 'programada') stats.programadas = Number(row.total)
      if (row.status === 'borrador') stats.borradores = Number(row.total)
    })

    res.json({
      modals: rows.map(sanitizeModal),
      stats,
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

export async function createModal(req, res, next) {
  try {
    const { errors, payload } = validatePayload(req.body)
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Datos de ventana inválido', details: errors, code: 'INVALID_MODAL_PAYLOAD' })
    }

    console.debug('[createModal] Saving modal:', {
      name: payload.name,
      title: payload.title,
      bodyLength: payload.body?.length || 0,
      bodyPreview: payload.body?.substring(0, 50) || '(empty)',
      isTemplate: payload.config.isTemplate,
    })

    const { rows: result, error: insertError } = await query(
      'INSERT INTO modals (name, title, content, type, `trigger`, config, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        payload.name || payload.title,
        payload.title,
        payload.body,
        payload.type,
        payload.trigger,
        JSON.stringify(payload.config),
        payload.is_active ? 1 : 0,
      ]
    )
    if (insertError) return next(insertError)

    const { rows, error } = await query(
      'SELECT id, name, title, content, type, `trigger`, config, is_active, created_at, updated_at FROM modals WHERE id = ? LIMIT 1',
      [result.insertId]
    )
    if (error) return next(error)

    const modal = sanitizeModal(rows[0])
    console.debug('[createModal] Modal saved and returned:', {
      id: modal.id,
      bodyLength: modal.body?.length || 0,
      bodyPreview: modal.body?.substring(0, 50) || '(empty)',
    })
    const io = getIo()

if (
  io &&
  modal.status === 'enviada' &&
  !modal.scheduledFor &&
  !modal.isTemplate
) {
  console.debug('[Popup] Emitting popup:new', {
    id: modal.id,
    title: modal.title,
    clientsRoom: io.sockets.adapter.rooms.get('clients')?.size || 0,
  })

  io.to('clients').emit('popup:new', modal)
}

res.status(201).json({ modal })
  } catch (err) {
    next(err)
  }
}

export async function updateModal(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de ventana inválido', code: 'INVALID_ID' })
    }

    const { errors, payload } = validatePayload(req.body)
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Datos de ventana inválidos', details: errors, code: 'INVALID_MODAL_PAYLOAD' })
    }

    console.debug('[updateModal] Updating modal:', {
      id,
      name: payload.name,
      title: payload.title,
      bodyLength: payload.body?.length || 0,
      bodyPreview: payload.body?.substring(0, 50) || '(empty)',
      isTemplate: payload.config.isTemplate,
    })

    const { error: updateError } = await query(
      'UPDATE modals SET name = ?, title = ?, content = ?, type = ?, `trigger` = ?, config = ?, is_active = ? WHERE id = ?',
      [
        payload.name || payload.title,
        payload.title,
        payload.body,
        payload.type,
        payload.trigger,
        JSON.stringify(payload.config),
        payload.is_active ? 1 : 0,
        id,
      ]
    )
    if (updateError) return next(updateError)

    const { rows, error } = await query(
      'SELECT id, name, title, content, type, `trigger`, config, is_active, created_at, updated_at FROM modals WHERE id = ? LIMIT 1',
      [id]
    )
    if (error) return next(error)
    if (!rows?.length) return res.status(404).json({ error: 'Ventana no encontrada', code: 'MODAL_NOT_FOUND' })

    const modal = sanitizeModal(rows[0])
    console.debug('[updateModal] Modal updated and returned:', {
      id: modal.id,
      bodyLength: modal.body?.length || 0,
      bodyPreview: modal.body?.substring(0, 50) || '(empty)',
    })
    const io = getIo()
    if (io && payload.status === 'enviada' && !payload.scheduledFor) {
      io.emit('popup:new', modal)
    }

    res.json({ modal })
  } catch (err) {
    next(err)
  }
}

export async function getActivePopups(req, res, next) {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      .toISOString().replace('T', ' ').slice(0, 19)

    const { rows, error } = await query(
      `SELECT id, name, title, content, type, \`trigger\`, config, is_active, created_at, updated_at
       FROM modals
       WHERE is_active = 1
         AND JSON_UNQUOTE(JSON_EXTRACT(config, '$.status')) = 'enviada'
         AND (JSON_UNQUOTE(JSON_EXTRACT(config, '$.isTemplate')) IS NULL
              OR JSON_UNQUOTE(JSON_EXTRACT(config, '$.isTemplate')) = 'false')
         AND (JSON_UNQUOTE(JSON_EXTRACT(config, '$.sentAt')) >= ?
              OR JSON_EXTRACT(config, '$.sentAt') IS NULL)
       ORDER BY id DESC
       LIMIT 5`,
      [twoHoursAgo]
    )
    if (error) return next(error)
    res.json({ popups: (rows || []).map(sanitizeModal) })
  } catch (err) { next(err) }
}

export async function deleteModal(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id || isNaN(id)) {
      return res.status(400).json({ error: 'ID de ventana inválido', code: 'INVALID_ID' })
    }

    const { error } = await query('DELETE FROM modals WHERE id = ?', [id])
    if (error) return next(error)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
