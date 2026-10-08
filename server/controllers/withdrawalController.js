import { query, transaction } from '../config/database.js'
import { buildRequestContext } from '../utils/withdrawalRiskEngine.js'
import {
  approveWithdrawalWithDispatch,
  rejectWithdrawal,
  refreshWithdrawalStatus,
  reconcileHgCashLog,
} from '../services/withdrawalAutoService.js'

const ALL_STATUSES = ['pending', 'review_pending', 'approved', 'initiated', 'processing', 'done', 'failed', 'rejected', 'cancelled']

function sanitizeWithdrawal(row) {
  if (!row) return null
  let riskFlags = row.fraud_alerts || row.risk_flags || null
  if (typeof riskFlags === 'string') { try { riskFlags = JSON.parse(riskFlags) } catch { riskFlags = null } }
  return {
    id:                  Number(row.id),
    chatId:              Number(row.chat_id),
    clientId:            Number(row.client_id),
    clientUsername:      row.client_username || null,
    formId:              row.form_id || null,
    messageId:           row.message_id ? Number(row.message_id) : null,
    status:              row.status,
    formData:            row.form_data || '',
    holderName:          row.holder_name || null,
    method:              row.method || null,
    alias:               row.alias || null,
    cbu:                 row.cbu || null,
    amount:              row.amount !== null && row.amount !== undefined ? Number(row.amount) : null,
    rejectionMessage:    row.rejection_message || null,
    processedBy:         row.processed_by || null,
    processedAt:         row.processed_at || null,
    bankTransactionId:   row.bank_transaction_id || null,
    bankExternalId:      row.bank_external_id || null,
    rawStatus:           row.raw_status ? (typeof row.raw_status === 'string' ? JSON.parse(row.raw_status) : row.raw_status) : null,
    correlationId:       row.correlation_id || null,
    dispatchedAt:        row.dispatched_at || null,
    balanceDebitedAt:    row.balance_debited_at || null,
    riskScore:           row.risk_score !== null && row.risk_score !== undefined ? Number(row.risk_score) : null,
    riskFlags,
    riskReason:          row.risk_reason || null,
    reviewMode:          row.review_mode || 'manual',
    reviewedBy:          row.reviewed_by || null,
    reviewedByUsername:  row.reviewed_by_username || null,
    reviewedAt:          row.reviewed_at || null,
    reviewNote:          row.review_note || null,
    requestIp:           row.request_ip || null,
    requestCountry:      row.request_country_name || null,
    requestCity:         row.request_city || null,
    createdAt:           row.created_at || null,
    updatedAt:           row.updated_at || null,
  }
}

function extractFormFields(formDataStr) {
  let data = {}
  try { data = typeof formDataStr === 'string' ? JSON.parse(formDataStr) : (formDataStr || {}) } catch { /* ignore */ }
  const find = (...keys) => {
    for (const k of keys) { const v = data[k]; if (v !== undefined && v !== null && v !== '') return String(v) }
    return null
  }
  const rawAmount = find('amount', 'monto', 'importe', 'value')
  const amount = rawAmount ? parseFloat(String(rawAmount).replace(/[^\d.]/g, '')) : null
  return {
    amount: (!amount || isNaN(amount)) ? null : amount,
    cbu_alias:      find('cbu', 'cbu_alias', 'alias', 'cuenta', 'cbu_cvu'),
    account_holder: find('titular', 'account_holder', 'nombre_titular', 'holder'),
    whatsapp:       find('whatsapp', 'telefono', 'celular', 'phone'),
    cuil_check:     find('cuil_check', 'cuil', 'cuit'),
  }
}

// ─── Admin: lista paginada ────────────────────────────────────────────────────────

