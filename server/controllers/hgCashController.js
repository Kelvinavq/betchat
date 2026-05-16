import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import axios from 'axios'
import FormData from 'form-data'
import { query } from '../config/database.js'
import { persistMessage } from './chatController.js'
import { getAutoMessage } from './autoMessagesController.js'

const SUPABASE_AUTH_URL = 'https://oafouerwrpwzlthrsaba.supabase.co/auth/v1/token?grant_type=password'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hZm91ZXJ3cnB3emx0aHJzYWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MTQwNzMsImV4cCI6MjA2MjM5MDA3M30.RKET8maIzQvYm2yGDtrEIbfT8rw7EKjgzUf886LU_wE'
const HG_TRPC_BASE      = 'https://hg.cash/api/trpc/transactions.getPaginated'
const COOKIE_PREFIX     = 'intercom-device-id-crbfkivo=bf88146c-9af8-46ab-bf31-81d648784d56; sidebar_state=true; sb-oafouerwrpwzlthrsaba-auth-token=base64-'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'
const ALLOWED_MODELS = new Set([
  'google/gemini-3.1-flash-lite',
  'google/gemini-2.0-flash-001',
  'google/gemini-2.5-flash',
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
])
const TZ = 'America/Argentina/Buenos_Aires'

// ============================================================
//  Internal helpers
// ============================================================

function parseData(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return {} }
}

function toBase64(obj) {
  return Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64')
}

function buildCookie(authJson) {
  return COOKIE_PREFIX + toBase64(authJson)
}

function isCookieExpiringSoon(expiresAt) {
  if (!expiresAt) return true
  return Date.now() + 5 * 60 * 1000 >= Number(expiresAt) * 1000
}

async function getHgBankAccount(id) {
  const { rows, error } = await query(
    `SELECT ba.*, bp.slug AS provider_slug
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE ba.id = ? AND bp.slug = 'hgcash'
     LIMIT 1`,
    [id]
  )
  if (error) throw error
  return rows?.[0] || null
}

async function saveHgCookie(accountId, data, cookie, expiresAt) {
  const updated = { ...data, cookie, cookie_expires_at: expiresAt }
  const { error } = await query(
    'UPDATE bank_accounts SET account_data = ? WHERE id = ?',
    [JSON.stringify(updated), accountId]
  )
  if (error) console.error('[HGCash] Error guardando cookie en DB:', error)
  else console.log('[HGCash] Cookie guardada en DB. expires_at:', expiresAt)
}

async function getOpenRouterConfig() {
  const { rows, error } = await query('SELECT api_key, model FROM config_openrouter WHERE id = 1 LIMIT 1')
  if (error) throw error
  const row = rows?.[0] || {}
  if (!row.api_key) throw new Error('OpenRouter API key no configurada')
  const model = ALLOWED_MODELS.has(String(row.model || '').trim()) ? String(row.model).trim() : DEFAULT_OPENROUTER_MODEL
  return { apiKey: String(row.api_key).trim(), model }
}

function stripCodeFences(s) {
  let t = String(s || '').trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```[a-zA-Z]*\s*/m, '')
    t = t.replace(/```$/m, '').trim()
  }
  return t.trim()
}

function safeJsonParse(raw) {
  const original = String(raw || '').trim()
  try { return JSON.parse(original) } catch {}
  const noFences = stripCodeFences(original)
  try { return JSON.parse(noFences) } catch {}
  const start = noFences.indexOf('{')
  const end = noFences.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return JSON.parse(noFences.slice(start, end + 1))
  throw new Error(`No se pudo parsear JSON. Preview: ${original.slice(0, 200)}`)
}

function buildHgVisionPrompt() {
  return `
Eres un extractor de datos de comprobantes de HGCash.
Devuelve SOLO JSON estricto, sin markdown ni texto extra.

Salida:
{
  "amount": "string|null",
  "date": "YYYY-MM-DD|null",
  "time": "HH:mm:ss|null",
  "transaction_id": "string|null",
  "cuit": "string|null",
  "cbu_cvu": "string|null",
  "confidence": "high|medium|low",
  "notes": "string"
}

Reglas:
- amount: normaliza a string con 2 decimales.
- transaction_id: usa solo ids de operación/coelsa/operación visibles y confiables.
- cuit: solo si aparece claramente.
- cbu_cvu: solo si aparece claramente.
- Si el comprobante no es suficientemente claro, usa confidence=low.
`.trim()
}

