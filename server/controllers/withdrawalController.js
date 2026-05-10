import { query } from '../config/database.js'
import { getAutoMessage } from './autoMessagesController.js'
import { persistMessage, resetClientBot } from './chatController.js'

function sanitizeWithdrawal(row) {
  if (!row) return null
  return {
    id:                Number(row.id),
    chatId:            Number(row.chat_id),
    clientId:          Number(row.client_id),
    formId:            row.form_id || null,
    messageId:         row.message_id ? Number(row.message_id) : null,
    status:            row.status,
    formData:          row.form_data || '',
    rejectionMessage:  row.rejection_message || null,
    processedBy:       row.processed_by || null,
    processedAt:       row.processed_at || null,
    createdAt:         row.created_at || null,
    updatedAt:         row.updated_at || null,
  }
}

export async function listWithdrawals(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    if (!chatId) return res.status(400).json({ error: 'Chat inválido' })

    const { rows, error } = await query(
      `SELECT id, chat_id, client_id, form_id, message_id, status, form_data,
              rejection_message, processed_by, processed_at, created_at, updated_at
       FROM withdrawal_requests
       WHERE chat_id = ?
       ORDER BY created_at DESC`,
      [chatId]
    )
    if (error) throw error

    res.json({ withdrawals: (rows || []).map(sanitizeWithdrawal) })
  } catch (error) {
    next(error)
  }
}

