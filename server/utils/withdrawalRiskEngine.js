import axios from 'axios'
import { query } from '../config/database.js'

const REVIEW_THRESHOLD = 35
const REJECT_THRESHOLD = 80

const normalizeCbuCvu = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits.length === 22 ? digits : null
}

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()

const isLocalIp = (ip) =>
  !ip || ip === '127.0.0.1' || ip === '::1' ||
  ip.startsWith('10.') || ip.startsWith('172.16.') || ip.startsWith('192.168.')

export function getRequestIp(req) {
  const rawIp =
    req.headers['x-forwarded-for'] || req.headers['x-real-ip'] ||
    req.connection?.remoteAddress || req.socket?.remoteAddress || ''
  return String(rawIp).split(',')[0].trim().replace(/^::ffff:/, '')
}

function parseDeviceFromUserAgent(ua) {
  if (!ua) return 'Unknown on Unknown'
  const browser = ua.match(/(?:Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)[/\s][\d.]+/i)?.[0] || 'Unknown'
  const os = ua.match(/(?:Windows NT|Mac OS X|Linux|Android|iPhone OS|iPad)[^;)]+/i)?.[0] || 'Unknown'
  return `${browser} on ${os}`
}

export async function buildRequestContext(req) {
  const ip = getRequestIp(req)
  const userAgent = req.headers['user-agent'] || ''
  const device = parseDeviceFromUserAgent(userAgent)

  let geo = null
  if (!isLocalIp(ip)) {
    try {
      const geoResp = await axios.get(`https://ip.guide/${ip}`, { timeout: 6000 })
      const d = geoResp.data || {}
      const loc = d.location || {}
      const net = d.network || {}
      const as = net.autonomous_system || {}
      geo = {
        country_code: loc.country || null,
        country_name: loc.country_name || null,
        city: loc.city || null,
        region: loc.region || loc.state || null,
        latitude: loc.coordinates?.latitude ?? loc.latitude ?? null,
        longitude: loc.coordinates?.longitude ?? loc.longitude ?? null,
        timezone: loc.timezone || null,
        asn_number: as.asn ? Number(as.asn) : null,
        asn_name: as.name || null,
        asn_org: as.organization || null,
      }
    } catch { geo = null }
  }

  return { ip: ip || null, device, userAgent, geo }
}

async function getRecentClientSessions(clientId, limit = 5) {
  const { rows = [] } = await query(
    `SELECT ip_address, country, city, user_agent, device_type, browser, os, geo_json, created_at AS login_at
     FROM client_sessions WHERE client_id = ? ORDER BY created_at DESC LIMIT ?`,
    [clientId, limit]
  )
  return rows
}

async function getWhitelistMatch(clientId, cbu) {
  const { rows } = await query(
    `SELECT id, source, source_ref_id, verified_at FROM client_cbu_whitelist
     WHERE client_id = ? AND cbu = ? AND active = 1 LIMIT 1`,
    [clientId, cbu]
  )
  return rows?.[0] || null
}

async function getApprovedWithdrawalDestination(clientId, cbu) {
  const { rows } = await query(
    `SELECT id, status, created_at FROM withdrawal_requests
     WHERE client_id = ? AND cbu = ? AND status IN ('initiated','processing','done')
     ORDER BY created_at DESC LIMIT 1`,
    [clientId, cbu]
  )
  return rows?.[0] || null
}

