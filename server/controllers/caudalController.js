import fs from 'fs'
import os from 'os'
import path from 'path'
import axios from 'axios'
import moment from 'moment-timezone'
import { query, getPool } from '../config/database.js'
import { getIo } from '../socket/socketServer.js'
import { creditPanelBalance } from './mercadoPagoController.js'
import { insertCaudalPaymentAudit } from '../services/caudalAuditService.js'
import { getAutoMessage } from './autoMessagesController.js'
import { persistMessage, resetClientBot } from './chatController.js'

const ARGENTINA_TZ = 'America/Argentina/Buenos_Aires'
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-4o-mini'
const ALLOWED_OPENROUTER_MODELS = new Set([
  'google/gemini-3.1-flash-lite',
  'google/gemini-2.0-flash-001',
  'google/gemini-2.5-flash',
  'openai/gpt-4o-mini',
  'openai/gpt-4o',
])

// ─── Inline helpers (ported from clientTitularService) ──────────────────────

const normalizeDigits = (value) => String(value ?? '').replace(/\D/g, '')

const normalizeName = (value) =>
  String(value ?? '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const storeClientVerifiedTitularName = async (clientId, name, source) => {
  await query(
    `UPDATE clients SET verified_titular_name=?, verified_titular_source=?, verified_titular_updated_at=UTC_TIMESTAMP()
     WHERE id=? AND (verified_titular_name IS NULL OR verified_titular_name='')`,
    [name, source, clientId]
  )
}

const resolveClientVerifiedTitularName = async (clientId) => {
  const { rows } = await query('SELECT verified_titular_name FROM clients WHERE id=? LIMIT 1', [clientId])
  return rows?.[0]?.verified_titular_name || null
}

// ─── Utilities ───────────────────────────────────────────────────────────────

const getRequestIp = (req) => {
  const rawIp =
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    ''
  return String(rawIp).split(',')[0].trim().replace(/^::ffff:/, '') || null
}

const safeAudit = async (data) => {
  try {
    return await insertCaudalPaymentAudit(data)
  } catch (error) {
    console.warn('[caudal] no se pudo guardar auditoria:', error?.message || error)
    return null
  }
}

// ─── Auto message helper ─────────────────────────────────────────────────────

const sendAutoMessage = async (eventKey, chatId, fallbackText, vars = {}) => {
  try {
    const text = (await getAutoMessage(eventKey, { vars })) || fallbackText
    if (text) {
      await persistMessage({ chatId: Number(chatId), senderType: 'system', content: text, messageType: 'text' })
      getIo()?.to(Number(chatId))?.emit?.('newMessage', { chatId: Number(chatId), content: text, sender: 'system' })
    }
  } catch (e) {
    console.warn('[caudal] Error enviando auto mensaje:', e?.message || e)
  }
}

// ─── Caudal audit <-> message link ───────────────────────────────────────────

const linkCaudalAuditToMessage = async (messageId, caudalAuditId, chatId = null) => {
  const msgId = Number(messageId || 0)
  const auditId = Number(caudalAuditId || 0)
  if (!msgId || !auditId) return false

  await query(`UPDATE messages SET caudal_audit_id = ? WHERE id = ?`, [auditId, msgId])

  try {
    const io = getIo()
    if (io) {
      const payload = {
        messageId: `msg-${msgId}`,
        messageDbId: msgId,
        caudalAuditId: auditId,
      }
      if (chatId) payload.chatId = Number(chatId)
      if (chatId) {
        io.to(Number(chatId)).emit('messageMetadataUpdated', payload)
      } else {
        io.emit('messageMetadataUpdated', payload)
      }
    }
  } catch (error) {
    console.warn('[caudal] no se pudo emitir messageMetadataUpdated:', error?.message || error)
  }

  return true
}

// ─── OpenRouter ──────────────────────────────────────────────────────────────

const getOpenRouterConfig = async () => {
  const { rows, error } = await query('SELECT api_key, model FROM config_openrouter WHERE id = 1 LIMIT 1')
  if (error) throw error
  const row = rows?.[0] || {}
  if (!row.api_key) throw new Error('OpenRouter API key no configurada.')
  const selectedModel = String(row.model || '').trim()
  return {
    apiKey: String(row.api_key).trim(),
    model: ALLOWED_OPENROUTER_MODELS.has(selectedModel) ? selectedModel : DEFAULT_OPENROUTER_MODEL,
  }
}

const getMimeTypeFromFilename = (filePath, fallback = 'application/octet-stream') => {
  const ext = String(path.extname(filePath || '') || '').toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.bmp') return 'image/bmp'
  if (ext === '.tif' || ext === '.tiff') return 'image/tiff'
  if (ext === '.pdf') return 'application/pdf'
  return fallback
}

const toDataUrl = (buffer, mimeType) => `data:${mimeType};base64,${buffer.toString('base64')}`