export async function resolveWithdrawal(req, res, next) {
  try {
    const id = Number(req.params.id)
    const { action, message } = req.body || {}
    if (!id || !['approved', 'rejected'].includes(action)) {
      return res.status(400).json({ error: 'Datos inválidos' })
    }

    const { rows: wrRows, error: wrErr } = await query(
      'SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1',
      [id]
    )
    if (wrErr) throw wrErr
    const wr = wrRows?.[0]
    if (!wr) return res.status(404).json({ error: 'Solicitud no encontrada' })

    const chatId = Number(wr.chat_id)
    const processedBy = req.user?.username || 'Admin'

    const { error: updErr } = await query(
      `UPDATE withdrawal_requests
       SET status = ?, rejection_message = ?, processed_by = ?, processed_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [action, action === 'rejected' ? (message?.trim() || null) : null, processedBy, id]
    )
    if (updErr) throw updErr

    const clientCtx = { clientId: Number(wr.client_id) }

    if (action === 'approved') {
      const formData = wr.form_data ? JSON.parse(wr.form_data) : {}
      const amount   = formData.monto ?? formData.amount ?? null
      const autoMsg  = await getAutoMessage('withdrawal_approved', { ...clientCtx, amount })
      if (autoMsg) {
        await persistMessage({ chatId, senderType: 'system', content: autoMsg, messageType: 'text' })
      }
      await resetClientBot(chatId)
    } else {
      const msgContent = message?.trim()
      if (msgContent) {
        await persistMessage({ chatId, senderType: 'system', content: msgContent, messageType: 'text' })
      } else {
        const autoMsg = await getAutoMessage('withdrawal_rejected', clientCtx)
        if (autoMsg) {
          await persistMessage({ chatId, senderType: 'system', content: autoMsg, messageType: 'text' })
        }
      }
    }

    const { rows: updated } = await query(
      'SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1',
      [id]
    )
    res.json({ withdrawal: sanitizeWithdrawal(updated?.[0] || wr) })
  } catch (error) {
    next(error)
  }
}

export async function setWithdrawalPending(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const { error: updErr } = await query(
      `UPDATE withdrawal_requests
       SET status = 'pending', rejection_message = NULL, processed_by = NULL, processed_at = NULL, updated_at = NOW()
       WHERE id = ?`,
      [id]
    )
    if (updErr) throw updErr

    const { rows: updated } = await query(
      'SELECT * FROM withdrawal_requests WHERE id = ? LIMIT 1',
      [id]
    )
    if (!updated?.length) return res.status(404).json({ error: 'Solicitud no encontrada' })
    res.json({ withdrawal: sanitizeWithdrawal(updated[0]) })
  } catch (error) {
    next(error)
  }
}

/* ── helpers ─────────────────────────────────────────────── */

function extractFormFields(formDataStr) {
  let data = {}
  try {
    data = typeof formDataStr === 'string' ? JSON.parse(formDataStr) : (formDataStr || {})
  } catch { /* ignore */ }

  const find = (...keys) => {
    for (const k of keys) {
      const v = data[k]
      if (v !== undefined && v !== null && v !== '') return String(v)
    }
    return null
  }

  const rawAmount = find('amount', 'monto', 'importe', 'value')
  const amount = rawAmount ? parseFloat(String(rawAmount).replace(/[^\d.]/g, '')) : null

  return {
    amount: (!amount || isNaN(amount)) ? null : amount,
    cbu_alias:      find('cbu', 'cbu_alias', 'alias', 'cuenta', 'cbu_cvu'),
    account_holder: find('titular', 'account_holder', 'nombre_titular', 'holder', 'nombre_cuenta'),
    whatsapp:       find('whatsapp', 'telefono', 'celular', 'phone', 'tel', 'numero'),
    cuil_check:     find('cuil_check', 'cuil', 'cuit', 'cuil_status', 'estado_cuil'),
  }
}

async function runAntiFraud(withdrawalId, clientId, fields) {
  const { amount, cbu_alias } = fields
  const alerts = []
  let risk = 0

  if (cbu_alias) {
    const like = `%${cbu_alias}%`
    const { rows: r1 } = await query(
      `SELECT id FROM withdrawal_requests
       WHERE form_data LIKE ? AND client_id != ? AND status != 'rejected' LIMIT 1`,
      [like, clientId]
    )
    if (r1?.length) {
      alerts.push('CBU usado por otro cliente')
      risk += 25
    } else {
      const { rows: r2 } = await query(
        `SELECT id FROM withdrawal_requests
         WHERE form_data LIKE ? AND client_id = ? AND id != ? LIMIT 1`,
        [like, clientId, withdrawalId]
      )
      if (!r2?.length) {
        alerts.push('CBU nuevo (no registrado previamente)')
        risk += 20
      }
    }
  }

  const { rows: r3 } = await query(
    `SELECT COUNT(*) AS cnt FROM withdrawal_requests
     WHERE client_id = ? AND id != ?
       AND created_at >= DATE_SUB(NOW(), INTERVAL 2 HOUR)`,
    [clientId, withdrawalId]
  )
  const recentCnt = Number(r3?.[0]?.cnt || 0)
  if (recentCnt > 0) {
    alerts.push(`${recentCnt} retiro${recentCnt !== 1 ? 's' : ''} en últimas 2 horas`)
    risk += Math.min(30, recentCnt * 15)
  }

  if (amount && amount > 0) {
    const { rows: r4 } = await query(
      `SELECT COALESCE(SUM(d.amount), 0) AS total FROM (
         SELECT amount FROM manual_payment_movements WHERE client_id = ? AND status = 'paid'
         UNION ALL
         SELECT amount FROM hgcash_movements WHERE client_id = ? AND status = 'paid'
         UNION ALL
         SELECT amount FROM telepagos_movements WHERE client_id = ? AND status = 'paid'
         UNION ALL
         SELECT amount FROM mercadopago_movements WHERE client_id = ? AND status = 'paid'
       ) d`,
      [clientId, clientId, clientId, clientId]
    )
    const totalDeposits = Number(r4?.[0]?.total || 0)
    if (totalDeposits > 0) {
      const pct = (amount / totalDeposits) * 100
      const betPct = Math.max(0, Math.round(100 - pct))
      if (betPct < 15) {
        alerts.push(`Apostó solo ${betPct}% de depósitos`)
        risk += 20
      }
    }
  }

  risk = Math.min(100, risk)
  const reviewMode = risk >= 40 ? 'manual' : 'auto'

  await query(
    `UPDATE withdrawal_requests SET risk_score = ?, fraud_alerts = ?, review_mode = ? WHERE id = ?`,
    [risk, JSON.stringify(alerts), reviewMode, withdrawalId]
  )

  return { riskScore: risk, alerts, reviewMode }
}

/* ── admin list ──────────────────────────────────────────── */

export async function getAdminWithdrawals(req, res, next) {
  try {
    const page   = Math.max(1, parseInt(req.query.page  || '1',  10) || 1)
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10) || 20))
    const search = String(req.query.search || '').trim()
    const status = String(req.query.status || 'all')
    const dateFrom = req.query.dateFrom || null
    const dateTo   = req.query.dateTo   || null

    const where = []
    const values = []

    if (search) {
      where.push('(c.username LIKE ? OR wr.form_data LIKE ?)')
      const like = `%${search}%`
      values.push(like, like)
    }
    if (['pending', 'approved', 'rejected'].includes(status)) {
      where.push('wr.status = ?'); values.push(status)
    }
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
      `SELECT wr.id, wr.chat_id, wr.client_id, wr.status, wr.form_data,
              wr.rejection_message, wr.processed_by, wr.processed_at,
              wr.risk_score, wr.fraud_alerts, wr.review_mode,
              wr.created_at, wr.updated_at,
              c.username AS client_username
       FROM withdrawal_requests wr
       JOIN clients c ON c.id = wr.client_id
       ${whereSql}
       ORDER BY wr.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      values
    )
    if (error) throw error

    const withdrawals = (rows || []).map(row => {
      const f = extractFormFields(row.form_data)
      const fa = row.fraud_alerts
        ? (typeof row.fraud_alerts === 'string' ? JSON.parse(row.fraud_alerts) : row.fraud_alerts)
        : null
      return {
        id:               Number(row.id),
        chatId:           Number(row.chat_id),
        clientId:         Number(row.client_id),
        clientUsername:   row.client_username,
        status:           row.status,
        amount:           f.amount,
        cbuAlias:         f.cbu_alias,
        accountHolder:    f.account_holder,
        whatsapp:         f.whatsapp,
        cuilCheck:        f.cuil_check,
        formData:         row.form_data,
        rejectionMessage: row.rejection_message || null,
        processedBy:      row.processed_by      || null,
        processedAt:      row.processed_at      || null,
        riskScore:        row.risk_score !== null ? Number(row.risk_score) : null,
        fraudAlerts:      fa,
        reviewMode:       row.review_mode || 'manual',
        createdAt:        row.created_at,
        updatedAt:        row.updated_at,
      }
    })

    res.json({ withdrawals, pagination: { page: safePage, limit, total, totalPages } })
  } catch (err) { next(err) }
}