async function getSameClientMovement(clientId, cbu) {
  if (!clientId || !cbu) return null
  const { rows } = await query(
    `SELECT id, from_cbu, amount, status, created_at FROM hgcash_movements
     WHERE client_id = ? AND from_cbu = ? AND status = 'paid'
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [clientId, cbu]
  )
  return rows?.[0] || null
}

async function getCrossClientDestination(clientId, cbu) {
  if (!cbu) return null
  const { rows: wl } = await query(
    `SELECT client_id, source, verified_at FROM client_cbu_whitelist
     WHERE cbu = ? AND client_id != ? AND active = 1
     ORDER BY verified_at DESC LIMIT 1`,
    [cbu, clientId]
  )
  if (wl?.length) return { ...wl[0], origin: 'whitelist' }

  const { rows: wr } = await query(
    `SELECT client_id, id, status, created_at FROM withdrawal_requests
     WHERE cbu = ? AND client_id != ? AND status IN ('initiated','processing','done')
     ORDER BY created_at DESC LIMIT 1`,
    [cbu, clientId]
  )
  if (wr?.length) return { ...wr[0], origin: 'withdrawal' }
  return null
}

async function countRecentAttempts(clientId, cbu, minutes = 30) {
  const { rows } = await query(
    `SELECT COUNT(*) AS total FROM withdrawal_requests
     WHERE client_id = ? AND cbu = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
    [clientId, cbu, minutes]
  )
  return Number(rows?.[0]?.total || 0)
}

async function checkBlacklist(cbu, cuit, dni) {
  const conditions = [], values = []
  if (cbu)  { conditions.push("(type = 'cbu'  AND value = ?)"); values.push(cbu) }
  if (cuit) { conditions.push("(type = 'cuit' AND value = ?)"); values.push(cuit) }
  if (dni)  { conditions.push("(type = 'dni'  AND value = ?)"); values.push(dni) }
  if (!conditions.length) return null
  const { rows } = await query(
    `SELECT id, type, value FROM withdrawal_blacklist WHERE ${conditions.join(' OR ')} LIMIT 1`,
    values
  )
  return rows?.[0] || null
}

function pushFlag(flags, code, label, severity = 'medium', data = null) {
  if (!code || flags.some((f) => f.code === code)) return
  flags.push({ code, label, severity, data })
}

