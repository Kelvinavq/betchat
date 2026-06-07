import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { query, transaction } from '../config/database.js'
import { config } from '../config/config.js'
import { getCookieValue } from '../middlewares/authMiddleware.js'
import { parseMysqlUtc as parseMysqlDate, toTimezoneIso } from '../utils/eventTime.js'
import {
  findClientEventParticipant,
  hasClientEventPaidParticipation,
  syncClientEventReceiptPaid,
} from '../utils/eventParticipantStatus.js'
import { getSystemConfig } from './settingsController.js'
import { io } from '../app.js'
import { persistMessage } from './chatController.js'
import { creditPanelBalance } from './mercadoPagoController.js'
import { settleEventRewardPaid } from '../utils/eventRewardSettlement.js'

// ============================================================
//  MULTER — Receipt upload
// ============================================================

const RECEIPTS_DIR = path.join(process.cwd(), 'public', 'event-receipts')
fs.mkdirSync(RECEIPTS_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, RECEIPTS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '')
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

export const uploadReceiptMiddleware = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|webp/
    const ok = allowed.test(file.mimetype) || allowed.test(path.extname(file.originalname).toLowerCase())
    cb(ok ? null : new Error('Formato no permitido'), ok)
  },
}).single('receipt')

// ============================================================
//  HELPERS
// ============================================================

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

function isEventStillActive(event, now = Date.now()) {
  const endsAt = parseMysqlDate(event.ends_at)
  if (endsAt) return endsAt.valueOf() > now

  const startsAt = parseMysqlDate(event.starts_at) || parseMysqlDate(event.created_at)
  if (startsAt && event.duration_minutes != null) {
    return startsAt.valueOf() + Number(event.duration_minutes) * 60_000 > now
  }

  return true
}

async function getLatestClientChatId(clientId) {
  const { rows, error } = await query(
    'SELECT id FROM chats WHERE client_id = ? AND is_archived = 0 ORDER BY id DESC LIMIT 1',
    [clientId]
  )
  if (error) throw error
  return rows?.[0]?.id ? Number(rows[0].id) : null
}

function fileToDataUrl(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath)
  const mime = mimeType || 'application/octet-stream'
  return `data:${mime};base64,${buffer.toString('base64')}`
}

function removeFileQuietly(filePath) {
  if (!filePath) return
  try {
    fs.unlinkSync(filePath)
  } catch {}
}