export async function getAdminWithdrawals(req, res, next) {
  try {
    const page     = Math.max(1, parseInt(req.query.page  || '1',  10) || 1)
    const limit    = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10) || 20))
    const search   = String(req.query.search || '').trim()
    const status   = String(req.query.status || 'all')
    const dateFrom = req.query.dateFrom || null
    const dateTo   = req.query.dateTo   || null

    const where = []; const values = []

    if (search) {
      where.push('(c.username LIKE ? OR wr.form_data LIKE ? OR wr.holder_name LIKE ? OR wr.cbu LIKE ?)')
      const like = `%${search}%`
      values.push(like, like, like, like)
    }
    if (ALL_STATUSES.includes(status)) { where.push('wr.status = ?'); values.push(status) }
    if (dateFrom) { where.push('DATE(wr.created_at) >= ?'); values.push(dateFrom) }
    if (dateTo)   { where.push('DATE(wr.created_at) <= ?'); values.push(dateTo)   }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const { rows: countRows, error: cntErr } = await query(
      `SELECT COUNT(*) AS total FROM withdrawal_requests wr JOIN clients c ON c.id = wr.client_id ${whereSql}`,
      values
    )
    if (cntErr) throw cntErr
    const total      = Number(countRows?.[0]?.total || 0)
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage   = Math.min(page, totalPages)
    const offset     = (safePage - 1) * limit

    const { rows, error } = await query(
      `SELECT wr.id, wr.chat_id, wr.client_id, wr.form_id, wr.message_id, wr.status,
              wr.form_data, wr.holder_name, wr.method, wr.alias, wr.cbu,
              wr.amount, wr.rejection_message, wr.processed_by, wr.processed_at,
              wr.bank_transaction_id, wr.bank_external_id, wr.raw_status,
              wr.correlation_id, wr.dispatched_at, wr.balance_debited_at,
              wr.risk_score, wr.fraud_alerts, wr.risk_reason, wr.review_mode,
              wr.reviewed_by, wr.reviewed_by_username, wr.reviewed_at, wr.review_note,
              wr.request_ip, wr.request_country_name, wr.request_city,
              wr.created_at, wr.updated_at,
              c.username AS client_username
       FROM withdrawal_requests wr JOIN clients c ON c.id = wr.client_id
       ${whereSql}
       ORDER BY wr.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      values
    )
    if (error) throw error

    const withdrawals = (rows || []).map(row => {
      const s = sanitizeWithdrawal(row)
      if (!s.amount && row.form_data) {
        const f = extractFormFields(row.form_data)
        s.amount = f.amount
        if (!s.cbu) s.cbu = f.cbu_alias
        if (!s.holderName) s.holderName = f.account_holder
      }
      return s
    })

    res.json({ withdrawals, pagination: { page: safePage, limit, total, totalPages } })
  } catch (err) { next(err) }
}

// ─── Admin: resolver (aprobar / rechazar) — flujo unificado ──────────────────────

export async function resolveWithdrawal(req, res, next) {
  try {
    const id = Number(req.params.id)
    const { action, message } = req.body || {}
    if (!id || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Datos inválidos' })
    }

    const requestContext = await buildRequestContext(req)
    const adminUser = { id: req.user?.id, username: req.user?.username || 'Admin', email: req.user?.email }

    if (action === 'approved') {
      try {
        const result = await approveWithdrawalWithDispatch({ withdrawalId: id, adminUser, note: message || null, requestContext })
        const { rows } = await query('SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1', [id])
        return res.json({ withdrawal: sanitizeWithdrawal({ ...rows?.[0], client_username: null }), ...result })
      } catch (err) {
        const hints = {
          withdrawal_not_found: 404, withdrawal_not_in_review: 409,
          withdrawal_review_race: 409, hgcash_account_unavailable: 503, rate_limited: 429,
        }
        const httpStatus = hints[err.message] || err.httpStatus || 500
        return res.status(httpStatus).json({ error: err.message })
      }
    }

    // action === 'rejected'
    try {
      await rejectWithdrawal({ withdrawalId: id, adminUser, note: message || null, requestContext })
      const { rows } = await query('SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1', [id])
      return res.json({ withdrawal: sanitizeWithdrawal({ ...rows?.[0], client_username: null }) })
    } catch (err) {
      return res.status(err.httpStatus || 500).json({ error: err.message })
    }
  } catch (error) { next(error) }
}

// ─── Admin: volver a pending ──────────────────────────────────────────────────────

export async function setWithdrawalPending(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const { error: updErr } = await query(
      `UPDATE withdrawal_requests SET status = 'pending', rejection_message = NULL, processed_by = NULL, processed_at = NULL, updated_at = NOW() WHERE id = ?`,
      [id]
    )
    if (updErr) throw updErr
    const { rows } = await query('SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1', [id])
    if (!rows?.length) return res.status(404).json({ error: 'Solicitud no encontrada' })
    res.json({ withdrawal: sanitizeWithdrawal(rows[0]) })
  } catch (error) { next(error) }
}

// ─── Admin: lista por chat ────────────────────────────────────────────────────────

export async function listWithdrawals(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    if (!chatId) return res.status(400).json({ error: 'Chat inválido' })
    const { rows, error } = await query(
      `SELECT id, chat_id, client_id, form_id, message_id, status, form_data, holder_name, method, cbu,
              amount, rejection_message, processed_by, processed_at, bank_transaction_id,
              risk_score, fraud_alerts, review_mode, reviewed_by, reviewed_at, review_note, created_at, updated_at
       FROM withdrawal_requests WHERE chat_id = ? ORDER BY created_at DESC`,
      [chatId]
    )
    if (error) throw error
    res.json({ withdrawals: (rows || []).map(sanitizeWithdrawal) })
  } catch (error) { next(error) }
}

// ─── Config ──────────────────────────────────────────────────────────────────────

export async function getWithdrawalConfig(req, res, next) {
  try {
    const { rows, error } = await query('SELECT mode, manual_threshold, max_per_day FROM withdrawal_config WHERE id = 1')
    if (error) throw error
    const cfg = rows?.[0] || { mode: 'manual', manual_threshold: 80000, max_per_day: 5 }
    res.json({ config: { mode: cfg.mode, manualThreshold: Number(cfg.manual_threshold), maxPerDay: Number(cfg.max_per_day) } })
  } catch (err) { next(err) }
}

export async function updateWithdrawalConfig(req, res, next) {
  try {
    const { mode, manualThreshold, maxPerDay } = req.body
    const updates = []; const vals = []
    if (['auto', 'manual'].includes(mode))  { updates.push('mode = ?');              vals.push(mode) }
    if (manualThreshold !== undefined)       { updates.push('manual_threshold = ?');  vals.push(Number(manualThreshold)) }
    if (maxPerDay !== undefined)             { updates.push('max_per_day = ?');       vals.push(Math.max(1, Number(maxPerDay))) }
    if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' })
    const { error } = await query(`UPDATE withdrawal_config SET ${updates.join(', ')} WHERE id = 1`, vals)
    if (error) throw error
    const { rows } = await query('SELECT mode, manual_threshold, max_per_day FROM withdrawal_config WHERE id = 1')
    const cfg = rows?.[0]
    res.json({ config: { mode: cfg.mode, manualThreshold: Number(cfg.manual_threshold), maxPerDay: Number(cfg.max_per_day) } })
  } catch (err) { next(err) }
}

// ─── Anti-fraud on-demand (compatibilidad) ───────────────────────────────────────

export async function analyzeWithdrawal(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const { rows, error } = await query('SELECT id, client_id, form_data, cbu, amount FROM withdrawal_requests WHERE id = ? LIMIT 1', [id])
    if (error) throw error
    const wr = rows?.[0]
    if (!wr) return res.status(404).json({ error: 'Solicitud no encontrada' })
    const fields = extractFormFields(wr.form_data)
    const cbu_alias = wr.cbu || fields.cbu_alias
    const amount = wr.amount !== null ? Number(wr.amount) : fields.amount
    const alerts = []; let risk = 0
    if (cbu_alias) {
      const { rows: r1 } = await query(`SELECT id FROM withdrawal_requests WHERE form_data LIKE ? AND client_id != ? AND status != 'rejected' LIMIT 1`, [`%${cbu_alias}%`, wr.client_id])
      if (r1?.length) { alerts.push('CBU usado por otro cliente'); risk += 25 }
      else {
        const { rows: r2 } = await query(`SELECT id FROM withdrawal_requests WHERE form_data LIKE ? AND client_id = ? AND id != ? LIMIT 1`, [`%${cbu_alias}%`, wr.client_id, id])
        if (!r2?.length) { alerts.push('CBU nuevo (no registrado previamente)'); risk += 20 }
      }
    }
    const { rows: r3 } = await query(`SELECT COUNT(*) AS cnt FROM withdrawal_requests WHERE client_id = ? AND id != ? AND created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)`, [wr.client_id, id])
    const recentCnt = Number(r3?.[0]?.cnt || 0)
    if (recentCnt > 0) { alerts.push(`${recentCnt} retiro${recentCnt !== 1 ? 's' : ''} en últimas 2 horas`); risk += Math.min(30, recentCnt * 15) }
    if (amount && amount > 0) {
      const { rows: r4 } = await query(`SELECT COALESCE(SUM(d.amount), 0) AS total FROM (SELECT amount FROM manual_payment_movements WHERE client_id = ? AND status = 'paid' UNION ALL SELECT amount FROM hgcash_movements WHERE client_id = ? AND status = 'paid' UNION ALL SELECT amount FROM telepagos_movements WHERE client_id = ? AND status = 'paid' UNION ALL SELECT amount FROM mercadopago_movements WHERE client_id = ? AND status = 'paid') d`, [wr.client_id, wr.client_id, wr.client_id, wr.client_id])
      const totalDeposits = Number(r4?.[0]?.total || 0)
      if (totalDeposits > 0) {
        const betPct = Math.max(0, Math.round(100 - (amount / totalDeposits * 100)))
        if (betPct < 15) { alerts.push(`Apostó solo ${betPct}% de depósitos`); risk += 20 }
      }
    }
    risk = Math.min(100, risk)
    const reviewMode = risk >= 40 ? 'manual' : 'auto'
    await query(`UPDATE withdrawal_requests SET risk_score = ?, fraud_alerts = ?, review_mode = ? WHERE id = ?`, [risk, JSON.stringify(alerts), reviewMode, id])
    res.json({ analysis: { riskScore: risk, alerts, reviewMode } })
  } catch (err) { next(err) }
}

// ─── Refresh estado HG Cash ───────────────────────────────────────────────────────

export async function refreshWithdrawalStatusHandler(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const requestContext = await buildRequestContext(req)
    const adminUser = { id: req.user?.id, username: req.user?.username || 'Admin', email: req.user?.email }
    const result = await refreshWithdrawalStatus({ withdrawalId: id, adminUser, requestContext })
    res.json(result)
  } catch (err) {
    const hints = { withdrawal_not_found: 404, withdrawal_not_dispatched: 409, hgcash_account_unavailable: 503, rate_limited: 429 }
    res.status(hints[err.message] || err.httpStatus || 500).json({ error: err.message })
  }
}

// ─── Reconciliar outbox log HG Cash ─────────────────────────────────────────────

export async function reconcileHgCashLogHandler(req, res, next) {
  try {
    const requestContext = await buildRequestContext(req)
    const adminUser = { id: req.user?.id, username: req.user?.username || 'Admin', email: req.user?.email }
    const result = await reconcileHgCashLog({ adminUser, requestContext })
    res.json(result)
  } catch (err) { res.status(err.httpStatus || 500).json({ error: err.message }) }
}

// ─── Blacklist ────────────────────────────────────────────────────────────────────

export async function getBlacklist(req, res, next) {
  try {
    const { rows, error } = await query('SELECT id, type, value, reason, created_by, created_at FROM withdrawal_blacklist ORDER BY created_at DESC LIMIT 200')
    if (error) throw error
    res.json({ blacklist: rows || [] })
  } catch (err) { next(err) }
}

export async function addToBlacklist(req, res, next) {
  try {
    const { type, value, reason } = req.body || {}
    const normalizedType = String(type || '').toLowerCase()
    const normalizedValue = String(value || '').replace(/\D/g, '')
    const requiredLength = { cbu: 22, cuit: 11, dni: 8 }[normalizedType]
    if (!requiredLength || normalizedValue.length !== requiredLength) {
      return res.status(400).json({ error: 'type (cbu|cuit|dni) y value son requeridos' })
    }
    const actorLabel = req.user?.username || req.user?.email || 'Admin'
    const normalizedReason = String(reason || '').trim().slice(0, 500) || null
    await transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO withdrawal_blacklist (type, value, reason, created_by)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE reason = VALUES(reason), created_by = VALUES(created_by)`,
        [normalizedType, normalizedValue, normalizedReason, actorLabel],
      )
      await connection.execute(
        `INSERT INTO withdrawal_audit_log
           (withdrawal_request_id, event_type, actor_type, actor_id, actor_label, ip_address, user_agent, details_json, created_at)
         VALUES (NULL, 'withdrawal_blacklist_added', 'admin', ?, ?, ?, ?, ?, NOW())`,
        [req.user?.id || null, actorLabel, req.ip || null, req.headers['user-agent'] || null, JSON.stringify({ type: normalizedType, value: normalizedValue, reason: normalizedReason })],
      )
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
}