function buildBinaryDataUrl(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath)
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

async function extractWithOpenRouter({ filePath, mimeType }) {
  const { apiKey, model } = await getOpenRouterConfig()
  const isPdf = String(mimeType || '').includes('pdf')
  const dataUrl = buildBinaryDataUrl(filePath, isPdf ? 'application/pdf' : mimeType)
  const resp = await axios.post(
    OPENROUTER_URL,
    {
      model,
      max_tokens: 700,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: dataUrl } },
          { type: 'text', text: buildHgVisionPrompt() },
        ],
      }],
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 45_000,
      validateStatus: () => true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    },
  )
  if (resp.status < 200 || resp.status >= 300) {
    const apiError = resp?.data?.error?.message || resp?.data?.message || resp?.data?.error || 'OpenRouter request failed'
    throw new Error(`OpenRouter ${resp.status}: ${apiError}`)
  }
  const raw = resp?.data?.choices?.[0]?.message?.content || ''
  if (!String(raw || '').trim()) throw new Error('OpenRouter no devolvio contenido utilizable')
  return { ...safeJsonParse(stripCodeFences(raw)), model, rawResponse: raw }
}

function normalizeExtractedData(data) {
  const out = {
    amount: data?.amount ?? null,
    date: data?.date ?? null,
    time: data?.time ?? null,
    transaction_id: data?.transaction_id || null,
    cuit: data?.cuit || null,
    cbu_cvu: data?.cbu_cvu || null,
    confidence: data?.confidence || 'low',
    notes: data?.notes ? String(data.notes).slice(0, 160).replace(/\n/g, ' ') : '',
    model: data?.model || null,
  }
  if (out.transaction_id) out.transaction_id = String(out.transaction_id).trim().toUpperCase().replace(/[\s-]/g, '')
  if (out.cuit) out.cuit = String(out.cuit).replace(/\D/g, '').slice(0, 20) || null
  if (out.cbu_cvu) out.cbu_cvu = String(out.cbu_cvu).trim().slice(0, 32) || null
  if (out.amount !== null && out.amount !== '') {
    const n = Number(String(out.amount).replace(/[^0-9,.]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'))
    out.amount = Number.isFinite(n) ? n.toFixed(2) : null
  } else {
    out.amount = null
  }
  return out
}

async function getHgAutoMessage(event, context = {}) {
  const msg = await getAutoMessage(event, context)
  return msg || null
}

async function sendHgAutoMessage(chatId, event, context = {}) {
  const msg = await getHgAutoMessage(event, context)
  if (msg) await persistMessage({ chatId, senderType: 'system', content: msg })
}

// ============================================================
//  Supabase auth
// ============================================================

async function loginSupabase(email, password) {
  console.log('[HGCash] Iniciando login Supabase para:', email)

  const res = await fetch(SUPABASE_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  })

  const text = await res.text()
  console.log('[HGCash] Supabase status:', res.status)
  console.log('[HGCash] Supabase body (primeros 400 chars):', text.slice(0, 400))

  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`)
  }

  return JSON.parse(text)
}

async function refreshHgCookie(accountId, data) {
  const email    = data.email    || ''
  const password = data.password || ''

  console.log('[HGCash] refreshHgCookie — email:', email || '(vacío)')

  if (!email || !password) {
    throw new Error('Email/password no configurados en la cuenta HGCash')
  }

  const authData  = await loginSupabase(email, password)
  console.log('[HGCash] Login OK. expires_at:', authData.expires_at, '| access_token presente:', Boolean(authData.access_token))

  const cookie    = buildCookie(authData)
  const expiresAt = authData.expires_at || null

  await saveHgCookie(accountId, data, cookie, expiresAt)
  return cookie
}

async function ensureHgCookie(accountId, data) {
  const cookieExpiring = isCookieExpiringSoon(data.cookie_expires_at)
  console.log('[HGCash] ensureHgCookie — cookie en DB:', Boolean(data.cookie), '| expirando:', cookieExpiring)

  if (data.cookie && !cookieExpiring) {
    console.log('[HGCash] Usando cookie existente, expires_at:', data.cookie_expires_at)
    return data.cookie
  }

  return refreshHgCookie(accountId, data)
}

// ============================================================
//  HMAC verification
// ============================================================

function verifySignature(rawBody, secret, sigHeader) {
  if (!secret || !sigHeader) return false
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(rawBody)
  const expected = Buffer.from(`sha256=${hmac.digest('hex')}`)
  const received = Buffer.from(sigHeader)
  if (expected.length !== received.length) return false
  return crypto.timingSafeEqual(expected, received)
}

// ============================================================
//  Movement helpers
// ============================================================

function mapHgStatus(direction, status) {
  const s = String(status || '').toLowerCase()
  if (['done', 'completed', 'approved', 'success', 'acreditado'].includes(s)) return 'paid'
  if (['failed', 'rejected', 'error', 'rechazado'].includes(s))        return 'rejected'
  return 'pending'
}

function parseDateFields(dateStr) {
  if (!dateStr) return { date: null, time: null }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { date: null, time: null }
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 19) }
}

// Returns true if a new row was inserted, false if it already existed
async function upsertMovement(accountId, item) {
  const coelsaId  = item.coelsaCode || item.coelsa_id || item.coelsaId || item.externalID || String(item.id || '')
  if (!coelsaId) {
    console.warn('[HGCash] Item sin coelsaId, ignorado:', JSON.stringify(item).slice(0, 200))
    return false
  }

  const amount    = Number(item.amount || 0)
  const fromCBU   = item.fromCBU  || item.from_cbu  || null
  const fromCUIT  = item.fromCUIT || item.from_cuit || null
  const bankStatus = String(item.transactionStatus?.name || item.status || '').trim()
  const status    = mapHgStatus(item.direction || item.type, item.transactionStatus?.name || item.status)
  const { date, time } = parseDateFields(item.date || item.createdAt || item.created_at || item.externalDate)

  const { rows: existing, error: selErr } = await query(
    'SELECT id FROM hgcash_movements WHERE coelsa_id = ? LIMIT 1',
    [coelsaId]
  )
  if (selErr) { console.error('[HGCash] Error SELECT coelsa_id:', selErr); return false }

  if (existing?.length > 0) {
    await query(
      `UPDATE hgcash_movements SET
         bank_account_id = ?, amount = ?, cbu_cvu = ?, cuit = ?,
         receipt_date = ?, receipt_time = ?, bank_status = ?, status = ?,
         sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
       WHERE coelsa_id = ?`,
      [accountId, amount, fromCBU, fromCUIT, date, time, bankStatus, status, coelsaId]
    )
    return false  // already existed
  } else {
    const { error } = await query(
      `INSERT INTO hgcash_movements
         (bank_account_id, coelsa_id, amount, cbu_cvu, cuit,
          receipt_date, receipt_time, bank_status, status, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
      [accountId, coelsaId, amount, fromCBU, fromCUIT, date, time, bankStatus, status]
    )
    if (error) {
      console.error('[HGCash] Error INSERT movimiento:', error.message, '| code:', error.code)
      return false
    }
    console.log(`[HGCash] INSERT coelsa_id=${coelsaId} amount=${amount} status=${status}`)
    return true  // newly inserted
  }
}