function parseJsonSafe(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function sanitizePublicConfigForClient(type, cfg) {
  const publicCfg = cfg && typeof cfg === 'object' ? { ...cfg } : {}
  const normalizedType = String(type || '').toLowerCase()
  if (normalizedType === 'quiz') {
    delete publicCfg.correct_option
  }
  if (normalizedType === 'scratch') {
    delete publicCfg.prizes
    delete publicCfg.win_rules
  }
  if (normalizedType === 'slots') {
    delete publicCfg.prizes
  }
  return publicCfg
}

const RECEIPT_RETRYABLE_STATUSES = new Set(['duplicate', 'error', 'invalid', 'amount_low'])
const RECEIPT_REQUIRED_EVENT_TYPES = new Set(['sorteo', 'briefcase', 'treasure_chest'])

function buildReceiptCaption(event) {
  const title = String(event?.title || event?.type || 'evento').trim()
  return `Comprobante subido desde el evento "${title}" (#${event?.id || ''}).`
}

async function resolveReceiptProcessorContext(chatId) {
  const { rows, error } = await query(
    `SELECT bi.receipt_processing, cpc.bank_account_id, bp.slug AS active_provider
     FROM chats ch
     LEFT JOIN bot_items bi ON bi.id = ch.bot_last_button_id
     LEFT JOIN chat_processing_config cpc ON cpc.id = 1
     LEFT JOIN bank_accounts ba ON ba.id = cpc.bank_account_id
     LEFT JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE ch.id = ?
     LIMIT 1`,
    [chatId]
  )
  if (error) throw error
  return rows?.[0] || {}
}

async function processEventReceiptThroughActiveProvider({
  clientId,
  event,
  eventId,
  receiptChatId,
  receiptMessage,
  receiptDataUrl,
  baseReceiptPayload,
  participantId,
}) {
  const context = await resolveReceiptProcessorContext(receiptChatId)
  const activeProvider = String(context.active_provider || '').toLowerCase()
  const receiptProcessing = String(context.receipt_processing || '').toLowerCase()
  const bankAccountId = context.bank_account_id || null
  const eventMinDepositAmount = Number(event.min_deposit_amount || 0) || null

  let processingResult = null
  if (activeProvider === 'mercadopago') {
    const { processMercadoPagoClientReceipt } = await import('./mercadoPagoController.js')
    processingResult = await processMercadoPagoClientReceipt({
      chatId: receiptChatId,
      clientId,
      messageId: receiptMessage?.message?.id || null,
      dataUrl: receiptDataUrl,
      fileName: receiptMessage?.message?.file_name || receiptMessage?.message?.fileName || '',
      eventMinDepositAmount,
    })
  } else if (activeProvider === 'hgcash') {
    const { processHgCashClientReceipt } = await import('./hgCashController.js')
    processingResult = await processHgCashClientReceipt({
      chatId: receiptChatId,
      clientId,
      messageId: receiptMessage?.message?.id || null,
      dataUrl: receiptDataUrl,
      fileName: receiptMessage?.message?.file_name || receiptMessage?.message?.fileName || '',
      eventMinDepositAmount,
    })
  } else {
    const { processManualClientReceipt } = await import('./chatController.js')
    processingResult = await processManualClientReceipt({
      chatId: receiptChatId,
      clientId,
      messageId: receiptMessage?.message?.id || null,
      dataUrl: receiptDataUrl,
      bankAccountId,
      eventMinDepositAmount,
    })
  }

  if (!processingResult && receiptProcessing !== 'manual') {
    const { processManualClientReceipt } = await import('./chatController.js')
    processingResult = await processManualClientReceipt({
      chatId: receiptChatId,
      clientId,
      messageId: receiptMessage?.message?.id || null,
      dataUrl: receiptDataUrl,
      bankAccountId,
      eventMinDepositAmount,
    })
  }

  const receiptLogId = Number(processingResult?.receiptLogId || 0) || null
  let receiptMovementId = Number(processingResult?.movementId || 0) || null
  if (!receiptMovementId && receiptLogId) {
    const { rows: receiptLogRows } = await query(
      'SELECT movement_id FROM receipt_logs WHERE id = ? LIMIT 1',
      [receiptLogId]
    )
    receiptMovementId = receiptLogRows?.[0]?.movement_id ? Number(receiptLogRows[0].movement_id) : null
  }

  const extractedAmount = Number(
    processingResult?.extractedData?.amount
    ?? processingResult?.amount
    ?? processingResult?.panel?.amount
    ?? 0
  ) || null
  let receiptStatus = processingResult?.status || baseReceiptPayload.receipt_status
  let receiptReason = processingResult?.resultReason || null

  if (receiptStatus === 'paid' && eventMinDepositAmount > 0) {
    const numAmount = Number(extractedAmount || 0)
    if (numAmount < eventMinDepositAmount) {
      receiptStatus = 'amount_low'
      receiptReason = numAmount > 0
        ? `amount_below_event_min_${eventMinDepositAmount}`
        : `amount_unverifiable_min_${eventMinDepositAmount}`
    }
  }

  const processedPayload = {
    ...baseReceiptPayload,
    receipt_status: receiptStatus,
    receipt_processing_reason: receiptReason,
    receipt_processed_at: receiptStatus ? new Date().toISOString() : null,
    receipt_pending: receiptStatus !== 'paid',
    receipt_retryable: RECEIPT_RETRYABLE_STATUSES.has(receiptStatus),
    receipt_log_id: receiptLogId,
    receipt_movement_id: receiptMovementId,
  }

  await query(
    'UPDATE event_participants SET payload_json = ? WHERE id = ?',
    [JSON.stringify(processedPayload), participantId]
  ).catch(() => {})

  io?.to(`client:${clientId}`).emit('event:receipt_result', {
    eventId: Number(eventId),
    clientId: Number(clientId),
    receiptStatus,
    receiptRetryable: RECEIPT_RETRYABLE_STATUSES.has(receiptStatus),
    receiptPending: receiptStatus !== 'paid',
    rewardCreated: false,
    receiptLogId,
  })

  return {
    receiptStatus,
    rewardCreated: false,
    receiptLogId,
    receiptMovementId,
  }
}

async function processEventReceiptInBackground({
  clientId,
  clientUsername,
  event,
  eventId,
  participantId,
  receiptChatId,
  receiptMessage,
  receiptDataUrl,
  receiptUrl,
  baseReceiptPayload,
}) {
  return processEventReceiptThroughActiveProvider({
    clientId,
    event,
    eventId,
    receiptChatId,
    receiptMessage,
    receiptDataUrl,
    baseReceiptPayload,
    participantId,
  })
  let processingResult = null
  try {
    processingResult = await processReceiptAsync({
      chatId: receiptChatId,
      clientId,
      messageId: receiptMessage?.message?.id || null,
      dataUrl: receiptDataUrl,
      eventMinDepositAmount: Number(event.min_deposit_amount || 0) || null,
    })
  } catch (processingErr) {
    console.error('[ClientEvents] uploadReceipt — error procesando comprobante por chat:', processingErr?.message || processingErr)
  }

  const receiptLogId = Number(processingResult?.receiptLogId || 0) || null
  let receiptMovementId = null
  if (receiptLogId) {
    const { rows: receiptLogRows } = await query(
      'SELECT movement_id FROM receipt_logs WHERE id = ? LIMIT 1',
      [receiptLogId]
    )
    receiptMovementId = receiptLogRows?.[0]?.movement_id ? Number(receiptLogRows[0].movement_id) : null
  }

  const minDepositAmount = Number(event.min_deposit_amount || 0)
  const extractedAmount = Number(
    processingResult?.extractedData?.amount
    ?? processingResult?.amount
    ?? processingResult?.panel?.amount
    ?? 0
  ) || null
  let receiptStatus = processingResult?.status || baseReceiptPayload.receipt_status
  let receiptReason = processingResult?.resultReason || null

  if (receiptStatus === 'paid' && minDepositAmount > 0) {
    const numAmount = Number(extractedAmount || 0)
    if (numAmount < minDepositAmount) {
      receiptStatus = 'amount_low'
      receiptReason = numAmount > 0
        ? `amount_below_event_min_${minDepositAmount}`
        : `amount_unverifiable_min_${minDepositAmount}`
    }
  }

  const processedPayload = {
    ...baseReceiptPayload,
    receipt_status: receiptStatus,
    receipt_processing_reason: receiptReason,
    receipt_processed_at: receiptStatus ? new Date().toISOString() : null,
    receipt_pending: receiptStatus !== 'paid',
    receipt_retryable: RECEIPT_RETRYABLE_STATUSES.has(receiptStatus),
    receipt_log_id: receiptLogId,
    receipt_movement_id: receiptMovementId,
  }

  await query(
    'UPDATE event_participants SET payload_json = ? WHERE id = ?',
    [JSON.stringify(processedPayload), participantId]
  ).catch(() => {})

  if (receiptStatus === 'paid') {
    await syncClientEventReceiptPaid({
      clientId,
      eventId: Number(eventId),
      eventType: event.type,
      messageId: receiptMessage?.message?.id || null,
      receiptLogId,
      chatId: receiptChatId || null,
      creditPanelBalance,
      processedAt: processedPayload.receipt_processed_at || new Date().toISOString(),
    }).catch((syncErr) => {
      console.error('[ClientEvents] uploadReceipt — error sincronizando evento pagado:', syncErr?.message || syncErr)
    })
  }

  io?.to(`client:${clientId}`).emit('event:receipt_result', {
    eventId: Number(eventId),
    clientId: Number(clientId),
    receiptStatus,
    receiptRetryable: RECEIPT_RETRYABLE_STATUSES.has(receiptStatus),
    receiptPending: receiptStatus !== 'paid',
    rewardCreated: false,
    receiptLogId,
  })

  return {
    receiptStatus,
    rewardCreated: false,
    receiptLogId,
    receiptMovementId,
  }
}

function weightedRandom(items) {
  const total = items.reduce((s, i) => s + (Number(i.probability) || 0), 0)
  if (!total) return items[0] || null
  let r = Math.random() * total
  for (const item of items) {
    r -= Number(item.probability) || 0
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function resolveGame(event, body) {
  const cfg =
    typeof event.config_json === 'string'
      ? (() => { try { return JSON.parse(event.config_json) } catch { return {} } })()
      : (event.config_json || {})
  const type = event.type

  // Games requiring a receipt (no instant result)
  if (type === 'sorteo') {
    return {
      won: null,
      prize: null,
      requiresReceipt: Boolean(event.min_deposit_amount),
      data: { requires_receipt: Boolean(event.min_deposit_amount) },
    }
  }

  // Voting games — result determined when event ends
  if (type === 'briefcase' || type === 'treasure_chest') {
    const voteKey = String(body?.vote_key || '').trim()
    return {
      won: null,
      prize: null,
      requiresReceipt: false,
      data: { voted_for: voteKey, deferred: true },
    }
  }

  // Ranking — informational enrollment
  if (type === 'ranking') {
    return { won: null, prize: null, requiresReceipt: false, data: { enrolled: true } }
  }

  // Quiz
  if (type === 'quiz') {
    const answer = String(body?.answer || '').toUpperCase()
    const correct = String(cfg.correct_option || '').toUpperCase()
    const isCorrect = answer === correct && Boolean(answer)
    const prize = isCorrect
      ? { label: 'Quiz correcto', prize_type: event.prize_type, amount: Number(event.prize_amount) }
      : null
    return {
      won: isCorrect,
      prize,
      requiresReceipt: false,
      data: { answer, is_correct: isCorrect },
    }
  }

  // Red / Black
  if (type === 'red_black') {
    const options = cfg.options || []
    const winRate = Number(cfg.win_rate) || 50
    const chose = String(body?.chose || options[0]?.label || '').trim()
    const won = Math.random() * 100 < winRate
    const winOption = options[Math.floor(Math.random() * options.length)]
    const prize = won
      ? { label: `Ganaste en ${winOption?.label || 'Rojo/Negro'}`, prize_type: event.prize_type, amount: Number(event.prize_amount) }
      : null
    return { won, prize, requiresReceipt: false, data: { chose, won } }
  }

  // Scratch — 3×3 grid (9 cards). Win rules are line-based:
  // three identical symbols in a horizontal, vertical, or diagonal line.
  if (type === 'scratch') {
    const prizes = cfg.prizes || []
    const isFixedGrid = prizes.length === 9 && prizes.every(p => !('probability' in p))
    const cards = isFixedGrid
      ? prizes
      : Array.from({ length: 9 }, () => weightedRandom(prizes))

    const signatureOf = (card) => {
      if (!card) return ''
      return [
        String(card.icon || '').trim(),
        String(card.label || '').trim(),
        String(card.prize_type || '').trim(),
      ].join('|')
    }

    const linePatterns = [
      { key: 'row_top', label: 'fila superior', positions: [0, 1, 2] },
      { key: 'row_middle', label: 'fila central', positions: [3, 4, 5] },
      { key: 'row_bottom', label: 'fila inferior', positions: [6, 7, 8] },
      { key: 'col_left', label: 'columna izquierda', positions: [0, 3, 6] },
      { key: 'col_middle', label: 'columna central', positions: [1, 4, 7] },
      { key: 'col_right', label: 'columna derecha', positions: [2, 5, 8] },
      { key: 'diag_main', label: 'diagonal principal', positions: [0, 4, 8] },
      { key: 'diag_anti', label: 'diagonal secundaria', positions: [2, 4, 6] },
    ]

    // Build win rules: highest amount first, skip disabled.
    const configRules = Array.isArray(cfg.win_rules) ? cfg.win_rules : []
    const winRules = configRules.length > 0
      ? configRules
          .filter(r => r.enabled !== false)
          .sort((a, b) => Number(b.amount) - Number(a.amount))
      : [{ match_count: 3, amount: Number(event.prize_amount) || 0, label: 'Premio', enabled: true }]

    const matchedLines = []
    for (const pattern of linePatterns) {
      const lineCards = pattern.positions.map((index) => cards[index]).filter(Boolean)
      if (lineCards.length !== 3) continue
      if (lineCards.some((card) => !card || card.prize_type === 'none')) continue
      const sig = signatureOf(lineCards[0])
      if (!sig) continue
      if (lineCards.every((card) => signatureOf(card) === sig)) {
        matchedLines.push({
          ...pattern,
          signature: sig,
          card: lineCards[0],
        })
      }
    }

    const chosenLine = matchedLines[0] || null
    const winRule = chosenLine ? (winRules[0] || null) : null
    const winningSignature = chosenLine?.signature || null
    const winningCard = chosenLine?.card || null
    const prize = winRule
      ? {
          label: winRule.label || winningCard?.label || 'Premio',
          prize_type: 'fichas',
          amount: Number(winRule.amount ?? event.prize_amount ?? 0) || 0,
          icon: winningCard?.icon || '🏆',
        }
      : null

    return {
      won: Boolean(winRule),
      prize,
      requiresReceipt: false,
      data: { revealed: cards },
    }
  }

  // Roulette
  if (type === 'roulette') {
    const segments = cfg.segments || []
    const total = segments.reduce((sum, seg) => sum + (Number(seg.probability) || 0), 0)
    let segmentIndex = -1
    let seg = null

    if (segments.length > 0) {
      let roll = Math.random() * (total > 0 ? total : segments.length)
      for (let i = 0; i < segments.length; i++) {
        roll -= Number(segments[i].probability) || 0 || (total > 0 ? 0 : 1)
        if (roll <= 0) {
          segmentIndex = i
          seg = segments[i]
          break
        }
      }
      if (!seg) {
        segmentIndex = segments.length - 1
        seg = segments[segmentIndex]
      }
    }

    const segmentAmount = Number(
      seg?.amount
      ?? seg?.prize_amount
      ?? event.prize_amount
      ?? 0
    ) || 0
    const won = seg && seg.prize_type !== 'none' && segmentAmount > 0
    const prize = won
      ? { label: seg.label, prize_type: seg.prize_type, amount: segmentAmount, icon: seg.icon, color: seg.color }
      : null
    return { won: Boolean(won), prize, requiresReceipt: false, data: { won, segmentIndex, amount: segmentAmount } }
  }

  // Slots
  if (type === 'slots') {
    const symbols = cfg.symbols || []
    const prizes = cfg.prizes || []
    const winRate = Number(cfg.win_rate) || 35
    const didWin = Math.random() * 100 < winRate && prizes.length > 0
    if (didWin) {
      const prize = weightedRandom(prizes)
      const combo = Array.isArray(prize?.combo) && prize.combo.length > 0
        ? prize.combo.map((item) => String(item || '').trim()).filter(Boolean)
        : symbols.slice(0, 3).map((s) => s.icon)
      return {
        won: true,
        prize: {
          label: prize.label,
          prize_type: prize.prize_type,
          amount: Number(prize.amount ?? event.prize_amount ?? 0),
          combo,
        },
        requiresReceipt: false,
        data: { combo },
      }
    }
    return { won: false, prize: null, requiresReceipt: false, data: { combo: [] } }
  }

  return { won: null, prize: null, requiresReceipt: false, data: {} }
}

function buildMessage(result) {
  if (result.requiresReceipt) return '¡Listo! Subí tu comprobante para participar.'
  if (result.data?.deferred) return '¡Votaste! El resultado se revela al finalizar el evento.'
  if (result.data?.enrolled) return '¡Te inscribiste en el ranking!'
  if (result.won) {
    const p = result.prize
    const suffix =
      p.prize_type === 'fichas'
        ? 'fichas'
        : p.prize_type === 'bono_200'
        ? 'de bono 200%'
        : p.prize_type || ''
    return `¡Felicitaciones! Ganaste ${p.amount} ${suffix}.`.trim()
  }
  if (result.won === false) return 'No fue esta vez. ¡Seguí intentando!'
  return '¡Participación registrada!'
}

// ============================================================
//  CONTROLLERS
// ============================================================

/**
 * GET /api/client/events/active
 * Public — returns active events. If client cookie present, adds has_played flag.
 */
export async function getActiveEvents(req, res, next) {
  try {
    const systemConfig = await getSystemConfig()
    const timezone = systemConfig.timezone || 'UTC'
    const { rows, error } = await query(
       `SELECT id, type, title, description, prize_type, prize_amount, min_deposit_amount,
              duration_minutes, starts_at, ends_at, created_at, config_json
         FROM events
       WHERE status = 'active'
       ORDER BY created_at DESC
       LIMIT 20`
    )
    if (error) return next(error)

    const events = (rows || [])
      .filter((row) => isEventStillActive(row))
      .map((row) => {
        let cfg = row.config_json
        if (typeof cfg === 'string') {
          try { cfg = JSON.parse(cfg) } catch { cfg = {} }
        }
        return {
          ...row,
          starts_at: toTimezoneIso(row.starts_at, timezone),
          ends_at: toTimezoneIso(row.ends_at, timezone),
          created_at: toTimezoneIso(row.created_at, timezone),
          config_json: sanitizePublicConfigForClient(row.type, cfg || {}),
          has_played: false,
        }
      })

    // Optionally check participation for authenticated clients
    const client = await getClientFromCookie(req)
    if (client) {
      for (const event of events) {
        const requiresReceipt = RECEIPT_REQUIRED_EVENT_TYPES.has(String(event.type || '').toLowerCase())
        let paidParticipation = false
        try {
          paidParticipation = await hasClientEventPaidParticipation({
            clientId: client.clientId,
            eventId: event.id,
            eventType: event.type,
          })
        } catch (lookupErr) {
          return next(lookupErr)
        }

        if (paidParticipation && !requiresReceipt) {
          event.__hide = true
          continue
        }

        const participant = await findClientEventParticipant({
          clientId: client.clientId,
          eventId: event.id,
          eventType: event.type,
        })
        const payload = parseJsonSafe(participant?.payload_json)
        const receiptStatus = String(
          payload?.receipt_status
          || ''
        ).toLowerCase()
        const voteKey = String(payload?.vote_key || '').trim()
        const rewardStatus = String(participant?.reward_status || '').toLowerCase()
        if (rewardStatus === 'paid' || (!requiresReceipt && receiptStatus === 'paid')) {
          event.__hide = true
          continue
        }

        const hasParticipation = Boolean(participant)
        event.has_played = hasParticipation
        event.has_voted = Boolean(voteKey)
        const retryableStatuses = new Set(['duplicate', 'error', 'invalid', 'amount_low'])
        event.receipt_status = receiptStatus || (
          hasParticipation
          && requiresReceipt
          && Number(event.min_deposit_amount) > 0
            ? 'pending'
            : null
        )
        event.receipt_retryable = Boolean(
          requiresReceipt
          && Number(event.min_deposit_amount) > 0
          && retryableStatuses.has(receiptStatus)
        )
        event.has_pending_receipt = Boolean(
          requiresReceipt
          && Number(event.min_deposit_amount) > 0
          && hasParticipation
          && receiptStatus !== 'paid'
        )
        event.is_played_locked = Boolean(hasParticipation && !event.receipt_retryable && receiptStatus !== 'paid')
      }
    }

    const visibleEvents = events.filter(event => !event.__hide)

    console.log('[ClientEvents] getActiveEvents — returned', visibleEvents.length, 'events', client ? `for client ${client.clientId}` : '(guest)')
    return res.json({ events: visibleEvents })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/client/events/history
 * Requires client cookie. Returns the client's participated events with receipt/reward context.
 */
export async function getEventHistory(req, res, next) {
  try {
    const systemConfig = await getSystemConfig()
    const timezone = systemConfig.timezone || 'UTC'
    const client = await getClientFromCookie(req)
    if (!client) {
      return res.status(401).json({ error: 'No autorizado', code: 'UNAUTHORIZED' })
    }

    const { rows, error } = await query(
      `SELECT
         e.id AS event_id,
         e.type AS event_type,
         e.title AS event_title,
         e.description AS event_description,
         e.prize_type AS event_prize_type,
         e.prize_amount AS event_prize_amount,
         e.min_deposit_amount AS event_min_deposit_amount,
         e.status AS event_status,
         e.starts_at AS event_starts_at,
         e.ends_at AS event_ends_at,
         e.config_json AS event_config_json,
         e.created_at AS event_created_at,
         e.updated_at AS event_updated_at,
         ep.id AS participant_id,
         ep.is_winner AS participant_is_winner,
         ep.payload_json AS participant_payload_json,
         ep.created_at AS participant_created_at,
         er.id AS reward_id,
         er.status AS reward_status,
         er.reward_type AS reward_type,
         er.reward_amount AS reward_amount,
         er.reward_description AS reward_description,
         er.paid_at AS reward_paid_at,
         er.discarded_at AS reward_discarded_at,
         er.discard_reason AS reward_discard_reason
       FROM event_participants ep
       INNER JOIN events e ON e.id = ep.event_id
       LEFT JOIN event_rewards er ON er.id = (
         SELECT id
         FROM event_rewards
         WHERE event_id = ep.event_id
           AND client_id = ep.client_id
           AND source = e.type
         ORDER BY created_at DESC
         LIMIT 1
       )
       WHERE ep.client_id = ?
       ORDER BY ep.created_at DESC, ep.id DESC`,
      [client.clientId]
    )
    if (error) return next(error)

    const retryableStatuses = new Set(['duplicate', 'error', 'invalid', 'amount_low'])
    const statePriority = {
      reward_paid: 4,
      receipt_paid: 3,
      receipt_retryable: 2,
      receipt_pending: 1,
      finished: 0,
    }

    const buildHistoryEntry = (row) => {
      const payload = parseJsonSafe(row.participant_payload_json)
      const receiptStatus = String(payload?.receipt_status || '').toLowerCase()
      const receiptRetryable = Boolean(
        RECEIPT_REQUIRED_EVENT_TYPES.has(String(row.event_type || '').toLowerCase())
        && Number(row.event_min_deposit_amount || 0) > 0
        && retryableStatuses.has(receiptStatus)
      )
      const hasPendingReceipt = Boolean(
        RECEIPT_REQUIRED_EVENT_TYPES.has(String(row.event_type || '').toLowerCase())
        && Number(row.event_min_deposit_amount || 0) > 0
        && receiptStatus !== 'paid'
      )
      const rewardStatus = row.reward_status || null
      const rewardPaid = rewardStatus === 'paid'
      return {
        event: {
          id: Number(row.event_id),
          type: row.event_type,
          title: row.event_title,
          description: row.event_description,
          prize_type: row.event_prize_type,
          prize_amount: row.event_prize_amount != null ? Number(row.event_prize_amount) : null,
          min_deposit_amount: row.event_min_deposit_amount != null ? Number(row.event_min_deposit_amount) : null,
          status: row.event_status,
          starts_at: toTimezoneIso(row.event_starts_at, timezone),
          ends_at: toTimezoneIso(row.event_ends_at, timezone),
          config_json: sanitizePublicConfigForClient(row.event_type, parseJsonSafe(row.event_config_json)),
          created_at: toTimezoneIso(row.event_created_at, timezone),
          updated_at: toTimezoneIso(row.event_updated_at, timezone),
        },
        participant: {
          id: Number(row.participant_id),
          is_winner: Boolean(row.participant_is_winner),
          played_at: toTimezoneIso(row.participant_created_at, timezone),
        },
        receipt: {
          source: payload?.receipt_source || (row.event_type ? 'event' : null),
          status: receiptStatus || null,
          retryable: receiptRetryable,
          pending: hasPendingReceipt,
          message_id: payload?.receipt_message_id ? Number(payload.receipt_message_id) : null,
          chat_id: payload?.receipt_chat_id ? Number(payload.receipt_chat_id) : null,
          url: payload?.receipt_url || null,
          processing_reason: payload?.receipt_processing_reason || null,
          processed_at: payload?.receipt_processed_at || null,
          uploaded_at: payload?.uploaded_at || null,
        },
        reward: row.reward_id ? {
          id: Number(row.reward_id),
          status: rewardStatus,
          type: row.reward_type,
          amount: row.reward_amount != null ? Number(row.reward_amount) : null,
          description: row.reward_description || null,
          paid_at: toTimezoneIso(row.reward_paid_at, timezone),
          discarded_at: toTimezoneIso(row.reward_discarded_at, timezone),
          discard_reason: row.reward_discard_reason || null,
          paid: rewardPaid,
        } : null,
        state: rewardPaid
          ? 'reward_paid'
          : receiptStatus === 'paid'
            ? 'receipt_paid'
            : receiptRetryable
              ? 'receipt_retryable'
              : hasPendingReceipt
                ? 'receipt_pending'
                : 'finished',
      }
    }

    const historyByEvent = new Map()
    for (const row of rows || []) {
      const entry = buildHistoryEntry(row)
      const current = historyByEvent.get(entry.event.id)
      if (!current) {
        historyByEvent.set(entry.event.id, entry)
        continue
      }
      const currentPriority = statePriority[current.state] ?? 0
      const nextPriority = statePriority[entry.state] ?? 0
      if (nextPriority > currentPriority) {
        historyByEvent.set(entry.event.id, entry)
      }
    }

    const history = Array.from(historyByEvent.values())

    return res.json({ history })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/client/events/:id/play
 * Requires client auth. Resolves game and records participation.
 */
export async function playEvent(req, res, next) {
  try {
    const client = await getClientFromCookie(req)
    if (!client) {
      return res.status(401).json({ error: 'Sesión requerida', code: 'AUTH_REQUIRED' })
    }

    const eventId = req.params.id
    if (!eventId) return res.status(400).json({ error: 'ID de evento requerido', code: 'EVENT_ID_REQUIRED' })

    // Fetch event
    const { rows: eventRows, error: eventErr } = await query(
      `SELECT * FROM events
       WHERE id = ? AND status = ? AND (starts_at IS NULL OR starts_at <= NOW())
       LIMIT 1`,
      [eventId, 'active']
    )
    if (eventErr) return next(eventErr)
    if (!eventRows || eventRows.length === 0) {
      removeFileQuietly(req.file?.path)
      return res.status(404).json({ error: 'Evento no encontrado o inactivo.', code: 'EVENT_NOT_FOUND' })
    }
    const event = eventRows[0]
    const eventTypeLower = String(event.type || '').toLowerCase()
    const isReceiptGateEvent = RECEIPT_REQUIRED_EVENT_TYPES.has(eventTypeLower) && Number(event.min_deposit_amount) > 0

    // Check already played
    let alreadyPaid = false
    let receiptGatePaidParticipation = false
    try {
      if (!isReceiptGateEvent) {
        alreadyPaid = await hasClientEventPaidParticipation({
          clientId: client.clientId,
          eventId,
          eventType: event.type,
        })
      } else {
        receiptGatePaidParticipation = await hasClientEventPaidParticipation({
          clientId: client.clientId,
          eventId,
          eventType: event.type,
        })
      }
    } catch (lookupErr) {
      return next(lookupErr)
    }

    if (alreadyPaid) {
      return res.status(409).json({ error: 'Ya participaste en este evento.', code: 'ALREADY_PLAYED' })
    }

    let participant = null
    try {
      participant = await findClientEventParticipant({
        clientId: client.clientId,
        eventId,
        eventType: event.type,
      })
    } catch (lookupErr) {
      return next(lookupErr)
    }
    if (participant) {
      const payload = parseJsonSafe(participant.payload_json)
      const receiptStatus = String(
        payload?.receipt_status
        || ''
      ).toLowerCase()
      const voteKey = String(payload?.vote_key || '').trim()

      const rewardStatus = String(participant.reward_status || '').toLowerCase()

      if (isReceiptGateEvent) {
        // Already voted → block second vote
        if (voteKey) {
          console.log('[playEvent] ALREADY_PLAYED: receipt-gate event, vote_key already set', { clientId: client.clientId, eventId, voteKey })
          return res.status(409).json({ error: 'Ya participaste en este evento.', code: 'ALREADY_PLAYED' })
        }
        // Receipt not yet paid → prompt upload, don't block
        if (receiptStatus !== 'paid') {
          console.log('[playEvent] requiresReceipt: receipt not paid yet', { clientId: client.clientId, eventId, receiptStatus })
          return res.json({
            participated: true,
            result: {
              won: null,
              prize: null,
              data: {
                requires_receipt: true,
                receipt_status: receiptStatus || 'pending',
                receipt_retryable: true,
              },
              requiresReceipt: true,
            },
            message: event.type === 'briefcase' || event.type === 'treasure_chest'
              ? 'Subí tu comprobante para poder votar.'
              : 'Subí tu comprobante para participar.',
          })
        }
        // receiptStatus === 'paid' && !voteKey → receipt paid, voting allowed → fall through to resolveGame
        console.log('[playEvent] receipt paid, no vote yet — allowing vote', { clientId: client.clientId, eventId })
      } else {
        // Non-receipt-gate event: any existing participant row means already played
        console.log('[playEvent] ALREADY_PLAYED: non-receipt-gate event, participant row exists', { clientId: client.clientId, eventId, receiptStatus, rewardStatus })
        return res.status(409).json({ error: 'Ya participaste en este evento.', code: 'ALREADY_PLAYED' })
      }
    }

    if (isReceiptGateEvent && !receiptGatePaidParticipation) {
      return res.json({
        participated: true,
        result: {
          won: null,
          prize: null,
          data: {
            requires_receipt: true,
            receipt_status: 'pending',
            receipt_retryable: true,
          },
          requiresReceipt: true,
        },
        message: event.type === 'briefcase' || event.type === 'treasure_chest'
          ? 'Subí tu comprobante para poder votar.'
          : 'Subí tu comprobante para participar.',
      })
    }

    // Resolve game logic
    const result = resolveGame(event, req.body || {})

    const existingParticipantPayload = participant ? parseJsonSafe(participant.payload_json) : {}
    const payloadJson = JSON.stringify({
      ...(isReceiptGateEvent ? existingParticipantPayload : {}),
      ...result.data,
      answer: req.body?.answer ?? undefined,
      vote_key: req.body?.vote_key ?? existingParticipantPayload?.vote_key ?? undefined,
      ...(isReceiptGateEvent ? { receipt_status: existingParticipantPayload?.receipt_status || 'paid' } : {}),
    })
    const isWinner = result.won ? 1 : 0

    // Persist in a transaction
    let participantId = null
    let rewardId = null

    try {
      await transaction(async (conn) => {
        if (isReceiptGateEvent && participant) {
          const [updateResult] = await conn.execute(
            `UPDATE event_participants
                SET payload_json = ?, is_winner = ?
              WHERE id = ? AND client_id = ? AND event_id = ?`,
            [payloadJson, isWinner, participant.id, client.clientId, eventId]
          )
          if (!updateResult?.affectedRows) {
            throw new Error('No se pudo actualizar la participación existente.')
          }
          participantId = participant.id
        } else {
          // Insert participant
          const [partResult] = await conn.execute(
            `INSERT INTO event_participants (event_id, client_id, username, payload_json, is_winner)
             VALUES (?, ?, ?, ?, ?)`,
            [eventId, client.clientId, client.username, payloadJson, isWinner]
          )
          participantId = partResult.insertId
        }

        // Insert reward if won
        if (result.won && result.prize) {
          const [rewardResult] = await conn.execute(
            `INSERT INTO event_rewards
               (event_id, event_type, client_id, username, reward_type, reward_amount, reward_description, source, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
              eventId,
              event.type,
              client.clientId,
              client.username,
              result.prize.prize_type,
              result.prize.amount,
              result.prize.label,
              event.type,
            ]
          )
          rewardId = rewardResult.insertId
        }
      })
    } catch (txError) {
      if (txError.errno === 1062) {
        return res.status(409).json({ error: 'Ya participaste en este evento.', code: 'ALREADY_PLAYED' })
      }
      return next(txError)
    }

    const message = buildMessage(result)

    console.log(
      '[ClientEvents] playEvent — client', client.clientId,
      'event', eventId, 'type', event.type,
      'won:', result.won, 'participantId:', participantId, 'rewardId:', rewardId
    )

    res.json({
      participated: true,
      result: {
        won: result.won,
        prize: result.prize,
        data: result.data,
        requiresReceipt: result.requiresReceipt,
      },
      message,
    })

    // Auto-credit fichas for instant-result games that show result immediately.
    // Scratch is excluded: the server resolves the outcome on /play but the client
    // still needs to reveal cells — auto-crediting here would close the modal before
    // the user scratches anything.
    const AUTO_CREDIT_TYPES = new Set(['quiz', 'roulette', 'slots', 'red_black'])
    if (result.won && rewardId && AUTO_CREDIT_TYPES.has(event.type)) {
      void (async () => {
        try {
          const chatId = await getLatestClientChatId(client.clientId).catch(() => null)
          const rewardResult = await settleEventRewardPaid({
            clientId: client.clientId,
            eventId: Number(eventId),
            eventType: event.type,
            username: client.username || '',
            chatId: chatId || null,
            creditPanelBalance,
          })
          console.log('[ClientEvents] playEvent — auto-settle:', rewardResult?.status, 'rewardId:', rewardResult?.rewardId)
          if (rewardResult?.status === 'paid' && !rewardResult?.alreadyPaid) {
            io?.to(`client:${client.clientId}`).emit('event:reward_paid', {
              rewardId: rewardResult.rewardId,
              eventId: Number(eventId),
              amount: rewardResult.amount,
              mocked: rewardResult.panel?.mocked || false,
            })
          }
        } catch (err) {
          console.error('[ClientEvents] playEvent — error acreditando premio automático:', err?.message || err)
        }
      })()
    }
  } catch (err) {
    if (err.errno === 1062) {
      return res.status(409).json({ error: 'Ya participaste en este evento.', code: 'ALREADY_PLAYED' })
    }
    next(err)
  }
}

/**
 * GET /api/client/events/:id/ranking-progress
 * Returns the client's real progress for a ranking event.
 */
export async function getRankingProgress(req, res, next) {
  try {
    const client = await getClientFromCookie(req)
    if (!client) {
      return res.status(401).json({ error: 'Sesión requerida', code: 'AUTH_REQUIRED' })
    }
    const eventId = Number(req.params.id)
    if (!eventId) return res.status(400).json({ error: 'ID de evento requerido', code: 'EVENT_ID_REQUIRED' })

    const { rows: eventRows, error: eventErr } = await query(
      'SELECT id, type, config_json, starts_at, ends_at FROM events WHERE id = ? LIMIT 1',
      [eventId]
    )
    if (eventErr) return next(eventErr)
    if (!eventRows?.length) return res.status(404).json({ error: 'Evento no encontrado.' })
    const event = eventRows[0]
    if (String(event.type || '').toLowerCase() !== 'ranking') {
      return res.status(400).json({ error: 'Este endpoint es solo para eventos de ranking.' })
    }

    const cfg = parseJsonSafe(event.config_json)
    const missionType = cfg.mission_type || 'deposit_count'
    const goalAmount = Number(cfg.goal_amount) || 0

    const { rows: participantRows } = await query(
      'SELECT id FROM event_participants WHERE event_id = ? AND client_id = ? LIMIT 1',
      [eventId, client.clientId]
    )
    const enrolled = Boolean(participantRows?.length)

    let progress = 0

    if (enrolled && missionType !== 'other') {
      const dateParams = []
      let dateClause = ''
      const startsAt = event.starts_at
        ? String(event.starts_at).slice(0, 19).replace('T', ' ')
        : null
      const endsAt = event.ends_at
        ? String(event.ends_at).slice(0, 19).replace('T', ' ')
        : null
      if (startsAt) { dateClause += ' AND created_at >= ?'; dateParams.push(startsAt) }
      if (endsAt)   { dateClause += ' AND created_at <= ?'; dateParams.push(endsAt)   }

      const cid = client.clientId
      // Union all deposit tables so auto-processed (HGCash/MercadoPago/Telepagos) deposits are counted too
      const allDepositsSubquery = `(
        SELECT amount, created_at FROM manual_payment_movements WHERE client_id = ? AND LOWER(status) = 'paid'${dateClause}
        UNION ALL
        SELECT amount, created_at FROM hgcash_movements WHERE client_id = ? AND LOWER(status) = 'paid'${dateClause}
        UNION ALL
        SELECT amount, created_at FROM mercadopago_movements WHERE client_id = ? AND LOWER(status) = 'paid'${dateClause}
        UNION ALL
        SELECT amount, created_at FROM telepagos_movements WHERE client_id = ? AND LOWER(status) = 'paid'${dateClause}
      ) AS _deps`
      const unionParams = [cid, ...dateParams, cid, ...dateParams, cid, ...dateParams, cid, ...dateParams]

      if (missionType === 'deposit_amount') {
        const { rows } = await query(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM ${allDepositsSubquery}`,
          unionParams
        )
        progress = Number(rows?.[0]?.total || 0)
      } else {
        // deposit_count, charge_count — count paid movements across all providers
        const { rows } = await query(
          `SELECT COUNT(*) AS cnt FROM ${allDepositsSubquery}`,
          unionParams
        )
        progress = Number(rows?.[0]?.cnt || 0)
      }
    }

    const pct = goalAmount > 0 ? Math.min(100, Math.round((progress / goalAmount) * 100)) : 0

    return res.json({ enrolled, progress, goal: goalAmount, pct, missionType })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/client/events/:id/settle-reward
 * Called by the client after the user finishes revealing a scratch card.
 * Settles the pending reward (credits fichas, sends chat message) without
 * emitting the event:reward_paid socket — so the GameModal stays open and
 * the user can read their ResultScreen before closing manually.
 */
export async function settleReward(req, res, next) {
  try {
    const client = await getClientFromCookie(req)
    if (!client) {
      return res.status(401).json({ error: 'Sesión requerida', code: 'AUTH_REQUIRED' })
    }
    const eventId = Number(req.params.id)
    if (!eventId) return res.status(400).json({ error: 'ID de evento requerido', code: 'EVENT_ID_REQUIRED' })

    const { rows: eventRows, error: eventErr } = await query(
      `SELECT id, type, prize_type, prize_amount FROM events WHERE id = ? AND status = 'active' LIMIT 1`,
      [eventId],
    )
    if (eventErr) return next(eventErr)
    if (!eventRows?.length) return res.status(404).json({ error: 'Evento no encontrado.', code: 'EVENT_NOT_FOUND' })
    const event = eventRows[0]

    const chatId = await getLatestClientChatId(client.clientId).catch(() => null)
    const rewardResult = await settleEventRewardPaid({
      clientId: client.clientId,
      eventId,
      eventType: event.type,
      username: client.username || '',
      chatId: chatId || null,
      creditPanelBalance,
    })

    return res.json({ ok: true, status: rewardResult?.status, rewardId: rewardResult?.rewardId, amount: rewardResult?.amount })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/client/events/:id/receipt
 * Requires client auth + file upload (via uploadReceiptMiddleware).
 */
export async function uploadReceipt(req, res, next) {
  try {
    const client = await getClientFromCookie(req)
    if (!client) {
      return res.status(401).json({ error: 'Sesión requerida', code: 'AUTH_REQUIRED' })
    }

    const eventId = req.params.id
    if (!eventId) return res.status(400).json({ error: 'ID de evento requerido', code: 'EVENT_ID_REQUIRED' })

    // Fetch event
    const { rows: eventRows, error: eventErr } = await query(
      `SELECT * FROM events
       WHERE id = ? AND status = ? AND (starts_at IS NULL OR starts_at <= NOW())
       LIMIT 1`,
      [eventId, 'active']
    )
    if (eventErr) return next(eventErr)
    if (!eventRows || eventRows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado o inactivo.', code: 'EVENT_NOT_FOUND' })
    }
    const event = eventRows[0]

    // Ensure file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo.', code: 'FILE_REQUIRED' })
    }

    // Check / create participant record
    let alreadyPaid = false
    try {
      alreadyPaid = await hasClientEventPaidParticipation({
        clientId: client.clientId,
        eventId,
        eventType: event.type,
      })
    } catch (lookupErr) {
      removeFileQuietly(req.file?.path)
      return next(lookupErr)
    }

    if (alreadyPaid) {
      removeFileQuietly(req.file?.path)
      return res.status(409).json({
        error: 'Este sorteo ya fue acreditado y no admite nuevos comprobantes.',
        code: 'EVENT_ALREADY_PAID',
      })
    }

    let participant = null
    try {
      participant = await findClientEventParticipant({
        clientId: client.clientId,
        eventId,
        eventType: event.type,
      })
    } catch (lookupErr) {
      removeFileQuietly(req.file?.path)
      return next(lookupErr)
    }

    let participantId

    if (!participant) {
      // No record yet — create one
      const { rows: insertRows, error: insertErr } = await query(
        `INSERT INTO event_participants (event_id, client_id, username, payload_json, is_winner)
         VALUES (?, ?, ?, '{}', 0)`,
        [eventId, client.clientId, client.username]
      )
      if (insertErr) {
        if (insertErr.errno === 1062) {
          // Race condition — fetch existing
          try {
            const raceParticipant = await findClientEventParticipant({
              clientId: client.clientId,
              eventId,
              eventType: event.type,
            })
            participantId = raceParticipant?.id
          } catch (raceErr) {
            return next(raceErr)
          }
        } else {
          return next(insertErr)
        }
      } else {
        participantId = insertRows.insertId
      }
    } else {
      participantId = participant.id
    }

    if (!participantId) {
      removeFileQuietly(req.file?.path)
      return res.status(500).json({ error: 'No se pudo registrar al participante.', code: 'PARTICIPANT_ERROR' })
    }

    // Build receipt URL and merge payload
    const receiptUrl = `/event-receipts/${req.file.filename}`

    const { rows: latestRows } = await query(
      'SELECT payload_json FROM event_participants WHERE id = ? LIMIT 1',
      [participantId]
    )
    const existingPayload = parseJsonSafe(latestRows?.[0]?.payload_json)
    const existingReceiptStatus = String(existingPayload?.receipt_status || '').toLowerCase()
    const existingRewardStatus = String(participant?.reward_status || '').toLowerCase()
    if ((existingReceiptStatus && !RECEIPT_RETRYABLE_STATUSES.has(existingReceiptStatus)) || existingRewardStatus === 'paid') {
      removeFileQuietly(req.file?.path)
      return res.status(409).json({
        error: 'Ya participaste en este evento y no admite nuevos comprobantes.',
        code: 'ALREADY_PLAYED',
      })
    }

    const receiptChatId = await getLatestClientChatId(client.clientId)
    if (!receiptChatId) {
      removeFileQuietly(req.file?.path)
      return res.status(409).json({
        error: 'No encontramos un chat activo para asociar el comprobante.',
        code: 'CHAT_REQUIRED',
      })
    }

    const receiptDataUrl = fileToDataUrl(req.file.path, req.file.mimetype)
    const receiptMessageType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image'
    const receiptCaption = buildReceiptCaption(event)
    let receiptMovementId = null

    const receiptMessage = await persistMessage({
      chatId: receiptChatId,
      senderType: 'client',
      clientId: client.clientId,
      content: receiptCaption,
      messageType: receiptMessageType,
      dataUrl: receiptDataUrl,
      fileName: req.file.originalname || req.file.filename,
      clientMessageId: `event-receipt-${eventId}-${participantId}`,
      extra: {
        source: 'event',
        sourceEventId: Number(eventId),
        sourceEventType: event.type,
        sourceEventTitle: event.title || '',
        sourceParticipantId: Number(participantId),
      },
    })

    const baseReceiptPayload = {
      ...existingPayload,
      receipt_log_id: null,
      receipt_url: receiptUrl,
      receipt_status: 'pending',
      receipt_processing_reason: null,
      receipt_pending: true,
      receipt_retryable: false,
      receipt_source: 'event',
      receipt_event_id: Number(eventId),
      receipt_event_type: event.type,
      receipt_event_title: event.title || '',
      receipt_chat_id: Number(receiptChatId),
      receipt_message_id: Number(receiptMessage?.message?.id || 0) || null,
      receipt_movement_id: receiptMovementId,
      uploaded_at: new Date().toISOString(),
    }

    await query(
      'UPDATE event_participants SET payload_json = ? WHERE id = ?',
      [JSON.stringify(baseReceiptPayload), participantId]
    )

    void processEventReceiptInBackground({
      clientId: client.clientId,
      clientUsername: client.username,
      event,
      eventId,
      participantId,
      receiptChatId,
      receiptMessage,
      receiptDataUrl,
      receiptUrl,
      baseReceiptPayload,
    }).catch((processingErr) => {
      console.error('[ClientEvents] uploadReceipt — error finalizando comprobante en background:', processingErr?.message || processingErr)
    })

    console.log(
      '[ClientEvents] uploadReceipt — client', client.clientId,
      'event', eventId, 'file:', req.file.filename,
      'participantId:', participantId
    )

    return res.json({
      uploaded: true,
      receipt_url: receiptUrl,
      receipt_status: 'pending',
      receipt_pending: true,
      reward_created: false,
      receipt_message_id: receiptMessage?.message?.id || null,
      receipt_chat_id: receiptChatId,
      message: '¡Comprobante recibido! Lo revisaremos a la brevedad.',
      receipt_retryable: false,
    })
  } catch (err) {
    next(err)
  }
}
