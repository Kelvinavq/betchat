import { writeFile, unlink, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import { query } from '../config/database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const PUBLIC_DIR    = join(__dirname, '../public')
const SOUNDS_DIR    = join(PUBLIC_DIR, 'sounds')
const SOUNDS_PREFIX = '/sounds/'

const MAX_FILE_BYTES = 1 * 1024 * 1024  // 1 MB
const MAX_DURATION   = 5.0               // 5 seconds

const AUDIO_MIME = {
  'audio/mpeg': 'mp3',
  'audio/mp3':  'mp3',
  'audio/ogg':  'ogg',
  'audio/wav':  'wav',
  'audio/x-wav':'wav',
  'audio/mp4':  'mp4',
  'audio/webm': 'webm',
}

function parseAudioDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(
    /^data:(audio\/[a-z0-9\-+]+)(?:;[^,]*)?;base64,([a-z0-9+/=\n]+)$/i
  )
  if (!match) return null
  const mime   = match[1].toLowerCase()
  const ext    = AUDIO_MIME[mime]
  if (!ext) return null
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) return null
  const hash   = createHash('sha256').update(buffer).update(String(Date.now())).digest('hex')
  const filename = `${hash}.${ext}`
  return { buffer, filename, ext, url: `${SOUNDS_PREFIX}${filename}` }
}

async function removeSoundFile(fileUrl) {
  if (!fileUrl?.startsWith(SOUNDS_PREFIX)) return
  const filename = fileUrl.replace(SOUNDS_PREFIX, '')
  if (!filename || filename.includes('/') || filename.includes('\\')) return
  try { await unlink(join(SOUNDS_DIR, filename)) } catch {}
}

/* ── GET /api/notification-sounds ── */
export async function listSounds(req, res) {
  const { rows, error } = await query(
    `SELECT id, name, file_url, file_size, duration, created_by, created_at
       FROM notification_sounds
      ORDER BY created_at DESC`,
    []
  )
  if (error) return res.status(500).json({ error: 'Error al obtener los sonidos' })
  res.json({ sounds: rows || [] })
}

/* ── POST /api/notification-sounds ── (admin only) */
export async function uploadSound(req, res) {
  const { name, data_url, duration } = req.body || {}
  const userId = Number(req.user?.sub) || null

  if (!String(name || '').trim())
    return res.status(400).json({ error: 'El nombre es requerido' })
  if (!data_url)
    return res.status(400).json({ error: 'El archivo de audio es requerido' })

  const durationNum = parseFloat(duration)
  if (!Number.isFinite(durationNum) || durationNum <= 0 || durationNum > MAX_DURATION)
    return res.status(400).json({ error: `La duración debe ser mayor a 0 y máximo ${MAX_DURATION} segundos` })

  const file = parseAudioDataUrl(data_url)
  if (!file)
    return res.status(400).json({ error: 'Formato inválido o archivo demasiado grande (máx 1 MB). Formatos: mp3, ogg, wav, mp4, webm' })

  try {
    await mkdir(SOUNDS_DIR, { recursive: true })
    await writeFile(join(SOUNDS_DIR, file.filename), file.buffer)
  } catch {
    return res.status(500).json({ error: 'Error al guardar el archivo en el servidor' })
  }

  const { rows, error } = await query(
    `INSERT INTO notification_sounds (name, file_url, file_size, duration, created_by) VALUES (?, ?, ?, ?, ?)`,
    [String(name).trim().slice(0, 120), file.url, file.buffer.length, durationNum, userId || null]
  )
  if (error) return res.status(500).json({ error: 'Error al registrar el sonido' })

  res.status(201).json({
    sound: {
      id: rows.insertId,
      name: String(name).trim(),
      file_url: file.url,
      file_size: file.buffer.length,
      duration: durationNum,
      created_by: userId,
      created_at: new Date().toISOString(),
    },
  })
}

/* ── DELETE /api/notification-sounds/:id ── (admin only) */
export async function deleteSound(req, res) {
  const soundId = Number(req.params.id)
  if (!soundId) return res.status(400).json({ error: 'ID inválido' })

  const { rows: found, error: fetchErr } = await query(
    `SELECT id, file_url FROM notification_sounds WHERE id = ? LIMIT 1`,
    [soundId]
  )
  if (fetchErr) return res.status(500).json({ error: 'Error al buscar el sonido' })
  if (!found?.length) return res.status(404).json({ error: 'Sonido no encontrado' })

  // Reset any user who had this sound selected
  await query(`UPDATE users SET notification_sound_id = NULL WHERE notification_sound_id = ?`, [soundId])

  const { error } = await query(`DELETE FROM notification_sounds WHERE id = ?`, [soundId])
  if (error) return res.status(500).json({ error: 'Error al eliminar el sonido' })

  await removeSoundFile(found[0].file_url)
  res.json({ success: true })
}

/* ── GET /api/notification-sounds/preference ── (any auth user) */
export async function getUserPreference(req, res) {
  const userId = Number(req.user?.sub)
  const { rows, error } = await query(
    `SELECT u.notification_sound_id,
            u.notification_sound_enabled,
            ns.name      AS sound_name,
            ns.file_url  AS sound_url,
            ns.duration  AS sound_duration
       FROM users u
       LEFT JOIN notification_sounds ns ON ns.id = u.notification_sound_id
      WHERE u.id = ? LIMIT 1`,
    [userId]
  )
  if (error) return res.status(500).json({ error: 'Error al obtener preferencia' })
  const row = rows?.[0] || {}
  res.json({
    soundId:      row.notification_sound_id || null,
    soundEnabled: row.notification_sound_enabled !== 0,
    sound: row.notification_sound_id
      ? {
          id:       row.notification_sound_id,
          name:     row.sound_name,
          file_url: row.sound_url,
          duration: Number(row.sound_duration) || 0,
        }
      : null,
  })
}

/* ── PUT /api/notification-sounds/preference ── (any auth user) */
export async function updateUserPreference(req, res) {
  const userId = Number(req.user?.sub)
  const { sound_id, sound_enabled } = req.body || {}

  // Validate sound_id if provided and not null
  if (sound_id != null) {
    const { rows, error } = await query(
      `SELECT id FROM notification_sounds WHERE id = ? LIMIT 1`,
      [Number(sound_id)]
    )
    if (error) return res.status(500).json({ error: 'Error al verificar sonido' })
    if (!rows?.length) return res.status(404).json({ error: 'Sonido no encontrado' })
  }

  const updates = []
  const params  = []
  if (sound_id !== undefined) {
    updates.push('notification_sound_id = ?')
    params.push(sound_id == null ? null : Number(sound_id))
  }
  if (sound_enabled !== undefined) {
    updates.push('notification_sound_enabled = ?')
    params.push(sound_enabled ? 1 : 0)
  }
  if (!updates.length) return res.status(400).json({ error: 'Sin cambios' })
  params.push(userId)

  const { error } = await query(
    `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    params
  )
  if (error) return res.status(500).json({ error: 'Error al guardar preferencia' })
  res.json({ success: true })
}
