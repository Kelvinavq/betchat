import { query } from '../config/database.js'

/* ── helpers ── */
const PROVIDER_LABELS = {
  manual:      'Manual',
  hgcash:      'HGCash',
  telepagos:   'Telepagos',
  mercadopago: 'Mercado Pago',
}

function buildUnion(fromDate, toDate) {
  const branch = (table, provider) => `
    SELECT
      CASE WHEN status = 'paid' THEN 'paid'
           WHEN status IN ('rejected','error') THEN 'rejected'
           ELSE 'pending' END AS status,
      CAST(amount AS DECIMAL(18,2)) AS amount,
      client_id,
      DATE(created_at) AS day
    FROM ${table}
    WHERE DATE(created_at) BETWEEN ? AND ?`

  return {
    sql: [
      branch('manual_payment_movements',  'manual'),
      branch('hgcash_movements',          'hgcash'),
      branch('telepagos_movements',       'telepagos'),
      branch('mercadopago_movements',     'mercadopago'),
    ].join('\n    UNION ALL'),
    params: [fromDate, toDate, fromDate, toDate, fromDate, toDate, fromDate, toDate],
  }
}

function buildProviderUnion(fromDate, toDate) {
  const branch = (table, provider) => `
    SELECT
      CASE WHEN status = 'paid' THEN 'paid'
           WHEN status IN ('rejected','error') THEN 'rejected'
           ELSE 'pending' END AS status,
      CAST(amount AS DECIMAL(18,2)) AS amount,
      client_id,
      DATE(created_at) AS day,
      '${provider}' AS provider
    FROM ${table}
    WHERE DATE(created_at) BETWEEN ? AND ?`

  return {
    sql: [
      branch('manual_payment_movements',  'manual'),
      branch('hgcash_movements',          'hgcash'),
      branch('telepagos_movements',       'telepagos'),
      branch('mercadopago_movements',     'mercadopago'),
    ].join('\n    UNION ALL'),
    params: [fromDate, toDate, fromDate, toDate, fromDate, toDate, fromDate, toDate],
  }
}

function validateDates(from, to) {
  const re = /^\d{4}-\d{2}-\d{2}$/
  if (!re.test(from) || !re.test(to)) throw Object.assign(new Error('Fechas inválidas'), { status: 400 })
  if (from > to) throw Object.assign(new Error('La fecha inicial debe ser anterior a la final'), { status: 400 })
}

