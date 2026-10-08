import crypto from 'crypto'
import moment from 'moment-timezone'
import { query, getPool } from '../config/database.js'
import { persistDetectedEvent } from '../services/caudalTransactionService.js'
import { getWithdrawalStatusFromProvider } from '../services/caudalWithdrawalService.js'

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires'

const safeJson = (value) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'object') return value
  try { return JSON.parse(String(value)) } catch { return value }
}

const getGroupStatusSummary = (rows = []) => {
  const list = Array.isArray(rows) ? rows : []
  const pending  = list.filter((r) => String(r.our_status || 'pending').toLowerCase() === 'pending').length
  const paid     = list.filter((r) => String(r.our_status || '').toLowerCase() === 'paid').length
  const duplicate = list.filter((r) => String(r.our_status || '').toLowerCase() === 'duplicate').length
  const latestResolved = list.slice().reverse().find((r) => String(r.our_status || '').toLowerCase() !== 'pending')
  return { total: list.length, pending, paid, duplicate, hasResolution: paid + duplicate > 0, latestResolved }
}

const getAdminAuditActor = (adminUser) => {
  const adminId       = adminUser?.id ?? adminUser?.userId ?? null
  const adminUsername = adminUser?.username ?? null
  const adminEmail    = adminUser?.email ?? null
  const adminRole     = adminUser?.role ?? null
  const adminLabel    = adminUsername || adminEmail || (adminId != null ? `admin_${adminId}` : 'admin_desconocido')
  return { adminId, adminUsername, adminEmail, adminRole, adminLabel }
}

const getActiveCaudalAccount = async () => {
  const { rows } = await query(
    `SELECT ba.id, ba.account_data
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE bp.slug = 'caudal' AND ba.is_active = 1
     ORDER BY ba.id ASC LIMIT 1`
  )
  if (!rows?.[0]) return null
  const data = typeof rows[0].account_data === 'object'
    ? rows[0].account_data
    : JSON.parse(rows[0].account_data || '{}')
  return {
    id: rows[0].id,
    cbu: data.cbu || null,
    alias: data.alias || null,
    nombre_titular: data.nombre_titular || null,
    webhook_secret: data.webhook_secret || null,
  }
}

const signWebhookBody = (rawBody, secret) =>
  `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`

const buildWhereClause = (q) => {
  const { search, eventName, status, fromCuit, clientCuit, ourStatus, matchSource, dateFrom, dateTo, flowType } = q
  let where = 'WHERE 1=1'
  const params = []

  if (flowType && flowType !== 'ALL') {
    if (flowType === 'deposit') {
      where += " AND e.event_name IN ('transferencia.detectada', 'transferencia.actualizada')"
    } else if (flowType === 'withdrawal') {
      where += " AND e.event_name = 'retiro.resuelto'"
    }
  }

  if (eventName && eventName !== 'ALL') {
    where += ' AND e.event_name = ?'
    params.push(eventName)
  }

  if (status) {
    where += ' AND e.status = ?'
    params.push(status)
  }

  if (ourStatus) {
    if (ourStatus === 'pending') {
      where += " AND (e.our_status IS NULL OR e.our_status = 'pending')"
    } else {
      where += ' AND e.our_status = ?'
      params.push(ourStatus)
    }
  }

  if (matchSource) {
    if (matchSource === 'none') {
      where += " AND (e.match_source IS NULL OR e.match_source = 'none')"
    } else {
      where += ' AND e.match_source = ?'
      params.push(matchSource)
    }
  }

  if (dateFrom && String(dateFrom).trim()) {
    where += ' AND e.occurred_at >= ?'
    const value = String(dateFrom).trim()
    params.push(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value} 00:00:00` : value)
  }

  if (dateTo && String(dateTo).trim()) {
    where += ' AND e.occurred_at <= ?'
    const value = String(dateTo).trim()
    params.push(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value} 23:59:59` : value)
  }

  if (search && String(search).trim()) {
    const like = `%${String(search).trim()}%`
    where += `
      AND (
        e.external_transaction_id LIKE ?
        OR e.account_external_id LIKE ?
        OR e.from_name LIKE ?
        OR e.from_cuit LIKE ?
        OR e.from_cbu LIKE ?
        OR e.client_cuit_cuil LIKE ?
        OR c.username LIKE ?
        OR c.full_name LIKE ?
        OR c.verified_titular_name LIKE ?
      )
    `
    params.push(like, like, like, like, like, like, like, like, like)
  }

  if (fromCuit && String(fromCuit).trim()) {
    where += ' AND e.from_cuit = ?'
    params.push(String(fromCuit).trim().replace(/\D/g, ''))
  }

  if (clientCuit && String(clientCuit).trim()) {
    where += ' AND e.client_cuit_cuil = ?'
    params.push(String(clientCuit).trim().replace(/\D/g, ''))
  }

  return { where, params }
}

