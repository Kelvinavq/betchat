import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import axios from 'axios'
import FormData from 'form-data'
import { query, transaction } from '../config/database.js'
import { persistMessage, resetClientBot } from './chatController.js'
import { getAutoMessage } from './autoMessagesController.js'
import { getIo } from '../socket/socketServer.js'

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
    'SELECT id, username, full_name, cuil FROM clients WHERE REPLACE(REPLACE(REPLACE(COALESCE(cuil, \'\'), \'.\', \'\'), \'-\', \'\'), \' \', \'\') = ? LIMIT 1',
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

// ============================================================
//  CashGateway webhook receiver
// ============================================================

const CASHGATEWAY_ALLOWED_STATUSES = new Set(['pending', 'paid', 'rejected'])
const CASHGATEWAY_REPLAY_WINDOW_MS = 5 * 60 * 1000

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function normalizeWebhookText(value) {
  return String(value ?? '').trim()
}

function normalizeProviderStatus(value) {
  const status = normalizeWebhookText(value).toLowerCase()
  return CASHGATEWAY_ALLOWED_STATUSES.has(status) ? status : null
}

function parseJsonMaybe(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function rawToString(rawBuffer) {
  if (Buffer.isBuffer(rawBuffer)) return rawBuffer.toString('utf8')
  if (typeof rawBuffer === 'string') return rawBuffer
  if (rawBuffer == null) return ''
  return String(rawBuffer)
}

function normalizeHeaderValue(headers, name) {
  return normalizeWebhookText(headers?.[name] ?? headers?.[name.toLowerCase()] ?? '')
}

function normalizeGatewayTimestamp(timestamp) {
  if (!timestamp) return null
  const numeric = Number(timestamp)
  if (Number.isFinite(numeric)) {
    return numeric < 1e12 ? numeric * 1000 : numeric
  }
  const parsed = Date.parse(String(timestamp))
  return Number.isNaN(parsed) ? null : parsed
}

function verifyGatewayHmac({ rawBody, timestamp, signature, secret }) {
  if (!signature || !secret || !timestamp) return false
  const signedPayload = `${timestamp}.${rawToString(rawBody)}`
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')
  const received = signature.replace(/^sha256=/i, '').trim().toLowerCase()
  if (!received || received.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received))
}

async function getHgBankAccountByGatewayToken(token) {
  const cleanToken = normalizeWebhookText(token)
  if (!cleanToken) return null

  const { rows, error } = await query(
    `SELECT ba.*, bp.slug AS provider_slug
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE bp.slug = 'hgcash'
       AND ba.is_active = 1
       AND JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.webhook_enabled')) IN ('true', '1')
       AND JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.webhook_mode')) = 'flowhg'
       AND JSON_UNQUOTE(JSON_EXTRACT(ba.account_data, '$.webhook_secret')) = ?
     LIMIT 1`,
    [cleanToken]
  )
  if (error) throw error
  return rows?.[0] || null
}

async function resolveHGCashBankAccountId(gatewayAccountId) {
  const clean = normalizeWebhookText(gatewayAccountId)
  if (clean) {
    const { rows, error } = await query(
      `SELECT ba.id, ba.account_data
       FROM bank_accounts ba
       INNER JOIN bank_providers bp ON bp.id = ba.provider_id
       WHERE bp.slug = 'hgcash' AND ba.is_active = 1`,
      []
    )
    if (error) throw error

    for (const row of rows || []) {
      const data = parseData(row.account_data)
      const candidates = [
        data.gateway_account_id,
        data.cashgateway_account_id,
        data.flowhg_account_id,
        data.account_id,
      ].map(normalizeWebhookText).filter(Boolean)
      if (candidates.includes(clean)) return Number(row.id)
    }
  }

  const { rows: configRows, error: configError } = await query(
    `SELECT cpc.bank_account_id, bp.slug AS provider_slug
     FROM chat_processing_config cpc
     LEFT JOIN bank_accounts ba ON ba.id = cpc.bank_account_id
     LEFT JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE cpc.id = 1
     LIMIT 1`,
    []
  )
  if (configError) throw configError
  const activeConfigId = Number(configRows?.[0]?.bank_account_id || 0)
  if (activeConfigId && configRows?.[0]?.provider_slug === 'hgcash') return activeConfigId

  const { rows: fallbackRows, error: fallbackError } = await query(
    `SELECT ba.id
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE bp.slug = 'hgcash' AND ba.is_active = 1
     ORDER BY ba.updated_at DESC, ba.id DESC
     LIMIT 1`,
    []
  )
  if (fallbackError) throw fallbackError
  return Number(fallbackRows?.[0]?.id || 0) || null
}

