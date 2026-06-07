import axios from 'axios'
import fs from 'fs'
import os from 'os'
import path from 'path'
import moment from 'moment-timezone'
import FormData from 'form-data'
import { query } from '../config/database.js'
import { persistMessage } from './chatController.js'
import { getAutoMessage } from './autoMessagesController.js'
import { insertReceiptLog, finalizeReceiptLog } from './receiptLogController.js'
import { processReferralRewardForMovement } from './referralController.js'
import { syncClientEventReceiptPaid } from '../utils/eventParticipantStatus.js'
import { getIo } from '../socket/socketServer.js'

const MP_API_BASE = 'https://api.mercadopago.com'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'
const ALLOWED_MODELS = new Set([
  'google/gemini-3.1-flash-lite',
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
  'openai/gpt-4o',
])
const TZ = 'America/Argentina/Buenos_Aires'

function parseData(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeModel(model) {
  const value = normalizeText(model)
  return ALLOWED_MODELS.has(value) ? value : DEFAULT_OPENROUTER_MODEL
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
  try {
    return JSON.parse(original)
  } catch {}

  const noFences = stripCodeFences(original)
  try {
    return JSON.parse(noFences)
  } catch {}

  const start = noFences.indexOf('{')
  const end = noFences.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(noFences.slice(start, end + 1))
  }

  throw new Error(`No se pudo parsear JSON. Preview: ${original.slice(0, 200)}`)
}

function nowSql() {
  return moment().tz(TZ).format('YYYY-MM-DD HH:mm:ss')
}

function localDateStr() {
  return moment().tz(TZ).format('YYYY-MM-DD')
}

async function getCasinoConfig() {
  const { rows, error } = await query(
    'SELECT api_url, api_key FROM config_casino WHERE id = 1 LIMIT 1',
  )
  if (error) throw error
  const row = rows?.[0] || {}
  if (!row.api_url || !row.api_key) {
    throw new Error('Configuración de panel no encontrada en config_casino')
  }
  return {
    apiUrl: String(row.api_url).trim(),
    apiKey: String(row.api_key).trim(),
  }
}

async function getOpenRouterConfig() {
  const { rows, error } = await query(
    'SELECT api_key, model FROM config_openrouter WHERE id = 1 LIMIT 1',
  )
  if (error) throw error
  const row = rows?.[0] || {}
  if (!row.api_key) throw new Error('OpenRouter API key no configurada')
  return {
    apiKey: String(row.api_key).trim(),
    model: normalizeModel(row.model),
  }
}

function isMockPanelBalance() {
  return String(process.env.MOCK_PANEL_BALANCE || 'false').toLowerCase() === 'true'
}

function isPanelSuccessResponse(panelData) {
  const rawSuccessMessage = panelData?.successMessage || panelData?.message || ''
  const successMsg = String(rawSuccessMessage).toLowerCase().trim()
  return (
    panelData?.success === true ||
    successMsg.includes('balance es cambiado con éxito') ||
    successMsg.includes('balance successfully changed') ||
    successMsg.includes('saldo acreditado') ||
    successMsg.includes('credited successfully')
  )
}

function buildMpVisionPrompt() {
  return `
Eres un extractor de datos de comprobantes de Mercado Pago.
Devuelve SOLO JSON estricto, sin markdown ni texto extra.

Salida:
{
  "amount": "string|null",
  "date": "YYYY-MM-DD|null",
  "time": "HH:mm:ss|null",
  "transaction_id": "string|null",
  "id_type": "numerico|alfanumerico|indefinido",
  "confidence": "high|medium|low",
  "notes": "string"
}

Reglas:
- amount: normaliza a string con 2 decimales.
- date/time: normaliza si aparecen visibles.
- transaction_id: solo número de operación válido o ID alfanumérico válido.
- No uses alias, CBU, CUIT, teléfono ni DNI como transaction_id.
- Si no hay ID confiable, transaction_id=null e id_type=indefinido.
- Si el comprobante no es suficientemente claro, usa confidence=low.
`.trim()
}