const CAUDAL_WITHDRAWAL_JOIN = `
  LEFT JOIN caudal_withdrawal_requests wr
    ON wr.external_id = e.external_transaction_id
    OR wr.client_reference_id = e.external_transaction_id
`

const CAUDAL_AMOUNT_SELECT = 'COALESCE(e.amount, wr.amount) AS amount'

export async function listTransactionEvents(req, res) {
  try {
    const page     = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 25, 1), 100)
    const offset   = (page - 1) * pageSize

    const { where, params } = buildWhereClause(req.query)

    const countQuery = `
      SELECT COUNT(DISTINCT e.id) AS total
      FROM caudal_transaction_events e
      LEFT JOIN clients c ON c.id = e.client_id
      ${CAUDAL_WITHDRAWAL_JOIN}
      ${where}
    `

    const listQuery = `
      SELECT
        e.id,
        e.event_id,
        e.event_name,
        CASE WHEN e.event_name = 'retiro.resuelto' THEN 'withdrawal' ELSE 'deposit' END AS flow_type,
        e.occurred_at,
        e.external_transaction_id,
        e.account_external_id,
        e.direction,
        e.status,
        ${CAUDAL_AMOUNT_SELECT},
        e.currency,
        e.transfer_date,
        e.coelsa_code,
        e.from_name,
        e.from_cuit,
        e.from_cbu,
        e.client_id,
        e.client_cuit_cuil,
        e.match_source,
        e.our_status,
        e.reviewed_by_admin_id,
        e.reviewed_by_admin_username,
        e.reviewed_at,
        e.review_note,
        e.balance_credited_at,
        e.matched_at,
        e.created_at,
        e.updated_at,
        g.group_total,
        g.group_pending,
        g.group_paid,
        g.group_duplicate,
        g.group_has_resolution,
        c.username AS client_username,
        c.full_name AS client_name,
        c.verified_titular_name AS client_verified_titular_name
      FROM caudal_transaction_events e
      LEFT JOIN clients c ON c.id = e.client_id
      ${CAUDAL_WITHDRAWAL_JOIN}
      LEFT JOIN (
        SELECT
          external_transaction_id,
          MAX(occurred_at) AS group_latest_occurred_at,
          MAX(id) AS group_latest_id,
          COUNT(*) AS group_total,
          SUM(CASE WHEN our_status IS NULL OR our_status = 'pending' THEN 1 ELSE 0 END) AS group_pending,
          SUM(CASE WHEN our_status = 'paid'      THEN 1 ELSE 0 END) AS group_paid,
          SUM(CASE WHEN our_status = 'duplicate' THEN 1 ELSE 0 END) AS group_duplicate,
          MAX(CASE WHEN our_status IS NOT NULL AND our_status <> 'pending' THEN 1 ELSE 0 END) AS group_has_resolution
        FROM caudal_transaction_events
        GROUP BY external_transaction_id
      ) g ON g.external_transaction_id = e.external_transaction_id
      ${where}
      ORDER BY g.group_latest_occurred_at DESC, g.group_latest_id DESC, e.external_transaction_id DESC, e.event_name ASC, e.occurred_at ASC, e.id ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `

    const [{ rows: countRows }, { rows: listRows }] = await Promise.all([
      query(countQuery, params),
      query(listQuery, params),
    ])

    const events = (listRows || []).map((row) => ({
      ...row,
      raw_payload: safeJson(row.raw_payload),
      raw_headers: safeJson(row.raw_headers),
      group_total:          Number(row.group_total || 0),
      group_pending:        Number(row.group_pending || 0),
      group_paid:           Number(row.group_paid || 0),
      group_duplicate:      Number(row.group_duplicate || 0),
      group_has_resolution: Number(row.group_has_resolution || 0),
    }))

    return res.json({
      events,
      total: Number(countRows?.[0]?.total || 0),
      page,
      pageSize,
    })
  } catch (error) {
    console.error('[adminCaudal] Error listando eventos:', error)
    return res.status(500).json({ message: 'Error al obtener eventos de Caudal.' })
  }
}