// ============================================================
//  TRPC helpers
// ============================================================

function buildTrpcUrl(page, pageSize) {
  const inputObj = { '0': { json: { page, pageSize } } }
  const url = `${HG_TRPC_BASE}?batch=1&input=${encodeURIComponent(JSON.stringify(inputObj))}`
  console.log('[HGCash] TRPC URL:', url)
  return url
}

function parseTrpcItems(batch) {
  console.log('[HGCash] TRPC raw batch tipo:', typeof batch, '| es array:', Array.isArray(batch))
  if (Array.isArray(batch)) {
    console.log('[HGCash] batch[0] keys:', Object.keys(batch[0] || {}))
  }

  const first = Array.isArray(batch) ? batch[0] : batch
  const data  = first?.result?.data?.json ?? first?.result?.data ?? {}

  console.log('[HGCash] data keys:', Object.keys(data))

  if (Array.isArray(data.items)) {
    console.log('[HGCash] items encontrados:', data.items.length)
    if (data.items.length > 0) console.log('[HGCash] Primer item:', JSON.stringify(data.items[0]).slice(0, 300))
    return data.items
  }
  if (Array.isArray(data.data)) {
    console.log('[HGCash] data.data encontrado:', data.data.length)
    return data.data
  }
  if (Array.isArray(data)) {
    console.log('[HGCash] data es array directamente:', data.length)
    return data
  }

  console.warn('[HGCash] No se encontraron items. data completo:', JSON.stringify(data).slice(0, 500))
  return []
}

