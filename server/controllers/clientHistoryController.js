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

const PAGE_LIMIT = 20

/**
 * GET /api/client/history/movements?type=deposits&page=1
 * Returns paginated deposit or withdrawal history for the authenticated client.
 * Response: { items, total, page, limit, hasMore }
 */
export async function getClientMovements(req, res, next) {
  try {
    const client = await getClientFromCookie(req)
    if (!client) return res.status(401).json({ error: 'Sesión requerida', code: 'AUTH_REQUIRED' })

    const cid   = client.clientId
    const type  = req.query.type === 'withdrawals' ? 'withdrawals' : 'deposits'
    const page  = Math.max(1, parseInt(req.query.page  || '1',              10) || 1)
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit || String(PAGE_LIMIT), 10) || PAGE_LIMIT))
    const offset = (page - 1) * limit

    if (type === 'deposits') {
      // ── Count ────────────────────────────────────────────────
      const { rows: cntRows, error: cntErr } = await query(
        `SELECT COUNT(*) AS total FROM (
           SELECT id FROM manual_payment_movements WHERE client_id = ?
           UNION ALL SELECT id FROM hgcash_movements    WHERE client_id = ?
           UNION ALL SELECT id FROM mercadopago_movements WHERE client_id = ?
           UNION ALL SELECT id FROM telepagos_movements  WHERE client_id = ?
           UNION ALL SELECT id FROM balance_adjustments  WHERE client_id = ? AND operation = 'in'
         ) AS _c`,
        [cid, cid, cid, cid, cid]
      )
      if (cntErr) throw cntErr
      const total = Number(cntRows?.[0]?.total || 0)

      // ── Page ─────────────────────────────────────────────────
      const { rows: movRows, error: movErr } = await query(
        `SELECT
           sub.id, sub.amount, sub.status, sub.created_at, sub.src, sub.label,
           ep.event_id, e.title AS event_title, e.type AS event_type
         FROM (
           SELECT id, amount, status, created_at, 'manual'      AS src, NULL               AS label
             FROM manual_payment_movements  WHERE client_id = ?
           UNION ALL
           SELECT id, amount, status, created_at, 'hgcash'      AS src, NULL               AS label
             FROM hgcash_movements          WHERE client_id = ?
           UNION ALL
           SELECT id, amount, IF(LOWER(status)='error','rejected',status) AS status,
                  created_at, 'mercadopago' AS src, NULL AS label
             FROM mercadopago_movements     WHERE client_id = ?
           UNION ALL
           SELECT id, amount, status, created_at, 'telepagos'   AS src, NULL               AS label
             FROM telepagos_movements       WHERE client_id = ?
           UNION ALL
           SELECT id, amount, 'paid' AS status, created_at, 'admin' AS src, 'Ajuste de saldo' AS label
             FROM balance_adjustments WHERE client_id = ? AND operation = 'in'
         ) sub
         LEFT JOIN event_participants ep ON (
           sub.src = 'manual'
           AND ep.client_id = ?
           AND JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_movement_id')) = CAST(sub.id AS CHAR)
         )
         LEFT JOIN events e ON e.id = ep.event_id
         ORDER BY sub.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        [cid, cid, cid, cid, cid, cid]
      )
      if (movErr) throw movErr

      const items = (movRows || []).map(row => ({
        id:         Number(row.id),
        type:       'deposit',
        amount:     Number(row.amount || 0),
        status:     String(row.status || 'pending').toLowerCase(),
        created_at: row.created_at,
        label:      row.label || null,
        event: row.event_id
          ? { id: Number(row.event_id), title: row.event_title || '', type: row.event_type || '' }
          : null,
      }))

      return res.json({ items, total, page, limit, hasMore: offset + items.length < total })
    }

    // ── Withdrawals ───────────────────────────────────────────
    const { rows: cntRows, error: cntErr } = await query(
      `SELECT COUNT(*) AS total FROM (
         SELECT id FROM withdrawal_requests WHERE client_id = ?
         UNION ALL SELECT id FROM balance_adjustments WHERE client_id = ? AND operation = 'out'
       ) AS _c`,
      [cid, cid]
    )
    if (cntErr) throw cntErr
    const total = Number(cntRows?.[0]?.total || 0)

    const { rows: wdRows, error: wdErr } = await query(
      `SELECT id, 'request' AS kind, status, form_data AS meta, NULL AS direct_amount,
              created_at, processed_at, rejection_message
         FROM withdrawal_requests WHERE client_id = ?
       UNION ALL
       SELECT id, 'adjustment' AS kind, 'approved' AS status, NULL AS meta, amount AS direct_amount,
              created_at, NULL AS processed_at, NULL AS rejection_message
         FROM balance_adjustments WHERE client_id = ? AND operation = 'out'
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [cid, cid]
    )
    if (wdErr) throw wdErr

    const items = (wdRows || []).map(row => {
      let amount = Number(row.direct_amount || 0)
      if (!amount && row.kind === 'request' && row.meta) {
        try {
          const fd = JSON.parse(row.meta)
          amount = Number(fd.monto ?? fd.amount ?? 0)
        } catch {}
      }
      return {
        id:                Number(row.id),
        type:              'withdrawal',
        kind:              row.kind,
        amount,
        status:            String(row.status || 'pending').toLowerCase(),
        created_at:        row.created_at,
        processed_at:      row.processed_at || null,
        rejection_message: row.rejection_message || null,
      }
    })

    return res.json({ items, total, page, limit, hasMore: offset + items.length < total })
  } catch (err) {
    next(err)
  }
}