export async function getTransactionDetail(req, res) {
  try {
    const externalTransactionId = String(req.params.externalTransactionId || '').trim()
    if (!externalTransactionId) {
      return res.status(400).json({ message: 'externalTransactionId es obligatorio.' })
    }

    const { rows: eventRows } = await query(
      `SELECT
        e.id, e.event_id, e.event_name,
        CASE WHEN e.event_name = 'retiro.resuelto' THEN 'withdrawal' ELSE 'deposit' END AS flow_type,
        e.occurred_at, e.external_transaction_id, e.account_external_id, e.direction,
        e.status, ${CAUDAL_AMOUNT_SELECT}, e.currency, e.transfer_date, e.coelsa_code,
        e.from_name, e.from_cuit, e.from_cbu, e.client_id, e.client_cuit_cuil,
        e.match_source, e.matched_at, e.created_at, e.updated_at,
        g.group_total, g.group_pending, g.group_paid, g.group_duplicate, g.group_has_resolution,
        e.raw_payload, e.raw_headers,
        c.username AS client_username,
        c.full_name AS client_name,
        c.verified_titular_name AS client_verified_titular_name
       FROM caudal_transaction_events e
       LEFT JOIN clients c ON c.id = e.client_id
       ${CAUDAL_WITHDRAWAL_JOIN}
       LEFT JOIN (
         SELECT external_transaction_id,
           COUNT(*) AS group_total,
           SUM(CASE WHEN our_status IS NULL OR our_status = 'pending' THEN 1 ELSE 0 END) AS group_pending,
           SUM(CASE WHEN our_status = 'paid'      THEN 1 ELSE 0 END) AS group_paid,
           SUM(CASE WHEN our_status = 'duplicate' THEN 1 ELSE 0 END) AS group_duplicate,
           MAX(CASE WHEN our_status IS NOT NULL AND our_status <> 'pending' THEN 1 ELSE 0 END) AS group_has_resolution
         FROM caudal_transaction_events GROUP BY external_transaction_id
       ) g ON g.external_transaction_id = e.external_transaction_id
       WHERE e.external_transaction_id = ?
       ORDER BY e.occurred_at ASC, e.id ASC`,
      [externalTransactionId]
    )

    if (!eventRows?.length) {
      return res.status(404).json({ message: 'No se encontraron eventos para esa transacción.' })
    }

    const events = eventRows.map((row) => ({
      ...row,
      raw_payload: safeJson(row.raw_payload),
      raw_headers: safeJson(row.raw_headers),
      group_total:          Number(row.group_total || 0),
      group_pending:        Number(row.group_pending || 0),
      group_paid:           Number(row.group_paid || 0),
      group_duplicate:      Number(row.group_duplicate || 0),
      group_has_resolution: Number(row.group_has_resolution || 0),
    }))

    const { rows: auditRows } = await query(
      `SELECT
        a.id, a.source, a.decision, a.reason_code, a.reason_detail,
        a.client_id, a.chat_id, a.user_id, a.comprobante_id,
        a.caudal_transaction_event_id, a.external_transaction_id,
        a.amount, a.currency, a.from_name, a.from_cuit,
        a.coelsa_code, a.match_source, a.ai_confidence,
        a.request_ip, a.user_agent, a.payload, a.metadata,
        a.created_at, u.username AS admin_username
       FROM caudal_payment_audit_log a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.external_transaction_id = ?
       ORDER BY a.created_at DESC, a.id DESC`,
      [externalTransactionId]
    )

    const auditHistory = (auditRows || []).map((row) => ({
      ...row,
      payload:  safeJson(row.payload),
      metadata: safeJson(row.metadata),
    }))

    const latest      = events[events.length - 1]
    const groupSummary = getGroupStatusSummary(events)

    return res.json({ externalTransactionId, totalEvents: events.length, groupSummary, currentState: latest, events, auditHistory })
  } catch (error) {
    console.error('[adminCaudal] Error obteniendo detalle:', error)
    return res.status(500).json({ message: 'Error al obtener el detalle de la transacción.' })
  }
}