export async function evaluateWithdrawalRisk({ clientId, clientRow, destinationCbu, holderName, amount, requestContext }) {
  const normalizedCbu = normalizeCbuCvu(destinationCbu)
  const normalizedHolder = normalizeText(holderName)
  const clientNames = [clientRow?.username, clientRow?.full_name].map(normalizeText).filter(Boolean)

  const flags = []
  let score = 0

  const [whitelistMatch, approvedWithdrawal, sameClientMovement, crossClientDest] = await Promise.all([
    getWhitelistMatch(clientId, normalizedCbu),
    getApprovedWithdrawalDestination(clientId, normalizedCbu),
    getSameClientMovement(clientId, normalizedCbu),
    getCrossClientDestination(clientId, normalizedCbu),
  ])

  const recentAttempts = await countRecentAttempts(clientId, normalizedCbu, 30)
  const recentSessions = await getRecentClientSessions(clientId, 5)

  const verifiedSources = []
  if (whitelistMatch) verifiedSources.push('whitelist')
  if (approvedWithdrawal) verifiedSources.push('approved_withdrawal')
  if (clientRow?.cbu_cvu && normalizeCbuCvu(clientRow.cbu_cvu) === normalizedCbu) verifiedSources.push('client_profile')

  if (!verifiedSources.length) {
    pushFlag(flags, 'destination_unverified', 'Destino no verificado', 'high', { destinationCbu: normalizedCbu })
    score += 45
  }

  if (sameClientMovement) {
    pushFlag(flags, 'same_client_hg_movement', 'Aparece en movimientos HG del mismo cliente', 'info', { movementId: sameClientMovement.id })
    score = Math.max(score - 15, 0)
  }

  if (crossClientDest) {
    pushFlag(flags, 'cross_client_destination', 'El destino aparece en otro cliente', 'high', { clientId: crossClientDest.client_id, origin: crossClientDest.origin })
    score += 70
  }

  if (clientRow?.cbu_cvu) {
    const stored = normalizeCbuCvu(clientRow.cbu_cvu)
    if (stored && stored !== normalizedCbu) {
      pushFlag(flags, 'profile_destination_changed', 'El destino difiere del CBU/CVU guardado', 'medium', { storedCbu: stored })
      score += 20
    }
  }

  if (amount >= 300000 * 0.8)  { pushFlag(flags, 'high_amount',      'Monto alto o cercano al máximo', 'medium'); score += 15 }
  if (amount >= 300000 * 0.95) { pushFlag(flags, 'very_high_amount', 'Monto muy alto', 'high'); score += 10 }

  if (clientNames.length && !clientNames.includes(normalizedHolder)) {
    pushFlag(flags, 'holder_mismatch', 'El titular no coincide con el perfil', 'high', { holderName })
    score += 25
  }

  if (recentAttempts >= 3) {
    pushFlag(flags, 'multiple_attempts', 'Múltiples intentos en poco tiempo', 'medium', { attempts: recentAttempts })
    score += 15
  }

  if (!recentSessions.length) {
    pushFlag(flags, 'no_session_history', 'No hay historial de sesiones reciente', 'medium')
    score += 10
  } else {
    const latest = recentSessions[0]
    const seenIps = new Set(recentSessions.map((r) => r.ip_address).filter(Boolean))
    const seenCountries = new Set(recentSessions.map((r) => r.country).filter(Boolean).map(normalizeText))

    if (requestContext?.ip && !seenIps.has(requestContext.ip)) {
      pushFlag(flags, 'new_ip', 'IP nueva para el cliente', 'medium', { ip: requestContext.ip, previousIp: latest.ip_address })
      score += 15
    }

    if (requestContext?.geo?.country_name && latest.country &&
        normalizeText(requestContext.geo.country_name) !== normalizeText(latest.country) &&
        !seenCountries.has(normalizeText(requestContext.geo.country_name))) {
      pushFlag(flags, 'new_country', 'País distinto al de la última sesión', 'high', { currentCountry: requestContext.geo.country_name, previousCountry: latest.country })
      score += 15
    }

    if (requestContext?.geo?.asn_name && latest.geo_json) {
      let latestGeo = null
      try { latestGeo = typeof latest.geo_json === 'string' ? JSON.parse(latest.geo_json) : latest.geo_json } catch { /* ignore */ }
      if (latestGeo?.asn_name && normalizeText(requestContext.geo.asn_name) !== normalizeText(latestGeo.asn_name)) {
        pushFlag(flags, 'new_asn', 'ASN distinto al de la última sesión', 'medium', { currentAsn: requestContext.geo.asn_name, previousAsn: latestGeo.asn_name })
        score += 10
      }
    }
  }

  if (!requestContext?.geo)  { pushFlag(flags, 'geo_unavailable', 'No se pudo resolver la geolocalización', 'low'); score += 5 }
  if (!requestContext?.ip)   { pushFlag(flags, 'ip_missing',      'No se pudo resolver la IP',              'low'); score += 5 }

  if (whitelistMatch || approvedWithdrawal || sameClientMovement) {
    pushFlag(flags, 'positive_history', 'Existe historial favorable del destino', 'info', { whitelist: !!whitelistMatch, approvedWithdrawal: !!approvedWithdrawal, sameClientMovement: !!sameClientMovement })
  }

  const riskScore = Math.max(0, Math.round(score))

  let decision = 'AUTO_APPROVED'
  if (crossClientDest && riskScore >= 60) {
    decision = riskScore >= REJECT_THRESHOLD ? 'REJECTED' : 'REVIEW_PENDING'
  } else if (riskScore >= REJECT_THRESHOLD) {
    decision = 'REJECTED'
  } else if (riskScore >= REVIEW_THRESHOLD || !verifiedSources.length) {
    decision = 'REVIEW_PENDING'
  }
  if (verifiedSources.length && !crossClientDest && riskScore < REVIEW_THRESHOLD) {
    decision = 'AUTO_APPROVED'
  }

  const riskReason = flags.length ? flags.map((f) => f.label).join('; ') : 'Sin hallazgos relevantes'

  return {
    decision, riskScore, riskFlags: flags, riskReason,
    verifiedSources, crossClientDestination: !!crossClientDest,
    whitelistMatch: !!whitelistMatch, approvedWithdrawal: !!approvedWithdrawal,
    sameClientMovement: !!sameClientMovement, recentAttempts, requestContext,
  }
}

export { checkBlacklist, normalizeCbuCvu, normalizeText, REVIEW_THRESHOLD, REJECT_THRESHOLD }
