import { randomBytes } from 'crypto'
import { query } from '../config/database.js'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ALNUM   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function generateCode() {
  const b = randomBytes(8)
  const prefix = Array.from({ length: 4 }, (_, i) => LETTERS[b[i] % LETTERS.length]).join('')
  const suffix = Array.from({ length: 4 }, (_, i) => ALNUM[b[4 + i] % ALNUM.length]).join('')
  return `${prefix}-${suffix}`
}

async function ensureReferralCode(clientId) {
  const { rows } = await query('SELECT referral_code FROM clients WHERE id = ?', [clientId])
  if (rows?.[0]?.referral_code) return rows[0].referral_code

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    try {
      await query(
        'UPDATE clients SET referral_code = ? WHERE id = ? AND referral_code IS NULL',
        [code, clientId]
      )
      const { rows: check } = await query('SELECT referral_code FROM clients WHERE id = ?', [clientId])
      if (check?.[0]?.referral_code) return check[0].referral_code
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY') throw e
    }
  }
  throw new Error('No se pudo generar código de referido único.')
}

function parseUA(ua = '') {
  const s = String(ua)

  let os = 'Desconocido'
  if      (/Windows NT 10|Windows NT 11/.test(s))               os = 'Windows 10/11'
  else if (/Windows NT 6\.3/.test(s))                            os = 'Windows 8.1'
  else if (/Windows NT 6\.1/.test(s))                            os = 'Windows 7'
  else if (/Windows/.test(s))                                    os = 'Windows'
  else if (/Mac OS X/.test(s))                                   os = 'macOS'
  else if (/Android (\d+)/.test(s)) { const v = s.match(/Android (\d+)/); os = `Android ${v?.[1] || ''}` }
  else if (/iPhone OS (\d+)/.test(s)) { const v = s.match(/iPhone OS (\d+)/); os = `iOS ${v?.[1] || ''}` }
  else if (/iPad.*OS (\d+)/.test(s))  { const v = s.match(/iPad.*OS (\d+)/);  os = `iPadOS ${v?.[1] || ''}` }
  else if (/Linux/.test(s))                                      os = 'Linux'

  let browser = 'Desconocido'
  if      (/Edg\/(\d+)/.test(s))     { const v = s.match(/Edg\/(\d+)/);     browser = `Edge ${v?.[1] || ''}` }
  else if (/OPR\/(\d+)/.test(s))     { const v = s.match(/OPR\/(\d+)/);     browser = `Opera ${v?.[1] || ''}` }
  else if (/Chrome\/(\d+)/.test(s))  { const v = s.match(/Chrome\/(\d+)/);  browser = `Chrome ${v?.[1] || ''}` }
  else if (/Firefox\/(\d+)/.test(s)) { const v = s.match(/Firefox\/(\d+)/); browser = `Firefox ${v?.[1] || ''}` }
  else if (/Version\/(\d+).*Safari/.test(s)) { const v = s.match(/Version\/(\d+)/); browser = `Safari ${v?.[1] || ''}` }

  let deviceType = 'desktop'
  if      (/Mobile|iPhone/.test(s))                       deviceType = 'mobile'
  else if (/iPad|Android(?!.*Mobile)|Tablet/.test(s))     deviceType = 'tablet'

  return { os: os.trim(), browser: browser.trim(), deviceType }
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return fwd.split(',')[0].trim()
  return req.ip || req.connection?.remoteAddress || null
}

function isPrivateIp(ip) {
  if (!ip) return true
  const clean = ip.replace(/^::ffff:/, '')
  if (clean === '127.0.0.1' || clean === '::1') return true
  if (/^10\./.test(clean)) return true
  if (/^192\.168\./.test(clean)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(clean)) return true
  return false
}

async function geoLookup(ip) {
  if (!ip || isPrivateIp(ip)) return { country: null, city: null }
  try {
    const clean = ip.replace(/^::ffff:/, '')
    const res = await fetch(`http://ip-api.com/json/${clean}?fields=status,country,city`, {
      signal: AbortSignal.timeout(3000),
    })
    const data = await res.json()
    if (data.status === 'success') return { country: data.country || null, city: data.city || null }
  } catch { /* skip silently */ }
  return { country: null, city: null }
}

export async function logClientSession(clientId, req) {
  try {
    const ip = getClientIp(req)
    const ua = String(req.headers['user-agent'] || '').slice(0, 512)
    const fingerprint = req.body?.fingerprint ? String(req.body.fingerprint).slice(0, 255) : null
    const { os, browser, deviceType } = parseUA(ua)
    const { country, city } = await geoLookup(ip)

    await query(
      `INSERT INTO client_sessions (client_id, ip_address, user_agent, device_type, browser, os, country, city, fingerprint)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [clientId, ip, ua, deviceType, browser, os, country, city, fingerprint]
    )
  } catch (err) {
    console.error('[profileController] Error al registrar sesión:', err.message)
  }
}

export async function getChatProfile(req, res, next) {
  try {
    const chatId = Number(req.params.chatId)
    if (!chatId) return res.status(400).json({ error: 'ID de chat inválido.' })

    const { rows: chatRows, error: chatErr } = await query(
      'SELECT client_id FROM chats WHERE id = ?',
      [chatId]
    )
    if (chatErr) throw chatErr
    if (!chatRows?.length) return res.status(404).json({ error: 'Chat no encontrado.' })

    const clientId = chatRows[0].client_id
    const referralCode = await ensureReferralCode(clientId)

    const { rows: sessionRows } = await query(
      `SELECT id, ip_address, device_type, browser, os, country, city, fingerprint, created_at
       FROM client_sessions
       WHERE client_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [clientId]
    )

    res.json({
      referralCode,
      sessions: (sessionRows || []).map(s => ({
        id: s.id,
        ip: s.ip_address || null,
        deviceType: s.device_type || 'desktop',
        browser: s.browser || null,
        os: s.os || null,
        country: s.country || null,
        city: s.city || null,
        fingerprint: s.fingerprint || null,
        createdAt: s.created_at,
      })),
    })
  } catch (error) {
    next(error)
  }
}