function buildBinaryDataUrl(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath)
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

function dataUrlToBuffer(dataUrl) {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  }
}

async function extractWithOpenRouter({ filePath, mimeType }) {
  const { apiKey, model } = await getOpenRouterConfig()
  const isPdf = String(mimeType || '').includes('pdf')
  const dataUrl = isPdf ? null : buildBinaryDataUrl(filePath, mimeType)
  const pdfDataUrl = isPdf ? buildBinaryDataUrl(filePath, 'application/pdf') : null

  const resp = await axios.post(
    OPENROUTER_URL,
    {
      model,
      max_tokens: 700,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: isPdf
            ? [
                {
                  type: 'image_url',
                  image_url: { url: pdfDataUrl },
                },
                { type: 'text', text: buildMpVisionPrompt() },
              ]
            : [
                { type: 'image_url', image_url: { url: dataUrl } },
                { type: 'text', text: buildMpVisionPrompt() },
              ],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 45_000,
      validateStatus: () => true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    },
  )

  if (resp.status < 200 || resp.status >= 300) {
    const apiError =
      resp?.data?.error?.message ||
      resp?.data?.message ||
      resp?.data?.error ||
      'OpenRouter request failed'
    throw new Error(`OpenRouter ${resp.status}: ${apiError}`)
  }

  const raw = resp?.data?.choices?.[0]?.message?.content || ''
  if (!String(raw || '').trim()) {
    throw new Error('OpenRouter no devolvió contenido utilizable')
  }

  const parsed = safeJsonParse(stripCodeFences(raw))
  return { ...parsed, model, rawResponse: raw }
}

function normalizeMpTxId(id) {
  if (!id) return null
  return String(id).trim().toUpperCase().replace(/[\s-]/g, '')
}

function getMpTransactionId(payment) {
  const candidates = [
    payment?.transaction_details?.transaction_id,
    payment?.point_of_interaction?.transaction_data?.transaction_id,
    payment?.transaction_details?.bank_transfer_id,
    payment?.point_of_interaction?.transaction_data?.bank_transfer_id,
    payment?.external_reference,
  ]

  for (const item of candidates) {
    const norm = normalizeMpTxId(item)
    if (norm) return norm
  }
  return null
}