async function fetchTrpcTransactions(cookie, page, pageSize) {
  const url = buildTrpcUrl(page, pageSize)
  console.log(`[HGCash] Fetching TRPC page=${page} pageSize=${pageSize}`)

  const res = await fetch(url, {
    headers: {
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
  })

  console.log('[HGCash] TRPC response status:', res.status)

  if (res.status === 401) {
    console.warn('[HGCash] TRPC 401 — cookie expirada o inválida')
    const err = new Error('UNAUTHORIZED')
    err.status = 401
    throw err
  }

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('[HGCash] TRPC error body:', txt.slice(0, 400))
    throw new Error(`HGCash TRPC ${res.status}: ${txt.slice(0, 200)}`)
  }

  const json = await res.json()
  return parseTrpcItems(json)
}

// ============================================================
//  Webhook — POST /api/hgcash/webhook
// ============================================================

export async function hgWebhook(req, res, next) {
  try {
    const rawBody   = req.rawBody || Buffer.from(JSON.stringify(req.body ?? {}))
    const sigHeader = req.headers['x-hg-webhook-signature'] || ''
    const qid       = parseInt(req.query.account_id || '0', 10) || null

    let row = null

    if (qid) {
      row = await getHgBankAccount(qid)
      if (row && sigHeader) {
        const data   = parseData(row.account_data)
        const secret = data.webhook_secret || ''
        if (secret && !verifySignature(rawBody, secret, sigHeader)) {
          return res.status(401).json({ error: 'Firma de webhook inválida' })
        }
      }
    } else if (sigHeader) {
      const { rows: candidates, error } = await query(
        `SELECT ba.*, bp.slug AS provider_slug
         FROM bank_accounts ba
         INNER JOIN bank_providers bp ON bp.id = ba.provider_id
         WHERE bp.slug = 'hgcash' AND ba.is_active = 1`,
        []
      )
      if (error) throw error
      for (const candidate of (candidates || [])) {
        const data   = parseData(candidate.account_data)
        const secret = data.webhook_secret || ''
        if (secret && verifySignature(rawBody, secret, sigHeader)) {
          row = candidate
          break
        }
      }
    }

    if (!row) return res.status(404).json({ error: 'Cuenta no encontrada o firma inválida' })

    const payload = req.body

    if (payload.direction && payload.direction !== 'Inbound') {
      return res.json({ ok: true, skipped: true, reason: 'not_inbound' })
    }

    await upsertMovement(row.id, payload)
    res.json({ ok: true })
  } catch (err) { next(err) }
}

// ============================================================
//  Manual sync — POST /api/hgcash/:id/sync
// ============================================================