export async function getMetrics(req, res) {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN t.our_status IS NULL OR t.our_status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN t.our_status = 'paid'      THEN 1 ELSE 0 END) AS paid,
        SUM(CASE WHEN t.our_status = 'duplicate' THEN 1 ELSE 0 END) AS duplicate,
        SUM(CASE WHEN t.our_status = 'paid' THEN t.resolved_amount ELSE 0 END) AS amountPaid,
        SUM(CASE WHEN t.our_status IS NULL OR t.our_status = 'pending' THEN t.resolved_amount ELSE 0 END) AS amountPending,
        SUM(t.resolved_amount) AS amountTotal,
        SUM(CASE WHEN t.match_source IS NULL OR t.match_source = 'none' THEN 1 ELSE 0 END) AS matchNone,
        SUM(CASE WHEN t.match_source = 'client_cuit_cuil'             THEN 1 ELSE 0 END) AS matchCuit,
        SUM(CASE WHEN t.match_source = 'client_name_exact'            THEN 1 ELSE 0 END) AS matchNameExact,
        SUM(CASE WHEN t.match_source = 'client_name_exact_ambiguous'  THEN 1 ELSE 0 END) AS matchAmbiguous,
        SUM(CASE WHEN t.match_source = 'client_name'                  THEN 1 ELSE 0 END) AS matchName,
        SUM(CASE WHEN t.match_source = 'manual'                       THEN 1 ELSE 0 END) AS matchManual
      FROM (
        SELECT t.*, COALESCE(t.amount, wr.amount, 0) AS resolved_amount
        FROM caudal_transaction_events t
        LEFT JOIN caudal_withdrawal_requests wr
          ON wr.external_id = t.external_transaction_id
          OR wr.client_reference_id = t.external_transaction_id
        INNER JOIN (
          SELECT external_transaction_id, MAX(id) AS max_id
          FROM caudal_transaction_events
          GROUP BY external_transaction_id
        ) latest ON t.id = latest.max_id
      ) t
    `)

    const m = rows?.[0] || {}
    return res.json({
      total:         Number(m.total || 0),
      pending:       Number(m.pending || 0),
      paid:          Number(m.paid || 0),
      duplicate:     Number(m.duplicate || 0),
      amountPaid:    Number(m.amountPaid || 0),
      amountPending: Number(m.amountPending || 0),
      amountTotal:   Number(m.amountTotal || 0),
      matchNone:       Number(m.matchNone || 0),
      matchCuit:       Number(m.matchCuit || 0),
      matchNameExact:  Number(m.matchNameExact || 0),
      matchAmbiguous:  Number(m.matchAmbiguous || 0),
      matchName:       Number(m.matchName || 0),
      matchManual:     Number(m.matchManual || 0),
    })
  } catch (error) {
    console.error('[adminCaudal] Error obteniendo métricas:', error)
    return res.status(500).json({ message: 'Error al obtener métricas de Caudal.' })
  }
}

export async function resolveTransaction(req, res) {
  try {
    const externalTransactionId = String(req.params.externalTransactionId || '').trim()
    const { action, reviewNote } = req.body || {}
    const adminUser = req.user

    if (!externalTransactionId) {
      return res.status(400).json({ message: 'externalTransactionId es obligatorio.' })
    }

    if (!['paid', 'duplicate'].includes(action)) {
      return res.status(400).json({ message: "action debe ser 'paid' o 'duplicate'." })
    }

    const { rows } = await query(
      `SELECT id, our_status FROM caudal_transaction_events WHERE external_transaction_id = ? ORDER BY id DESC LIMIT 1`,
      [externalTransactionId]
    )

    if (!rows?.length) {
      return res.status(404).json({ message: 'Transacción no encontrada.' })
    }

    const { rows: groupRows } = await query(
      `SELECT id, our_status FROM caudal_transaction_events WHERE external_transaction_id = ? ORDER BY id ASC`,
      [externalTransactionId]
    )

    const groupSummary = getGroupStatusSummary(groupRows || [])
    if (groupSummary.hasResolution) {
      const currentStatus = groupSummary.latestResolved?.our_status || 'paid'
      return res.status(409).json({ message: 'La transacción ya fue resuelta.', currentStatus })
    }

    const currentStatus = String(rows[0].our_status || 'pending').toLowerCase()
    if (currentStatus !== 'pending') {
      return res.status(409).json({ message: 'La transacción ya fue resuelta.', currentStatus })
    }

    const now        = moment().tz(ARGENTINA_TZ).format('YYYY-MM-DD HH:mm:ss')
    const adminId    = adminUser?.id ?? adminUser?.userId ?? null
    const adminUsername = adminUser?.username ?? null
    const noteValue  = reviewNote ? String(reviewNote).slice(0, 500) : null
    const ourStatus  = action === 'paid' ? 'paid' : 'duplicate'

    await query(
      `UPDATE caudal_transaction_events
       SET our_status = ?, reviewed_by_admin_id = ?, reviewed_by_admin_username = ?,
           reviewed_at = ?, review_note = ?, updated_at = CURRENT_TIMESTAMP
       WHERE external_transaction_id = ?`,
      [ourStatus, adminId, adminUsername, now, noteValue, externalTransactionId]
    )

    return res.json({ ok: true, ourStatus, reviewedAt: now, reviewedBy: adminUsername })
  } catch (error) {
    console.error('[adminCaudal] Error resolviendo transacción:', error)
    return res.status(500).json({ message: 'Error al resolver la transacción.' })
  }
}

async function getLatestCaudalTransactionState(externalTransactionId) {
  const { rows } = await query(
    `SELECT e.id, e.event_id, e.event_name, e.occurred_at, e.external_transaction_id,
            e.account_external_id, e.direction, e.status, e.amount, e.currency,
            e.transfer_date, e.coelsa_code, e.from_name, e.from_cuit, e.from_cbu,
            e.client_id, e.client_cuit_cuil, e.match_source, e.our_status,
            e.reviewed_by_admin_id, e.reviewed_by_admin_username, e.reviewed_at,
            e.review_note, e.balance_credited_at, e.matched_at, e.created_at, e.updated_at,
            c.username AS client_username,
            c.full_name AS client_name,
            c.verified_titular_name AS client_verified_titular_name
     FROM caudal_transaction_events e
     LEFT JOIN clients c ON c.id = e.client_id
     WHERE e.external_transaction_id = ?
     ORDER BY e.id DESC LIMIT 1`,
    [externalTransactionId]
  )
  return rows?.[0] || null
}

async function getClientById(clientId) {
  const { rows } = await query(
    `SELECT id, username, full_name, cuil AS cuit_cuil, verified_titular_name FROM clients WHERE id = ? LIMIT 1`,
    [clientId]
  )
  return rows?.[0] || null
}

async function updateTransactionAssignment({ externalTransactionId, targetClientId, adminUser, requestIp = null, userAgent = null, reviewNote = null, clearAssignment = false }) {
  const latest = await getLatestCaudalTransactionState(externalTransactionId)
  if (!latest) {
    const error = new Error('caudal_transaction_not_found')
    error.httpStatus = 404; throw error
  }

  const targetClient = clearAssignment ? null : await getClientById(targetClientId)
  if (!clearAssignment && !targetClient) {
    const error = new Error('caudal_client_not_found')
    error.httpStatus = 404; throw error
  }

  const admin           = getAdminAuditActor(adminUser)
  const now             = moment().tz(ARGENTINA_TZ).format('YYYY-MM-DD HH:mm:ss')
  const normalizedAmount = Number(latest.amount || 0)
  const oldClientId     = latest.client_id ? Number(latest.client_id) : null
  const oldClientUsername = latest.client_username || null
  const oldTitularName  = latest.client_verified_titular_name || null
  const newClientId     = clearAssignment ? null : Number(targetClient.id)
  const newClientUsername = clearAssignment ? null : targetClient.username || null
  const newCuit         = clearAssignment ? null : String(targetClient.cuit_cuil || '').replace(/\D/g, '') || null
  const nextTitularName = clearAssignment
    ? null
    : String(latest.from_name || '').trim() || String(targetClient.verified_titular_name || '').trim() || null
  const shouldUpdateTitular = !clearAssignment && Boolean(nextTitularName)
  const changeSource        = clearAssignment ? 'caudal_assignment_clear' : 'caudal_assignment'

  const pool = getPool()
  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    await conn.query(
      `UPDATE caudal_transaction_events
       SET client_id = ?, client_cuit_cuil = ?, match_source = 'manual',
           matched_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE external_transaction_id = ?`,
      [newClientId, newCuit, externalTransactionId]
    )

    if (shouldUpdateTitular && targetClient && String(targetClient.verified_titular_name || '').trim() !== nextTitularName) {
      await conn.query(
        `UPDATE clients SET verified_titular_name = ?, verified_titular_source = 'caudal_transactions',
         verified_titular_updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [nextTitularName, targetClient.id]
      )

      await conn.query(
        `INSERT INTO client_profile_audit_log
           (client_id, field_name, old_value, new_value, changed_by_admin_id, changed_by_admin_username,
            changed_by_admin_email, changed_by_admin_label, changed_by_admin_role, change_source,
            change_reason, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(targetClient.id), 'verified_titular_name',
          targetClient.verified_titular_name || null, nextTitularName,
          admin.adminId, admin.adminUsername, admin.adminEmail, admin.adminLabel, admin.adminRole,
          changeSource,
          reviewNote || (clearAssignment ? 'Se desasigno el pago Caudal del cliente.' : 'Se asigno manualmente un pago Caudal al cliente.'),
          requestIp, userAgent, now,
        ]
      )
    }

    await conn.query(
      `INSERT INTO caudal_payment_audit_log
         (source, decision, reason_code, reason_detail, client_id, user_id,
          caudal_transaction_event_id, external_transaction_id, amount, currency,
          from_name, from_cuit, match_source, request_ip, user_agent, payload, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'admin_action',
        clearAssignment ? 'ignored' : 'accepted',
        clearAssignment ? 'clear_client_assignment' : 'assign_client',
        reviewNote || (clearAssignment ? 'Se quito la asignacion manual del pago Caudal.' : 'Se asigno manualmente el pago Caudal a un cliente.'),
        clearAssignment ? null : Number(targetClient.id),
        admin.adminId, latest.id, externalTransactionId,
        normalizedAmount || null, latest.currency || 'ARS',
        latest.from_name || null, latest.from_cuit || null, 'manual',
        requestIp, userAgent,
        JSON.stringify({ action: clearAssignment ? 'clear_client_assignment' : 'assign_client', externalTransactionId, oldClientId, oldClientUsername, oldTitularName, newClientId, newClientUsername, newCuit, newTitularName: nextTitularName }),
        JSON.stringify({ oldClientId, oldClientUsername, oldTitularName, newClientId, newClientUsername, newCuit, newTitularName: nextTitularName, clearAssignment }),
        now,
      ]
    )

    await conn.commit()
    conn.release()

    return {
      latest, oldClientId, oldClientUsername, oldTitularName,
      newClientId, newClientUsername, newTitularName: nextTitularName,
      clearAssignment, changedTitularName: shouldUpdateTitular,
      clientId: newClientId, clientUsername: newClientUsername,
      clientVerifiedTitularName: nextTitularName, matchedAt: now,
    }
  } catch (error) {
    await conn.rollback()
    conn.release()
    throw error
  }
}

