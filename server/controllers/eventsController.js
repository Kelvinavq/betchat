import moment from 'moment-timezone';
import { query, transaction } from '../config/database.js';
import { getSystemConfig } from './settingsController.js';
import { parseMysqlUtc, toMysqlUtc, toTimezoneIso } from '../utils/eventTime.js';
import { io } from '../app.js';
import { persistMessage } from './chatController.js';
import { creditPanelBalance } from './mercadoPagoController.js';
import { getAutoMessage } from './autoMessagesController.js';

const EVENT_TYPES = ['sorteo','quiz','scratch','roulette','slots','red_black','briefcase','treasure_chest','ranking'];
const EVENT_STATUSES = ['draft','scheduled','active','finished','cancelled'];
const REWARD_STATUSES = ['pending','paid','failed','discarded'];

const jsonParse = (value, fallback = null) => {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};

const jsonStringify = (value) => JSON.stringify(value ?? null);

function assertEnum(value, allowed, label) {
  if (!allowed.includes(value)) {
    const err = new Error(`${label} inválido`);
    err.status = 400;
    throw err;
  }
}

function parseFilters(q) {
  return {
    type: q.type || null,
    status: q.status || null,
    date_from: q.date_from || null,
    date_to: q.date_to || null,
  };
}

function buildWhere(filters) {
  const where = ['1=1'];
  const values = [];
  if (filters.type) { where.push('type = ?'); values.push(filters.type); }
  if (filters.status) { where.push('status = ?'); values.push(filters.status); }
  if (filters.date_from) { where.push('DATE(COALESCE(starts_at, created_at)) >= ?'); values.push(filters.date_from); }
  if (filters.date_to) { where.push('DATE(COALESCE(ends_at, created_at)) <= ?'); values.push(filters.date_to); }
  return { where: where.join(' AND '), values };
}

function computeEndsAt(startsAt, durationMinutes) {
  if (!durationMinutes || !startsAt) return null;
  const start = parseEventDate(startsAt);
  if (!start?.isValid?.() || !start.isValid()) return null;
  return moment(start).add(Number(durationMinutes), 'minutes').toDate();
}

function toMysqlDatetime(date) {
  return toMysqlUtc(date);
}

function parseEventDate(value, timezone = 'UTC') {
  if (!value) return null;
  if (moment.isMoment(value)) return value.clone();
  if (value instanceof Date) return moment(value);

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(raw) && !/[zZ]|[+-]\d{2}:\d{2}$/.test(raw)) {
    return moment.tz(raw, timezone);
  }

  return parseMysqlUtc(raw) || moment(raw);
}

function serializeEventForResponse(event, timezone) {
  if (!event) return event
  return {
    ...event,
    starts_at: toTimezoneIso(event.starts_at, timezone),
    ends_at: toTimezoneIso(event.ends_at, timezone),
    created_at: toTimezoneIso(event.created_at, timezone),
    updated_at: toTimezoneIso(event.updated_at, timezone),
  }
}

function normalizeEventRow(row) {
  return {
    ...row,
    config_json: jsonParse(row.config_json, {}),
    preview_json: jsonParse(row.preview_json, null),
    duration_minutes: row.duration_minutes == null ? null : Number(row.duration_minutes),
    min_deposit_amount: row.min_deposit_amount == null ? null : Number(row.min_deposit_amount),
    prize_amount: row.prize_amount == null ? null : Number(row.prize_amount),
  };
}

function resolveScratchPrizeAmount(eventType, configJson, fallbackAmount = null) {
  if (String(eventType || '').toLowerCase() !== 'scratch') return fallbackAmount
  const cfg = typeof configJson === 'string'
    ? jsonParse(configJson, {})
    : (configJson || {})
  const rawRules = Array.isArray(cfg.win_rules) ? cfg.win_rules : []
  const ruleAmount = Number(rawRules[0]?.amount)
  if (Number.isFinite(ruleAmount) && ruleAmount > 0) return ruleAmount
  const fallback = Number(fallbackAmount)
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0
}