async function findClientByTaxId(taxId) {
  const clean = normalizeWebhookText(taxId).replace(/\D/g, '')
  if (!clean) return null
  const { rows, error } = await query(
    `SELECT id, username, full_name, cuil
     FROM clients
     WHERE REPLACE(REPLACE(REPLACE(COALESCE(cuil, ''), '.', ''), '-', ''), ' ', '') = ?
     LIMIT 1`,
    [clean]
  )
  if (error) throw error
  return rows?.[0] || null
}

async function findLatestChatByClientId(clientId) {
  if (!clientId) return null
  const { rows, error } = await query(
    `SELECT id, client_id
     FROM chats
     WHERE client_id = ? AND is_archived = 0
     ORDER BY id DESC
     LIMIT 1`,
    [clientId]
  )
  if (error) throw error
  return rows?.[0] || null
}

async function findGatewayMovement(connection, keys) {
  const lookups = [
    ['gateway_event_id', keys.gatewayEventId],
    ['provider_event_id', keys.providerEventId],
    ['hg_id', keys.hgId],
    ['coelsa_id', keys.coelsaCode],
  ]
  for (const [column, value] of lookups) {
    const clean = normalizeWebhookText(value)
    if (!clean) continue
    const [rows] = await connection.execute(
      `SELECT * FROM hgcash_movements WHERE ${column} = ? ORDER BY id DESC LIMIT 1`,
      [clean]
    )
    if (rows?.[0]) return rows[0]
  }
  return null
}

function movementPayloadFromGateway({ body, headers, providerStatus, bankStatus, clientId, chatId, bankAccountId }) {
  const payload = parseJsonMaybe(body?.payload) || {}
  const amount = Number(payload.amount ?? 0)
  const receiptDate = payload.date ? new Date(payload.date) : null
  const parsedDate = receiptDate && !Number.isNaN(receiptDate.getTime()) ? receiptDate : null

  return {
    client_id: clientId || null,
    chat_id: chatId || null,
    message_id: null,
    bank_account_id: bankAccountId || null,
    hg_id: normalizeWebhookText(payload.id) || null,
    hg_movement_id: normalizeHeaderValue(headers, 'x-hg-movement-id') || null,
    gateway_movement_id: normalizeHeaderValue(headers, 'x-gateway-movement-id') || null,
    hg_account_id: normalizeHeaderValue(headers, 'x-hg-account-id') || null,
    provider_event_id: normalizeWebhookText(body?.provider_event_id) || normalizeHeaderValue(headers, 'x-provider-event-id') || null,
    gateway_event_id: normalizeHeaderValue(headers, 'x-gateway-event-id') || null,
    destination_domain: normalizeWebhookText(body?.destination_domain) || normalizeHeaderValue(headers, 'x-destination-domain') || null,
    provider_status: providerStatus,
    cuit: normalizeWebhookText(payload.fromCUIT || payload.fromCuit || ''),
    receipt_date: parsedDate ? parsedDate.toISOString().slice(0, 10) : null,
    receipt_time: parsedDate ? parsedDate.toISOString().slice(11, 19) : null,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: normalizeWebhookText(payload.currency) || null,
    direction: normalizeWebhookText(payload.direction) || null,
    type: normalizeWebhookText(payload.type) || null,
    timezone: normalizeWebhookText(payload.timezone) || null,
    from_name: normalizeWebhookText(payload.fromName) || null,
    to_name: normalizeWebhookText(payload.toName) || null,
    from_cbu: normalizeWebhookText(payload.fromCBU) || null,
    to_cbu: normalizeWebhookText(payload.toCBU) || null,
    from_cuit: normalizeWebhookText(payload.fromCUIT) || null,
    to_cuit: normalizeWebhookText(payload.toCUIT) || null,
    account_id: normalizeWebhookText(payload.accountId) || null,
    cbu_cvu: normalizeWebhookText(payload.fromCBU || payload.fromCBU) || null,
    bank_status: normalizeWebhookText(payload.status) || null,
    coelsa_id: normalizeWebhookText(payload.coelsaCode) || null,
    status: providerStatus,
    sync_status: 'synced',
    raw_payload: JSON.stringify(payload),
    raw_body: JSON.stringify(body),
    received_from_gateway_at: new Date(),
    updated_from_gateway_at: new Date(),
  }
}

