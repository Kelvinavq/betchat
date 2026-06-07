import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import axios from 'axios'
import moment from 'moment-timezone'
import FormData from 'form-data'
import { query, transaction } from '../config/database.js'
import { getClientFromRequest, persistMessage, resetClientBot } from './chatController.js'
import { getAutoMessage } from './autoMessagesController.js'
import { getIo } from '../socket/socketServer.js'
import { insertReceiptLog, finalizeReceiptLog } from './receiptLogController.js'
import { processReferralRewardForMovement } from './referralController.js'
import { syncClientEventReceiptPaid } from '../utils/eventParticipantStatus.js'

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

function nowSql() {
  return moment().tz(TZ).format('YYYY-MM-DD HH:mm:ss')
}

function localDateStr() {
  return moment().tz(TZ).format('YYYY-MM-DD')
}

function localTimeStr() {
  return moment().tz(TZ).format('HH:mm:ss')
}

function normalizeMoney(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function normalizeTaxId(value) {
  return String(value || '').replace(/\D/g, '')
}

function normalizeCoelsaId(value) {
  return String(value || '').trim().toUpperCase().replace(/[\s-]/g, '')
}

async function getActiveAmountConfig(operation = 'deposit') {
  const { rows, error } = await query(
    `SELECT currency, min_amount
     FROM amounts
     WHERE operation = ? AND is_active = 1
     ORDER BY updated_at DESC, id DESC
     LIMIT 1`,
    [operation],
  )
  if (error) throw error
  const row = rows?.[0] || {}
  return {
    currency: String(row.currency || 'ARS').trim().toUpperCase(),
    minAmount: Number(row.min_amount || 0),
  }
}

async function getCasinoConfig() {
  const { rows, error } = await query(
    'SELECT api_url, api_key FROM config_casino WHERE id = 1 LIMIT 1',
  )
  if (error) throw error
  const row = rows?.[0] || {}
  if (!row.api_url || !row.api_key) {
    throw new Error('Configuracion de panel no encontrada en config_casino')
  }
  return {
    apiUrl: String(row.api_url).trim(),
    apiKey: String(row.api_key).trim(),
  }
}

async function getClientExternalId(clientId) {
  const { rows, error } = await query(
    'SELECT external_id FROM clients WHERE id = ? LIMIT 1',
    [Number(clientId)],
  )
  if (error) throw error
  const externalId = rows?.[0]?.external_id
  if (!externalId) throw new Error(`El cliente ${clientId} no tiene external_id configurado`)
  return String(externalId).trim()
}

function isMockPanelBalance() {
  return String(process.env.MOCK_PANEL_BALANCE || 'false').toLowerCase() === 'true'
}

function isPanelSuccessResponse(panelData) {
  const rawSuccessMessage = panelData?.successMessage || panelData?.message || ''
  const successMsg = String(rawSuccessMessage).toLowerCase().trim()
  return (
    panelData?.success === true ||
    successMsg.includes('balance es cambiado con exito') ||
    successMsg.includes('balance es cambiado con éxito') ||
    successMsg.includes('balance successfully changed') ||
    successMsg.includes('saldo acreditado') ||
    successMsg.includes('credited successfully')
  )
}

async function creditPanelBalance({ clientId, amountArs }) {
  const amount = normalizeMoney(amountArs)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'invalid_amount', message: 'Monto invalido para el panel' }
  }

  const mocked = isMockPanelBalance()
  if (mocked) {
    return { ok: true, mocked: true, data: { successMessage: 'Balance es cambiado con exito (MOCK)' } }
  }

  const { apiUrl, apiKey } = await getCasinoConfig()
  const { currency } = await getActiveAmountConfig('deposit')
  const externalId = await getClientExternalId(clientId)
  const formData = new FormData()
  formData.append('operation', 'in')
  formData.append('send', 'true')
  formData.append('amount', String(amount))
  formData.append('balance_currency', currency || 'ARS')
  formData.append('api_token', apiKey)

  const panelUrl = `${apiUrl}index.php?act=admin&area=balance&response=js&type=frame&id=${encodeURIComponent(externalId)}`
  const resp = await axios.post(panelUrl, formData, {
    headers: formData.getHeaders(),
    timeout: 25_000,
    validateStatus: () => true,
  })
  const data = resp?.data || {}
  const ok = isPanelSuccessResponse(data)
  console.log('[HGCash][PANEL] credit attempt', {
    clientId,
    externalId,
    amountArs: amount,
    mocked: false,
    status: resp.status,
    ok,
    url: panelUrl,
    successMessage: data?.successMessage || null,
    message: data?.message || null,
    success: data?.success ?? null,
    dataPreview: JSON.stringify(data).slice(0, 500),
  })
  return { ok, mocked: false, status: resp.status, url: panelUrl, data }
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
  if (out.date && !moment(out.date, 'YYYY-MM-DD', true).isValid()) out.date = null
  if (out.time && !moment(out.time, ['HH:mm:ss', 'HH:mm'], true).isValid()) out.time = null
  if (out.time && moment(out.time, ['HH:mm:ss', 'HH:mm'], true).isValid()) {
    out.time = moment(out.time, ['HH:mm:ss', 'HH:mm'], true).format('HH:mm:ss')
  }
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
  if (msg) {
    const extra = (event === 'deposit_completed' || event === 'deposit_completed_report')
      ? { depositEvent: event, depositAmount: context.amount ?? null }
      : {}
    return await persistMessage({ chatId, senderType: 'system', content: msg, extra })
  }
  return null
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
    'SELECT id, status FROM hgcash_movements WHERE coelsa_id = ? LIMIT 1',
    [coelsaId]
  )
  if (selErr) { console.error('[HGCash] Error SELECT coelsa_id:', selErr); return false }

  if (existing?.length > 0) {
    const currentStatus = String(existing[0].status || '').toLowerCase()
    const nextStatus = currentStatus === 'paid' ? 'paid' : status
    await query(
      `UPDATE hgcash_movements SET
         bank_account_id = ?, amount = ?, cbu_cvu = ?, cuit = ?,
         receipt_date = ?, receipt_time = ?, bank_status = ?, status = ?,
         sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
       WHERE coelsa_id = ?`,
      [accountId, amount, fromCBU, fromCUIT, date, time, bankStatus, nextStatus, coelsaId]
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

async function getActiveHgBankAccount() {
  const { rows, error } = await query(
    `SELECT ba.*, bp.slug AS provider_slug
     FROM chat_processing_config cpc
     INNER JOIN bank_accounts ba ON ba.id = cpc.bank_account_id
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE cpc.id = 1 AND bp.slug = 'hgcash' AND ba.is_active = 1
     LIMIT 1`,
  )
  if (error) throw error
  if (rows?.[0]) return rows[0]

  const fallback = await query(
    `SELECT ba.*, bp.slug AS provider_slug
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE bp.slug = 'hgcash' AND ba.is_active = 1
     ORDER BY ba.updated_at DESC, ba.id DESC
     LIMIT 1`,
  )
  if (fallback.error) throw fallback.error
  return fallback.rows?.[0] || null
}

function isWebhookHgAccount(account) {
  const data = parseData(account?.account_data)
  const enabled = data.webhook_enabled === true || data.webhook_enabled === 1 || data.webhook_enabled === '1' || data.webhook_enabled === 'true'
  return enabled && ['flowhg', 'hmac'].includes(String(data.webhook_mode || '').toLowerCase())
}

function getAccountCuit(account) {
  const data = parseData(account?.account_data)
  return normalizeTaxId(data.cuit)
}

async function updateClientCuilIfEmpty({ clientId, cuit, activeAccount }) {
  const clean = normalizeTaxId(cuit)
  const accountCuit = getAccountCuit(activeAccount)
  if (!clientId || !clean || clean === accountCuit) return false

  const { rows, error } = await query(
    `UPDATE clients
     SET cuil = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND (cuil IS NULL OR cuil = '')`,
    [clean, clientId],
  )
  if (error) throw error
  return Boolean(rows?.affectedRows)
}

async function findLocalHgMovement({ accountId, extractedData, amount }) {
  const txId = String(extractedData.transaction_id || '').trim().toUpperCase()
  const cuit = normalizeTaxId(extractedData.cuit)
  const values = [accountId]
  const parts = []

  if (txId) {
    parts.push('m.coelsa_id = ?', 'm.hg_id = ?', 'm.provider_event_id = ?', 'm.gateway_event_id = ?')
    values.push(txId, txId, txId, txId)
  }

  if (Number.isFinite(amount) && amount > 0) {
    const amountParts = ['m.amount = ?']
    const amountValues = [amount]
    if (extractedData.date) {
      amountParts.push('m.receipt_date = ?')
      amountValues.push(extractedData.date)
    }
    if (cuit) {
      amountParts.push('REPLACE(REPLACE(REPLACE(COALESCE(m.cuit, \'\'), \'.\', \'\'), \'-\', \'\'), \' \', \'\') = ?')
      amountValues.push(cuit)
    }
    if (amountParts.length > 1) {
      parts.push(`(${amountParts.join(' AND ')})`)
      values.push(...amountValues)
    }
  }

  if (!parts.length) return null

  const { rows, error } = await query(
    `SELECT m.*
     FROM hgcash_movements m
     WHERE m.bank_account_id = ?
       AND (${parts.join(' OR ')})
     ORDER BY
       CASE WHEN m.game_platform_load_id IS NOT NULL AND m.game_platform_load_id <> '' THEN 0 ELSE 1 END,
       m.created_at DESC,
       m.id DESC
     LIMIT 1`,
    values,
  )
  if (error) throw error
  return rows?.[0] || null
}

async function findLoadedHgMovementByCoelsa(coelsaId) {
  const clean = normalizeCoelsaId(coelsaId)
  if (!clean) return null
  const { rows, error } = await query(
    `SELECT id, coelsa_id, status, game_platform_load_id
     FROM hgcash_movements
     WHERE UPPER(REPLACE(REPLACE(COALESCE(coelsa_id, ''), ' ', ''), '-', '')) = ?
       AND status = 'paid'
       AND game_platform_load_id IS NOT NULL
       AND game_platform_load_id <> ''
     ORDER BY id DESC
     LIMIT 1`,
    [clean],
  )
  if (error) throw error
  return rows?.[0] || null
}

async function findLatestPendingHgMovementByCuit(cuit, accountId = null) {
  const clean = normalizeTaxId(cuit)
  if (!clean) return null
  const values = [clean]
  let accountSql = ''
  if (accountId) {
    accountSql = 'AND bank_account_id = ?'
    values.push(Number(accountId))
  }
  const { rows, error } = await query(
    `SELECT *
     FROM hgcash_movements
     WHERE REPLACE(REPLACE(REPLACE(COALESCE(cuit, ''), '.', ''), '-', ''), ' ', '') = ?
       AND status = 'pending'
       ${accountSql}
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    values,
  )
  if (error) throw error
  return rows?.[0] || null
}

async function markHgMovementPaidFromReport({ movement, clientId, chatId, messageId = null }) {
  const panelAmount = Number(movement?.amount || 0)
  const panelResult = await creditPanelBalance({ clientId, amountArs: panelAmount })
  const resultReason = panelResult?.ok
    ? 'panel_balance_credit_success'
    : `panel_balance_credit_failed_${panelResult?.error || panelResult?.status || 'unknown'}`

  if (!panelResult?.ok) {
    await query(
      `UPDATE hgcash_movements
       SET client_id = COALESCE(?, client_id),
           chat_id = COALESCE(?, chat_id),
           message_id = COALESCE(?, message_id),
           sync_status = 'error',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [clientId, chatId, messageId, movement.id],
    )
    return { ok: false, panel: panelResult, resultReason }
  }

  const loadId = String(movement.coelsa_id || movement.id)
  await query(
    `UPDATE hgcash_movements
     SET client_id = ?, chat_id = ?, message_id = COALESCE(?, message_id),
         status = 'paid',
         game_platform_load_id = COALESCE(NULLIF(game_platform_load_id, ''), ?),
         game_load_date = ?, game_load_time = ?, game_load_amount = ?,
         sync_status = 'synced',
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      clientId,
      chatId,
      messageId,
      loadId,
      movement.receipt_date || localDateStr(),
      movement.receipt_time || localTimeStr(),
      panelAmount,
      movement.id,
    ],
  )

  await processReferralRewardForMovement({
    sourceTable: 'hgcash_movements',
    sourceMovementId: movement.id,
    clientId,
    chatId,
    amount: panelAmount,
  }).catch(() => {})

  return { ok: true, panel: panelResult, resultReason, amount: panelAmount }
}

function movementToPayload(item) {
  return {
    amount: item.amount,
    cuit: item.fromCUIT || item.from_cuit || item.cuit || item.payerCuit || null,
    cbu_cvu: item.fromCBU || item.from_cbu || item.cbu_cvu || item.cbu || item.cvu || null,
    coelsa_id: item.coelsaCode || item.coelsa_id || item.coelsaId || item.externalID || item.id || null,
    status: item.transactionStatus?.name || item.status || null,
    bank_status: item.transactionStatus?.name || item.status || null,
    date: item.date || item.createdAt || item.created_at || item.externalDate || null,
    direction: item.direction || item.type || null,
  }
}

function isSameHgMovement(item, extractedData, amount) {
  const payload = movementToPayload(item)
  const itemTx = normalizeCoelsaId(payload.coelsa_id)
  const extractedTx = normalizeCoelsaId(extractedData.transaction_id)
  if (itemTx && extractedTx && itemTx === extractedTx) return true

  const itemAmount = Number(payload.amount || 0)
  if (!Number.isFinite(itemAmount) || !Number.isFinite(amount) || itemAmount !== amount) return false
  const itemCuit = normalizeTaxId(payload.cuit)
  const extractedCuit = normalizeTaxId(extractedData.cuit)
  if (itemCuit && extractedCuit && itemCuit !== extractedCuit) return false

  const parsed = parseDateFields(payload.date)
  if (extractedData.date && parsed.date && extractedData.date !== parsed.date) return false
  return Boolean(itemTx || itemCuit || parsed.date)
}

async function findTraditionalHgMovement({ account, extractedData, amount }) {
  const data = parseData(account.account_data)
  const cookie = await ensureHgCookie(account.id, data)
  for (let page = 1; page <= 5; page++) {
    const items = await fetchTrpcTransactions(cookie, page, 50)
    if (!items?.length) break
    const match = items.find(item => isSameHgMovement(item, extractedData, amount))
    if (match) {
      await upsertHgMovement({
        accountId: account.id,
        payload: movementToPayload(match),
        syncStatus: 'synced',
      })
      return await findLocalHgMovement({ accountId: account.id, extractedData, amount })
    }
    if (items.length < 50) break
  }
  return null
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

  const { rows: existing } = await query('SELECT id, status FROM hgcash_movements WHERE coelsa_id = ? LIMIT 1', [coelsaId])
  if (existing?.length) {
    const currentStatus = String(existing[0].status || '').toLowerCase()
    const nextStatus = currentStatus === 'paid' ? 'paid' : status
    await query(
      `UPDATE hgcash_movements SET
         client_id = COALESCE(?, client_id),
         chat_id = COALESCE(?, chat_id),
         message_id = COALESCE(?, message_id),
         bank_account_id = ?,
         amount = ?, cuit = ?, cbu_cvu = ?, receipt_date = ?, receipt_time = ?,
         bank_status = ?, status = ?, sync_status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE coelsa_id = ?`,
      [clientId, chatId, messageId, accountId, amount, cuit, cbu, date, time, bankStatus, nextStatus, syncStatus, coelsaId],
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
  const chatId = Number(req.body?.chatId)
  const clientId = Number(req.body?.clientId)
  const messageId = Number(req.body?.messageId) || null
  const eventMinDepositAmount = Number(req.body?.eventMinDepositAmount || 0) || null

  let logId = null
  const logSteps = []
  const logAccum = { aiModel: null, aiRawResponse: null, aiExtractedJson: null, movementId: null }
  const ts = () => new Date().toISOString()

  const flushLog = async (resultStatus, resultReason, resultDetail) => {
    if (!logId) return
    try {
      await finalizeReceiptLog(logId, {
        ...logAccum,
        processingSteps: logSteps,
        resultStatus,
        resultReason,
        resultDetail,
      })
    } catch (e) {
      console.error('[HGCash][Log] Error guardando log:', e.message)
    }
  }

  try {
    if (!req.file) return res.status(400).json({ ok: false, message: 'No se proporciono archivo' })
    if (!chatId || !clientId) return res.status(400).json({ ok: false, message: 'chatId y clientId son requeridos' })

    try {
      logId = await insertReceiptLog({ provider: 'hgcash', messageId, chatId, clientId })
    } catch (e) {
      console.error('[HGCash][Log] Error creando log:', e.message)
    }

    const createdAt = nowSql()
    const filename = req.file.filename

    logSteps.push({ step: 'ai_extraction_start', ts: ts(), detail: {} })
    const extractedRaw = await extractWithOpenRouter({ filePath: req.file.path, mimeType })
    const extractedData = normalizeExtractedData(extractedRaw)
    const aiModel = extractedRaw?.model || null
    logAccum.aiModel = aiModel
    logAccum.aiRawResponse = extractedRaw?.rawResponse || null
    logAccum.aiExtractedJson = extractedData
    logSteps.push({
      step: 'ai_extraction_complete',
      ts: ts(),
      detail: { model: aiModel, extracted: extractedData },
    })

    const { currency: activeCurrency, minAmount } = await getActiveAmountConfig('deposit')
    const amount = extractedData.amount ? Number(extractedData.amount) : null
    const amountTooLow = Number.isFinite(amount) && amount > 0 && amount < minAmount
    const amountBelowEventMin = eventMinDepositAmount > 0 && Number.isFinite(amount) && amount > 0 && amount < eventMinDepositAmount
    const activeAccount = await getActiveHgBankAccount()

    let outcome = 'invalid'
    let resultReason = 'hgcash_match_pending'
    let panelResult = null
    let matchedMovement = null
    let isDuplicate = false

    if (!extractedData.transaction_id || !amount) {
      outcome = 'insufficient_info'
      resultReason = !extractedData.transaction_id ? 'missing_transaction_id' : 'missing_amount'
      logSteps.push({ step: 'validation_failed', ts: ts(), detail: { reason: resultReason, amount, transactionId: extractedData.transaction_id } })
    } else if (amountTooLow) {
      outcome = 'amount_low'
      resultReason = `amount_below_minimum_${minAmount}_${activeCurrency}`
      logSteps.push({ step: 'amount_too_low', ts: ts(), detail: { amount, minAmount, currency: activeCurrency } })
    } else if (amountBelowEventMin) {
      outcome = 'amount_low'
      resultReason = `amount_below_event_min_${eventMinDepositAmount}`
      logSteps.push({ step: 'amount_below_event_min', ts: ts(), detail: { amount, eventMinDepositAmount } })
    } else if (!activeAccount) {
      outcome = 'invalid'
      resultReason = 'active_hgcash_account_not_found'
      logSteps.push({ step: 'no_active_account', ts: ts(), detail: {} })
    } else {
      logSteps.push({ step: 'validation_ok', ts: ts(), detail: { amount, transactionId: extractedData.transaction_id, cuit: extractedData.cuit } })

      const duplicateByCoelsa = await findLoadedHgMovementByCoelsa(extractedData.transaction_id)
      if (duplicateByCoelsa) {
        isDuplicate = true
        outcome = 'duplicate'
        resultReason = 'duplicate_coelsa_id'
        matchedMovement = duplicateByCoelsa
        logSteps.push({ step: 'duplicate_found', ts: ts(), detail: { duplicateId: duplicateByCoelsa.id, coelsaId: extractedData.transaction_id } })
      }
    }

    if (!isDuplicate && outcome === 'invalid' && resultReason === 'hgcash_match_pending') {
      const mode = isWebhookHgAccount(activeAccount) ? 'local' : 'bank'
      logSteps.push({ step: 'movement_lookup_start', ts: ts(), detail: { mode, coelsaId: extractedData.transaction_id, amount } })

      matchedMovement = isWebhookHgAccount(activeAccount)
        ? await findLocalHgMovement({ accountId: activeAccount.id, extractedData, amount })
        : await findTraditionalHgMovement({ account: activeAccount, extractedData, amount })

      if (!matchedMovement) {
        outcome = 'invalid'
        resultReason = isWebhookHgAccount(activeAccount) ? 'local_hgcash_payment_not_found' : 'hgcash_payment_not_found'
        logSteps.push({ step: 'movement_lookup_not_found', ts: ts(), detail: { mode, reason: resultReason } })
      } else if (
        normalizeCoelsaId(matchedMovement.coelsa_id) === normalizeCoelsaId(extractedData.transaction_id)
        && String(matchedMovement.status || '').toLowerCase() === 'paid'
        && matchedMovement.game_platform_load_id
      ) {
        isDuplicate = true
        outcome = 'duplicate'
        resultReason = 'duplicate_coelsa_id'
        logSteps.push({ step: 'duplicate_found', ts: ts(), detail: { movementId: matchedMovement.id, alreadyLoaded: true } })
      } else {
        logSteps.push({ step: 'movement_lookup_found', ts: ts(), detail: { movementId: matchedMovement.id, coelsaId: matchedMovement.coelsa_id, mode } })
        logSteps.push({ step: 'panel_credit_start', ts: ts(), detail: { amountArs: matchedMovement.amount || amount } })

        const reportResult = await markHgMovementPaidFromReport({ movement: matchedMovement, clientId, chatId, messageId })
        panelResult = reportResult.panel
        outcome = reportResult.ok ? 'paid' : 'invalid'
        resultReason = reportResult.resultReason

        logSteps.push({
          step: reportResult.ok ? 'panel_credit_ok' : 'panel_credit_failed',
          ts: ts(),
          detail: {
            ok: reportResult.ok,
            mocked: panelResult?.mocked || false,
            httpStatus: panelResult?.status || null,
            message: panelResult?.data?.successMessage || panelResult?.data?.message || null,
          },
        })

        if (reportResult.ok) {
          await query(
            `UPDATE hgcash_movements
             SET cuit = COALESCE(NULLIF(cuit, ''), ?),
                 cbu_cvu = COALESCE(NULLIF(cbu_cvu, ''), ?),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [extractedData.cuit || null, extractedData.cbu_cvu || null, matchedMovement.id],
          )
          await updateClientCuilIfEmpty({
            clientId,
            cuit: matchedMovement.cuit || extractedData.cuit,
            activeAccount,
          })
          logAccum.movementId = matchedMovement.id
          logSteps.push({ step: 'movement_updated', ts: ts(), detail: { movementId: matchedMovement.id } })
        } else {
          console.warn('[HGCash][PANEL] credit failed', {
            clientId, chatId, movementId: matchedMovement.id,
            amount: matchedMovement.amount || amount, resultReason,
            panelStatus: panelResult?.status,
            panelDataPreview: JSON.stringify(panelResult?.data || {}).slice(0, 500),
          })
          await query(
            `UPDATE hgcash_movements
             SET client_id = COALESCE(?, client_id), chat_id = COALESCE(?, chat_id),
                 message_id = COALESCE(?, message_id), sync_status = 'error',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [clientId, chatId, messageId, matchedMovement.id],
          )
        }
      }
    }

    const event = {
      paid: 'deposit_completed',
      amount_low: 'receipt_amount_low',
      duplicate: 'receipt_duplicate',
      insufficient_info: 'receipt_insufficient_info',
      invalid: 'receipt_invalid',
    }[outcome] || 'deposit_failed'

    const autoMessageResult = await sendHgAutoMessage(chatId, event, {
      clientId,
      bankAccountId: activeAccount?.id || null,
      amount,
    })
    const autoMessageId = autoMessageResult?.message?.id || null

    await flushLog(outcome, resultReason, {
      isDuplicate,
      panel: panelResult ? { ok: panelResult.ok, mocked: panelResult.mocked, httpStatus: panelResult.status } : null,
      syncStatus: outcome === 'paid' ? 'synced' : 'not_synced',
      source: activeAccount ? (isWebhookHgAccount(activeAccount) ? 'local' : 'bank') : 'none',
    })

    if (outcome === 'paid') {
      const syncResult = await syncClientEventReceiptPaid({
        clientId,
        messageId,
        movementId: matchedMovement?.id || null,
        receiptLogId: logId || null,
        chatId,
        creditPanelBalance,
        paymentAmount: amount,
      }).catch((syncErr) => {
        console.error('[HGCash] Error sincronizando evento pagado:', syncErr?.message || syncErr)
        return null
      })

      const rewardResult = syncResult?.rewardResult || syncResult?.reward_result || null
      if (rewardResult?.status === 'paid' && !rewardResult?.alreadyPaid) {
        getIo()?.to(`client:${clientId}`).emit('event:reward_paid', {
          rewardId: rewardResult.rewardId,
          eventId: Number(syncResult?.event_id || rewardResult.eventId || 0),
          clientId: Number(clientId),
          status: 'paid',
        })
      }
    }

    return res.status(200).json({
      ok: true,
      status: outcome,
      extractedData,
      panel: panelResult,
      isDuplicate,
      duplicateId: isDuplicate ? matchedMovement?.id || null : null,
      movementId: matchedMovement?.id || null,
      autoMessageId,
      resultReason,
      aiModel,
      createdAt,
      image_name: filename,
      syncStatus: outcome === 'paid' ? 'synced' : 'not_synced',
      currency: activeCurrency,
      minAmount,
      source: activeAccount ? (isWebhookHgAccount(activeAccount) ? 'local' : 'bank') : 'none',
    })
  } catch (error) {
    console.error('[HGCash] process receipt error:', error)
    logSteps.push({ step: 'error', ts: ts(), detail: { message: error?.message } })
    await flushLog('error', error?.message || 'internal_error', { error: error?.message })
    await sendHgAutoMessage(Number(req.body?.chatId || 0), 'deposit_failed', {
      clientId: Number(req.body?.clientId || 0),
    })
    return res.status(500).json({
      ok: false,
      message: error?.message || 'Error procesando comprobante',
    })
  }
}

export async function processImage(req, res) {
  return processHgReceiptBase(req, res, req.file?.mimetype || 'image/jpeg')
}

export async function processPdf(req, res) {
  return processHgReceiptBase(req, res, 'application/pdf')
}

export async function processHgCashClientReceipt({ chatId, clientId, messageId, dataUrl, eventMinDepositAmount = null }) {
  const parsed = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!parsed) throw new Error('No se pudo leer el archivo enviado por el cliente')
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hg-receipt-'))
  const ext = parsed[1].includes('pdf') ? '.pdf' : '.jpg'
  const tempFile = path.join(tmpDir, `${Date.now()}${ext}`)
  fs.writeFileSync(tempFile, Buffer.from(parsed[2], 'base64'))
  const fakeReq = {
    file: { path: tempFile, filename: `hg-${Date.now()}${ext}`, mimetype: parsed[1] },
    body: { chatId, clientId, messageId, eventMinDepositAmount },
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

export async function reportHgCashPaymentByClientCuil(req, res, next) {
  try {
    const chatId = Number(req.params.chatId || req.body?.chatId)
    if (!chatId) return res.status(400).json({ error: 'chatId requerido', code: 'CHAT_ID_REQUIRED' })

    const clientSession = await getClientFromRequest(req)
    if (!clientSession?.sub) {
      return res.status(401).json({ error: 'Sesion de cliente requerida', code: 'CLIENT_AUTH_REQUIRED' })
    }

    const { rows: chatRows, error: chatError } = await query(
      `SELECT ch.id, ch.client_id, c.cuil, c.username, c.full_name
       FROM chats ch
       INNER JOIN clients c ON c.id = ch.client_id
       WHERE ch.id = ? AND ch.client_id = ?
       LIMIT 1`,
      [chatId, clientSession.sub],
    )
    if (chatError) throw chatError
    const chat = chatRows?.[0]
    if (!chat) return res.status(404).json({ error: 'Chat no encontrado', code: 'CHAT_NOT_FOUND' })

    const cuit = normalizeTaxId(chat.cuil)
    const logSteps = []
    const logAccum = { movementId: null }
    const finalizeReportLog = async (logId, {
      messageId = null,
      resultStatus = null,
      resultReason = null,
      resultDetail = null,
    } = {}) => {
      if (!logId) return
      await finalizeReceiptLog(logId, {
        messageId,
        movementId: logAccum.movementId,
        processingSteps: logSteps,
        resultStatus,
        resultReason,
        resultDetail,
      })
    }

    let logId = null
    try {
      logId = await insertReceiptLog({ provider: 'hgcash', messageId: null, chatId, clientId: Number(clientSession.sub) })
    } catch (error) {
      console.error('[HGCash][ReportLog] Error creando log:', error.message)
    }

    logSteps.push({
      step: 'report_payment_start',
      ts: new Date().toISOString(),
      detail: { chatId, clientId: Number(clientSession.sub), cuit },
    })
    if (!cuit) {
      logSteps.push({
        step: 'report_payment_missing_cuil',
        ts: new Date().toISOString(),
        detail: { chatId, clientId: Number(clientSession.sub) },
      })
      await persistMessage({
        chatId,
        senderType: 'system',
        content: 'Para reportar el pago automaticamente necesitamos tener tu CUIL registrado. Subi el comprobante para validarlo.',
      })
      await finalizeReportLog(logId, {
        resultStatus: 'missing_cuil',
        resultReason: 'report_payment_missing_cuil',
        resultDetail: { cuit: null, chatId, clientId: Number(clientSession.sub) },
      })
      return res.json({ ok: true, status: 'missing_cuil', found: false })
    }

    const activeAccount = await getActiveHgBankAccount()
    logSteps.push({
      step: 'movement_lookup_start',
      ts: new Date().toISOString(),
      detail: { cuit, accountId: activeAccount?.id || null },
    })
    const movement = await findLatestPendingHgMovementByCuit(cuit, activeAccount?.id || null)
      || await findLatestPendingHgMovementByCuit(cuit, null)

    if (!movement) {
      logSteps.push({
        step: 'movement_lookup_not_found',
        ts: new Date().toISOString(),
        detail: { cuit, accountId: activeAccount?.id || null },
      })
      await sendHgAutoMessage(chatId, 'hgcash_payment_not_found', {
        clientId: Number(clientSession.sub),
        bankAccountId: activeAccount?.id || null,
      })
      await finalizeReportLog(logId, {
        resultStatus: 'not_found',
        resultReason: 'report_payment_not_found',
        resultDetail: { cuit, chatId, clientId: Number(clientSession.sub), bankAccountId: activeAccount?.id || null },
      })
      return res.json({ ok: true, status: 'not_found', found: false })
    }

    logSteps.push({
      step: 'movement_lookup_found',
      ts: new Date().toISOString(),
      detail: { cuit, movementId: movement.id, coelsaId: movement.coelsa_id, amount: movement.amount },
    })
    const result = await markHgMovementPaidFromReport({
      movement,
      clientId: Number(clientSession.sub),
      chatId,
      messageId: null,
    })

    if (!result.ok) {
      logSteps.push({
        step: 'panel_credit_failed',
        ts: new Date().toISOString(),
        detail: { movementId: movement.id, resultReason: result.resultReason, panel: result.panel || null },
      })
      await sendHgAutoMessage(chatId, 'deposit_failed', {
        clientId: Number(clientSession.sub),
        bankAccountId: movement.bank_account_id || activeAccount?.id || null,
        amount: Number(movement.amount || 0),
      })
      await finalizeReportLog(logId, {
        movementId: movement.id,
        resultStatus: 'invalid',
        resultReason: 'report_payment_panel_credit_failed',
        resultDetail: {
          cuit,
          movementId: movement.id,
          coelsaId: movement.coelsa_id || null,
          amount: Number(movement.amount || 0),
          bankAccountId: movement.bank_account_id || activeAccount?.id || null,
          panel: result.panel || null,
          panelReason: result.resultReason || null,
        },
      })
      return res.status(200).json({
        ok: true,
        status: 'invalid',
        found: true,
        movementId: movement.id,
        panel: result.panel,
        resultReason: result.resultReason,
      })
    }

    const autoMessageResult = await sendHgAutoMessage(chatId, 'deposit_completed_report', {
      clientId: Number(clientSession.sub),
      bankAccountId: movement.bank_account_id || activeAccount?.id || null,
      amount: result.amount,
    })
    const autoMessageId = autoMessageResult?.message?.id || null
    await query(
      `UPDATE hgcash_movements
       SET cuit = COALESCE(NULLIF(cuit, ''), ?),
           cbu_cvu = COALESCE(NULLIF(cbu_cvu, ''), ?),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [movement.cuit || null, movement.cbu_cvu || null, movement.id],
    )
    await updateClientCuilIfEmpty({ clientId: Number(clientSession.sub), cuit: movement.cuit || cuit, activeAccount })

    logAccum.movementId = movement.id
    logSteps.push({
      step: 'panel_credit_ok',
      ts: new Date().toISOString(),
      detail: {
        movementId: movement.id,
        coelsaId: movement.coelsa_id || null,
        amount: result.amount,
        bankAccountId: movement.bank_account_id || activeAccount?.id || null,
      },
    })
    await finalizeReportLog(logId, {
      messageId: autoMessageId,
      movementId: movement.id,
      resultStatus: 'paid',
      resultReason: 'report_payment_paid',
      resultDetail: {
        cuit,
        movementId: movement.id,
        coelsaId: movement.coelsa_id || null,
        amount: result.amount,
        bankAccountId: movement.bank_account_id || activeAccount?.id || null,
        panel: result.panel || null,
      },
    })

    const syncResult = await syncClientEventReceiptPaid({
      clientId: Number(clientSession.sub),
      messageId: autoMessageId || null,
      movementId: movement.id,
      receiptLogId: logId || null,
      chatId,
      creditPanelBalance,
      paymentAmount: result.amount,
    }).catch((syncErr) => {
      console.error('[HGCash] Error sincronizando evento pagado desde reporte:', syncErr?.message || syncErr)
      return null
    })

    const rewardResult = syncResult?.rewardResult || syncResult?.reward_result || null
    if (rewardResult?.status === 'paid' && !rewardResult?.alreadyPaid) {
      getIo()?.to(`client:${Number(clientSession.sub)}`).emit('event:reward_paid', {
        rewardId: rewardResult.rewardId,
        eventId: Number(syncResult?.event_id || rewardResult.eventId || 0),
        clientId: Number(clientSession.sub),
        status: 'paid',
      })
    }

    getIo()?.to(`chat:${chatId}`).emit('receipt:result', {
      chatId: Number(chatId),
      messageId: autoMessageId ? Number(autoMessageId) : null,
      status: 'paid',
      amount: result.amount,
      date: movement.receipt_date || null,
      time: movement.receipt_time || null,
      transactionId: movement.coelsa_id || null,
      resultReason: result.resultReason,
    })

    scheduleClientBotReset(chatId)

    return res.json({
      ok: true,
      status: 'paid',
      found: true,
      movementId: movement.id,
      autoMessageId,
      amount: result.amount,
      coelsaId: movement.coelsa_id || null,
      resultReason: result.resultReason,
    })
  } catch (err) {
    next(err)
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

function scheduleClientBotReset(chatId, delayMs = 1500) {
  if (!chatId) return
  setTimeout(() => {
    resetClientBot(chatId).catch(error => {
      console.error('[HGCash] Error reseteando bot del cliente:', error?.message || error)
    })
  }, delayMs)
}

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

function getGatewaySigningSecretFromAccount(account) {
  const data = parseData(account?.account_data)
  return normalizeWebhookText(
    data.gateway_signing_secret ||
    data.flowhg_signing_secret ||
    data.signing_secret ||
    ''
  )
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
      const nextStatus = normalizeWebhookText(existing.status).toLowerCase() === 'paid'
        ? 'paid'
        : movement.status
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
          nextStatus,
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
      const syncResult = await syncClientEventReceiptPaid({
        clientId: finalClientId,
        messageId: result.message.id,
        movementId: movement.id,
        chatId: finalChatId,
        creditPanelBalance,
        paymentAmount: depositAmount,
      }).catch((syncErr) => {
        console.error('[CashGateway] Error sincronizando evento pagado:', syncErr?.message || syncErr)
        return null
      })

      const rewardResult = syncResult?.rewardResult || syncResult?.reward_result || null
      if (rewardResult?.status === 'paid' && !rewardResult?.alreadyPaid) {
        getIo()?.to(`client:${finalClientId}`).emit('event:reward_paid', {
          rewardId: rewardResult.rewardId,
          eventId: Number(syncResult?.event_id || rewardResult.eventId || 0),
          clientId: Number(finalClientId),
          status: 'paid',
        })
      }
      io?.to(`chat:${finalChatId}`).emit('receipt:result', {
        chatId: Number(finalChatId),
        messageId: Number(result.message.id),
        status: 'paid',
        amount: depositAmount,
        resultReason: 'cashgateway_paid',
      })
      scheduleClientBotReset(finalChatId)
    }
    await processReferralRewardForMovement({
      sourceTable: 'hgcash_movements',
      sourceMovementId: movement.id,
      clientId: finalClientId,
      chatId: finalChatId,
      amount: depositAmount,
    }).catch(() => {})
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
    let resolvedBankAccountIdFromToken = null
    let tokenAccount = null

    tokenAccount = await getHgBankAccountByGatewayToken(receivedToken)
    if (tokenAccount) {
      console.info('[CashGateway] token_valid_db')
      resolvedBankAccountIdFromToken = Number(tokenAccount.id) || null
    } else {
      console.warn('[CashGateway] token_invalid')
      return res.status(401).json({ error: 'Token de gateway invalido' })
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
      const secret = getGatewaySigningSecretFromAccount(tokenAccount)
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
