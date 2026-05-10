import { query } from '../config/database.js'

const MP_API_BASE = 'https://api.mercadopago.com'

// ============================================================
//  Helpers
// ============================================================

function parseData(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return {} }
}

function parseDateFields(dateStr) {
  if (!dateStr) return { date: null, time: null }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { date: null, time: null }
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 19) }
}

// MP payments come in as "approved" on their side, but in our system
// they must go through admin review before being marked paid.
function mapMpStatus(_status) {
  return 'pending'
}

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function getMpBankAccount(id) {
  const { rows, error } = await query(
    `SELECT ba.*, bp.slug AS provider_slug
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE ba.id = ? AND bp.slug = 'mercadopago'
     LIMIT 1`,
    [id]
  )
  if (error) throw error
  return rows?.[0] || null
}

async function upsertMpMovement(accountId, payment) {
  const mpId = String(payment.id || '')
  if (!mpId) return false

  const amount    = Number(payment.transaction_amount || 0)
  const status    = mapMpStatus(payment.status)
  const cuit      = payment.payer?.identification?.number || null
  const extRef    = payment.external_reference ? String(payment.external_reference) : mpId
  const txType    = /^\d+$/.test(extRef) ? 'numeric' : 'alphanumeric'
  const { date, time } = parseDateFields(payment.date_created)

  const { rows: existing } = await query(
    'SELECT id FROM mercadopago_movements WHERE mercadopago_id = ? LIMIT 1',
    [mpId]
  )

  if (existing?.length > 0) {
    await query(
      `UPDATE mercadopago_movements SET
         bank_account_id = ?, amount = ?, status = ?, cuit = ?,
         transaction_id = ?, transaction_id_type = ?,
         receipt_date = ?, receipt_time = ?,
         sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
       WHERE mercadopago_id = ?`,
      [accountId, amount, status, cuit, extRef, txType, date, time, mpId]
    )
    return false
  }

  const { error } = await query(
    `INSERT INTO mercadopago_movements
       (bank_account_id, mercadopago_id, transaction_id, transaction_id_type,
        amount, cuit, receipt_date, receipt_time, status, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
    [accountId, mpId, extRef, txType, amount, cuit, date, time, status]
  )
  if (error) {
    console.error('[MP] Error INSERT:', error.message, '| code:', error.code)
    return false
  }
  console.log(`[MP] INSERT mp_id=${mpId} amount=${amount} status=${status}`)
  return true
}

async function fetchMpPage(token, offset, limit, beginDate, endDate) {
  const params = new URLSearchParams({
    sort:       'date_created',
    criteria:   'desc',
    range:      'date_created',
    begin_date: beginDate,
    end_date:   endDate,
    offset:     String(offset),
    limit:      String(limit),
  })

  const url = `${MP_API_BASE}/v1/payments/search?${params}`
  console.log(`[MP] GET ${url}`)

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  console.log('[MP] status:', res.status)

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('[MP] Error body:', txt.slice(0, 400))
    throw new Error(`MP API ${res.status}: ${txt.slice(0, 200)}`)
  }

  return res.json()
}

// ============================================================
//  Export — POST /api/mercadopago/:id/sync
// ============================================================

export async function mpSyncTransactions(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const row = await getMpBankAccount(id)
    if (!row) return res.status(404).json({ error: 'Cuenta MercadoPago no encontrada' })

    const data  = parseData(row.account_data)
    const token = data.token || ''
    if (!token) return res.status(400).json({ error: 'Esta cuenta no tiene token configurado' })

    // Day range in Argentina timezone (UTC-3)
    const today     = localDateStr()
    const beginDate = `${today}T00:00:00.000-03:00`
    const endDate   = `${today}T23:59:59.999-03:00`

    console.log(`[MP] === Sync cuenta id=${id} | ${beginDate} → ${endDate} ===`)

    const limit  = 50
    let offset   = 0
    let synced   = 0

    while (offset <= 2000) {
      let data
      try {
        data = await fetchMpPage(token, offset, limit, beginDate, endDate)
      } catch (err) {
        return next(err)
      }

      const results = data?.results || []
      const total   = data?.paging?.total ?? 0
      console.log(`[MP] Offset ${offset}: ${results.length} pagos | total=${total}`)

      if (results.length === 0) break

      let newInPage = 0
      for (const payment of results) {
        try {
          const isNew = await upsertMpMovement(id, payment)
          if (isNew) { synced++; newInPage++ }
        } catch (e) {
          console.error('[MP] Error upsert individual:', e.message)
        }
      }

      // Checkpoint: página con todos items ya conocidos → detener
      if (newInPage === 0) {
        console.log('[MP] Checkpoint alcanzado — todos ya existían')
        break
      }

      if (results.length < limit || offset + limit >= total) break
      offset += limit
    }

    console.log(`[MP] === Sync finalizado: ${synced} nuevos movimientos ===`)
    res.json({ ok: true, synced })
  } catch (err) {
    console.error('[MP] Error inesperado:', err)
    next(err)
  }
}