async function fetchEventById(id) {
  const { rows, error } = await query('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);
  if (error) throw error;
  return rows?.[0] ? normalizeEventRow(rows[0]) : null;
}

export async function listEvents(req, res, next) {
  try {
    const systemConfig = await getSystemConfig();
    const timezone = systemConfig.timezone || 'UTC';
    const filters = parseFilters(req.query);
    const { where, values } = buildWhere(filters);
    const { rows, error } = await query(
      `SELECT * FROM events WHERE ${where} ORDER BY created_at DESC LIMIT 200`,
      values
    );
    if (error) return next(error);
    res.json({ events: (rows || []).map(row => serializeEventForResponse(normalizeEventRow(row), timezone)) });
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req, res, next) {
  try {
    const systemConfig = await getSystemConfig();
    const timezone = systemConfig.timezone || 'UTC';
    const event = await fetchEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado', code: 'EVENT_NOT_FOUND' });
    res.json({ event: serializeEventForResponse(event, timezone) });
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const body = req.body || {};
    const systemConfig = await getSystemConfig();
    const timezone = systemConfig.timezone || 'UTC';
    assertEnum(body.type, EVENT_TYPES, 'Tipo de evento');
    const requestedStatus = body.status || 'draft';
    assertEnum(requestedStatus, EVENT_STATUSES, 'Estado');
    const title = String(body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'El título es obligatorio', code: 'TITLE_REQUIRED' });
    if (!body.config_json || typeof body.config_json !== 'object') {
      return res.status(400).json({ error: 'config_json es obligatorio', code: 'CONFIG_REQUIRED' });
    }

    const now = new Date();
    const startsAt = body.starts_at || null;
    const normalizedStartsAt = startsAt ? toMysqlDatetime(parseEventDate(startsAt, timezone)) : null;
    const nextStatus =
      normalizedStartsAt && requestedStatus === 'active' && parseEventDate(startsAt, timezone).valueOf() > Date.now()
        ? 'scheduled'
        : requestedStatus;

    const durationMinutes = body.duration_minutes ?? null;
    const rawStartsAt =
      nextStatus === 'active' && durationMinutes && !normalizedStartsAt
        ? toMysqlDatetime(now)
        : normalizedStartsAt;
    const rawEndsAt = body.ends_at || null;
    const derivedEndsAt = rawEndsAt
      ? toMysqlDatetime(parseEventDate(rawEndsAt, timezone))
      : (durationMinutes && rawStartsAt
        ? toMysqlDatetime(computeEndsAt(rawStartsAt, durationMinutes))
        : null);

    const payload = {
      type: body.type,
      title,
      description: body.description || null,
      status: nextStatus,
      config_json: jsonStringify(body.config_json),
      preview_json: body.preview_json ? jsonStringify(body.preview_json) : null,
      min_deposit_amount: body.min_deposit_amount ?? null,
      prize_type: body.prize_type || null,
      prize_amount: resolveScratchPrizeAmount(body.type, body.config_json, body.prize_amount ?? null),
      starts_at: rawStartsAt,
      ends_at: derivedEndsAt,
      duration_minutes: durationMinutes,
      created_by: req.user?.sub || null,
    };

    const { rows, error } = await query(
      `INSERT INTO events
        (type, title, description, status, config_json, preview_json, min_deposit_amount, prize_type, prize_amount, starts_at, ends_at, duration_minutes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.type, payload.title, payload.description, payload.status, payload.config_json,
        payload.preview_json, payload.min_deposit_amount, payload.prize_type, payload.prize_amount,
        payload.starts_at, payload.ends_at, payload.duration_minutes, payload.created_by,
      ]
    );
    if (error) return next(error);
    const event = serializeEventForResponse(await fetchEventById(rows.insertId), timezone);

    if (event?.status === 'active') {
      io?.emit('event:new', { event })
    } else if (event?.status === 'finished' || event?.status === 'cancelled') {
      io?.emit('event:finished', { eventId: event.id, status: event.status })
    }

    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
}

export async function updateEvent(req, res, next) {
  try {
    const event = await fetchEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado', code: 'EVENT_NOT_FOUND' });
    const body = req.body || {};
    const systemConfig = await getSystemConfig();
    const timezone = systemConfig.timezone || 'UTC';
    const nextType = body.type || event.type;
    assertEnum(nextType, EVENT_TYPES, 'Tipo de evento');
    const requestedStatus = body.status || event.status;
    const startsAt = body.starts_at ?? event.starts_at;
    const normalizedStartsAt = startsAt ? toMysqlDatetime(parseEventDate(startsAt, timezone)) : null;
    const nextStatus =
      normalizedStartsAt && requestedStatus === 'active' && parseEventDate(startsAt, timezone).valueOf() > Date.now()
        ? 'scheduled'
        : requestedStatus;
    assertEnum(nextStatus, EVENT_STATUSES, 'Estado');

    const configJson = body.config_json ? jsonStringify(body.config_json) : jsonStringify(event.config_json);
    const previewJson = body.preview_json !== undefined ? jsonStringify(body.preview_json) : jsonStringify(event.preview_json);
    const resolvedPrizeAmount = resolveScratchPrizeAmount(
      nextType,
      configJson,
      body.prize_amount !== undefined ? body.prize_amount : event.prize_amount
    );

    const updDuration = body.duration_minutes ?? event.duration_minutes;
    const updStartsAt = normalizedStartsAt ?? event.starts_at;
    const explicitEndsAt = body.ends_at !== undefined ? (body.ends_at || null) : event.ends_at;
    const now = new Date();
    const effectiveStartsAt =
      nextStatus === 'active' && updDuration && !updStartsAt
        ? toMysqlDatetime(now)
        : updStartsAt;
    const updEndsAt = explicitEndsAt
      ? toMysqlDatetime(parseEventDate(explicitEndsAt, timezone))
      : (updDuration && effectiveStartsAt
        ? toMysqlDatetime(computeEndsAt(effectiveStartsAt, updDuration))
        : null);

    const { error } = await query(
      `UPDATE events SET
        type = ?, title = ?, description = ?, status = ?, config_json = ?, preview_json = ?,
        min_deposit_amount = ?, prize_type = ?, prize_amount = ?, starts_at = ?, ends_at = ?, duration_minutes = ?
       WHERE id = ?`,
      [
        nextType,
        String(body.title ?? event.title).trim(),
        body.description ?? event.description,
        nextStatus,
        configJson,
        previewJson,
        body.min_deposit_amount ?? event.min_deposit_amount,
        body.prize_type ?? event.prize_type,
        resolvedPrizeAmount,
        effectiveStartsAt,
        updEndsAt,
        updDuration,
        req.params.id,
      ]
    );
    if (error) return next(error);
    const updatedEvent = serializeEventForResponse(await fetchEventById(req.params.id), timezone);

    if (event.status !== updatedEvent.status) {
      if (updatedEvent.status === 'active') {
        io?.emit('event:new', { event: updatedEvent })
      } else if (updatedEvent.status === 'finished' || updatedEvent.status === 'cancelled') {
        io?.emit('event:finished', { eventId: updatedEvent.id, status: updatedEvent.status })
      }
    }

    res.json({ event: updatedEvent });
  } catch (error) {
    next(error);
  }
}

export async function deleteEvent(req, res) {
  return res.status(403).json({ error: 'Los eventos no se pueden eliminar. Usá Finalizar o Cancelar para preservar el historial.', code: 'EVENT_DELETE_FORBIDDEN' });
}

async function setEventStatus(req, res, next, status) {
  try {
    const existing = await fetchEventById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Evento no encontrado', code: 'EVENT_NOT_FOUND' });

    // When activating, ensure timed events always have a real start/end window.
    if (status === 'active' && existing.duration_minutes) {
      const now = new Date();
      const activatedStartsAt = existing.starts_at ? new Date(existing.starts_at) : now;
      const activatedEndsAt = computeEndsAt(activatedStartsAt, existing.duration_minutes);
      const { error: updateError } = await query(
        'UPDATE events SET status = ?, starts_at = COALESCE(starts_at, ?), ends_at = COALESCE(ends_at, ?) WHERE id = ?',
        [status, toMysqlDatetime(now), toMysqlDatetime(activatedEndsAt), req.params.id]
      );
      if (updateError) return next(updateError);
    } else {
      const { error } = await query('UPDATE events SET status = ? WHERE id = ?', [status, req.params.id]);
      if (error) return next(error);
    }

    const event = await fetchEventById(req.params.id);

    // Notify all connected sockets in real time
    if (status === 'active') {
      io?.emit('event:new', { event })
    } else if (status === 'finished' || status === 'cancelled') {
      io?.emit('event:finished', { eventId: Number(req.params.id), status })
    }

    res.json({ event });
  } catch (error) {
    next(error);
  }
}

export const activateEvent = (req, res, next) => setEventStatus(req, res, next, 'active');
export const cancelEvent   = (req, res, next) => setEventStatus(req, res, next, 'cancelled');

/* ── Briefcase / treasure_chest winner helpers ─────────────── */

const DEFERRED_TYPES = new Set(['briefcase', 'treasure_chest'])

async function getBriefcaseVoteDistribution(eventId) {
  const { rows } = await query(
    'SELECT payload_json FROM event_participants WHERE event_id = ?',
    [eventId]
  )
  const counts = {}
  for (const row of (rows || [])) {
    const payload = jsonParse(row.payload_json, {})
    const key = String(payload.vote_key || payload.voted_for || '').trim()
    if (key) counts[key] = (counts[key] || 0) + 1
  }
  if (!Object.keys(counts).length) return { counts: {}, minVotes: 0, winnerKeys: [], tied: false }
  const minVotes = Math.min(...Object.values(counts))
  const winnerKeys = Object.keys(counts).filter(k => counts[k] === minVotes)
  return { counts, minVotes, winnerKeys, tied: winnerKeys.length > 1 }
}

async function settleBriefcaseWinnersForKeys(event, voteKeys) {
  const { rows } = await query(
    `SELECT ep.id, ep.client_id, ep.username, ep.payload_json,
            (SELECT id FROM chats WHERE client_id = ep.client_id ORDER BY created_at DESC LIMIT 1) AS chat_id
       FROM event_participants ep
      WHERE ep.event_id = ?`,
    [event.id]
  )

  const winners = (rows || []).filter(row => {
    const payload = jsonParse(row.payload_json, {})
    const vk = String(payload.vote_key || payload.voted_for || '').trim()
    return voteKeys.includes(vk)
  })

  const settled = []
  for (const winner of winners) {
    await query('UPDATE event_participants SET is_winner = 1 WHERE id = ?', [winner.id]).catch(() => {})

    const { rows: existing } = await query(
      'SELECT id, status FROM event_rewards WHERE event_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT 1',
      [event.id, winner.client_id]
    )

    let rewardId
    if (!existing?.[0]) {
      const { rows: ins } = await query(
        `INSERT INTO event_rewards (event_id, event_type, client_id, username, reward_type, reward_amount, reward_description, source, status)
         VALUES (?, ?, ?, ?, 'fichas', ?, ?, ?, 'pending')`,
        [event.id, event.type, winner.client_id, winner.username, Number(event.prize_amount || 0), event.title || event.type, event.type]
      )
      rewardId = ins?.insertId
    } else if (existing[0].status === 'paid') {
      settled.push({ clientId: winner.client_id, status: 'already_paid' })
      continue
    } else {
      rewardId = existing[0].id
    }

    const amount = Number(event.prize_amount || 0)
    const panelResult = await creditPanelBalance({ clientId: winner.client_id, amountArs: amount })
      .catch(e => ({ ok: false, error: e?.message }))

    if (panelResult?.ok) {
      await query(
        `UPDATE event_rewards SET status = 'paid', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [rewardId]
      ).catch(() => {})

      if (winner.chat_id && amount > 0) {
        const amountStr = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
        persistMessage({
          chatId: Number(winner.chat_id),
          senderType: 'system',
          content: `🏆 ¡Ganaste el evento "${event.title || event.type}"! Te acreditamos ${amountStr} en fichas. ¡Felicitaciones!`,
          extra: { eventRewardPaid: true, rewardId, eventId: Number(event.id), depositEvent: 'fichas_credited', depositAmount: amount },
        }).catch(() => {})
      }

      io?.emit('event:reward_paid', { rewardId, eventId: Number(event.id), clientId: winner.client_id, status: 'paid' })
      settled.push({ clientId: winner.client_id, rewardId, status: 'paid' })
    } else {
      await query(
        `UPDATE event_rewards SET status = 'failed', error_message = ?, attempts = attempts + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [panelResult?.error || 'panel_error', rewardId]
      ).catch(() => {})
      settled.push({ clientId: winner.client_id, rewardId, status: 'failed', error: panelResult?.error })
    }
  }
  return settled
}

export async function finishEvent(req, res, next) {
  try {
    const existing = await fetchEventById(req.params.id)
    if (!existing) return res.status(404).json({ error: 'Evento no encontrado', code: 'EVENT_NOT_FOUND' })

    const { error } = await query('UPDATE events SET status = ? WHERE id = ?', ['finished', req.params.id])
    if (error) return next(error)

    const event = await fetchEventById(req.params.id)
    io?.emit('event:finished', { eventId: Number(req.params.id), status: 'finished' })

    if (DEFERRED_TYPES.has(String(existing.type || '').toLowerCase())) {
      getBriefcaseVoteDistribution(Number(req.params.id))
        .then(dist => {
          if (!dist.tied && dist.winnerKeys.length > 0) {
            return settleBriefcaseWinnersForKeys(event, dist.winnerKeys)
          }
        })
        .catch(e => console.error('[finishEvent] briefcase auto-settle error:', e?.message))
    }

    res.json({ event })
  } catch (error) {
    next(error)
  }
}

export async function payBriefcaseWinners(req, res, next) {
  try {
    const eventId = Number(req.params.id)
    const voteKeys = (req.body?.vote_keys || []).map(k => String(k).trim()).filter(Boolean)
    if (!voteKeys.length) return res.status(400).json({ error: 'Se requiere al menos una clave ganadora.' })

    const event = await fetchEventById(eventId)
    if (!event) return res.status(404).json({ error: 'Evento no encontrado', code: 'EVENT_NOT_FOUND' })
    if (!DEFERRED_TYPES.has(String(event.type || '').toLowerCase())) {
      return res.status(400).json({ error: 'Solo para eventos de tipo maletín o cofre.' })
    }

    const dist = await getBriefcaseVoteDistribution(eventId)
    const validKeys = voteKeys.filter(k => dist.winnerKeys.includes(k))
    if (!validKeys.length) return res.status(400).json({ error: 'Las claves seleccionadas no corresponden a ganadores válidos.' })

    const settled = await settleBriefcaseWinnersForKeys(event, validKeys)
    res.json({ ok: true, settled })
  } catch (error) {
    next(error)
  }
}

export async function participateEvent(req, res, next) {
  try {
    const event = await fetchEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado', code: 'EVENT_NOT_FOUND' });
    const body = req.body || {};
    const username = String(body.username || req.user?.username || '').trim() || null;
    const payload = body.payload_json || {};
    const clientId = body.client_id ?? null;
    const userId = body.user_id ?? req.user?.sub ?? null;

    const { rows, error } = await query(
      `INSERT INTO event_participants (event_id, client_id, user_id, username, payload_json)
       VALUES (?, ?, ?, ?, ?)`,
      [event.id, clientId, userId, username, jsonStringify(payload)]
    );
    if (error) return next(error);
    res.status(201).json({ participantId: rows.insertId });
  } catch (error) {
    next(error);
  }
}

export async function getParticipants(req, res, next) {
  try {
    const { rows, error } = await query(
      'SELECT * FROM event_participants WHERE event_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    if (error) return next(error);
    res.json({ participants: rows || [] });
  } catch (error) {
    next(error);
  }
}

export async function getEventDetail(req, res, next) {
  try {
    const eventId = Number(req.params.id)
    const event = await fetchEventById(eventId)
    if (!event) return res.status(404).json({ error: 'Evento no encontrado', code: 'EVENT_NOT_FOUND' })

    const { rows, error } = await query(
      `SELECT
         ep.id,
         ep.event_id,
         ep.client_id,
         ep.username,
         ep.payload_json,
         ep.is_winner,
         ep.created_at                                                        AS participated_at,
         (SELECT id FROM chats WHERE client_id = ep.client_id ORDER BY created_at DESC LIMIT 1) AS chat_id,
         er.id                                                                AS reward_id,
         er.status                                                            AS reward_status,
         er.reward_type,
         er.reward_amount,
         er.reward_description,
         er.paid_at,
         er.discard_reason,
         er.error_message
       FROM event_participants ep
       LEFT JOIN event_rewards er
         ON  er.client_id = ep.client_id
         AND er.event_id  = ep.event_id
         AND er.id = (
               SELECT id FROM event_rewards
                WHERE client_id = ep.client_id AND event_id = ep.event_id
                ORDER BY created_at DESC LIMIT 1
             )
       WHERE ep.event_id = ?
       ORDER BY ep.created_at DESC`,
      [eventId]
    )
    if (error) return next(error)

    const systemConfig = await getSystemConfig()
    const timezone = systemConfig.timezone || 'UTC'

    const participants = (rows || []).map(row => {
      const payload = jsonParse(row.payload_json, {})
      return {
        id: row.id,
        client_id: row.client_id,
        username: row.username || '',
        is_winner: Boolean(row.is_winner),
        participated_at: row.participated_at,
        chat_id: row.chat_id || null,
        receipt_status: payload.receipt_status || null,
        receipt_url: payload.receipt_url || null,
        receipt_retryable: Boolean(payload.receipt_retryable),
        vote_key: payload.vote_key || payload.voted_for || null,
        answer: payload.answer || null,
        is_correct: payload.is_correct ?? null,
        reward: row.reward_id ? {
          id: row.reward_id,
          status: row.reward_status,
          reward_type: row.reward_type,
          reward_amount: Number(row.reward_amount || 0),
          reward_description: row.reward_description,
          paid_at: row.paid_at,
          discard_reason: row.discard_reason,
          error_message: row.error_message,
        } : null,
      }
    })

    res.json({
      event: serializeEventForResponse(event, timezone),
      participants,
      total: participants.length,
    })
  } catch (error) {
    next(error)
  }
}

export async function resetParticipation(req, res, next) {
  try {
    const eventId = Number(req.params.id)
    const participantId = Number(req.params.participantId)

    const { rows: pRows } = await query(
      'SELECT * FROM event_participants WHERE id = ? AND event_id = ? LIMIT 1',
      [participantId, eventId]
    )
    const participant = pRows?.[0]
    if (!participant) return res.status(404).json({ error: 'Participación no encontrada', code: 'NOT_FOUND' })

    await query(
      `UPDATE event_rewards
          SET status = 'discarded', discard_reason = 'admin_reset', updated_at = CURRENT_TIMESTAMP
        WHERE event_id = ? AND client_id = ? AND LOWER(COALESCE(status,'')) IN ('pending','failed')`,
      [eventId, participant.client_id]
    )

    await query(
      'DELETE FROM event_participants WHERE id = ? AND event_id = ?',
      [participantId, eventId]
    )

    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
}

export async function sendVoteReminder(req, res, next) {
  try {
    const eventId = Number(req.params.id)
    const event = await fetchEventById(eventId)
    if (!event) return res.status(404).json({ error: 'Evento no encontrado', code: 'EVENT_NOT_FOUND' })
    if (!DEFERRED_TYPES.has(String(event.type || '').toLowerCase())) {
      return res.status(400).json({ error: 'Solo disponible para eventos de tipo maletín o cofre.' })
    }

    const { rows } = await query(
      `SELECT ep.id, ep.client_id, ep.username, ep.payload_json,
              (SELECT id FROM chats WHERE client_id = ep.client_id AND is_archived = 0 ORDER BY id DESC LIMIT 1) AS chat_id
         FROM event_participants ep
        WHERE ep.event_id = ?`,
      [eventId]
    )

    const nonVoters = (rows || []).filter(row => {
      const payload = jsonParse(row.payload_json, {})
      const hasVoted = Boolean(payload.vote_key || payload.voted_for)
      const hasPaid  = String(payload.receipt_status || '').toLowerCase() === 'paid'
      return hasPaid && !hasVoted
    })

    let sent = 0
    for (const p of nonVoters) {
      if (!p.chat_id) continue
      const message = await getAutoMessage('event_vote_reminder', {
        vars: { nombre: p.username || `Cliente #${p.client_id}`, evento: event.title || event.type },
      })
      if (!message) continue
      try {
        await persistMessage({
          chatId: Number(p.chat_id),
          senderType: 'system',
          content: message,
          extra: { eventVoteReminder: true, eventId },
        })
        sent++
      } catch (e) {
        console.error('[sendVoteReminder] persistMessage error:', e?.message)
      }
    }

    res.json({ ok: true, sent, total: nonVoters.length })
  } catch (error) {
    next(error)
  }
}