async function getMpToken() {
  const { rows, error } = await query(
    `SELECT ba.account_data
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE bp.slug = 'mercadopago' AND ba.is_active = 1
     ORDER BY ba.updated_at DESC, ba.id DESC
     LIMIT 1`,
  )
  if (error) throw error
  const raw = rows?.[0]?.account_data || '{}'
  const data = parseData(raw)
  if (!data.token) {
    throw new Error('No se encontró token de Mercado Pago activo')
  }
  return { token: String(data.token).trim() }
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

async function getClientExternalId(clientId) {
  const { rows, error } = await query(
    `SELECT external_id
     FROM clients
     WHERE id = ?
     LIMIT 1`,
    [Number(clientId)],
  )
  if (error) throw error
  const externalId = rows?.[0]?.external_id
  if (!externalId) {
    throw new Error(`El cliente ${clientId} no tiene external_id configurado`)
  }
  return String(externalId).trim()
}

export async function creditPanelBalance({ clientId, amountArs }) {
  const n = Number(amountArs)
  if (!Number.isFinite(n) || n <= 0) {
    return {
      ok: false,
      error: 'invalid_amount',
      message: 'Monto inválido para el panel',
    }
  }

  const mocked = isMockPanelBalance()
  if (mocked) {
    return {
      ok: true,
      mocked: true,
      data: { successMessage: 'Balance es cambiado con exito (MOCK)' },
    }
  }

  const { apiUrl, apiKey } = await getCasinoConfig()
  const { currency } = await getActiveAmountConfig('deposit')
  const externalId = await getClientExternalId(clientId)
  const formData = new FormData()
  formData.append('operation', 'in')
  formData.append('send', 'true')
  formData.append('amount', String(amountArs))
  formData.append('balance_currency', currency || 'ARS')
  formData.append('api_token', apiKey)

  const panelUrl = `${apiUrl}index.php?act=admin&area=balance&response=js&type=frame&id=${encodeURIComponent(
    externalId,
  )}`

  const resp = await axios.post(panelUrl, formData, {
    headers: formData.getHeaders(),
    timeout: 25_000,
    validateStatus: () => true,
  })

  const data = resp?.data || {}
  const ok = isPanelSuccessResponse(data)
  console.log('[MP][PANEL] credit attempt', {
    clientId,
    externalId,
    amountArs: n,
    mocked: false,
    status: resp.status,
    ok,
    url: panelUrl,
    successMessage: data?.successMessage || null,
    message: data?.message || null,
    success: data?.success ?? null,
    dataPreview: JSON.stringify(data).slice(0, 500),
  })
  return {
    ok,
    mocked: false,
    status: resp.status,
    url: panelUrl,
    data,
  }
}

async function getMpBankAccount(id) {
  const { rows, error } = await query(
    `SELECT ba.*, bp.slug AS provider_slug
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE ba.id = ? AND bp.slug = 'mercadopago'
     LIMIT 1`,
    [id],
  )
  if (error) throw error
  return rows?.[0] || null
}

async function upsertMpMovement(accountId, payment) {
  const mpId = String(payment?.id || '').trim()
  if (!mpId) return false

  const amount = Number(payment?.transaction_amount || 0)
  const status = 'pending'
  const cuit = payment?.payer?.identification?.number || null
  const extRef = payment?.external_reference ? String(payment.external_reference) : mpId
  const txType = /^\d+$/.test(extRef) ? 'numeric' : 'alphanumeric'
  const { date, time } = payment?.date_created
    ? {
        date: String(payment.date_created).slice(0, 10),
        time: String(payment.date_created).slice(11, 19),
      }
    : { date: null, time: null }

  const { rows: existing } = await query(
    'SELECT id FROM mercadopago_movements WHERE mercadopago_id = ? LIMIT 1',
    [mpId],
  )

  if (existing?.length > 0) {
    await query(
      `UPDATE mercadopago_movements SET
         bank_account_id = ?, amount = ?, status = ?, cuit = ?,
         transaction_id = ?, transaction_id_type = ?,
         receipt_date = ?, receipt_time = ?,
         sync_status = 'synced', updated_at = CURRENT_TIMESTAMP
       WHERE mercadopago_id = ?`,
      [accountId, amount, status, cuit, extRef, txType, date, time, mpId],
    )
    return false
  }

  const { error } = await query(
    `INSERT INTO mercadopago_movements
       (bank_account_id, mercadopago_id, transaction_id, transaction_id_type,
        amount, cuit, receipt_date, receipt_time, status, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
    [accountId, mpId, extRef, txType, amount, cuit, date, time, status],
  )
  if (error) throw error
  return true
}

async function fetchMpPage(token, offset, limit, beginDate, endDate) {
  const params = new URLSearchParams({
    sort: 'date_created',
    criteria: 'desc',
    range: 'date_created',
    begin_date: beginDate,
    end_date: endDate,
    offset: String(offset),
    limit: String(limit),
  })

  const url = `${MP_API_BASE}/v1/payments/search?${params.toString()}`
  const res = await axios.get(url, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 25_000,
    validateStatus: () => true,
  })

  if (res.status < 200 || res.status >= 300) {
    const txt = JSON.stringify(res.data || {}).slice(0, 200)
    throw new Error(`MP API ${res.status}: ${txt}`)
  }

  return res.data || {}
}

async function findMpPaymentByTxId({ transactionId, amount, date }) {
  const { token } = await getMpToken()
  const tx = normalizeMpTxId(transactionId)
  if (!tx) return null

  if (/^\d+$/.test(tx)) {
    const resp = await axios.get(`${MP_API_BASE}/v1/payments/${tx}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 25_000,
      validateStatus: () => true,
    })
    if (resp.status === 200) return { found: true, payment: resp.data, mode: 'id' }
    return { found: false, mode: 'id', status: resp.status, data: resp.data }
  }

  const begin = date ? `${date}T00:00:00.000-03:00` : 'NOW-2DAYS'
  const end = date ? `${date}T23:59:59.999-03:00` : 'NOW'
  const search = await fetchMpPage(token, 0, 40, begin, end)
  const results = Array.isArray(search.results) ? search.results : []
  const byTx = results.find((item) => normalizeMpTxId(getMpTransactionId(item)) === tx)
  if (byTx) return { found: true, payment: byTx, mode: 'search' }

  const nAmount = amount != null ? Number(amount) : null
  if (nAmount != null && Number.isFinite(nAmount)) {
    const byAmount = results.find(
      (item) => Number(item?.transaction_amount || 0) === nAmount,
    )
    if (byAmount) return { found: true, payment: byAmount, mode: 'search_amount' }
  }

  return { found: false, mode: 'search', status: 404, data: search }
}

