import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { promises as fs } from 'fs'
import { query } from '../config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PUBLIC_DIR = join(__dirname, '..', 'public')

function chunkArray(arr, size) {
  const result = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

async function deletePhysicalFile(fileUrl) {
  if (!fileUrl) return false
  try {
    const rel = fileUrl.startsWith('/') ? fileUrl.slice(1) : fileUrl
    await fs.unlink(join(PUBLIC_DIR, rel))
    return true
  } catch {
    return false
  }
}

/* ── Core logic — shared by HTTP handler and auto-scheduler ── */
async function runMaintenanceInternal({ clearMessages, clearFiles }) {
  const stats = { messagesDeleted: 0, filesDeleted: 0, filesSkipped: 0 }

  /* 1. Limpiar mensajes (borra registros + sus archivos) */
  if (clearMessages?.enabled && clearMessages.fromDate && clearMessages.toDate) {
    const { rows: msgRows, error: selErr } = await query(
      `SELECT id, file_url FROM messages WHERE DATE(created_at) BETWEEN ? AND ?`,
      [clearMessages.fromDate, clearMessages.toDate]
    )
    if (selErr) throw selErr

    const rows = msgRows || []
    const ids  = rows.map(r => r.id)

    if (ids.length > 0) {
      for (const row of rows) {
        if (row.file_url) {
          const ok = await deletePhysicalFile(row.file_url)
          ok ? stats.filesDeleted++ : stats.filesSkipped++
        }
      }
      for (const batch of chunkArray(ids, 500)) {
        const ph = batch.map(() => '?').join(',')
        await query(`UPDATE manual_payment_movements SET message_id = NULL WHERE message_id IN (${ph})`, batch)
      }
      for (const batch of chunkArray(ids, 500)) {
        const ph = batch.map(() => '?').join(',')
        const { rows: del, error: delErr } = await query(`DELETE FROM messages WHERE id IN (${ph})`, batch)
        if (delErr) throw delErr
        stats.messagesDeleted += del?.affectedRows ?? batch.length
      }
    }
  }

  /* 2. Limpiar archivos (borra físico, conserva registro de texto) */
  if (clearFiles?.enabled && clearFiles.fromDate && clearFiles.toDate) {
    const { rows: fileRows, error: selErr } = await query(
      `SELECT id, file_url FROM messages
       WHERE file_url IS NOT NULL
         AND message_type IN ('image', 'pdf', 'audio')
         AND DATE(created_at) BETWEEN ? AND ?`,
      [clearFiles.fromDate, clearFiles.toDate]
    )
    if (selErr) throw selErr

    const rows = fileRows || []
    const ids  = rows.map(r => r.id)

    for (const row of rows) {
      const ok = await deletePhysicalFile(row.file_url)
      ok ? stats.filesDeleted++ : stats.filesSkipped++
    }
    if (ids.length > 0) {
      for (const batch of chunkArray(ids, 500)) {
        const ph = batch.map(() => '?').join(',')
        await query(`UPDATE messages SET file_url = NULL, file_name = NULL WHERE id IN (${ph})`, batch)
      }
    }
  }

  await query(
    `UPDATE maintenance_config SET last_run_at = CURRENT_TIMESTAMP, last_run_stats = ? WHERE id = 1`,
    [JSON.stringify(stats)]
  )

  return stats
}

/* ── Auto-scheduler — call once on server startup ── */
let schedulerTimer = null

export function startMaintenanceScheduler() {
  // Check every hour whether it's time to run
  schedulerTimer = setInterval(async () => {
    try {
      const { rows, error } = await query('SELECT * FROM maintenance_config WHERE id = 1 LIMIT 1')
      if (error || !rows?.length) return

      const cfg = rows[0]
      if (!cfg.interval_days) return  // 0 = disabled

      const now     = Date.now()
      const lastRun = cfg.last_run_at ? new Date(cfg.last_run_at).getTime() : 0
      const intervalMs = cfg.interval_days * 24 * 60 * 60 * 1000

      if (now - lastRun < intervalMs) return  // not yet

      // Date range: clean everything older than interval_days days
      const cutoff = new Date(now - intervalMs)
      const toDate   = cutoff.toISOString().slice(0, 10)
      const fromDate = '2000-01-01'

      console.log(`[Maintenance] Ejecutando mantenimiento automático (intervalo: ${cfg.interval_days}d, hasta: ${toDate})`)

      const stats = await runMaintenanceInternal({
        clearMessages: cfg.clear_messages ? { enabled: true, fromDate, toDate } : { enabled: false },
        clearFiles:    cfg.clear_files    ? { enabled: true, fromDate, toDate } : { enabled: false },
      })

      console.log(`[Maintenance] Completado — mensajes: ${stats.messagesDeleted}, archivos: ${stats.filesDeleted}`)
    } catch (err) {
      console.error('[Maintenance] Error en mantenimiento automático:', err.message)
    }
  }, 60 * 60 * 1000) // cada hora
}

export function stopMaintenanceScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer)
    schedulerTimer = null
  }
}

/* ── HTTP handlers ── */

export async function getMaintenanceConfig(req, res, next) {
  try {
    const { rows, error } = await query('SELECT * FROM maintenance_config WHERE id = 1 LIMIT 1')
    if (error) throw error
    const row = rows?.[0] || {}
    res.json({
      intervalDays:  row.interval_days ?? 0,
      clearMessages: Boolean(row.clear_messages ?? 1),
      clearFiles:    Boolean(row.clear_files ?? 1),
      lastRunAt:     row.last_run_at || null,
      lastRunStats:  row.last_run_stats
        ? (typeof row.last_run_stats === 'string' ? JSON.parse(row.last_run_stats) : row.last_run_stats)
        : null,
    })
  } catch (error) {
    next(error)
  }
}

export async function saveMaintenanceConfig(req, res, next) {
  try {
    const intervalDays    = Math.max(0, Math.floor(Number(req.body.intervalDays) || 0))
    const clearMessages   = req.body.clearMessages !== false ? 1 : 0
    const clearFiles      = req.body.clearFiles    !== false ? 1 : 0

    const { error } = await query(
      `INSERT INTO maintenance_config (id, interval_days, clear_messages, clear_files)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         interval_days  = VALUES(interval_days),
         clear_messages = VALUES(clear_messages),
         clear_files    = VALUES(clear_files)`,
      [intervalDays, clearMessages, clearFiles]
    )
    if (error) throw error
    res.json({ success: true, intervalDays, clearMessages: Boolean(clearMessages), clearFiles: Boolean(clearFiles) })
  } catch (error) {
    next(error)
  }
}

export async function runMaintenance(req, res, next) {
  try {
    const { clearMessages, clearFiles } = req.body || {}
    const stats = await runMaintenanceInternal({ clearMessages, clearFiles })
    res.json({ success: true, stats })
  } catch (error) {
    next(error)
  }
}