export async function assignTransactionToClient(req, res) {
  try {
    const externalTransactionId = String(req.params.externalTransactionId || '').trim()
    const clientId   = Number(req.body?.clientId)
    const reviewNote = typeof req.body?.reviewNote === 'string' ? req.body.reviewNote.trim() : null
    const requestIp  = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    const userAgent  = req.headers['user-agent'] || null

    if (!externalTransactionId) {
      return res.status(400).json({ message: 'externalTransactionId es obligatorio.' })
    }
    if (!Number.isFinite(clientId) || clientId <= 0) {
      return res.status(400).json({ message: 'clientId es obligatorio.' })
    }

    const result = await updateTransactionAssignment({
      externalTransactionId, targetClientId: clientId,
      adminUser: req.user || null, requestIp, userAgent, reviewNote, clearAssignment: false,
    })

    return res.json({ ok: true, message: 'Pago asignado correctamente al cliente.', ...result })
  } catch (error) {
    console.error('[adminCaudal] Error asignando cliente:', error)
    return res.status(error?.httpStatus || 500).json({ message: error?.message || 'Error al asignar el cliente al pago Caudal.' })
  }
}

export async function clearTransactionClientAssignment(req, res) {
  try {
    const externalTransactionId = String(req.params.externalTransactionId || '').trim()
    const reviewNote = typeof req.body?.reviewNote === 'string' ? req.body.reviewNote.trim() : null
    const requestIp  = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null
    const userAgent  = req.headers['user-agent'] || null

    if (!externalTransactionId) {
      return res.status(400).json({ message: 'externalTransactionId es obligatorio.' })
    }

    const result = await updateTransactionAssignment({
      externalTransactionId, targetClientId: null,
      adminUser: req.user || null, requestIp, userAgent, reviewNote, clearAssignment: true,
    })

    return res.json({ ok: true, message: 'Pago desasignado correctamente.', ...result })
  } catch (error) {
    console.error('[adminCaudal] Error desasignando cliente:', error)
    return res.status(error?.httpStatus || 500).json({ message: error?.message || 'Error al desasignar el pago Caudal.' })
  }
}