async function sendMpAutoMessage(chatId, event, context = {}) {
  const msg = await getAutoMessage(event, context)
  if (msg) {
    const extra = event === 'deposit_completed'
      ? { depositEvent: 'deposit_completed', depositAmount: context.amount ?? null }
      : {}
    await persistMessage({ chatId, senderType: 'system', content: msg, extra })
  }
}

function pickMpFieldsFromSearchResult(payment) {
  return {
    id: payment?.id ?? null,
    status: payment?.status ?? null,
    status_detail: payment?.status_detail ?? null,
    currency_id: payment?.currency_id ?? null,
    transaction_amount: payment?.transaction_amount ?? null,
    date_created: payment?.date_created ?? null,
    date_approved: payment?.date_approved ?? null,
    tx_id: payment?.transaction_details?.transaction_id ?? null,
    payer: {
      email: payment?.payer?.email ?? null,
      identification: {
        type: payment?.payer?.identification?.type ?? null,
        number: payment?.payer?.identification?.number ?? null,
      },
    },
  }
}

function normalizeExtractedData(data) {
  const out = {
    amount: data?.amount ?? null,
    date: data?.date ?? null,
    time: data?.time ?? null,
    transaction_id: data?.transaction_id || null,
    id_type: data?.id_type || 'indefinido',
    confidence: data?.confidence || 'low',
    notes: data?.notes ? String(data.notes).slice(0, 160).replace(/\n/g, ' ') : '',
    model: data?.model || null,
  }

  if (out.transaction_id) {
    out.transaction_id = String(out.transaction_id).trim().toUpperCase().replace(/[\s-]/g, '')
  }

  if (out.date && !moment(out.date, 'YYYY-MM-DD', true).isValid()) out.date = null
  if (out.time && !moment(out.time, ['HH:mm:ss', 'HH:mm'], true).isValid()) out.time = null
  if (out.time && moment(out.time, ['HH:mm:ss', 'HH:mm'], true).isValid()) {
    out.time = moment(out.time, ['HH:mm:ss', 'HH:mm'], true).format('HH:mm:ss')
  }

  if (out.amount !== null && out.amount !== 'null' && out.amount !== '') {
    const cleaned = String(out.amount)
      .replace(/[^0-9,.]/g, '')
      .replace(/\.(?=\d{3})/g, '')
      .replace(',', '.')
    const n = Number(cleaned)
    out.amount = Number.isFinite(n) ? n.toFixed(2) : null
  } else {
    out.amount = null
  }

  if (out.id_type === 'numerico' && !/^\d+$/.test(String(out.transaction_id || ''))) {
    out.transaction_id = null
    out.id_type = 'indefinido'
  }
  if (out.id_type === 'alfanumerico' && !/^[A-Z0-9]{10,30}$/.test(String(out.transaction_id || ''))) {
    out.transaction_id = null
    out.id_type = 'indefinido'
  }

  return out
}