export async function hgSyncTransactions(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    console.log(`[HGCash] === Inicio sync para cuenta id=${id} ===`)

    const row = await getHgBankAccount(id)
    if (!row) return res.status(404).json({ error: 'Cuenta HGCash no encontrada' })

    const data = parseData(row.account_data)
    console.log('[HGCash] account_data keys:', Object.keys(data))
    console.log('[HGCash] email:', data.email || '(vacío)')
    console.log('[HGCash] password presente:', Boolean(data.password))
    console.log('[HGCash] cookie presente:', Boolean(data.cookie))
    console.log('[HGCash] api_token presente:', Boolean(data.api_token))
    console.log('[HGCash] token presente:', Boolean(data.token))

    let cookie
    try {
      cookie = await ensureHgCookie(id, data)
      console.log('[HGCash] Cookie lista, longitud:', cookie?.length ?? 0)
    } catch (authErr) {
      console.error('[HGCash] Error de autenticación:', authErr.message)
      return res.status(400).json({ error: `Error de autenticación: ${authErr.message}` })
    }

    const pageSize = 50
    let page    = 1
    let synced  = 0
    let retried = false

    while (page <= 20) {
      let items
      try {
        items = await fetchTrpcTransactions(cookie, page, pageSize)
      } catch (fetchErr) {
        if (fetchErr.status === 401 && !retried) {
          console.log('[HGCash] 401 recibido, reintentando login...')
          retried = true
          try {
            cookie = await refreshHgCookie(id, { ...data, cookie: null, cookie_expires_at: null })
            console.log('[HGCash] Re-login exitoso, continuando...')
          } catch (reAuthErr) {
            console.error('[HGCash] Re-login fallido:', reAuthErr.message)
            return res.status(400).json({ error: `Re-autenticación fallida: ${reAuthErr.message}` })
          }
          continue
        }
        console.error('[HGCash] Error TRPC no recuperable:', fetchErr.message)
        return next(fetchErr)
      }

      if (!items || items.length === 0) {
        console.log(`[HGCash] Página ${page} vacía, deteniendo`)
        break
      }

      console.log(`[HGCash] Página ${page}: ${items.length} items`)
      let newInPage = 0
      for (const item of items) {
        try {
          const isNew = await upsertMovement(id, item)
          if (isNew) { synced++; newInPage++ }
        } catch (e) {
          console.error('[HGCash] Error upsert individual:', e.message)
        }
      }

      // Checkpoint: si ningún item de esta página era nuevo, ya alcanzamos
      // la parte histórica y no hace falta seguir paginando
      if (newInPage === 0) {
        console.log(`[HGCash] Página ${page}: todos los items ya existían — checkpoint alcanzado`)
        break
      }

      if (items.length < pageSize) {
        console.log('[HGCash] Última página alcanzada')
        break
      }
      page++
    }

    console.log(`[HGCash] === Sync finalizado: ${synced} movimientos sincronizados en ${page} página(s) ===`)
    res.json({ ok: true, synced, pages: page })
  } catch (err) {
    console.error('[HGCash] Error inesperado en sync:', err)
    next(err)
  }
}

async function getHgBankAccountByClientCuit(cuit) {
  const clean = String(cuit || '').replace(/\D/g, '')
  if (!clean) return null
  const { rows, error } = await query(
    `SELECT ba.*, bp.slug AS provider_slug
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE bp.slug = 'hgcash' AND ba.is_active = 1
       AND REPLACE(REPLACE(REPLACE(COALESCE(JSON_EXTRACT(ba.account_data, '$.cuit'), ''), '"', ''), '.', ''), '-', '') = ?
     ORDER BY ba.updated_at DESC, ba.id DESC
     LIMIT 1`,
    [clean],
  )
  if (error) throw error
  return rows?.[0] || null
}

async function getClientByCuit(cuit) {
  const clean = String(cuit || '').replace(/\D/g, '')
  if (!clean) return null
  const { rows, error } = await query(
    'SELECT id, username, full_name, cuil, cuit FROM clients WHERE REPLACE(REPLACE(REPLACE(COALESCE(cuil, cuit, \'\'), \'.\', \'\'), \'-\', \'\'), \' \', \'\') = ? LIMIT 1',
    [clean],
  )
  if (error) throw error
  return rows?.[0] || null
}