export async function getWithdrawalStatus(req, res) {
  try {
    const externalId = String(req.params.externalId || '').trim()
    if (!externalId) {
      return res.status(400).json({ ok: false, message: 'externalId es obligatorio.' })
    }

    const provider = await getWithdrawalStatusFromProvider({ externalId })
    const { rows: localRows } = await query(
      `SELECT
        id, bank_account_id, account_external_id, client_id, client_cuit_cuil,
        client_username, client_name, correlation_id, client_reference_id, external_id,
        amount, destination_cbu, destination_alias, destination_name, destination_cuit,
        destination_bank, concept, status, provider_status, provider_reason, coelsa_id,
        raw_request, raw_response, raw_webhook, last_error, dispatched_at,
        balance_debited_at, risk_score, risk_flags, risk_reason,
        request_ip, request_device, request_user_agent, request_country_code,
        request_country_name, request_city, request_region, request_latitude,
        request_longitude, request_asn_number, request_asn_name, request_asn_org,
        request_timezone, reviewed_by, reviewed_at, review_note,
        created_at, updated_at, resolved_at
       FROM caudal_withdrawal_requests
       WHERE external_id = ?
       ORDER BY id DESC LIMIT 1`,
      [externalId]
    )

    return res.json({ ok: true, withdrawal: localRows?.[0] || null, provider })
  } catch (error) {
    console.error('[adminCaudal] Error consultando estado del retiro:', error)
    return res.status(error?.httpStatus || 500).json({
      ok: false,
      message: error?.message || 'Error al consultar el estado del retiro Caudal.',
      code: error?.code || 'caudal_withdrawal_status_error',
    })
  }
}