async function processReceiptBase(req, res, mimeType) {
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
      console.error('[MP][Log] Error guardando log:', e.message)
    }
  }

  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No se proporcionó archivo' })
    }
    if (!chatId || !clientId) {
      return res.status(400).json({ ok: false, message: 'chatId y clientId son requeridos' })
    }

    try {
      logId = await insertReceiptLog({ provider: 'mercadopago', messageId, chatId, clientId })
    } catch (e) {
      console.error('[MP][Log] Error creando log:', e.message)
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
    let isDuplicate = false

    let outcome = 'invalid'
    let panelResult = null
    let resultReason = 'openrouter_mp_match_pending'

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
    } else {
      logSteps.push({ step: 'validation_ok', ts: ts(), detail: { amount, transactionId: extractedData.transaction_id, idType: extractedData.id_type } })
      logSteps.push({ step: 'mp_api_lookup_start', ts: ts(), detail: { transactionId: extractedData.transaction_id, amount, date: extractedData.date } })

      const mpCheck = await findMpPaymentByTxId({
        transactionId: extractedData.transaction_id,
        amount,
        date: extractedData.date,
      })

      if (!mpCheck?.found) {
        outcome = 'invalid'
        resultReason = 'mp_payment_not_found'
        logSteps.push({ step: 'mp_api_lookup_not_found', ts: ts(), detail: { mode: mpCheck?.mode, status: mpCheck?.status } })
      } else {
        const payment = mpCheck.payment
        const paymentId = String(payment?.id || '').trim()
        const txId = normalizeMpTxId(getMpTransactionId(payment) || extractedData.transaction_id)
        logSteps.push({
          step: 'mp_api_lookup_found',
          ts: ts(),
          detail: { mode: mpCheck.mode, paymentId, txId, mpStatus: payment?.status, mpAmount: payment?.transaction_amount },
        })

        const { rows: duplicateRows } = await query(
          `SELECT id
           FROM mercadopago_movements
           WHERE status = 'paid'
             AND (mercadopago_id = ? OR transaction_id = ? OR game_platform_load_id = ?)
           LIMIT 1`,
          [paymentId, txId, txId],
        )

        if (duplicateRows?.length) {
          isDuplicate = true
          outcome = 'duplicate'
          resultReason = 'duplicate_payment_id_or_transaction'
          logSteps.push({ step: 'duplicate_found', ts: ts(), detail: { duplicateId: duplicateRows[0].id } })
          await flushLog(outcome, resultReason, { isDuplicate: true, duplicateId: duplicateRows[0].id })
          await sendMpAutoMessage(chatId, 'receipt_duplicate', { clientId, amount })
          return res.status(200).json({
            ok: true,
            status: outcome,
            extractedData,
            isDuplicate,
            resultReason,
            duplicateId: duplicateRows[0].id,
            receiptLogId: logId || null,
            createdAt,
            image_name: filename,
            syncStatus: 'not_synced',
            aiModel,
            currency: activeCurrency,
            minAmount,
          })
        }

        logSteps.push({ step: 'duplicate_check_ok', ts: ts(), detail: {} })

        const panelAmount = Number(payment?.transaction_amount || amount)
        logSteps.push({ step: 'panel_credit_start', ts: ts(), detail: { amountArs: panelAmount } })

        panelResult = await creditPanelBalance({ clientId, amountArs: panelAmount })
        outcome = panelResult?.ok ? 'paid' : 'invalid'
        resultReason = panelResult?.ok
          ? 'panel_balance_credit_success'
          : `panel_balance_credit_failed_${panelResult?.error || panelResult?.status || 'unknown'}`

        logSteps.push({
          step: panelResult?.ok ? 'panel_credit_ok' : 'panel_credit_failed',
          ts: ts(),
          detail: {
            ok: panelResult?.ok,
            mocked: panelResult?.mocked || false,
            httpStatus: panelResult?.status || null,
            message: panelResult?.data?.successMessage || panelResult?.data?.message || null,
          },
        })

        if (!panelResult?.ok) {
          console.warn('[MP][PANEL] credit failed', {
            clientId,
            chatId,
            paymentId,
            txId,
            amount: panelAmount,
            resultReason,
            panelStatus: panelResult?.status,
            panelDataPreview: JSON.stringify(panelResult?.data || {}).slice(0, 500),
          })
        }

        const loadDate = extractedData.date || String(payment?.date_approved || payment?.date_created || nowSql()).slice(0, 10)
        const loadTime = extractedData.time || String(payment?.date_approved || payment?.date_created || nowSql()).slice(11, 19)

        const { rows: existing } = await query(
          'SELECT id FROM mercadopago_movements WHERE mercadopago_id = ? LIMIT 1',
          [paymentId],
        )

        let movementDbId = null
        if (existing?.length) {
          movementDbId = existing[0].id
          await query(
            `UPDATE mercadopago_movements
             SET client_id = ?, chat_id = ?, message_id = ?, bank_account_id = NULL,
                 cuit = ?, receipt_date = ?, receipt_time = ?, amount = ?,
                 transaction_id = ?, transaction_id_type = ?,
                 status = ?, mercadopago_id = ?, game_platform_load_id = ?,
                 game_load_date = ?, game_load_time = ?, game_load_amount = ?,
                 sync_status = 'synced', result_status = ?, result_reason = ?, ai_model = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
              clientId, chatId, null,
              payment?.payer?.identification?.number || null,
              loadDate, loadTime, panelAmount, txId,
              /^\d+$/.test(txId || '') ? 'numeric' : 'alphanumeric',
              panelResult?.ok ? 'paid' : 'error',
              String(payment?.id || ''), txId, loadDate, loadTime, panelAmount,
              outcome, resultReason, aiModel,
              existing[0].id,
            ],
          )
        } else {
          const { rows: insertRows } = await query(
            `INSERT INTO mercadopago_movements
              (client_id, chat_id, message_id, bank_account_id, cuit, receipt_date, receipt_time, amount,
               transaction_id, transaction_id_type, status, mercadopago_id, game_platform_load_id,
               game_load_date, game_load_time, game_load_amount, sync_status, result_status, result_reason, ai_model)
             VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)`,
            [
              clientId, chatId, null,
              payment?.payer?.identification?.number || null,
              loadDate, loadTime, panelAmount, txId,
              /^\d+$/.test(txId || '') ? 'numeric' : 'alphanumeric',
              panelResult?.ok ? 'paid' : 'error',
              String(payment?.id || ''), txId, loadDate, loadTime, panelAmount,
              outcome, resultReason, aiModel,
            ],
          )
          movementDbId = insertRows?.insertId || null
        }

        logAccum.movementId = movementDbId
        logSteps.push({ step: 'movement_saved', ts: ts(), detail: { movementId: movementDbId, status: panelResult?.ok ? 'paid' : 'error' } })
        outcome = panelResult?.ok ? 'paid' : 'invalid'

        if (panelResult?.ok && movementDbId) {
          await processReferralRewardForMovement({
            sourceTable: 'mercadopago_movements',
            sourceMovementId: movementDbId,
            clientId,
            chatId,
            amount: panelAmount,
          }).catch(() => {})
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

    await sendMpAutoMessage(chatId, event, { clientId, amount })

    await flushLog(outcome, resultReason, {
      isDuplicate,
      panel: panelResult ? { ok: panelResult.ok, mocked: panelResult.mocked, httpStatus: panelResult.status } : null,
      syncStatus: outcome === 'paid' ? 'synced' : 'not_synced',
    })

    if (outcome === 'paid') {
      const syncResult = await syncClientEventReceiptPaid({
        clientId,
        messageId,
        receiptLogId: logId || null,
        chatId,
        creditPanelBalance,
        paymentAmount: amount,
      }).catch((syncErr) => {
        console.error('[MP] Error sincronizando evento pagado:', syncErr?.message || syncErr)
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
      resultReason,
      receiptLogId: logId || null,
      aiModel,
      createdAt,
      image_name: filename,
      syncStatus: outcome === 'paid' ? 'synced' : 'not_synced',
      currency: activeCurrency,
      minAmount,
    })
  } catch (error) {
    console.error('[MP] process receipt error:', error)
    logSteps.push({ step: 'error', ts: ts(), detail: { message: error?.message } })
    await flushLog('error', error?.message || 'internal_error', { error: error?.message })
    await sendMpAutoMessage(Number(req.body?.chatId || 0), 'deposit_failed', {
      clientId: Number(req.body?.clientId || 0),
    })
    return res.status(500).json({
      ok: false,
      message: error?.message || 'Error procesando comprobante',
    })
  }
}

export async function processMercadoPagoClientReceipt({ chatId, clientId, messageId, dataUrl, fileName, eventMinDepositAmount = null }) {
  const parsed = dataUrlToBuffer(dataUrl)
  if (!parsed?.buffer) {
    throw new Error('No se pudo leer el archivo enviado por el cliente')
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-receipt-'))
  const ext = String(parsed.mimeType || 'image/jpeg').includes('pdf') ? '.pdf' : '.jpg'
  const tempFile = path.join(tmpDir, `${Date.now()}${ext}`)
  fs.writeFileSync(tempFile, parsed.buffer)

  const fakeReq = {
    file: {
      path: tempFile,
      filename: fileName || path.basename(tempFile),
      mimetype: parsed.mimeType,
    },
    body: {
      chatId,
      clientId,
      messageId,
      eventMinDepositAmount,
    },
  }

  const fakeRes = {
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.payload = payload
      return payload
    },
  }

  try {
    const result = await processReceiptBase(fakeReq, fakeRes, parsed.mimeType)
    return {
      ...result,
      receiptLogId: result?.receiptLogId || null,
    }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true })
    } catch {}
  }
}

export async function processImage(req, res) {
  return processReceiptBase(req, res, req.file?.mimetype || 'image/jpeg')
}

export async function processPdf(req, res) {
  return processReceiptBase(req, res, 'application/pdf')
}

// ============================================================
//  Export - POST /api/mercadopago/:id/sync
// ============================================================

export async function mpSyncTransactions(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id) return res.status(400).json({ error: 'ID inválido' })

    const row = await getMpBankAccount(id)
    if (!row) return res.status(404).json({ error: 'Cuenta MercadoPago no encontrada' })

    const data = parseData(row.account_data)
    const token = data.token || ''
    if (!token) return res.status(400).json({ error: 'Esta cuenta no tiene token configurado' })

    const today = localDateStr()
    const beginDate = `${today}T00:00:00.000-03:00`
    const endDate = `${today}T23:59:59.999-03:00`

    const limit = 50
    let offset = 0
    let synced = 0

    while (offset <= 2000) {
      const dataPage = await fetchMpPage(token, offset, limit, beginDate, endDate)
      const results = dataPage?.results || []
      const total = dataPage?.paging?.total ?? 0
      if (results.length === 0) break

      let newInPage = 0
      for (const payment of results) {
        try {
          const isNew = await upsertMpMovement(id, payment)
          if (isNew) {
            synced++
            newInPage++
          }
        } catch (e) {
          console.error('[MP] Error upsert individual:', e.message)
        }
      }

      if (newInPage === 0) break
      if (results.length < limit || offset + limit >= total) break
      offset += limit
    }

    res.json({ ok: true, synced })
  } catch (err) {
    next(err)
  }
}
