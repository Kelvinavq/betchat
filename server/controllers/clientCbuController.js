import { query, transaction } from '../config/database.js'

const normalizeCbu = (value) => String(value || '').replace(/\D/g, '')
const actorFromRequest = (req) => ({
  id: req.user?.id ?? null,
  username: req.user?.username || null,
  email: req.user?.email || null,
  role: req.user?.role || null,
  label: req.user?.username || req.user?.email || (req.user?.id ? `admin_${req.user.id}` : 'admin'),
})
const requestIp = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || null

async function assertClient(clientId) {
  const { rows, error } = await query('SELECT id FROM clients WHERE id = ? LIMIT 1', [clientId])
  if (error) throw error
  return Boolean(rows?.length)
}

async function insertWhitelistAudit(connection, { req, clientId, oldValue = '', newValue = '', source, reason }) {
  const actor = actorFromRequest(req)
  await connection.execute(
    `INSERT INTO client_profile_audit_log
       (client_id, field_name, old_value, new_value, changed_by_admin_id,
        changed_by_admin_username, changed_by_admin_email, changed_by_admin_label,
        changed_by_admin_role, change_source, change_reason, ip_address, user_agent, created_at)
     VALUES (?, 'cbu_cvu', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      clientId, oldValue || '', newValue || '', actor.id, actor.username, actor.email,
      actor.label, actor.role, source, reason, requestIp(req), req.headers['user-agent'] || null,
    ],
  )
}

export async function getClientCbuWhitelist(req, res, next) {
  try {
    const clientId = Number(req.params.clientId)
    if (!clientId) return res.status(400).json({ error: 'Cliente inválido.' })
    const { rows, error } = await query(
      `SELECT id, cbu, label, source, source_ref_id, verified_by, verified_at, last_used_at, active, created_at
       FROM client_cbu_whitelist
       WHERE client_id = ? AND active = 1
       ORDER BY COALESCE(last_used_at, verified_at, created_at) DESC, id DESC`,
      [clientId],
    )
    if (error) throw error
    res.json({ entries: rows || [] })
  } catch (error) { next(error) }
}

export async function addClientCbu(req, res, next) {
  try {
    const clientId = Number(req.params.clientId)
    const cbu = normalizeCbu(req.body?.cbu)
    const label = String(req.body?.label || '').trim().slice(0, 120) || null
    if (!clientId) return res.status(400).json({ error: 'Cliente inválido.' })
    if (!/^\d{22}$/.test(cbu)) return res.status(400).json({ error: 'El CBU/CVU debe tener 22 dígitos.' })
    if (!await assertClient(clientId)) return res.status(404).json({ error: 'Cliente no encontrado.' })
    const actor = actorFromRequest(req)

    const entryId = await transaction(async (connection) => {
      const [existingRows] = await connection.execute(
        'SELECT id, cbu, active FROM client_cbu_whitelist WHERE client_id = ? AND cbu = ? LIMIT 1 FOR UPDATE',
        [clientId, cbu],
      )
      const existing = existingRows?.[0]
      if (existing) {
        await connection.execute(
          `UPDATE client_cbu_whitelist
           SET label = ?, source = 'manual', verified_by = ?, verified_at = NOW(), active = 1
           WHERE id = ? AND client_id = ?`,
          [label, actor.label, existing.id, clientId],
        )
        await insertWhitelistAudit(connection, {
          req, clientId, oldValue: existing.active ? cbu : '', newValue: cbu,
          source: 'client_cbu_whitelist_add', reason: existing.active ? 'Actualización manual de CBU permitido' : 'Reactivación manual de CBU permitido',
        })
        return existing.id
      }
      const [result] = await connection.execute(
        `INSERT INTO client_cbu_whitelist
           (client_id, cbu, label, source, verified_by, verified_at, active, created_at)
         VALUES (?, ?, ?, 'manual', ?, NOW(), 1, NOW())`,
        [clientId, cbu, label, actor.label],
      )
      await insertWhitelistAudit(connection, {
        req, clientId, newValue: cbu, source: 'client_cbu_whitelist_add', reason: 'Alta manual de CBU permitido',
      })
      return result.insertId
    })
    res.status(201).json({ ok: true, id: entryId })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese CBU/CVU ya está permitido para el cliente.' })
    next(error)
  }
}

export async function updateClientCbu(req, res, next) {
  try {
    const clientId = Number(req.params.clientId)
    const entryId = Number(req.params.entryId)
    const cbu = normalizeCbu(req.body?.cbu)
    const label = String(req.body?.label || '').trim().slice(0, 120) || null
    if (!clientId || !entryId) return res.status(400).json({ error: 'Cliente o entrada inválidos.' })
    if (!/^\d{22}$/.test(cbu)) return res.status(400).json({ error: 'El CBU/CVU debe tener 22 dígitos.' })
    const actor = actorFromRequest(req)

    await transaction(async (connection) => {
      const [rows] = await connection.execute(
        'SELECT id, cbu FROM client_cbu_whitelist WHERE id = ? AND client_id = ? AND active = 1 LIMIT 1 FOR UPDATE',
        [entryId, clientId],
      )
      const existing = rows?.[0]
      if (!existing) { const error = new Error('Entrada no encontrada.'); error.httpStatus = 404; throw error }
      await connection.execute(
        `UPDATE client_cbu_whitelist
         SET cbu = ?, label = ?, source = 'manual', verified_by = ?, verified_at = NOW()
         WHERE id = ? AND client_id = ?`,
        [cbu, label, actor.label, entryId, clientId],
      )
      await insertWhitelistAudit(connection, {
        req, clientId, oldValue: existing.cbu, newValue: cbu,
        source: 'client_cbu_whitelist_update', reason: 'Modificación manual de CBU permitido',
      })
    })
    res.json({ ok: true, id: entryId })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese CBU/CVU ya está permitido para el cliente.' })
    if (error.httpStatus) return res.status(error.httpStatus).json({ error: error.message })
    next(error)
  }
}

export async function removeClientCbu(req, res, next) {
  try {
    const clientId = Number(req.params.clientId)
    const entryId = Number(req.params.entryId)
    if (!clientId || !entryId) return res.status(400).json({ error: 'Cliente o entrada inválidos.' })
    await transaction(async (connection) => {
      const [rows] = await connection.execute(
        'SELECT id, cbu FROM client_cbu_whitelist WHERE id = ? AND client_id = ? AND active = 1 LIMIT 1 FOR UPDATE',
        [entryId, clientId],
      )
      const existing = rows?.[0]
      if (!existing) { const error = new Error('Entrada no encontrada.'); error.httpStatus = 404; throw error }
      await connection.execute('UPDATE client_cbu_whitelist SET active = 0 WHERE id = ? AND client_id = ?', [entryId, clientId])
      await insertWhitelistAudit(connection, {
        req, clientId, oldValue: existing.cbu, newValue: '',
        source: 'client_cbu_whitelist_delete', reason: 'Baja manual de CBU permitido',
      })
    })
    res.json({ ok: true })
  } catch (error) {
    if (error.httpStatus) return res.status(error.httpStatus).json({ error: error.message })
    next(error)
  }
}