export async function removeFromBlacklist(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const actorLabel = req.user?.username || req.user?.email || 'Admin'
    await transaction(async (connection) => {
      const [existingRows] = await connection.execute(
        'SELECT id, type, value, reason FROM withdrawal_blacklist WHERE id = ? LIMIT 1 FOR UPDATE',
        [id],
      )
      if (!existingRows?.length) {
        const error = new Error('Entrada no encontrada.')
        error.httpStatus = 404
        throw error
      }
      await connection.execute('DELETE FROM withdrawal_blacklist WHERE id = ?', [id])
      await connection.execute(
        `INSERT INTO withdrawal_audit_log
           (withdrawal_request_id, event_type, actor_type, actor_id, actor_label, ip_address, user_agent, details_json, created_at)
         VALUES (NULL, 'withdrawal_blacklist_removed', 'admin', ?, ?, ?, ?, ?, NOW())`,
        [req.user?.id || null, actorLabel, req.ip || null, req.headers['user-agent'] || null, JSON.stringify(existingRows[0])],
      )
    })
    res.json({ ok: true })
  } catch (err) {
    if (err.httpStatus) return res.status(err.httpStatus).json({ error: err.message })
    next(err)
  }
}

// ─── Log de auditoría ─────────────────────────────────────────────────────────────

export async function getAuditLog(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })
    const { rows, error } = await query(
      `SELECT id, event_type, actor_type, actor_label, old_status, new_status, ip_address, details_json, created_at
       FROM withdrawal_audit_log WHERE withdrawal_request_id = ? ORDER BY created_at ASC`,
      [id]
    )
    if (error) throw error
    res.json({ auditLog: rows || [] })
  } catch (err) { next(err) }
}