async function upsertHgMovement({ accountId, clientId = null, chatId = null, messageId = null, payload = {}, syncStatus = 'synced' }) {
  const coelsaId = String(payload.coelsa_id || payload.coelsaId || payload.transaction_id || payload.id || '').trim() || null
  const amount = Number(payload.amount || 0)
  const cuit = String(payload.cuit || '').replace(/\D/g, '') || null
  const cbu = String(payload.cbu_cvu || payload.cbu || payload.cvu || '').trim() || null
  const bankStatus = String(payload.bank_status || payload.status || payload.state || '').trim() || null
  const status = mapHgStatus(payload.direction || payload.type, payload.status || payload.state)
  const { date, time } = parseDateFields(payload.date || payload.createdAt || payload.created_at || payload.receipt_date)

  if (!coelsaId) return false

  const { rows: existing } = await query('SELECT id FROM hgcash_movements WHERE coelsa_id = ? LIMIT 1', [coelsaId])
  if (existing?.length) {
    await query(
      `UPDATE hgcash_movements SET
         client_id = COALESCE(?, client_id),
         chat_id = COALESCE(?, chat_id),
         message_id = COALESCE(?, message_id),
         bank_account_id = ?,
         amount = ?, cuit = ?, cbu_cvu = ?, receipt_date = ?, receipt_time = ?,
         bank_status = ?, status = ?, sync_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE coelsa_id = ?`,
      [clientId, chatId, messageId, accountId, amount, cuit, cbu, date, time, bankStatus, status, syncStatus, coelsaId],
    )
    return false
  }

  await query(
    `INSERT INTO hgcash_movements
      (client_id, chat_id, message_id, bank_account_id, cuit, receipt_date, receipt_time, amount, cbu_cvu, bank_status, coelsa_id, status, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [clientId, chatId, messageId, accountId, cuit, date, time, amount, cbu, bankStatus, coelsaId, status, syncStatus],
  )
  return true
}

async function processHgReceiptBase(req, res, mimeType) {
  if (!req.file) return res.status(400).json({ ok: false, message: 'No se proporciono archivo' })
  const chatId = Number(req.body?.chatId)
  const clientId = Number(req.body?.clientId)
  if (!chatId || !clientId) return res.status(400).json({ ok: false, message: 'chatId y clientId son requeridos' })

  const extractedRaw = await extractWithOpenRouter({ filePath: req.file.path, mimeType })
  const extractedData = normalizeExtractedData(extractedRaw)
  const client = await getClientByCuit(extractedData.cuit)
  const bankAccount = extractedData.cuit ? await getHgBankAccountByClientCuit(extractedData.cuit) : null

  const amount = extractedData.amount ? Number(extractedData.amount) : null
  const amountTooLow = Number.isFinite(amount) && amount > 0 && amount < 1
  if (!extractedData.transaction_id || !amount) {
    await sendHgAutoMessage(chatId, 'receipt_insufficient_info', { clientId, bankAccountId: bankAccount?.id || null })
    return res.json({ ok: true, status: 'insufficient_info', extractedData, syncStatus: 'not_synced', aiModel: extractedRaw?.model || null })
  }
  if (amountTooLow) {
    await sendHgAutoMessage(chatId, 'receipt_amount_low', { clientId, bankAccountId: bankAccount?.id || null })
    return res.json({ ok: true, status: 'amount_low', extractedData, syncStatus: 'not_synced', aiModel: extractedRaw?.model || null })
  }

  const duplicateResult = await query(
    `SELECT id FROM hgcash_movements
     WHERE status = 'paid'
       AND (coelsa_id = ? OR (cuit IS NOT NULL AND cuit = ?) OR (amount = ? AND receipt_date = ?))
     LIMIT 1`,
    [extractedData.transaction_id, extractedData.cuit || '', amount, extractedData.date || null],
  )
  if (duplicateResult?.rows?.length) {
    await sendHgAutoMessage(chatId, 'receipt_duplicate', { clientId, bankAccountId: bankAccount?.id || null })
    return res.json({ ok: true, status: 'duplicate', extractedData, duplicateId: duplicateResult.rows[0].id, syncStatus: 'not_synced', aiModel: extractedRaw?.model || null })
  }

  await upsertHgMovement({
    accountId: bankAccount?.id || null,
    clientId,
    chatId,
    messageId: Number(req.body?.messageId) || null,
    payload: {
      amount,
      cuit: extractedData.cuit,
      cbu_cvu: extractedData.cbu_cvu,
      coelsa_id: extractedData.transaction_id,
      status: 'pending',
      bank_status: 'pending',
      receipt_date: extractedData.date,
      receipt_time: extractedData.time,
    },
  })

  const status = 'pending'
  await sendHgAutoMessage(chatId, 'receipt_received', { clientId, bankAccountId: bankAccount?.id || null })
  return res.json({ ok: true, status, extractedData, syncStatus: 'synced', aiModel: extractedRaw?.model || null, client })
}

export async function processImage(req, res) {
  return processHgReceiptBase(req, res, req.file?.mimetype || 'image/jpeg')
}

export async function processPdf(req, res) {
  return processHgReceiptBase(req, res, 'application/pdf')
}

export async function processHgCashClientReceipt({ chatId, clientId, messageId, dataUrl }) {
  const parsed = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!parsed) throw new Error('No se pudo leer el archivo enviado por el cliente')
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hg-receipt-'))
  const ext = parsed[1].includes('pdf') ? '.pdf' : '.jpg'
  const tempFile = path.join(tmpDir, `${Date.now()}${ext}`)
  fs.writeFileSync(tempFile, Buffer.from(parsed[2], 'base64'))
  const fakeReq = {
    file: { path: tempFile, filename: `hg-${Date.now()}${ext}`, mimetype: parsed[1] },
    body: { chatId, clientId, messageId },
  }
  const fakeRes = {
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return payload },
  }
  try {
    return await processHgReceiptBase(fakeReq, fakeRes, parsed[1])
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}

export async function requestPaymentHG(req, res, next) {
  try {
    const chatId = Number(req.body?.chatId)
    const cuit = String(req.body?.cuit || req.body?.cuil || '').replace(/\D/g, '')
    if (!chatId || !cuit) return res.status(400).json({ error: 'chatId y cuit/cuil son requeridos' })

    const client = await getClientByCuit(cuit)
    const bankAccount = await getHgBankAccountByClientCuit(cuit)
    const pendingDb = await query(
      `SELECT id, amount, receipt_date, receipt_time, status
       FROM hgcash_movements
       WHERE cuit = ? AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [cuit],
    )
    if (pendingDb?.rows?.length) {
      await sendHgAutoMessage(chatId, 'receipt_received', { clientId: client?.id || null, bankAccountId: bankAccount?.id || null })
      return res.json({ ok: true, source: 'db', movement: pendingDb.rows[0], client, bankAccount })
    }

    if (!bankAccount) {
      await sendHgAutoMessage(chatId, 'receipt_insufficient_info', { clientId: client?.id || null, bankAccountId: null })
      return res.json({ ok: true, source: 'none', client, bankAccount: null })
    }

    const accountData = parseData(bankAccount.account_data)
    const cookie = accountData.cookie || (accountData.email && accountData.password ? await refreshHgCookie(bankAccount.id, accountData) : null)
    if (!cookie) {
      return res.status(400).json({ error: 'La cuenta HGCash no tiene cookie ni credenciales para sincronizar.' })
    }

    const url = `${HG_TRPC_BASE}?batch=1&input=${encodeURIComponent(JSON.stringify({ '0': { json: { page: 1, pageSize: 100 } } }))}`
    const resp = await fetch(url, { headers: { Cookie: cookie, 'Content-Type': 'application/json' } })
    if (!resp.ok) throw new Error(`HGCash TRPC ${resp.status}`)
    const json = await resp.json()
    const items = parseTrpcItems(json)
    const match = items.find(item => String(item?.fromCUIT || item?.from_cuit || item?.cuit || item?.payerCuit || '').replace(/\D/g, '') === cuit)
    if (!match) {
      await sendHgAutoMessage(chatId, 'receipt_reupload', { clientId: client?.id || null, bankAccountId: bankAccount.id })
      return res.json({ ok: true, source: 'bank', found: false, client, bankAccount })
    }

    await upsertHgMovement({
      accountId: bankAccount.id,
      clientId: client?.id || null,
      chatId,
      messageId: null,
      payload: match,
      syncStatus: 'synced',
    })
    await sendHgAutoMessage(chatId, 'receipt_received', { clientId: client?.id || null, bankAccountId: bankAccount.id })
    return res.json({ ok: true, source: 'bank', found: true, movement: match, client, bankAccount })
  } catch (err) {
    next(err)
  }
}