export async function getEventRewards(req, res, next) {
  try {
    const status = req.query.status || null;
    const where = ['event_id = ?'];
    const values = [req.params.id];
    if (status) {
      assertEnum(status, REWARD_STATUSES, 'Estado de premio');
      where.push('status = ?');
      values.push(status);
    }
    const { rows, error } = await query(
      `SELECT * FROM event_rewards WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      values
    );
    if (error) return next(error);
    res.json({ rewards: rows || [] });
  } catch (error) {
    next(error);
  }
}

export async function listTemplates(req, res, next) {
  try {
    const { rows, error } = await query('SELECT * FROM event_templates ORDER BY created_at DESC');
    if (error) return next(error);
    res.json({ templates: rows.map(row => ({ ...row, config_json: jsonParse(row.config_json, {}) })) });
  } catch (error) {
    next(error);
  }
}

export async function createTemplate(req, res, next) {
  try {
    const { name, event_type, config_json } = req.body || {};
    if (!String(name || '').trim()) return res.status(400).json({ error: 'Nombre requerido', code: 'NAME_REQUIRED' });
    assertEnum(event_type, EVENT_TYPES, 'Tipo de evento');
    const { rows, error } = await query(
      'INSERT INTO event_templates (name, event_type, config_json, created_by) VALUES (?, ?, ?, ?)',
      [String(name).trim(), event_type, jsonStringify(config_json || {}), req.user?.sub || null]
    );
    if (error) return next(error);
    res.status(201).json({ templateId: rows.insertId });
  } catch (error) {
    next(error);
  }
}

export async function deleteTemplate(req, res, next) {
  try {
    const { error } = await query('DELETE FROM event_templates WHERE id = ?', [req.params.id]);
    if (error) return next(error);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function listAutomations(req, res, next) {
  try {
    const { rows, error } = await query('SELECT * FROM event_automations ORDER BY created_at DESC');
    if (error) return next(error);
    res.json({ automations: rows });
  } catch (error) {
    next(error);
  }
}

export async function createAutomation(req, res, next) {
  try {
    const body = req.body || {};
    const { rows, error } = await query(
      `INSERT INTO event_automations
        (name, event_type, template_id, automation_type, days_of_week, launch_time, condition_type, condition_value, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.name,
        body.event_type,
        body.template_id ?? null,
        body.automation_type,
        jsonStringify(body.days_of_week || []),
        body.launch_time || null,
        body.condition_type || null,
        body.condition_value ?? null,
        body.is_active ?? 1,
      ]
    );
    if (error) return next(error);
    res.status(201).json({ automationId: rows.insertId });
  } catch (error) {
    next(error);
  }
}

