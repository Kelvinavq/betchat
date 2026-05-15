import { query, transaction } from '../config/database.js';
import { io } from '../app.js';

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

async function fetchEventById(id) {
  const { rows, error } = await query('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);
  if (error) throw error;
  return rows?.[0] ? normalizeEventRow(rows[0]) : null;
}

export async function listEvents(req, res, next) {
  try {
    const filters = parseFilters(req.query);
    const { where, values } = buildWhere(filters);
    const { rows, error } = await query(
      `SELECT * FROM events WHERE ${where} ORDER BY created_at DESC LIMIT 200`,
      values
    );
    if (error) return next(error);
    res.json({ events: (rows || []).map(normalizeEventRow) });
  } catch (error) {
    next(error);
  }
}

export async function getEvent(req, res, next) {
  try {
    const event = await fetchEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Evento no encontrado', code: 'EVENT_NOT_FOUND' });
    res.json({ event });
  } catch (error) {
    next(error);
  }
}

export async function createEvent(req, res, next) {
  try {
    const body = req.body || {};
    assertEnum(body.type, EVENT_TYPES, 'Tipo de evento');
    const requestedStatus = body.status || 'draft';
    assertEnum(requestedStatus, EVENT_STATUSES, 'Estado');
    const title = String(body.title || '').trim();
    if (!title) return res.status(400).json({ error: 'El título es obligatorio', code: 'TITLE_REQUIRED' });
    if (!body.config_json || typeof body.config_json !== 'object') {
      return res.status(400).json({ error: 'config_json es obligatorio', code: 'CONFIG_REQUIRED' });
    }

    const startsAt = body.starts_at || null;
    const nextStatus =
      startsAt && requestedStatus === 'active' && new Date(startsAt).getTime() > Date.now()
        ? 'scheduled'
        : requestedStatus;

    const payload = {
      type: body.type,
      title,
      description: body.description || null,
      status: nextStatus,
      config_json: jsonStringify(body.config_json),
      preview_json: body.preview_json ? jsonStringify(body.preview_json) : null,
      min_deposit_amount: body.min_deposit_amount ?? null,
      prize_type: body.prize_type || null,
      prize_amount: body.prize_amount ?? null,
      starts_at: body.starts_at || null,
      ends_at: body.ends_at || null,
      duration_minutes: body.duration_minutes ?? null,
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
    const event = await fetchEventById(rows.insertId);

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
    const nextType = body.type || event.type;
    assertEnum(nextType, EVENT_TYPES, 'Tipo de evento');
    const requestedStatus = body.status || event.status;
    const startsAt = body.starts_at ?? event.starts_at;
    const nextStatus =
      startsAt && requestedStatus === 'active' && new Date(startsAt).getTime() > Date.now()
        ? 'scheduled'
        : requestedStatus;
    assertEnum(nextStatus, EVENT_STATUSES, 'Estado');

    const configJson = body.config_json ? jsonStringify(body.config_json) : jsonStringify(event.config_json);
    const previewJson = body.preview_json !== undefined ? jsonStringify(body.preview_json) : jsonStringify(event.preview_json);

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
        body.prize_amount ?? event.prize_amount,
        body.starts_at ?? event.starts_at,
        body.ends_at ?? event.ends_at,
        body.duration_minutes ?? event.duration_minutes,
        req.params.id,
      ]
    );
    if (error) return next(error);
    const updatedEvent = await fetchEventById(req.params.id);

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

export async function deleteEvent(req, res, next) {
  try {
    const { error } = await query('DELETE FROM events WHERE id = ?', [req.params.id]);
    if (error) return next(error);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function setEventStatus(req, res, next, status) {
  try {
    const { error } = await query('UPDATE events SET status = ? WHERE id = ?', [status, req.params.id]);
    if (error) return next(error);
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
export const finishEvent = (req, res, next) => setEventStatus(req, res, next, 'finished');
export const cancelEvent = (req, res, next) => setEventStatus(req, res, next, 'cancelled');

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
    const { error } = await query(
      `UPDATE event_rewards
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP, attempts = attempts + 1, error_code = NULL, error_message = NULL
       WHERE id = ?`,
      [req.params.id]
    );
    if (error) return next(error);
    res.json({ success: true });
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