/* ── main handler ── */
export async function getMetrics(req, res, next) {
  try {
    const from = String(req.query.from || '')
    const to   = String(req.query.to   || '')
    validateDates(from, to)

    const union         = buildUnion(from, to)
    const providerUnion = buildProviderUnion(from, to)

    /* ── KPIs ── */
    const { rows: kpiRows, error: kpiErr } = await query(
      `SELECT
         COUNT(*)                                                     AS total,
         SUM(status = 'paid')                                         AS approved,
         SUM(status = 'rejected')                                     AS rejected,
         SUM(status = 'pending')                                      AS pending,
         SUM(CASE WHEN status='paid' THEN amount ELSE 0 END)          AS approved_amount,
         AVG(CASE WHEN status='paid' THEN amount END)                 AS avg_amount,
         MIN(CASE WHEN status='paid' THEN amount END)                 AS min_amount,
         MAX(CASE WHEN status='paid' THEN amount END)                 AS max_amount,
         COUNT(DISTINCT CASE WHEN status='paid' THEN client_id END)   AS unique_users
       FROM (${union.sql}) t`,
      union.params
    )
    if (kpiErr) throw kpiErr

    /* ── Time series ── */
    const { rows: tsRows, error: tsErr } = await query(
      `SELECT
         day,
         SUM(status = 'paid')                                AS count,
         SUM(CASE WHEN status='paid' THEN amount ELSE 0 END) AS amount,
         COUNT(*)                                            AS total
       FROM (${union.sql}) t
       GROUP BY day
       ORDER BY day`,
      union.params
    )
    if (tsErr) throw tsErr

    /* ── By provider ── */
    const { rows: provRows, error: provErr } = await query(
      `SELECT
         provider,
         COUNT(*)                                                AS total,
         SUM(status = 'paid')                                    AS approved,
         SUM(status = 'rejected')                                AS rejected,
         SUM(status = 'pending')                                 AS pending,
         SUM(CASE WHEN status='paid' THEN amount ELSE 0 END)     AS amount,
         AVG(CASE WHEN status='paid' THEN amount END)            AS avg_amount
       FROM (${providerUnion.sql}) t
       GROUP BY provider`,
      providerUnion.params
    )
    if (provErr) throw provErr

    /* ── Top users by count ── */
    const { rows: topCountRows, error: tcErr } = await query(
      `SELECT
         t.client_id,
         c.username,
         c.full_name,
         COUNT(*)        AS count,
         SUM(t.amount)   AS total_amount,
         AVG(t.amount)   AS avg_amount,
         MAX(t.amount)   AS max_amount
       FROM (${union.sql}) t
       JOIN clients c ON c.id = t.client_id
       WHERE t.status = 'paid'
       GROUP BY t.client_id, c.username, c.full_name
       ORDER BY count DESC
       LIMIT 10`,
      union.params
    )
    if (tcErr) throw tcErr

    /* ── Top users by amount ── */
    const { rows: topAmtRows, error: taErr } = await query(
      `SELECT
         t.client_id,
         c.username,
         c.full_name,
         COUNT(*)        AS count,
         SUM(t.amount)   AS total_amount,
         AVG(t.amount)   AS avg_amount,
         MAX(t.amount)   AS max_amount
       FROM (${union.sql}) t
       JOIN clients c ON c.id = t.client_id
       WHERE t.status = 'paid'
       GROUP BY t.client_id, c.username, c.full_name
       ORDER BY total_amount DESC
       LIMIT 10`,
      union.params
    )
    if (taErr) throw taErr

    /* ── Amount distribution ── */
    const { rows: distRows, error: distErr } = await query(
      `SELECT
         CASE
           WHEN amount <    1000 THEN '< $1k'
           WHEN amount <    5000 THEN '$1k–$5k'
           WHEN amount <   10000 THEN '$5k–$10k'
           WHEN amount <   50000 THEN '$10k–$50k'
           WHEN amount <  100000 THEN '$50k–$100k'
           ELSE '$100k+'
         END       AS range_label,
         COUNT(*)  AS count,
         SUM(amount) AS total
       FROM (${union.sql}) t
       WHERE status = 'paid'
       GROUP BY range_label
       ORDER BY MIN(amount)`,
      union.params
    )
    if (distErr) throw distErr

    /* ── Withdrawal KPIs ── */
    const { rows: wrKpiRows, error: wrKpiErr } = await query(
      `SELECT
         COUNT(*)                                        AS total,
         SUM(status = 'approved')                       AS approved,
         SUM(status = 'rejected')                       AS rejected,
         SUM(status = 'pending')                        AS pending,
         COUNT(DISTINCT client_id)                      AS unique_users
       FROM withdrawal_requests
       WHERE DATE(created_at) BETWEEN ? AND ?`,
      [from, to]
    )
    if (wrKpiErr) throw wrKpiErr

    /* ── Withdrawal time series ── */
    const { rows: wrTsRows, error: wrTsErr } = await query(
      `SELECT
         DATE(created_at) AS day,
         COUNT(*) AS total,
         SUM(status = 'approved') AS approved,
         SUM(status = 'rejected') AS rejected,
         SUM(status = 'pending')  AS pending
       FROM withdrawal_requests
       WHERE DATE(created_at) BETWEEN ? AND ?
       GROUP BY day
       ORDER BY day`,
      [from, to]
    )
    if (wrTsErr) throw wrTsErr

    /* ── Hourly pattern (por hora del día) ── */
    const { rows: hourRows, error: hourErr } = await query(
      `SELECT HOUR(created_at) AS hour,
              COUNT(*) AS count,
              SUM(amount) AS amount
       FROM manual_payment_movements
       WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'paid'
       GROUP BY HOUR(created_at)
       UNION ALL
       SELECT HOUR(created_at), COUNT(*), SUM(amount)
       FROM hgcash_movements
       WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'paid'
       GROUP BY HOUR(created_at)
       UNION ALL
       SELECT HOUR(created_at), COUNT(*), SUM(amount)
       FROM telepagos_movements
       WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'paid'
       GROUP BY HOUR(created_at)
       UNION ALL
       SELECT HOUR(created_at), COUNT(*), SUM(amount)
       FROM mercadopago_movements
       WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'paid'
       GROUP BY HOUR(created_at)`,
      [from, to, from, to, from, to, from, to]
    )
    if (hourErr) throw hourErr

    // aggregate hours across all providers
    const hourMap = {}
    for (const row of hourRows || []) {
      const h = Number(row.hour)
      if (!hourMap[h]) hourMap[h] = { hour: h, count: 0, amount: 0 }
      hourMap[h].count  += Number(row.count)
      hourMap[h].amount += Number(row.amount)
    }
    const hourlyPattern = Array.from({ length: 24 }, (_, h) => hourMap[h] || { hour: h, count: 0, amount: 0 })

    /* ── Format & respond ── */
    const kpi = kpiRows?.[0] || {}

    res.json({
      kpis: {
        total:          Number(kpi.total)          || 0,
        approved:       Number(kpi.approved)       || 0,
        rejected:       Number(kpi.rejected)       || 0,
        pending:        Number(kpi.pending)        || 0,
        approvalRate:   kpi.total > 0 ? Math.round((kpi.approved / kpi.total) * 100) : 0,
        approvedAmount: Number(kpi.approved_amount) || 0,
        avgAmount:      Number(kpi.avg_amount)      || 0,
        minAmount:      Number(kpi.min_amount)      || 0,
        maxAmount:      Number(kpi.max_amount)      || 0,
        uniqueUsers:    Number(kpi.unique_users)    || 0,
      },
      timeSeries: (tsRows || []).map(r => ({
        date:   r.day,
        count:  Number(r.count),
        amount: Number(r.amount),
        total:  Number(r.total),
      })),
      byProvider: (provRows || []).map(r => ({
        provider:   r.provider,
        label:      PROVIDER_LABELS[r.provider] || r.provider,
        total:      Number(r.total),
        approved:   Number(r.approved),
        rejected:   Number(r.rejected),
        pending:    Number(r.pending),
        amount:     Number(r.amount),
        avgAmount:  Number(r.avg_amount) || 0,
      })),
      topUsersByCount:  (topCountRows || []).map(r => ({
        clientId:    r.client_id,
        username:    r.username,
        fullName:    r.full_name,
        count:       Number(r.count),
        totalAmount: Number(r.total_amount),
        avgAmount:   Number(r.avg_amount) || 0,
        maxAmount:   Number(r.max_amount) || 0,
      })),
      topUsersByAmount: (topAmtRows || []).map(r => ({
        clientId:    r.client_id,
        username:    r.username,
        fullName:    r.full_name,
        count:       Number(r.count),
        totalAmount: Number(r.total_amount),
        avgAmount:   Number(r.avg_amount) || 0,
        maxAmount:   Number(r.max_amount) || 0,
      })),
      amountDistribution: (distRows || []).map(r => ({
        label: r.range_label,
        count: Number(r.count),
        total: Number(r.total),
      })),
      hourlyPattern,
      withdrawals: {
        kpis: (() => {
          const w = wrKpiRows?.[0] || {}
          const total = Number(w.total) || 0
          const approved = Number(w.approved) || 0
          return {
            total,
            approved,
            rejected:     Number(w.rejected)    || 0,
            pending:      Number(w.pending)      || 0,
            approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
            uniqueUsers:  Number(w.unique_users) || 0,
          }
        })(),
        timeSeries: (wrTsRows || []).map(r => ({
          date:     r.day,
          total:    Number(r.total),
          approved: Number(r.approved),
          rejected: Number(r.rejected),
          pending:  Number(r.pending),
        })),
      },
    })
  } catch (error) {
    next(error)
  }
}