async function upsertGatewayMovement({ body, headers, providerStatus, bankStatus, clientId, chatId, bankAccountId }) {
  return transaction(async (connection) => {
    const payload = parseJsonMaybe(body?.payload) || {}
    const identifiers = {
      gatewayEventId: normalizeHeaderValue(headers, 'x-gateway-event-id'),
      providerEventId: normalizeWebhookText(body?.provider_event_id) || normalizeHeaderValue(headers, 'x-provider-event-id'),
      hgId: normalizeWebhookText(payload.id),
      coelsaCode: normalizeWebhookText(payload.coelsaCode),
    }

    const existing = await findGatewayMovement(connection, identifiers)
    const now = new Date()
    const movement = movementPayloadFromGateway({ body, headers, providerStatus, bankStatus, clientId, chatId, bankAccountId })
    movement.updated_from_gateway_at = now
    const isReplay = Boolean(existing && (
      normalizeWebhookText(existing.gateway_event_id) === identifiers.gatewayEventId
      && normalizeWebhookText(existing.provider_event_id) === identifiers.providerEventId
      && normalizeWebhookText(JSON.stringify(parseJsonMaybe(existing.raw_body) || {})) === normalizeWebhookText(JSON.stringify(body))
    ))

    if (existing) {
      await connection.execute(
        `UPDATE hgcash_movements
         SET client_id = COALESCE(?, client_id),
             chat_id = COALESCE(?, chat_id),
             message_id = COALESCE(?, message_id),
             bank_account_id = COALESCE(?, bank_account_id),
             hg_id = COALESCE(?, hg_id),
             hg_movement_id = COALESCE(?, hg_movement_id),
             gateway_movement_id = COALESCE(?, gateway_movement_id),
             hg_account_id = COALESCE(?, hg_account_id),
             provider_event_id = COALESCE(?, provider_event_id),
             gateway_event_id = COALESCE(?, gateway_event_id),
             destination_domain = COALESCE(?, destination_domain),
             provider_status = ?,
             cuit = COALESCE(?, cuit),
             receipt_date = COALESCE(?, receipt_date),
             receipt_time = COALESCE(?, receipt_time),
             amount = COALESCE(?, amount),
             currency = COALESCE(?, currency),
             direction = COALESCE(?, direction),
             type = COALESCE(?, type),
             timezone = COALESCE(?, timezone),
             from_name = COALESCE(?, from_name),
             to_name = COALESCE(?, to_name),
             from_cbu = COALESCE(?, from_cbu),
             to_cbu = COALESCE(?, to_cbu),
             from_cuit = COALESCE(?, from_cuit),
             to_cuit = COALESCE(?, to_cuit),
             account_id = COALESCE(?, account_id),
             cbu_cvu = COALESCE(?, cbu_cvu),
             bank_status = ?,
             coelsa_id = COALESCE(?, coelsa_id),
             status = ?,
             sync_status = ?,
             raw_payload = ?,
             raw_body = ?,
             updated_from_gateway_at = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          movement.client_id,
          movement.chat_id,
          movement.message_id,
          movement.bank_account_id,
          movement.hg_id,
          movement.hg_movement_id,
          movement.gateway_movement_id,
          movement.hg_account_id,
          movement.provider_event_id,
          movement.gateway_event_id,
          movement.destination_domain,
          movement.provider_status,
          movement.cuit,
          movement.receipt_date,
          movement.receipt_time,
          movement.amount,
          movement.currency,
          movement.direction,
          movement.type,
          movement.timezone,
          movement.from_name,
          movement.to_name,
          movement.from_cbu,
          movement.to_cbu,
          movement.from_cuit,
          movement.to_cuit,
          movement.account_id,
          movement.cbu_cvu,
          movement.bank_status,
          movement.coelsa_id,
          movement.status,
          movement.sync_status,
          movement.raw_payload,
          movement.raw_body,
          movement.updated_from_gateway_at,
          existing.id,
        ]
      )
      const [rows] = await connection.execute('SELECT * FROM hgcash_movements WHERE id = ? LIMIT 1', [existing.id])
      return {
        movement: rows?.[0] || { ...existing, id: existing.id },
        inserted: false,
        insertId: existing.id,
        duplicate: isReplay,
        previousStatus: normalizeWebhookText(existing.provider_status || existing.status),
      }
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO hgcash_movements (
        client_id, chat_id, message_id, bank_account_id,
        hg_id, hg_movement_id, gateway_movement_id, hg_account_id,
        provider_event_id, gateway_event_id, destination_domain, provider_status,
        cuit, receipt_date, receipt_time, amount, currency, direction, type, timezone,
        from_name, to_name, from_cbu, to_cbu, from_cuit, to_cuit, account_id, cbu_cvu,
        bank_status, coelsa_id, status, sync_status, raw_payload, raw_body,
        received_from_gateway_at, updated_from_gateway_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        movement.client_id,
        movement.chat_id,
        movement.message_id,
        movement.bank_account_id,
        movement.hg_id,
        movement.hg_movement_id,
        movement.gateway_movement_id,
        movement.hg_account_id,
        movement.provider_event_id,
        movement.gateway_event_id,
        movement.destination_domain,
        movement.provider_status,
        movement.cuit,
        movement.receipt_date,
        movement.receipt_time,
        movement.amount,
        movement.currency,
        movement.direction,
        movement.type,
        movement.timezone,
        movement.from_name,
        movement.to_name,
        movement.from_cbu,
        movement.to_cbu,
        movement.from_cuit,
        movement.to_cuit,
        movement.account_id,
        movement.cbu_cvu,
        movement.bank_status,
        movement.coelsa_id,
        movement.status,
        movement.sync_status,
        movement.raw_payload,
        movement.raw_body,
        movement.received_from_gateway_at,
        movement.updated_from_gateway_at,
      ]
    )
    const [rows] = await connection.execute('SELECT * FROM hgcash_movements WHERE id = ? LIMIT 1', [insertResult.insertId])
    return {
      movement: rows?.[0] || { ...movement, id: insertResult.insertId },
      inserted: true,
      insertId: insertResult.insertId,
      duplicate: false,
      previousStatus: null,
    }
  })
}

async function processGatewaySideEffects({ movement, providerStatus, clientId, chatId, amount }) {
  const io = getIo()
  const finalClientId = clientId || movement?.client_id || null
  const finalChatId = chatId || movement?.chat_id || null
  const depositAmount = amount != null ? Number(amount) : Number(movement?.amount || 0)

  if (providerStatus === 'pending') {
    const pendingMsg = await getAutoMessage('receipt_received', { clientId: finalClientId, amount: depositAmount })
    if (pendingMsg && finalChatId) {
      const result = await persistMessage({
        chatId: finalChatId,
        senderType: 'system',
        content: pendingMsg,
      })
      await query(
        `UPDATE hgcash_movements
         SET message_id = COALESCE(message_id, ?), updated_from_gateway_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [result.message.id, movement.id]
      )
    }
    return
  }

  if (providerStatus === 'rejected') {
    const rejectedMsg = await getAutoMessage('receipt_reupload', { clientId: finalClientId, amount: depositAmount })
    if (rejectedMsg && finalChatId) {
      const result = await persistMessage({
        chatId: finalChatId,
        senderType: 'system',
        content: rejectedMsg,
      })
      await query(
        `UPDATE hgcash_movements
         SET message_id = COALESCE(message_id, ?), updated_from_gateway_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [result.message.id, movement.id]
      )
    }
    if (finalChatId) {
      io?.to(`chat:${finalChatId}`).emit('receipt:result', {
        chatId: Number(finalChatId),
        messageId: movement.message_id ? Number(movement.message_id) : null,
        status: 'invalid',
        amount: depositAmount,
        resultReason: 'cashgateway_rejected',
      })
    }
    return
  }

  if (providerStatus === 'paid') {
    const paidMsg = await getAutoMessage('deposit_completed', { clientId: finalClientId, amount: depositAmount })
    if (paidMsg && finalChatId) {
      const result = await persistMessage({
        chatId: finalChatId,
        senderType: 'system',
        content: paidMsg,
        extra: {
          depositEvent: 'deposit_completed',
          depositAmount,
        },
      })
      await query(
        `UPDATE hgcash_movements
         SET message_id = COALESCE(message_id, ?), updated_from_gateway_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [result.message.id, movement.id]
      )
      io?.to(`chat:${finalChatId}`).emit('receipt:result', {
        chatId: Number(finalChatId),
        messageId: Number(result.message.id),
        status: 'paid',
        amount: depositAmount,
        resultReason: 'cashgateway_paid',
      })
      await sleep(250)
      await resetClientBot(finalChatId)
    }
  }
}

export async function cashGatewayWebhook(req, res, next) {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : Buffer.from('')

    console.info('[CashGateway] webhook recibido')

    const receivedToken = normalizeHeaderValue(req.headers, 'x-gateway-token')
    const expectedToken = normalizeWebhookText(process.env.CASHGATEWAY_TOKEN)
    let resolvedBankAccountIdFromToken = null

    if (expectedToken && receivedToken === expectedToken) {
      console.info('[CashGateway] token_valid_env')
    } else {
      const tokenAccount = await getHgBankAccountByGatewayToken(receivedToken)
      if (tokenAccount) {
        console.info('[CashGateway] token_valid_db')
        resolvedBankAccountIdFromToken = Number(tokenAccount.id) || null
      } else {
        console.warn('[CashGateway] token_invalid')
        return res.status(401).json({ error: 'Token de gateway invalido' })
      }
    }

    const body = parseJsonMaybe(rawBody.toString('utf8'))
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'JSON invalido' })
    }

    const gatewayEventId = normalizeHeaderValue(req.headers, 'x-gateway-event-id') || null
    const providerEventId = normalizeWebhookText(body.provider_event_id) || normalizeHeaderValue(req.headers, 'x-provider-event-id') || null
    const providerStatus = normalizeProviderStatus(body.provider_status)
    const destinationDomain = normalizeWebhookText(body.destination_domain) || normalizeHeaderValue(req.headers, 'x-destination-domain') || null
    const payload = parseJsonMaybe(body.payload) || {}
    const bankStatus = normalizeWebhookText(payload.status) || null

    console.info(`[CashGateway] provider_status recibido=${body.provider_status}`)
    console.info(`[CashGateway] bank_status recibido=${payload.status || ''}`)

    if (!providerStatus) {
      return res.status(400).json({ error: 'provider_status invalido' })
    }

    const signature = normalizeHeaderValue(req.headers, 'x-gateway-signature')
    if (signature) {
      const secret = normalizeWebhookText(process.env.CASHGATEWAY_SIGNING_SECRET)
      const timestamp = normalizeHeaderValue(req.headers, 'x-gateway-timestamp')
      const timestampMs = normalizeGatewayTimestamp(timestamp)
      if (!secret || !timestampMs || Math.abs(Date.now() - timestampMs) > CASHGATEWAY_REPLAY_WINDOW_MS) {
        console.warn('[CashGateway] replay detectado')
        return res.status(401).json({ error: 'Firma o timestamp invalido' })
      }
      const signatureOk = verifyGatewayHmac({
        rawBody,
        timestamp,
        signature,
        secret,
      })
      if (!signatureOk) {
        console.warn('[CashGateway] firma inválida')
        return res.status(401).json({ error: 'Firma invalida' })
      }
    }

    const bankAccountId = resolvedBankAccountIdFromToken || await resolveHGCashBankAccountId(payload.accountId || null)
    const client = await findClientByTaxId(payload.fromCUIT || payload.fromCuit || payload.cuit || '')
    const chat = client ? await findLatestChatByClientId(client.id) : null

    const saved = await upsertGatewayMovement({
      body,
      headers: req.headers,
      providerStatus,
      bankStatus,
      clientId: client?.id || null,
      chatId: chat?.id || null,
      bankAccountId,
    })

    console.info(
      saved.inserted
        ? `[CashGateway] movimiento insertado id=${saved.insertId || saved.movement?.id || 'n/a'}`
        : `[CashGateway] movimiento actualizado id=${saved.insertId || saved.movement?.id || 'n/a'}`
    )
    if (saved.duplicate) console.info('[CashGateway] duplicado detectado')

    if (providerStatus === 'paid' && saved.previousStatus !== 'paid') {
      void processGatewaySideEffects({
        movement: saved.movement,
        providerStatus,
        clientId: client?.id || null,
        chatId: chat?.id || null,
        amount: Number(payload.amount || 0),
      }).catch(error => {
        console.error('[CashGateway] error interno', error)
      })
    } else if (providerStatus === 'rejected' && saved.previousStatus !== 'rejected') {
      void processGatewaySideEffects({
        movement: saved.movement,
        providerStatus,
        clientId: client?.id || null,
        chatId: chat?.id || null,
        amount: Number(payload.amount || 0),
      }).catch(error => {
        console.error('[CashGateway] error interno', error)
      })
    } else if (providerStatus === 'pending' && saved.previousStatus !== 'pending') {
      void processGatewaySideEffects({
        movement: saved.movement,
        providerStatus,
        clientId: client?.id || null,
        chatId: chat?.id || null,
        amount: Number(payload.amount || 0),
      }).catch(error => {
        console.error('[CashGateway] error interno', error)
      })
    }

    return res.status(200).json({
      received: true,
      gateway_event_id: gatewayEventId,
      processed: true,
      ...(saved.duplicate ? { duplicate: true } : {}),
    })
  } catch (error) {
    console.error('[CashGateway] error interno', error)
    next(error)
  }
}
