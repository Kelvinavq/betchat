import { query } from '../config/database.js'

function validateDates(from, to) {
  const re = /^\d{4}-\d{2}-\d{2}$/
  if (!re.test(from) || !re.test(to)) throw Object.assign(new Error('Fechas inválidas'), { status: 400 })
  if (from > to) throw Object.assign(new Error('La fecha de inicio debe ser anterior al fin'), { status: 400 })
}

export async function getChatAnalytics(req, res, next) {
  try {
    const from = req.query.from || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)
    const to   = req.query.to   || new Date().toISOString().slice(0, 10)
    validateDates(from, to)

    const [
      kpiRows,
      msgsByDay,
      chatsByDay,
      hourlyRows,
      agentRows,
      newClientsRows,
    ] = await Promise.all([
      // KPIs
      query(`
        SELECT
          (SELECT COUNT(*) FROM chats WHERE DATE(created_at) BETWEEN ? AND ?)                            AS total_chats,
          (SELECT COUNT(*) FROM messages WHERE sender_type = 'client' AND DATE(created_at) BETWEEN ? AND ?) AS total_messages,
          (SELECT COUNT(DISTINCT client_id) FROM messages WHERE sender_type = 'client' AND DATE(created_at) BETWEEN ? AND ?) AS unique_clients,
          (SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, created_at, closed_at)), 1) FROM chats
            WHERE closed_at IS NOT NULL AND DATE(created_at) BETWEEN ? AND ?)                            AS avg_resolution_min,
          (SELECT COUNT(*) FROM chats WHERE is_help_request = 1 AND DATE(created_at) BETWEEN ? AND ?)   AS help_requests
      `, [from, to, from, to, from, to, from, to, from, to]),

      // Messages by day (client only)
      query(`
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM messages
        WHERE sender_type = 'client' AND DATE(created_at) BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY day
      `, [from, to]),

      // Chats opened by day
      query(`
        SELECT DATE(created_at) AS day, COUNT(*) AS count
        FROM chats
        WHERE DATE(created_at) BETWEEN ? AND ?
        GROUP BY DATE(created_at)
        ORDER BY day
      `, [from, to]),

      // Hourly pattern (client messages)
      query(`
        SELECT HOUR(created_at) AS hour, COUNT(*) AS count
        FROM messages
        WHERE sender_type = 'client' AND DATE(created_at) BETWEEN ? AND ?
        GROUP BY HOUR(created_at)
        ORDER BY hour
      `, [from, to]),

      // Chats per agent
      query(`
        SELECT u.id, u.username, u.full_name,
               COUNT(c.id) AS total,
               SUM(CASE WHEN c.is_open = 0 THEN 1 ELSE 0 END) AS resolved
        FROM chats c
        INNER JOIN users u ON u.id = c.assigned_user_id
        WHERE DATE(c.created_at) BETWEEN ? AND ?
        GROUP BY u.id, u.username, u.full_name
        ORDER BY total DESC
        LIMIT 10
      `, [from, to]),

      // New clients by day
      query(`
        SELECT DATE(registered_at) AS day, COUNT(*) AS count
        FROM clients
        WHERE is_temporary = 0 AND DATE(registered_at) BETWEEN ? AND ?
        GROUP BY DATE(registered_at)
        ORDER BY day
      `, [from, to]),
    ])

    const kpi = kpiRows.rows?.[0] || {}

    // Build full date-range arrays for charts
    const days = []
    const cur = new Date(from)
    const end = new Date(to)
    while (cur <= end) {
      days.push(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 1)
    }

    const msgsByDayMap  = Object.fromEntries((msgsByDay.rows  || []).map(r => [r.day,  r.count]))
    const chatsByDayMap = Object.fromEntries((chatsByDay.rows || []).map(r => [r.day,  r.count]))
    const clientsMap    = Object.fromEntries((newClientsRows.rows || []).map(r => [r.day, r.count]))

    const timeline = days.map(day => ({
      day,
      messages: Number(msgsByDayMap[day]  || 0),
      chats:    Number(chatsByDayMap[day] || 0),
      clients:  Number(clientsMap[day]    || 0),
    }))

    // Hourly: fill 0-23
    const hourlyMap = Object.fromEntries((hourlyRows.rows || []).map(r => [r.hour, r.count]))
    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, '0')}h`,
      count: Number(hourlyMap[h] || 0),
    }))

    res.json({
      from,
      to,
      kpi: {
        totalChats:       Number(kpi.total_chats     || 0),
        totalMessages:    Number(kpi.total_messages  || 0),
        uniqueClients:    Number(kpi.unique_clients  || 0),
        helpRequests:     Number(kpi.help_requests   || 0),
        avgResolutionMin: kpi.avg_resolution_min != null ? Number(kpi.avg_resolution_min) : null,
      },
      timeline,
      hourly,
      agents: (agentRows.rows || []).map(r => ({
        id:       r.id,
        username: r.username,
        fullName: r.full_name,
        total:    Number(r.total),
        resolved: Number(r.resolved),
      })),
    })
  } catch (error) {
    next(error)
  }
}