export async function getClientCaudalDeposits(req, res) {
  try {
    const clientId = parseInt(req.params.clientId, 10)
    if (!clientId) return res.status(400).json({ ok: false, message: 'clientId inválido' })
    const page     = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100)
    const offset   = (page - 1) * pageSize

    const { rows: cnt } = await query(
      `SELECT COUNT(*) AS total FROM caudal_transaction_events WHERE client_id = ? AND event_name != 'retiro.resuelto'`,
      [clientId]
    )
    const total = cnt?.[0]?.total ?? 0

    const { rows, error } = await query(
      `SELECT id, event_name, occurred_at, external_transaction_id, amount, currency, from_name, from_cuit, match_source, our_status, reviewed_at, reviewed_by_admin_username, review_note
       FROM caudal_transaction_events
       WHERE client_id = ? AND event_name != 'retiro.resuelto'
       ORDER BY occurred_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [clientId]
    )
    if (error) return res.status(500).json({ ok: false })
    res.json({ ok: true, items: rows || [], total, page, pageSize })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
}

export async function getClientCaudalWithdrawals(req, res) {
  try {
    const clientId = parseInt(req.params.clientId, 10)
    if (!clientId) return res.status(400).json({ ok: false, message: 'clientId inválido' })
    const page     = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100)
    const offset   = (page - 1) * pageSize

    const { rows: cnt } = await query(
      `SELECT COUNT(*) AS total FROM caudal_withdrawal_requests WHERE client_id = ?`,
      [clientId]
    )
    const total = cnt?.[0]?.total ?? 0

    const { rows, error } = await query(
      `SELECT id, amount, destination_cbu, destination_alias, destination_name, concept, status, provider_status, provider_reason, risk_score, created_at, resolved_at
       FROM caudal_withdrawal_requests
       WHERE client_id = ?
       ORDER BY created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
      [clientId]
    )
    if (error) return res.status(500).json({ ok: false })
    res.json({ ok: true, items: rows || [], total, page, pageSize })
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message })
  }
}