const stripCodeFences = (value) => {
  let text = String(value || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\s*/m, '')
    text = text.replace(/```$/m, '').trim()
  }
  return text.trim()
}

const normalizeHumanFullName = (value) =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ')

const isValidHumanFullName = (value) => {
  const normalized = normalizeHumanFullName(value)
  if (!normalized || normalized.length < 5) return false
  const parts = normalized.split(' ').filter(Boolean)
  if (parts.length < 2) return false
  const namePartRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ''-]{2,}$/
  const connectorTokens = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'do', 'dos', 'das'])
  let meaningfulParts = 0
  for (const part of parts) {
    if (connectorTokens.has(part.toLowerCase())) continue
    meaningfulParts += 1
    if (!namePartRegex.test(part)) return false
  }
  return meaningfulParts >= 2
}

const extractFirstJsonObject = (value) => {
  const text = String(value || '')
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') depth += 1
    if (ch === '}') depth -= 1
    if (depth === 0) return text.slice(start, i + 1)
  }
  return null
}

const safeJsonParse = (raw) => {
  const original = String(raw || '').trim()
  try { return JSON.parse(original) } catch {}
  const noFences = stripCodeFences(original)
  try { return JSON.parse(noFences) } catch {}
  const candidate = extractFirstJsonObject(noFences) || extractFirstJsonObject(original)
  if (candidate) {
    try { return JSON.parse(candidate) } catch {}
  }
  throw new Error(`No se pudo parsear JSON desde la respuesta IA. Preview: ${original.slice(0, 300)}`)
}

const buildExtractPrompt = (todayISO) => `
Eres un extractor de comprobantes de Caudal.

Devuelve SOLO JSON estricto, sin markdown ni explicaciones, con este formato:
{
  "amount": "string|null",
  "date": "YYYY-MM-DD|null",
  "time": "HH:mm:ss|null",
  "transaction_id": "string|null",
  "id_type": "numerico|alfanumerico|indefinido",
  "from_cuit": "string|null",
  "to_cuit": "string|null",
  "from_cbu_cvu": "string|null",
  "to_cbu_cvu": "string|null",
  "from_name": "string|null",
  "confidence": "high|medium|low",
  "notes": "string"
}

Reglas:
- El documento puede ser imagen o PDF.
- Si un dato no aparece claro, usa null.
- amount debe ser un string decimal con punto.
- transaction_id debe ser el identificador mas util del comprobante, si existe.
- from_name debe ser EXCLUSIVAMENTE el nombre del REMITENTE / EMISOR / quien envio el dinero.
- Si el comprobante muestra dos nombres, usa el de la seccion "De", "Desde", "Remitente", "Envía" o equivalente.
- NUNCA uses el nombre de la seccion "Para", "Recibe", "Destinatario" o equivalente para from_name.
- Si solo ves el destinatario pero no el remitente, from_name debe ser null.
- Prioriza el monto visible en grande, el importe principal del comprobante o el valor asociado a la transferencia detectada.
- Si la fecha viene incompleta, completa con la fecha actual solo cuando sea razonable.
- Si no estas seguro, usa confidence "low".
- today = ${todayISO}
`

const normalizeCaudalExtractedData = (data) => {
  const out = {
    amount: data?.amount ?? null,
    date: data?.date ?? null,
    time: data?.time ?? null,
    transaction_id: data?.transaction_id ?? null,
    id_type: data?.id_type ?? 'indefinido',
    confidence: data?.confidence ?? 'low',
    from_cuit: data?.from_cuit ?? null,
    to_cuit: data?.to_cuit ?? null,
    from_cbu_cvu: data?.from_cbu_cvu ?? null,
    to_cbu_cvu: data?.to_cbu_cvu ?? null,
    from_name: data?.from_name ?? null,
    notes: data?.notes ? String(data.notes).slice(0, 240).replace(/\n/g, ' ') : '',
  }

  if (out.transaction_id) out.transaction_id = String(out.transaction_id).trim()

  if (out.date && moment(out.date, 'YYYY-MM-DD', true).isValid()) {
    out.date = moment.tz(out.date, ARGENTINA_TZ).format('YYYY-MM-DD')
  } else {
    out.date = null
  }

  if (out.time && moment(out.time, ['HH:mm:ss', 'HH:mm'], true).isValid()) {
    out.time = moment(out.time, ['HH:mm:ss', 'HH:mm'], true).format('HH:mm:ss')
  } else {
    out.time = null
  }

  if (out.amount !== null && out.amount !== 'null' && out.amount !== '') {
    const cleaned = String(out.amount)
      .replace(/[^0-9,.]/g, '')
      .replace(/\.(?=\d{3})/g, '')
      .replace(',', '.')
    const parsed = Number(cleaned)
    out.amount = Number.isFinite(parsed) ? parsed.toFixed(2) : null
  } else {
    out.amount = null
  }

  out.from_cuit = normalizeDigits(out.from_cuit)
  out.to_cuit = normalizeDigits(out.to_cuit)
  out.from_name = out.from_name ? String(out.from_name).trim() : null
  out.from_cbu_cvu = normalizeDigits(out.from_cbu_cvu)
  out.to_cbu_cvu = normalizeDigits(out.to_cbu_cvu)

  if (out.id_type === 'numerico') {
    if (!out.transaction_id || !/^\d+$/.test(out.transaction_id)) {
      out.transaction_id = null
      out.id_type = 'indefinido'
    }
  } else if (out.id_type === 'alfanumerico') {
    if (!out.transaction_id) out.id_type = 'indefinido'
  } else {
    out.id_type = 'indefinido'
  }

  return out
}

const extractWithOpenRouter = async ({ filePath, mimeType, text = '' }) => {
  const { apiKey, model } = await getOpenRouterConfig()
  const todayISO = moment().tz(ARGENTINA_TZ).format('YYYY-MM-DD')
  const messages = [
    {
      role: 'user',
      content: [{ type: 'text', text: buildExtractPrompt(todayISO) }],
    },
  ]

  if (filePath) {
    const buffer = fs.readFileSync(filePath)
    const resolvedMimeType = mimeType || getMimeTypeFromFilename(filePath, 'application/octet-stream')
    const dataUrl = toDataUrl(buffer, resolvedMimeType)

    if (resolvedMimeType === 'application/pdf') {
      messages[0].content.push({
        type: 'file',
        file: { filename: path.basename(filePath) || 'document.pdf', fileData: dataUrl },
      })
    } else {
      messages[0].content.push({ type: 'image_url', image_url: { url: dataUrl } })
    }
  } else if (text) {
    messages[0].content[0].text = `${messages[0].content[0].text}\n\nTexto detectado:\n${text}`
  }

  const resp = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    { model, max_tokens: 800, temperature: 0.1, messages },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 45_000,
      validateStatus: () => true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    }
  )

  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`OpenRouter HTTP ${resp.status}: ${JSON.stringify(resp.data).slice(0, 400)}`)
  }

  const raw = resp?.data?.choices?.[0]?.message?.content ?? ''
  const parsed = safeJsonParse(raw)
  return { ...normalizeCaudalExtractedData(parsed), ai_model: model }
}

// ─── Name comparison helpers ─────────────────────────────────────────────────

const normalizeTitle = (value) =>
  normalizeName(
    String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )

const similarityScore = (a, b) => {
  const left = normalizeTitle(a)
  const right = normalizeTitle(b)
  if (!left || !right) return 0
  const leftTokens = new Set(left.split(' ').filter((t) => t.length >= 3))
  const rightTokens = new Set(right.split(' ').filter((t) => t.length >= 3))
  if (!leftTokens.size || !rightTokens.size) return 0
  let hits = 0
  for (const token of leftTokens) { if (rightTokens.has(token)) hits += 1 }
  return hits / Math.max(leftTokens.size, rightTokens.size)
}

const tokenizeComparableTitle = (value) =>
  Array.from(new Set(normalizeTitle(value).split(' ').filter((token) => token.length >= 3)))

const canonicalComparableTitle = (value) => tokenizeComparableTitle(value).sort().join(' ')

const sameComparableTitleTokens = (a, b) => {
  const leftTokens = tokenizeComparableTitle(a)
  const rightTokens = tokenizeComparableTitle(b)
  if (!leftTokens.length || !rightTokens.length) return false
  if (leftTokens.length !== rightTokens.length) return false
  const rightSet = new Set(rightTokens)
  return leftTokens.every((token) => rightSet.has(token))
}

const markCaudalEventAmbiguous = (row, reasonCode, reasonDetail, candidatesCount = null) => {
  if (!row) return null
  return {
    ...row,
    match_ambiguous: true,
    match_ambiguous_reason: reasonCode || 'ambiguous_match',
    match_ambiguous_detail: reasonDetail || null,
    match_ambiguous_count: candidatesCount,
  }
}

const groupCaudalRowsByTransactionId = (rows = []) => {
  const groups = new Map()
  for (const row of rows || []) {
    const key = String(row?.external_transaction_id || '').trim()
    if (!key) continue
    const existing = groups.get(key)
    if (!existing) {
      groups.set(key, { ...row, caudal_event_count: 1 })
      continue
    }
    existing.caudal_event_count = Number(existing.caudal_event_count || 1) + 1
  }
  return Array.from(groups.values())
}

const compareNamesWithOpenRouter = async (leftName, rightName) => {
  const left = String(leftName || '').trim()
  const right = String(rightName || '').trim()
  if (!left || !right) return { samePerson: false, confidence: 'low', reason: 'missing_name' }

  try {
    const { apiKey, model } = await getOpenRouterConfig()
    const payload = {
      model,
      max_tokens: 200,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Compara estos dos nombres de personas. Responde solo JSON con same_person, confidence y reason. ' +
                'Ignora el orden de los nombres, acentos, signos, puntos, dobles apellidos y palabras accesorias. ' +
                'Formato exacto: {"same_person":true|false,"confidence":"high|medium|low","reason":"..."}',
            },
            { type: 'text', text: `Nombre A: ${left}\nNombre B: ${right}` },
          ],
        },
      ],
    }

    const resp = await axios.post('https://openrouter.ai/api/v1/chat/completions', payload, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 25_000,
      validateStatus: () => true,
    })

    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`OpenRouter HTTP ${resp.status}: ${JSON.stringify(resp.data).slice(0, 300)}`)
    }

    const raw = resp?.data?.choices?.[0]?.message?.content ?? ''
    const parsed = safeJsonParse(raw)
    return {
      samePerson: Boolean(parsed?.same_person),
      confidence: ['high', 'medium', 'low'].includes(parsed?.confidence) ? parsed.confidence : 'low',
      reason: parsed?.reason ? String(parsed.reason).slice(0, 200) : null,
    }
  } catch (error) {
    console.warn('[caudal] compareNamesWithOpenRouter fallo:', error?.message || error)
    return { samePerson: false, confidence: 'low', reason: 'ai_error' }
  }
}

// ─── Find best Caudal event ──────────────────────────────────────────────────

const findBestCaudalEvent = async ({ clientId, clientCuit, amount, verifiedTitularName, transactionId = null, bankAccountId }) => {
  const normalizedClientCuit = normalizeDigits(clientCuit)
  const normalizedTransactionId = String(transactionId || '').trim()
  const normalizedTargetName = normalizeTitle(verifiedTitularName || '')

  if (normalizedTransactionId) {
    const { rows: exactRows } = await query(
      `SELECT e.* FROM caudal_transaction_events e
       WHERE e.bank_account_id = ?
         AND (TRIM(COALESCE(e.external_transaction_id, '')) = ?)
       ORDER BY e.occurred_at DESC, e.updated_at DESC, e.id DESC
       LIMIT 20`,
      [bankAccountId, normalizedTransactionId]
    )
    if (exactRows?.length) return groupCaudalRowsByTransactionId(exactRows)[0]
  }

  const amountNum = Number(amount)
  const amountIsValid = Number.isFinite(amountNum) && amountNum > 0
  const amountSql = amountIsValid ? Number(amountNum).toFixed(2) : null

  const candidateQuery = `
    SELECT e.* FROM caudal_transaction_events e
    WHERE e.bank_account_id = ?
      AND e.event_name IN ('transferencia.detectada', 'transferencia.actualizada')
      AND (e.our_status IS NULL OR e.our_status = 'pending')
      AND (e.status IS NULL OR e.status IN ('preliminar', 'acreditado'))
      ${amountIsValid ? 'AND e.amount = ?' : ''}
    ORDER BY e.occurred_at DESC, e.updated_at DESC, e.id DESC
    LIMIT 30
  `
  let { rows } = await query(candidateQuery, amountIsValid ? [bankAccountId, amountSql] : [bankAccountId])

  if (!rows?.length && amountIsValid && normalizedTargetName) {
    const fallback = await query(
      `SELECT e.* FROM caudal_transaction_events e
       WHERE e.bank_account_id = ?
         AND e.event_name IN ('transferencia.detectada', 'transferencia.actualizada')
         AND (e.our_status IS NULL OR e.our_status = 'pending')
         AND (e.status IS NULL OR e.status IN ('preliminar', 'acreditado'))
       ORDER BY e.occurred_at DESC, e.updated_at DESC, e.id DESC
       LIMIT 30`,
      [bankAccountId]
    )
    rows = fallback.rows
  }

  if (!rows?.length) return null

  const groupedRows = groupCaudalRowsByTransactionId(rows)
  const canonicalTargetName = canonicalComparableTitle(verifiedTitularName || '')

  const exactNameRows = groupedRows.filter(
    (row) => canonicalComparableTitle(row.from_name || '') === canonicalTargetName
  )
  if (exactNameRows.length === 1) {
    return { ...exactNameRows[0], match_ambiguous: false, match_ambiguous_reason: null, match_ambiguous_detail: null, match_ambiguous_count: 1 }
  }
  if (exactNameRows.length > 1) {
    return markCaudalEventAmbiguous(
      exactNameRows[0],
      'ambiguous_exact_name',
      `Hay ${exactNameRows.length} pagos pendientes con coincidencia exacta de nombre; requiere revision manual.`,
      exactNameRows.length
    )
  }

  if (!normalizedTargetName) return null

  const scored = groupedRows
    .map((row) => {
      const baseName = normalizeTitle(row.from_name || '')
      let score = similarityScore(baseName, normalizedTargetName)
      if (sameComparableTitleTokens(row.from_name || '', verifiedTitularName || '')) score += 2
      if (amountIsValid && Number(row.amount) === Number(amountNum)) score += 0.25
      if (
        normalizedClientCuit &&
        (normalizeDigits(row.client_cuit_cuil) === normalizedClientCuit ||
          normalizeDigits(row.from_cuit) === normalizedClientCuit)
      ) score += 0.5
      return { row, score }
    })
    .sort((a, b) => b.score - a.score)

  const topCandidates = scored.slice(0, 5)
  const best = topCandidates[0]
  const second = topCandidates[1]

  if (!best || best.score < 0.85) return null

  if (second && best.score - second.score < 0.08) {
    return markCaudalEventAmbiguous(
      best.row,
      'ambiguous_close_match',
      'Hay al menos 2 pagos muy cercanos por nombre y monto; requiere revisión manual.',
      2
    )
  }

  for (const candidate of topCandidates) {
    if (!candidate.row?.from_name) continue
    const aiMatch = await compareNamesWithOpenRouter(verifiedTitularName, candidate.row.from_name)
    if (aiMatch.samePerson) {
      return { ...candidate.row, match_ambiguous: false, match_ambiguous_reason: null, match_ambiguous_detail: null, match_ambiguous_count: null }
    }
  }

  return null
}

// ─── Insert client file message ───────────────────────────────────────────────

const insertClientFileMessageAndEmit = async ({ chatId, filename, createdAt, isPdf = false }) => {
  if (!chatId || !filename) return null

  const fileCreatedAt = moment.utc(createdAt, 'YYYY-MM-DD HH:mm:ss', true).subtract(1, 'second').format('YYYY-MM-DD HH:mm:ss')
  const fileCreatedAtStrict = moment.utc(fileCreatedAt, 'YYYY-MM-DD HH:mm:ss', true)
  const fileCreatedAtTs = fileCreatedAtStrict.isValid() ? fileCreatedAtStrict.valueOf() : Date.now()

  const { rows: insertRows, error } = await query(
    `INSERT INTO messages (chat_id, content, is_image, image_name, is_sticker, sender, created_at, is_pdf)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [chatId, '', isPdf ? 0 : 1, filename, 0, 'client', fileCreatedAt, isPdf ? 1 : 0]
  )
  if (error) throw error

  const insertId = insertRows?.insertId
  const messageId = `msg-${insertId}`

  getIo()?.to(Number(chatId))?.emit?.('newImageMessage', {
    chatId,
    clientId: null,
    image_name: filename,
    is_image: !isPdf,
    is_pdf: isPdf,
    createdAt: fileCreatedAt,
    createdAtTs: fileCreatedAtTs,
    createdAtIso: new Date(fileCreatedAtTs).toISOString(),
    messageId,
    sender: 'client',
  })

  return {
    insertId,
    messageId,
    image_name: filename,
    createdAt: fileCreatedAt,
    createdAtTs: fileCreatedAtTs,
    createdAtIso: new Date(fileCreatedAtTs).toISOString(),
  }
}

