import jwt from 'jsonwebtoken'
import { query } from '../config/database.js'
import { config } from '../config/config.js'
import { getCookieValue } from '../middlewares/authMiddleware.js'

async function getClientFromCookie(req) {
  try {
    const token = getCookieValue(req, config.clientJwtCookieName)
    if (!token) return null
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
    })
    if (payload?.type !== 'client' || !payload?.sub) return null
    return { clientId: Number(payload.sub), username: payload.username || '' }
  } catch {
    return null
  }
}

/**
 * GET /api/client/history/movements
 * Returns deposit (manual_payment_movements) and withdrawal (withdrawal_requests)
 * history for the authenticated client, with event context where applicable.
 */
export async function getClientMovements(req, res, next) {
  try {
    const client = await getClientFromCookie(req)
    if (!client) return res.status(401).json({ error: 'Sesión requerida', code: 'AUTH_REQUIRED' })

    // Deposits — join with event_participants to detect event-linked deposits
    const { rows: movRows, error: movErr } = await query(
      `SELECT
         mpm.id,
         mpm.amount,
         mpm.status,
         mpm.created_at,
         ep.event_id,
         e.title  AS event_title,
         e.type   AS event_type
       FROM manual_payment_movements mpm
       LEFT JOIN event_participants ep ON (
         ep.client_id = mpm.client_id
         AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) = CAST(mpm.id AS CHAR)
       )
       LEFT JOIN events e ON e.id = ep.event_id
       WHERE mpm.client_id = ?
       ORDER BY mpm.created_at DESC
       LIMIT 100`,
      [client.clientId]
    )
    if (movErr) throw movErr

    // Withdrawals
    const { rows: wdRows, error: wdErr } = await query(
      `SELECT id, status, form_data, created_at, processed_at, rejection_message
       FROM withdrawal_requests
       WHERE client_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [client.clientId]
    )
    if (wdErr) throw wdErr

    const deposits = (movRows || []).map(row => ({
      id:         Number(row.id),
      type:       'deposit',
      amount:     Number(row.amount || 0),
      status:     String(row.status || 'pending').toLowerCase(),
      created_at: row.created_at,
      event: row.event_id
        ? { id: Number(row.event_id), title: row.event_title || '', type: row.event_type || '' }
        : null,
    }))

    const withdrawals = (wdRows || []).map(row => {
      let formData = {}
      try { formData = row.form_data ? JSON.parse(row.form_data) : {} } catch {}
      return {
        id:                Number(row.id),
        type:              'withdrawal',
        amount:            Number(formData.monto ?? formData.amount ?? 0),
        status:            String(row.status || 'pending').toLowerCase(),
        created_at:        row.created_at,
        processed_at:      row.processed_at || null,
        rejection_message: row.rejection_message || null,
        event:             null,
      }
    })

    return res.json({ deposits, withdrawals })
  } catch (err) {
    next(err)
  }
}