export async function simulateTransaction(req, res) {
  try {
    const {
      amount,
      fromName,
      fromCuit         = null,
      fromCbu          = null,
      accountExternalId = null,
      externalTransactionId = null,
      status           = 'acreditado',
      currency         = 'ARS',
      coelsaCode       = null,
      simulateUpdated  = true,
      updatedAfterSeconds = 180,
      occurredAt       = null,
      updatedOccurredAt = null,
    } = req.body || {}

    const amountNum = Number(amount)
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: 'amount debe ser un número válido mayor a 0.' })
    }
    if (!fromName || !String(fromName).trim()) {
      return res.status(400).json({ message: 'fromName es obligatorio.' })
    }

    const activeAccount = await getActiveCaudalAccount()
    if (!activeAccount?.webhook_secret) {
      return res.status(400).json({ message: 'No hay una cuenta Caudal activa con webhook_secret.' })
    }

    const sourceTransactionId = String(externalTransactionId || '').trim() || crypto.randomUUID()
    const baseOccurredAt = occurredAt
      ? moment.tz(String(occurredAt), ARGENTINA_TZ)
      : moment().tz(ARGENTINA_TZ)

    const detectPayload = {
      event:      'transferencia.detectada',
      event_id:   crypto.randomUUID(),
      occurred_at: baseOccurredAt.format(),
      data: {
        id:         sourceTransactionId,
        accountId:  String(accountExternalId || activeAccount.id || activeAccount.cbu),
        direction:  'Inbound',
        status:     'preliminar',
        amount:     amountNum,
        currency,
        date:       baseOccurredAt.format(),
        coelsaCode: null,
        fromName:   String(fromName).trim(),
        fromCUIT:   fromCuit ? String(fromCuit).replace(/\D/g, '') : null,
        fromCBU:    fromCbu  ? String(fromCbu).replace(/\D/g, '')  : null,
      },
    }

    const detectRawBody = Buffer.from(JSON.stringify(detectPayload), 'utf8')
    const detectReq = {
      rawBody: detectRawBody,
      body:    detectPayload,
      headers: {
        'content-type':                 'application/json',
        'x-caudal-webhook-signature':   signWebhookBody(detectRawBody, activeAccount.webhook_secret),
        'x-caudal-simulation':          '1',
        'user-agent':                   `admin-simulation/${req.user?.username || 'admin'}`,
        'x-forwarded-for':              req.headers?.['x-forwarded-for'] || req.ip || null,
      },
      connection: req.connection,
      socket:     req.socket,
    }

    const detectResult = await persistDetectedEvent(detectReq)

    let updatedResult = null
    if (simulateUpdated !== false) {
      const updatedAt = updatedOccurredAt
        ? moment.tz(String(updatedOccurredAt), ARGENTINA_TZ)
        : baseOccurredAt.clone().add(Number(updatedAfterSeconds) || 180, 'seconds')

      const updatedPayload = {
        event:      'transferencia.actualizada',
        event_id:   crypto.randomUUID(),
        occurred_at: updatedAt.format(),
        data: {
          id:         sourceTransactionId,
          accountId:  String(accountExternalId || activeAccount.id || activeAccount.cbu),
          direction:  'Inbound',
          status,
          amount:     amountNum,
          currency,
          date:       baseOccurredAt.format(),
          coelsaCode: coelsaCode || crypto.randomBytes(11).toString('hex').toUpperCase().slice(0, 22),
          fromName:   String(fromName).trim(),
          fromCUIT:   fromCuit ? String(fromCuit).replace(/\D/g, '') : null,
          fromCBU:    fromCbu  ? String(fromCbu).replace(/\D/g, '')  : null,
        },
      }

      const updatedRawBody = Buffer.from(JSON.stringify(updatedPayload), 'utf8')
      const updatedReq = {
        rawBody: updatedRawBody,
        body:    updatedPayload,
        headers: {
          'content-type':               'application/json',
          'x-caudal-webhook-signature': signWebhookBody(updatedRawBody, activeAccount.webhook_secret),
          'x-caudal-simulation':        '1',
          'user-agent':                 `admin-simulation/${req.user?.username || 'admin'}`,
          'x-forwarded-for':            req.headers?.['x-forwarded-for'] || req.ip || null,
        },
        connection: req.connection,
        socket:     req.socket,
      }

      const delayMs = Math.max(0, Number(updatedAfterSeconds) || 180) * 1000

      if (delayMs > 0) {
        setTimeout(async () => {
          try {
            await persistDetectedEvent(updatedReq)
          } catch (err) {
            console.error('[adminCaudal] Error en webhook actualizado simulado:', err)
          }
        }, delayMs)
        updatedResult = { scheduled: true, delaySeconds: Number(updatedAfterSeconds) || 180, occurredAt: updatedAt.format() }
      } else {
        updatedResult = await persistDetectedEvent(updatedReq)
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Simulación Caudal procesada correctamente.',
      detectResult,
      updatedResult,
      updatedScheduled: Boolean(updatedResult?.scheduled),
      account: { id: activeAccount.id, cbu: activeAccount.cbu, alias: activeAccount.alias, nombre_titular: activeAccount.nombre_titular },
      sourceTransactionId,
    })
  } catch (error) {
    console.error('[adminCaudal] Error simulando transacción:', error)
    return res.status(error?.httpStatus || 500).json({
      ok: false,
      message: error?.message || 'Error al simular la transacción Caudal.',
      code: error?.code || 'caudal_simulation_error',
    })
  }
}