export async function updateAutomation(req, res, next) {
  try {
    const body = req.body || {};
    const { error } = await query(
      `UPDATE event_automations
       SET name = ?, event_type = ?, template_id = ?, automation_type = ?, days_of_week = ?,
           launch_time = ?, condition_type = ?, condition_value = ?, is_active = ?
       WHERE id = ?`,
      [
        body.name, body.event_type, body.template_id ?? null, body.automation_type,
        jsonStringify(body.days_of_week || []), body.launch_time || null,
        body.condition_type || null, body.condition_value ?? null, body.is_active ?? 1, req.params.id,
      ]
    );
    if (error) return next(error);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function deleteAutomation(req, res, next) {
  try {
    const { error } = await query('DELETE FROM event_automations WHERE id = ?', [req.params.id]);
    if (error) return next(error);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function toggleAutomation(req, res, next) {
  try {
    const { error } = await query('UPDATE event_automations SET is_active = 1 - is_active WHERE id = ?', [req.params.id]);
    if (error) return next(error);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getStats(req, res, next) {
  try {
    const period = String(req.query.period || 'today');
    const dateMap = {
      today: ['CURDATE()', 'CURDATE()'],
      yesterday: ['DATE_SUB(CURDATE(), INTERVAL 1 DAY)', 'DATE_SUB(CURDATE(), INTERVAL 1 DAY)'],
      week: ['DATE_SUB(CURDATE(), INTERVAL 7 DAY)', 'CURDATE()'],
      month: ['DATE_SUB(CURDATE(), INTERVAL 30 DAY)', 'CURDATE()'],
    };
    const [fromSql, toSql] = dateMap[period] || dateMap.today;
    const { rows, error } = await query(
      `SELECT
         COUNT(*) AS total_rewards,
         SUM(status = 'paid') AS paid_rewards,
         SUM(status = 'failed') AS failed_rewards,
         SUM(status = 'discarded') AS discarded_rewards,
         SUM(CASE WHEN status IN ('paid','pending') THEN COALESCE(reward_amount,0) ELSE 0 END) AS total_amount,
         COUNT(DISTINCT user_id) AS unique_users
       FROM event_rewards
       WHERE DATE(created_at) BETWEEN ${fromSql} AND ${toSql}`
    );
    if (error) return next(error);
    const bySourceQuery = await query(
      `SELECT source, COUNT(*) AS total, SUM(CASE WHEN status='paid' THEN COALESCE(reward_amount,0) ELSE 0 END) AS amount
       FROM event_rewards
       WHERE DATE(created_at) BETWEEN ${fromSql} AND ${toSql}
       GROUP BY source
       ORDER BY amount DESC`
    );
    const dailyQuery = await query(
      `SELECT DATE(created_at) AS day, event_type, COUNT(*) AS total, SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) AS paid
       FROM event_rewards
       WHERE DATE(created_at) BETWEEN ${fromSql} AND ${toSql}
       GROUP BY day, event_type
       ORDER BY day DESC`
    );

    res.json({
      kpis: rows?.[0] || {},
      bySource: bySourceQuery.rows || [],
      daily: dailyQuery.rows || [],
    });
  } catch (error) {
    next(error);
  }
}

export async function listRewards(req, res, next) {
  try {
    const { status } = req.query;
    const where = ['1=1'];
    const values = [];
    if (status) { where.push('status = ?'); values.push(status); }
    const { rows, error } = await query(
      `SELECT * FROM event_rewards WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT 300`,
      values
    );
    if (error) return next(error);
    res.json({ rewards: rows || [] });
  } catch (error) {
    next(error);
  }
}

export async function payReward(req, res, next) {
  try {
    const { rows: rewardRows, error: rewardFetchError } = await query(
      `SELECT er.id, er.event_id, er.client_id, er.status, er.reward_amount, er.reward_type,
              e.title AS event_title, e.type AS event_type
       FROM event_rewards er
       LEFT JOIN events e ON e.id = er.event_id
       WHERE er.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (rewardFetchError) return next(rewardFetchError);
    const reward = rewardRows?.[0] || null;
    if (!reward) return res.status(404).json({ error: 'Premio no encontrado' });

    // Credit casino balance before marking as paid
    if (reward.reward_type === 'fichas' && reward.reward_amount != null) {
      let panelResult;
      try {
        panelResult = await creditPanelBalance({ clientId: reward.client_id, amountArs: Number(reward.reward_amount) });
      } catch (panelErr) {
        panelResult = { ok: false, error: 'exception', message: panelErr.message };
      }
      if (!panelResult.ok) {
        return res.status(502).json({
          error: `No se pudo acreditar en el panel: ${panelResult.message || panelResult.error || 'error desconocido'}`,
          panelResult,
        });
      }
    }

    const { error } = await query(
      `UPDATE event_rewards
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP, attempts = attempts + 1, error_code = NULL, error_message = NULL
       WHERE id = ?`,
      [req.params.id]
    );
    if (error) return next(error);

    if (reward.client_id) {
      io?.to(`client:${reward.client_id}`).emit('event:reward_paid', {
        rewardId: Number(reward.id),
        eventId: reward.event_id ? Number(reward.event_id) : null,
        clientId: Number(reward.client_id),
        status: 'paid',
      });

      // Send auto-message to client's active chat
      try {
        const { rows: chatRows } = await query(
          'SELECT id FROM chats WHERE client_id = ? AND is_archived = 0 ORDER BY id DESC LIMIT 1',
          [reward.client_id]
        );
        const chatId = chatRows?.[0]?.id;
        if (chatId) {
          const eventName = reward.event_title || reward.event_type || 'evento';
          const amount = reward.reward_amount != null ? Number(reward.reward_amount) : null;
          const amountStr = amount != null
            ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
            : null;
          const msg = amountStr
            ? `¡Tus fichas del evento "${eventName}" ya fueron acreditadas! Se te acreditaron ${amountStr} en fichas. ¡Buena suerte!`
            : `¡Tus fichas del evento "${eventName}" ya fueron acreditadas! ¡Buena suerte!`;
          await persistMessage({ chatId, senderType: 'system', content: msg, extra: { eventRewardPaid: true, rewardId: Number(reward.id) } });
        }
      } catch (msgErr) {
        console.error('[Events] Error enviando mensaje de acreditación:', msgErr.message);
      }
    }

    const { rows: updatedRows } = await query(
      `SELECT er.*, e.title AS event_title, e.type AS event_type
       FROM event_rewards er LEFT JOIN events e ON e.id = er.event_id
       WHERE er.id = ? LIMIT 1`,
      [req.params.id]
    );
    res.json({ success: true, reward: updatedRows?.[0] || null });
  } catch (error) {
    next(error);
  }
}

export async function getClientEventRewards(req, res, next) {
  try {
    const chatId = Number(req.params.chatId);
    const { rows: chatRows, error: chatErr } = await query(
      'SELECT client_id FROM chats WHERE id = ? LIMIT 1',
      [chatId]
    );
    if (chatErr) return next(chatErr);
    const clientId = chatRows?.[0]?.client_id;
    if (!clientId) return res.status(404).json({ error: 'Chat no encontrado' });

    const { rows, error } = await query(
      `SELECT er.*,
              e.title AS event_title, e.type AS event_type, e.status AS event_status,
              JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_url'))               AS receipt_url,
              JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_status'))             AS receipt_status_raw,
              JSON_UNQUOTE(JSON_EXTRACT(ep.payload_json, '$.receipt_processing_reason')) AS receipt_reason,
              ep.id AS participant_id
       FROM event_rewards er
       LEFT JOIN events e ON e.id = er.event_id
       LEFT JOIN event_participants ep ON ep.id = (
         SELECT id FROM event_participants
         WHERE event_id = er.event_id AND client_id = er.client_id
         ORDER BY created_at DESC LIMIT 1
       )
       WHERE er.client_id = ?
       ORDER BY er.created_at DESC`,
      [clientId]
    );
    if (error) return next(error);
    res.json({ rewards: rows || [], clientId: Number(clientId) });
  } catch (error) {
    next(error);
  }
}

export async function discardReward(req, res, next) {
  try {
    const reason = String(req.body?.reason || '').trim();
    const { error } = await query(
      `UPDATE event_rewards
       SET status = 'discarded', discarded_at = CURRENT_TIMESTAMP, discard_reason = ?, attempts = attempts + 1
       WHERE id = ?`,
      [reason || null, req.params.id]
    );
    if (error) return next(error);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function creditEventReward(reward) {
  // Placeholder para conectar luego con la API real del casino.
  await query(
    `UPDATE event_rewards
     SET status = 'pending', attempts = attempts + 1, error_code = ?, error_message = ?
     WHERE id = ?`,
    [reward.error_code || 'NO_EXTERNAL_API', reward.error_message || 'Pendiente de acreditación externa', reward.id]
  );
  return { success: false };
}
