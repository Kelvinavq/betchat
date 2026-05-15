import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { query, transaction } from '../config/database.js'
import { config } from '../config/config.js'
import { getCookieValue } from '../middlewares/authMiddleware.js'

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
      data: { answer, correct_option: correct, is_correct: isCorrect },
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
    return { won, prize, requiresReceipt: false, data: { chose, outcome: winOption?.label || '', won } }
  }

  // Scratch — 3×3 grid (9 cards). Win = 3 matching winning symbols.
  if (type === 'scratch') {
    const prizes = cfg.prizes || []
    const cards = Array.from({ length: 9 }, () => weightedRandom(prizes))

    const signatureOf = (card) => {
      if (!card) return ''
      return [
        String(card.label || '').trim(),
        String(card.prize_type || '').trim(),
        String(card.amount ?? '').trim(),
        String(card.icon || '').trim(),
      ].join('|')
    }

    const counts = new Map()
    for (const card of cards) {
      const key = signatureOf(card)
      if (!key) continue
      counts.set(key, (counts.get(key) || 0) + 1)
    }

    const winningCard = cards.find((card) => {
      if (!card || card.prize_type === 'none' || Number(card.amount) <= 0) return false
      return (counts.get(signatureOf(card)) || 0) >= 3
    }) || null

    const prize = winningCard
      ? {
          label: winningCard.label,
          prize_type: winningCard.prize_type,
          amount: Number(winningCard.amount),
          icon: winningCard.icon,
        }
      : null

    return { won: Boolean(winningCard), prize, requiresReceipt: false, data: { revealed: cards } }
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

    const won = seg && seg.prize_type !== 'none' && Number(seg.amount) > 0
    const prize = won
      ? { label: seg.label, prize_type: seg.prize_type, amount: Number(seg.amount), icon: seg.icon, color: seg.color }
      : null
    return { won: Boolean(won), prize, requiresReceipt: false, data: { segment: seg, segmentIndex } }
  }

  // Slots
  if (type === 'slots') {
    const symbols = cfg.symbols || []
    const prizes = cfg.prizes || []
    const winRate = Number(cfg.win_rate) || 35
    const didWin = Math.random() * 100 < winRate && prizes.length > 0
    if (didWin) {
      const prize = weightedRandom(prizes)
      const combo = prize?.combo || symbols.slice(0, 3).map((s) => s.icon)
      return {
        won: true,
        prize: {
          label: prize.label,
          prize_type: prize.prize_type,
          amount: Number(prize.amount ?? event.prize_amount ?? 0),
        },
        requiresReceipt: false,
        data: { combo },
      }
    }
    const combo = Array(3)
      .fill(null)
      .map(() => symbols[Math.floor(Math.random() * Math.max(symbols.length, 1))]?.icon || '?')
    return { won: false, prize: null, requiresReceipt: false, data: { combo } }
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
    const { rows, error } = await query(
      `SELECT id, type, title, description, prize_type, prize_amount, min_deposit_amount,
              duration_minutes, starts_at, ends_at, config_json
       FROM events
       WHERE status = 'active' AND (ends_at IS NULL OR ends_at > NOW())
       ORDER BY created_at DESC
       LIMIT 20`
    )
    if (error) return next(error)

    const events = (rows || []).map((row) => {
      let cfg = row.config_json
      if (typeof cfg === 'string') {
        try { cfg = JSON.parse(cfg) } catch { cfg = {} }
      }
      return { ...row, config_json: cfg || {}, has_played: false }
    })

    // Optionally check participation for authenticated clients
    const client = await getClientFromCookie(req)
    if (client) {
      for (const event of events) {
        const { rows: pRows } = await query(
          'SELECT 1 FROM event_participants WHERE event_id = ? AND client_id = ? LIMIT 1',
          [event.id, client.clientId]
        )
        event.has_played = Boolean(pRows && pRows.length > 0)
      }
    }

    console.log('[ClientEvents] getActiveEvents — returned', events.length, 'events', client ? `for client ${client.clientId}` : '(guest)')
    return res.json({ events })
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
      'SELECT * FROM events WHERE id = ? AND status = ? LIMIT 1',
      [eventId, 'active']
    )
    if (eventErr) return next(eventErr)
    if (!eventRows || eventRows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado o inactivo.', code: 'EVENT_NOT_FOUND' })
    }
    const event = eventRows[0]

    // Check already played
    const { rows: existing, error: checkErr } = await query(
      'SELECT id FROM event_participants WHERE event_id = ? AND client_id = ? LIMIT 1',
      [eventId, client.clientId]
    )
    if (checkErr) return next(checkErr)
    if (existing && existing.length > 0) {
      return res.status(409).json({ error: 'Ya participaste en este evento.', code: 'ALREADY_PLAYED' })
    }

    // Resolve game logic
    const result = resolveGame(event, req.body || {})

    const payloadJson = JSON.stringify({
      ...result.data,
      answer: req.body?.answer ?? undefined,
      vote_key: req.body?.vote_key ?? undefined,
    })
    const isWinner = result.won ? 1 : 0

    // Persist in a transaction
    let participantId = null
    let rewardId = null

    try {
      await transaction(async (conn) => {
        // Insert participant
        const [partResult] = await conn.execute(
          `INSERT INTO event_participants (event_id, client_id, username, payload_json, is_winner)
           VALUES (?, ?, ?, ?, ?)`,
          [eventId, client.clientId, client.username, payloadJson, isWinner]
        )
        participantId = partResult.insertId

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

    return res.json({
      participated: true,
      result: {
        won: result.won,
        prize: result.prize,
        data: result.data,
        requiresReceipt: result.requiresReceipt,
      },
      message,
    })
  } catch (err) {
    if (err.errno === 1062) {
      return res.status(409).json({ error: 'Ya participaste en este evento.', code: 'ALREADY_PLAYED' })
    }
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
      'SELECT * FROM events WHERE id = ? AND status = ? LIMIT 1',
      [eventId, 'active']
    )
    if (eventErr) return next(eventErr)
    if (!eventRows || eventRows.length === 0) {
      return res.status(404).json({ error: 'Evento no encontrado o inactivo.', code: 'EVENT_NOT_FOUND' })
    }

    // Ensure file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo.', code: 'FILE_REQUIRED' })
    }

    // Check / create participant record
    const { rows: pRows, error: pErr } = await query(
      'SELECT id, payload_json FROM event_participants WHERE event_id = ? AND client_id = ? LIMIT 1',
      [eventId, client.clientId]
    )
    if (pErr) return next(pErr)

    let participantId

    if (!pRows || pRows.length === 0) {
      // No record yet — create one
      const { rows: insertRows, error: insertErr } = await query(
        `INSERT INTO event_participants (event_id, client_id, username, payload_json, is_winner)
         VALUES (?, ?, ?, '{}', 0)`,
        [eventId, client.clientId, client.username]
      )
      if (insertErr) {
        if (insertErr.errno === 1062) {
          // Race condition — fetch existing
          const { rows: raceRows, error: raceErr } = await query(
            'SELECT id, payload_json FROM event_participants WHERE event_id = ? AND client_id = ? LIMIT 1',
            [eventId, client.clientId]
          )
          if (raceErr) return next(raceErr)
          participantId = raceRows?.[0]?.id
        } else {
          return next(insertErr)
        }
      } else {
        participantId = insertRows.insertId
      }
    } else {
      participantId = pRows[0].id
    }

    if (!participantId) {
      return res.status(500).json({ error: 'No se pudo registrar al participante.', code: 'PARTICIPANT_ERROR' })
    }

    // Build receipt URL and merged payload
    const receiptUrl = `/event-receipts/${req.file.filename}`

    // Fetch latest payload to merge
    const { rows: latestRows } = await query(
      'SELECT payload_json FROM event_participants WHERE id = ? LIMIT 1',
      [participantId]
    )
    let existingPayload = {}
    if (latestRows?.[0]?.payload_json) {
      if (typeof latestRows[0].payload_json === 'string') {
        try { existingPayload = JSON.parse(latestRows[0].payload_json) } catch { existingPayload = {} }
      } else {
        existingPayload = latestRows[0].payload_json || {}
      }
    }

    const mergedPayload = JSON.stringify({
      ...existingPayload,
      receipt_url: receiptUrl,
      receipt_status: 'pending',
      uploaded_at: new Date().toISOString(),
    })

    const { error: updateErr } = await query(
      'UPDATE event_participants SET payload_json = ? WHERE id = ?',
      [mergedPayload, participantId]
    )
    if (updateErr) return next(updateErr)

    console.log(
      '[ClientEvents] uploadReceipt — client', client.clientId,
      'event', eventId, 'file:', req.file.filename,
      'participantId:', participantId
    )

    return res.json({
      uploaded: true,
      receipt_url: receiptUrl,
      message: '¡Comprobante recibido! Lo revisaremos a la brevedad.',
    })
  } catch (err) {
    next(err)
  }
}