/* ── config ──────────────────────────────────────────────── */

export async function getWithdrawalConfig(req, res, next) {
  try {
    const { rows, error } = await query(
      'SELECT mode, manual_threshold, max_per_day FROM withdrawal_config WHERE id = 1'
    )
    if (error) throw error
    const cfg = rows?.[0] || { mode: 'manual', manual_threshold: 80000, max_per_day: 5 }
    res.json({ config: { mode: cfg.mode, manualThreshold: Number(cfg.manual_threshold), maxPerDay: Number(cfg.max_per_day) } })
  } catch (err) { next(err) }
}

export async function updateWithdrawalConfig(req, res, next) {
  try {
    const { mode, manualThreshold, maxPerDay } = req.body
    const updates = []; const vals = []
    if (['auto', 'manual'].includes(mode))    { updates.push('mode = ?');              vals.push(mode) }
    if (manualThreshold !== undefined)         { updates.push('manual_threshold = ?');  vals.push(Number(manualThreshold)) }
    if (maxPerDay !== undefined)               { updates.push('max_per_day = ?');       vals.push(Math.max(1, Number(maxPerDay))) }
    if (!updates.length) return res.status(400).json({ error: 'Nada que actualizar' })

    const { error } = await query(`UPDATE withdrawal_config SET ${updates.join(', ')} WHERE id = 1`, vals)
    if (error) throw error

    const { rows } = await query('SELECT mode, manual_threshold, max_per_day FROM withdrawal_config WHERE id = 1')
    const cfg = rows?.[0]
    res.json({ config: { mode: cfg.mode, manualThreshold: Number(cfg.manual_threshold), maxPerDay: Number(cfg.max_per_day) } })
  } catch (err) { next(err) }
}

/* ── anti-fraud analysis ─────────────────────────────────── */

export async function analyzeWithdrawal(req, res, next) {
  try {
    const id = Number(req.params.id)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const { rows, error } = await query(
      'SELECT id, client_id, form_data FROM withdrawal_requests WHERE id = ? LIMIT 1',
      [id]
    )
    if (error) throw error
    const wr = rows?.[0]
    if (!wr) return res.status(404).json({ error: 'Solicitud no encontrada' })

    const fields   = extractFormFields(wr.form_data)
    const analysis = await runAntiFraud(id, wr.client_id, fields)
    res.json({ analysis })
  } catch (err) { next(err) }
}