// ─── Chat state updates ───────────────────────────────────────────────────────

const updateChatAfterNoMatch = async (chatId) => {
  try {
    getIo()?.to?.(Number(chatId))?.emit?.('updateChatState', {
      chatId: Number(chatId),
      ticketStatus: 'cargar',
      depositAttemptsExhausted: false,
      showOptionButtons: false,
      showUploadButton: true,
      showCbuAliasButtons: false,
      hideImageUploadButton: true,
      showReportPaymentButton: false,
    })
  } catch (error) {
    console.warn('[caudal] updateChatState emit fallo:', error?.message || error)
  }
}

const updateChatAfterSuccess = async (chatId) => {
  try {
    getIo()?.to?.(Number(chatId))?.emit?.('updateChatState', {
      chatId: Number(chatId),
      ticketStatus: 'cargar',
      depositAttemptsExhausted: false,
      showOptionButtons: true,
      showUploadButton: false,
      showCbuAliasButtons: false,
      hideImageUploadButton: true,
      showReportPaymentButton: false,
    })
  } catch (error) {
    console.warn('[caudal] updateChatState emit fallo:', error?.message || error)
  }
}

// ─── Main payment flow ───────────────────────────────────────────────────────

const handleCaudalPaymentFlow = async ({
  req,
  res,
  chatId,
  userId,
  amount,
  fullName = null,
  extractedData = null,
  fileMeta = null,
  auditSource = 'ocr_image',
}) => {
  const createdAt = moment.utc().format('YYYY-MM-DD HH:mm:ss')
  let ticketId = null
  let comprobanteId = null
  const requestIp = getRequestIp(req)
  const userAgent = req.headers['user-agent'] || null

  const pool = getPool()
  const conn = await pool.getConnection()
  await conn.beginTransaction()

  try {
    const [bankRows] = await conn.query(
      `SELECT ba.id
       FROM chat_processing_config cpc
       INNER JOIN bank_accounts ba ON ba.id = cpc.bank_account_id AND ba.is_active = 1
       INNER JOIN bank_providers bp ON bp.id = ba.provider_id
       WHERE cpc.id = 1 AND bp.slug = 'caudal'
       LIMIT 1`
    )
    const bankAccountId = Number(bankRows?.[0]?.id || 0)
    if (!bankAccountId) {
      await conn.rollback()
      conn.release()
      return res.status(409).json({
        ok: false,
        status: 'unavailable',
        message: 'La cuenta Caudal seleccionada no está activa.',
        code: 'ACTIVE_CAUDAL_ACCOUNT_NOT_FOUND',
      })
    }

    const [attemptRows] = await conn.query(
      `SELECT COUNT(*) AS attempts
       FROM caudal_payment_audit_log
       WHERE chat_id = ? AND decision IN ('rejected', 'error')
         AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR)`,
      [chatId]
    )
    const attempts = Number(attemptRows?.[0]?.attempts || 0)

    if (attempts >= 4) {
      await conn.rollback()
      conn.release()
      await updateChatAfterNoMatch(chatId)
      await safeAudit({
        source: auditSource, decision: 'rejected', reasonCode: 'retry_exhausted',
        reasonDetail: 'Se alcanzo el limite de intentos.',
        clientId: userId, chatId, userId,
        externalTransactionId: extractedData?.transaction_id || null,
        amount: extractedData?.amount || amount || null,
        fromName: extractedData?.from_name || null,
        fromCuit: extractedData?.from_cuit || null,
        requestIp, userAgent, payload: extractedData, metadata: fileMeta,
      })
      return res.status(400).json({ ok: false, status: 'retry_exhausted', message: 'Se ha alcanzado el limite de intentos.' })
    }

    const [clientRows] = await conn.query(
      `SELECT id, username, full_name, cuil AS cuit_cuil, verified_titular_name FROM clients WHERE id = ? LIMIT 1`,
      [userId]
    )

    if (!clientRows?.length) {
      await conn.rollback()
      conn.release()
      await updateChatAfterNoMatch(chatId)
      await safeAudit({
        source: auditSource, decision: 'rejected', reasonCode: 'client_not_found',
        reasonDetail: 'Cliente no encontrado.',
        clientId: userId, chatId, userId,
        externalTransactionId: extractedData?.transaction_id || null,
        amount: extractedData?.amount || amount || null,
        fromName: extractedData?.from_name || null,
        fromCuit: extractedData?.from_cuit || null,
        requestIp, userAgent, payload: extractedData, metadata: fileMeta,
      })
      return res.status(404).json({ ok: false, message: 'Cliente no encontrado.' })
    }

    const client = clientRows[0]
    const clientCuit = normalizeDigits(client.cuit_cuil)
    const hasValidClientCuit = /^\d{11}$/.test(clientCuit)

    const providedFullName = normalizeHumanFullName(fullName || client.full_name)
    let verifiedTitularName = String(client.verified_titular_name || '').trim()
    const extractedFromName = normalizeHumanFullName(extractedData?.from_name || '')
    const hasValidExtractedFromName = isValidHumanFullName(extractedFromName)

    if (!verifiedTitularName && hasValidExtractedFromName) {
      await storeClientVerifiedTitularName(userId, extractedFromName, 'caudal_transactions')
      verifiedTitularName = extractedFromName
    }

    if (!verifiedTitularName) {
      if (providedFullName) {
        if (!isValidHumanFullName(providedFullName)) {
          await conn.rollback()
          conn.release()
          await updateChatAfterNoMatch(chatId)
          const auditId = await safeAudit({
            source: auditSource, decision: 'rejected', reasonCode: 'invalid_full_name',
            reasonDetail: 'El nombre ingresado no tiene un formato valido.',
            clientId: userId, chatId, userId,
            externalTransactionId: extractedData?.transaction_id || null,
            amount: extractedData?.amount || amount || null,
            fromName: extractedData?.from_name || null,
            fromCuit: extractedData?.from_cuit || null,
            requestIp, userAgent, payload: extractedData, metadata: fileMeta,
          })
          if (fileMeta?.insertId && auditId) await linkCaudalAuditToMessage(fileMeta.insertId, auditId, chatId)
          await sendAutoMessage('caudal_request_name', chatId, 'Necesitamos tu nombre y apellido para continuar con el pago Caudal.')
          return res.status(200).json({ ok: true, status: 'waiting_name', requiresName: true, message: 'Ingresá un nombre y apellido válido para continuar.' })
        }

        await storeClientVerifiedTitularName(userId, providedFullName, 'manual')
        verifiedTitularName = providedFullName
      }

      if (!verifiedTitularName) {
        await conn.rollback()
        conn.release()
        await updateChatAfterNoMatch(chatId)
        const auditId = await safeAudit({
          source: auditSource, decision: 'ignored', reasonCode: 'missing_verified_titular_name',
          reasonDetail: 'El cliente no tiene un nombre afiliado y no se proporciono uno nuevo.',
          clientId: userId, chatId, userId,
          externalTransactionId: extractedData?.transaction_id || null,
          amount: extractedData?.amount || amount || null,
          fromName: extractedData?.from_name || null,
          fromCuit: extractedData?.from_cuit || null,
          requestIp, userAgent, payload: extractedData, metadata: fileMeta,
        })
        if (fileMeta?.insertId && auditId) await linkCaudalAuditToMessage(fileMeta.insertId, auditId, chatId)
        await sendAutoMessage('caudal_request_name', chatId, 'Necesitamos tu nombre y apellido para continuar con el pago Caudal.')
        return res.status(200).json({
          ok: true, status: 'waiting_name', requiresName: true, chatId, ticketId,
          message: 'Necesitamos tu nombre y apellido para continuar con el pago Caudal.',
          extractedData, file: fileMeta || null,
        })
      }
    }

    if (providedFullName && !isValidHumanFullName(providedFullName)) {
      await conn.rollback()
      conn.release()
      await updateChatAfterNoMatch(chatId)
      await safeAudit({
        source: auditSource, decision: 'rejected', reasonCode: 'invalid_full_name',
        reasonDetail: 'El nombre ingresado no tiene un formato valido.',
        clientId: userId, chatId, userId,
        externalTransactionId: extractedData?.transaction_id || null,
        amount: extractedData?.amount || amount || null,
        fromName: extractedData?.from_name || null,
        fromCuit: extractedData?.from_cuit || null,
        requestIp, userAgent, payload: extractedData, metadata: fileMeta,
      })
      return res.status(400).json({ ok: false, message: 'Ingresá un nombre y apellido válido para continuar.' })
    }

    if (!verifiedTitularName && providedFullName) verifiedTitularName = providedFullName

    if (!verifiedTitularName) {
      await conn.rollback()
      conn.release()
      await updateChatAfterNoMatch(chatId)
      const auditId = await safeAudit({
        source: auditSource, decision: 'ignored', reasonCode: 'missing_verified_titular_name',
        reasonDetail: 'El cliente no tiene un nombre afiliado.',
        clientId: userId, chatId, userId,
        externalTransactionId: extractedData?.transaction_id || null,
        amount: extractedData?.amount || amount || null,
        fromName: extractedData?.from_name || null,
        fromCuit: extractedData?.from_cuit || null,
        requestIp, userAgent, payload: extractedData, metadata: fileMeta,
      })
      if (fileMeta?.insertId && auditId) await linkCaudalAuditToMessage(fileMeta.insertId, auditId, chatId)
      await sendAutoMessage('caudal_request_name', chatId, 'Necesitamos tu nombre y apellido para continuar con el pago Caudal.')
      return res.status(200).json({
        ok: true, status: 'waiting_name', requiresName: true, chatId, ticketId,
        message: 'Necesitamos tu nombre y apellido para continuar con el pago Caudal.',
        extractedData, file: fileMeta || null,
      })
    }

    if (!verifiedTitularName) {
      try {
        verifiedTitularName = (await resolveClientVerifiedTitularName(userId)) || ''
      } catch (error) {
        console.warn('[caudal] No se pudo resolver verified_titular_name:', error?.message || error)
      }
    }

    const aiAmount = Number(extractedData?.amount)
    const amountNum = Number.isFinite(aiAmount) && aiAmount > 0 ? aiAmount : Number(amount)
    const titleHint = extractedData?.from_name || verifiedTitularName || client.full_name || null

    // Release connection before doing expensive async work (findBestCaudalEvent)
    // We'll re-open a transaction after if needed
    await conn.rollback()
    conn.release()

    const movement = await findBestCaudalEvent({
      clientId: userId,
      clientCuit: hasValidClientCuit ? clientCuit : null,
      amount: Number.isFinite(amountNum) && amountNum > 0 ? amountNum : null,
      verifiedTitularName: titleHint,
      transactionId: extractedData?.transaction_id || null,
      bankAccountId,
    })

    if (!movement) {
      await updateChatAfterNoMatch(chatId)
      const auditId = await safeAudit({
        source: auditSource, decision: 'rejected', reasonCode: 'no_pending_match',
        reasonDetail: 'No se encontro una transaccion Caudal compatible.',
        clientId: userId, chatId, userId,
        externalTransactionId: extractedData?.transaction_id || null,
        amount: extractedData?.amount || amount || null,
        fromName: extractedData?.from_name || null,
        fromCuit: extractedData?.from_cuit || null,
        requestIp, userAgent, payload: extractedData, metadata: fileMeta,
      })
      if (fileMeta?.insertId && auditId) await linkCaudalAuditToMessage(fileMeta.insertId, auditId, chatId)
      await sendAutoMessage('caudal_no_pending', chatId, 'No encontramos un pago pendiente. Subí el comprobante para revisarlo manualmente.')
      return res.status(200).json({
        ok: true, status: 'no_pending', chatId, ticketId,
        message: 'No encontramos un pago pendiente. Subi el comprobante para revisarlo manualmente.',
        extractedData, file: fileMeta || null,
      })
    }

    if (movement.match_ambiguous) {
      await updateChatAfterNoMatch(chatId)
      const auditId = await safeAudit({
        source: auditSource, decision: 'ignored',
        reasonCode: movement.match_ambiguous_reason || 'ambiguous_name_match',
        reasonDetail: movement.match_ambiguous_detail || 'La coincidencia es ambigua y quedó pendiente de revisión manual.',
        clientId: userId, chatId, userId,
        externalTransactionId: movement.external_transaction_id || extractedData?.transaction_id || null,
        amount: movement.amount || extractedData?.amount || amount || null,
        fromName: movement.from_name || extractedData?.from_name || null,
        fromCuit: movement.from_cuit || extractedData?.from_cuit || null,
        coelsaCode: movement.coelsa_code || null,
        matchSource: movement.match_source || 'client_name_exact_ambiguous',
        requestIp, userAgent, payload: extractedData, metadata: fileMeta,
      })
      if (fileMeta?.insertId && auditId) await linkCaudalAuditToMessage(fileMeta.insertId, auditId, chatId)
      await sendAutoMessage('caudal_pending', chatId, 'Tu pago quedó en revisión manual. Un administrador lo va a revisar y, si hace falta, se va a contactar con vos.')
      return res.status(200).json({
        ok: true, status: 'review_pending', chatId, ticketId,
        message: 'Tu pago quedó en revisión manual. Un administrador lo va a revisar y, si hace falta, se va a contactar con vos.',
        reviewReason: movement.match_ambiguous_detail || 'Hay más de una coincidencia fuerte por nombre. Revisá el caso manualmente.',
        extractedData, file: fileMeta || null,
      })
    }

    const transactionId = String(movement.external_transaction_id || '').trim()

    if (!transactionId) {
      await updateChatAfterNoMatch(chatId)
      await safeAudit({
        source: auditSource, decision: 'rejected', reasonCode: 'missing_transaction_id',
        reasonDetail: 'No se pudo determinar el identificador de la transaccion.',
        clientId: userId, chatId, userId,
        externalTransactionId: extractedData?.transaction_id || null,
        amount: extractedData?.amount || amount || null,
        fromName: extractedData?.from_name || null,
        fromCuit: extractedData?.from_cuit || null,
        requestIp, userAgent, payload: extractedData, metadata: fileMeta,
      })
      return res.status(400).json({ ok: false, message: 'No se pudo determinar el identificador de la transaccion Caudal.' })
    }

    // Open a new transaction for the actual writes
    const conn2 = await pool.getConnection()
    await conn2.beginTransaction()

    try {
      const [eventRows] = await conn2.query(
        `SELECT id, our_status, balance_credited_at
         FROM caudal_transaction_events
         WHERE external_transaction_id = ? AND bank_account_id = ?
         ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        [transactionId, bankAccountId]
      )
      const lockedEvent = eventRows?.[0]
      if (!lockedEvent) throw new Error('No se encontró el evento Caudal a acreditar.')

      const duplicated = lockedEvent.our_status === 'paid' || Boolean(lockedEvent.balance_credited_at)
      comprobanteId = null

      if (!duplicated) {
        const credit = await creditPanelBalance({
          clientId: userId,
          amountArs: Number(movement.amount || amountNum || 0),
        })
        if (!credit?.ok) {
          throw new Error(credit?.data?.message || credit?.message || 'Falló la acreditación del saldo en el panel.')
        }

        await conn2.query(
          `UPDATE caudal_transaction_events
           SET match_source = ?, our_status = 'paid', matched_at = CURRENT_TIMESTAMP,
               client_id = COALESCE(client_id, ?),
               client_cuit_cuil = COALESCE(client_cuit_cuil, ?),
               balance_credited_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE external_transaction_id = ? AND bank_account_id = ?`,
          [titleHint ? 'manual' : 'client_cuit_cuil', userId, clientCuit, transactionId, bankAccountId]
        )
      }

      await conn2.commit()

      if (duplicated) {
        await sendAutoMessage('caudal_comprobante_duplicado', chatId, 'El comprobante ingresado ya se encuentra registrado previamente.')
      } else {
        await updateChatAfterSuccess(chatId)
      }

      const auditId = await safeAudit({
        source: auditSource,
        decision: duplicated ? 'duplicate' : 'accepted',
        reasonCode: duplicated ? 'idempotent_duplicate' : 'matched_and_credited',
        reasonDetail: duplicated
          ? 'Ya existia un comprobante pagado para esta transaccion.'
          : 'La transaccion Caudal fue matcheada y acreditada.',
        clientId: userId, chatId, userId, comprobanteId,
        caudalTransactionEventId: movement.id,
        externalTransactionId: transactionId,
        amount: Number(movement.amount || amountNum || 0),
        currency: movement.currency || 'ARS',
        fromName: movement.from_name || extractedData?.from_name || null,
        fromCuit: movement.from_cuit || extractedData?.from_cuit || null,
        coelsaCode: movement.coelsa_code || null,
        matchSource: movement.match_source || null,
        aiConfidence: extractedData?.confidence || null,
        requestIp, userAgent, payload: extractedData, metadata: fileMeta,
      })
      if (fileMeta?.insertId && auditId) await linkCaudalAuditToMessage(fileMeta.insertId, auditId, chatId)

      if (!duplicated) {
        await sendAutoMessage('caudal_deposito_completado', chatId, '¡Tu depósito fue acreditado con éxito! Ya podés jugar.', {
          amount: Number(movement.amount || amountNum || 0).toFixed(2),
          monto: Number(movement.amount || amountNum || 0).toFixed(2),
          transactionId,
          transaction_id: transactionId,
          verifiedTitularName: verifiedTitularName || null,
          verified_titular_name: verifiedTitularName || null,
        })
      }

      try { await resetClientBot(chatId) }
      catch (error) { console.warn('[caudal] No se pudo reiniciar el bot tras acreditar:', error?.message || error) }
      conn2.release()
      return res.status(200).json({
        ok: true,
        status: duplicated ? 'duplicado' : 'pagado',
        chatId, ticketId, comprobanteId,
        amount: Number(movement.amount || amountNum || 0),
        transactionId,
        message: duplicated
          ? 'Ya existia un registro previo para esta transaccion. Se devolvio la respuesta como idempotente.'
          : 'Pago encontrado y acreditado correctamente.',
        verifiedTitularName: verifiedTitularName || null,
        extractedData, file: fileMeta || null,
      })
    } catch (innerError) {
      try { await conn2.rollback() } catch {}
      conn2.release()
      throw innerError
    }
  } catch (error) {
    console.error('[caudal] Error en handleCaudalPaymentFlow:', error)

    try { await conn.rollback() } catch {}
    try { conn.release() } catch {}

    await updateChatAfterNoMatch(chatId)
    await safeAudit({
      source: auditSource, decision: 'error', reasonCode: 'processing_error',
      reasonDetail: error?.message || 'Error al procesar comprobante Caudal.',
      clientId: userId, chatId, userId,
      externalTransactionId: extractedData?.transaction_id || null,
      amount: extractedData?.amount || amount || null,
      fromName: extractedData?.from_name || null,
      fromCuit: extractedData?.from_cuit || null,
      requestIp, userAgent, payload: extractedData, metadata: fileMeta,
    })

    return res.status(500).json({ ok: false, message: error?.message || 'Error al procesar comprobante Caudal.' })
  }
}

// ─── Exported handlers ────────────────────────────────────────────────────────

export async function requestPaymentCaudal(req, res) {
  const chatId = Number(req.body?.chatId || req.params?.chatId || 0) || null
  const userId = Number(req.body?.userId || req.body?.clientId || req.client?.sub || 0) || null
  const { amount, fullName } = req.body || {}

  if (!chatId || !userId) {
    return res.status(400).json({ ok: false, message: 'chatId y userId son obligatorios.' })
  }

  return handleCaudalPaymentFlow({
    req, res,
    chatId,
    userId,
    amount,
    fullName,
    extractedData: null,
    fileMeta: null,
    auditSource: 'report_payment',
  })
}

export async function processImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No se proporciono ninguna imagen.' })
    }

    const chatId = Number(req.body?.chatId || 0) || null
    const userId = Number(req.body?.userId || req.body?.clientId || req.client?.sub || 0) || null

    if (!chatId || !userId) {
      return res.status(400).json({ ok: false, message: 'chatId y userId son obligatorios.' })
    }

    const createdAt = moment.utc().format('YYYY-MM-DD HH:mm:ss')
    const existingMessageId = Number(req.body?.existingMessageId || 0) || null
    const fileMeta = existingMessageId
      ? { insertId: existingMessageId, messageId: `msg-${existingMessageId}`, image_name: req.file.filename, createdAt }
      : await insertClientFileMessageAndEmit({
          chatId,
          filename: req.file.filename,
          createdAt,
          isPdf: false,
        })

    let extractedData
    try {
      extractedData = await extractWithOpenRouter({
        filePath: req.file.path,
        mimeType: req.file.mimetype || 'image/jpeg',
      })
    } catch (error) {
      console.error('[caudal] OCR de imagen fallo:', error?.message || error)
      await safeAudit({
        source: 'ocr_image', decision: 'rejected', reasonCode: 'ocr_failed',
        reasonDetail: error?.message || 'No se pudo leer la imagen del comprobante.',
        clientId: userId, chatId, userId,
        requestIp: getRequestIp(req),
        userAgent: req.headers['user-agent'] || null,
        payload: { fileName: req.file?.filename || null, mimeType: req.file?.mimetype || null },
        metadata: fileMeta,
      })
      await updateChatAfterNoMatch(chatId)
      return res.status(200).json({
        ok: false, status: 'falla_lectura',
        message: 'No se pudo leer la imagen del comprobante. Quedo para revision manual.',
        chatId, userId, file: fileMeta || null,
      })
    }

    return handleCaudalPaymentFlow({
      req, res, chatId, userId,
      amount: req.body?.amount,
      fullName: req.body?.fullName,
      extractedData, fileMeta,
      auditSource: 'ocr_image',
    })
  } catch (error) {
    console.error('[caudal] Error en processImage:', error)
    return res.status(500).json({ ok: false, message: error?.message || 'Error al procesar la imagen Caudal.' })
  }
}

export async function processPdf(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No se proporciono ningun PDF.' })
    }

    const chatId = Number(req.body?.chatId || 0) || null
    const userId = Number(req.body?.userId || req.body?.clientId || req.client?.sub || 0) || null

    if (!chatId || !userId) {
      return res.status(400).json({ ok: false, message: 'chatId y userId son obligatorios.' })
    }

    const createdAt = moment.utc().format('YYYY-MM-DD HH:mm:ss')
    const existingMessageId = Number(req.body?.existingMessageId || 0) || null
    const fileMeta = existingMessageId
      ? { insertId: existingMessageId, messageId: `msg-${existingMessageId}`, image_name: req.file.filename, createdAt }
      : await insertClientFileMessageAndEmit({
          chatId,
          filename: req.file.filename,
          createdAt,
          isPdf: true,
        })

    let extractedData
    try {
      extractedData = await extractWithOpenRouter({
        filePath: req.file.path,
        mimeType: req.file.mimetype || 'application/pdf',
      })
    } catch (error) {
      console.error('[caudal] OCR de PDF fallo:', error?.message || error)
      await safeAudit({
        source: 'ocr_pdf', decision: 'rejected', reasonCode: 'ocr_failed',
        reasonDetail: error?.message || 'No se pudo leer el PDF del comprobante.',
        clientId: userId, chatId, userId,
        requestIp: getRequestIp(req),
        userAgent: req.headers['user-agent'] || null,
        payload: { fileName: req.file?.filename || null, mimeType: req.file?.mimetype || null },
        metadata: fileMeta,
      })
      await updateChatAfterNoMatch(chatId)
      return res.status(200).json({
        ok: false, status: 'falla_lectura',
        message: 'No se pudo leer el PDF del comprobante. Quedo para revision manual.',
        chatId, userId, file: fileMeta || null,
      })
    }

    return handleCaudalPaymentFlow({
      req, res, chatId, userId,
      amount: req.body?.amount,
      fullName: req.body?.fullName,
      extractedData, fileMeta,
      auditSource: 'ocr_pdf',
    })
  } catch (error) {
    console.error('[caudal] Error en processPdf:', error)
    return res.status(500).json({ ok: false, message: error?.message || 'Error al procesar el PDF Caudal.' })
  }
}

export async function processCaudalClientReceipt({ chatId, clientId, messageId, dataUrl }) {
  const parsed = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!parsed) throw new Error('No se pudo leer el archivo enviado por el cliente.')

  const mimeType = parsed[1]
  const isPdf = mimeType === 'application/pdf'
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'caudal-receipt-'))
  const tempFile = path.join(tmpDir, `${Date.now()}${isPdf ? '.pdf' : '.jpg'}`)
  fs.writeFileSync(tempFile, Buffer.from(parsed[2], 'base64'))

  const fakeReq = {
    file: { path: tempFile, filename: path.basename(tempFile), mimetype: mimeType },
    body: { chatId, clientId, userId: clientId, existingMessageId: messageId },
    headers: {},
  }
  const fakeRes = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this },
    json(payload) { this.payload = payload; return payload },
  }

  try {
    if (isPdf) await processPdf(fakeReq, fakeRes)
    else await processImage(fakeReq, fakeRes)
    const payload = fakeRes.payload || { ok: false, status: 'processing_error' }
    const statusMap = {
      pagado: 'paid',
      duplicado: 'duplicate',
      no_pending: 'not_found',
      review_pending: 'pending',
      waiting_name: 'insufficient_info',
      falla_lectura: 'invalid',
      retry_exhausted: 'invalid',
    }
    return {
      ...payload,
      status: statusMap[payload.status] || payload.status || (payload.ok ? 'pending' : 'invalid'),
      resultReason: payload.resultReason || payload.status || payload.message || null,
    }
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }) } catch {}
  }
}
