const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map()

function normalizeIp(value) {
  const ip = String(value || '').trim().replace(/^::ffff:/, '')
  return ip || ''
}

function isPublicIp(ip) {
  if (!ip || isPrivateIp(ip)) return false
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return true
  if (/^[a-f0-9:]+$/i.test(ip)) return true
  return false
}

export function extractPublicIpFromHeaders(headers = {}, fallback = null) {
  const candidates = []

  const xForwardedFor = String(headers['x-forwarded-for'] || '')
  if (xForwardedFor) candidates.push(...xForwardedFor.split(','))
  candidates.push(headers['x-real-ip'])
  candidates.push(headers['cf-connecting-ip'])
  candidates.push(headers['true-client-ip'])
  candidates.push(fallback)

  for (const candidate of candidates) {
    const ip = normalizeIp(candidate)
    if (isPublicIp(ip)) return ip
  }

  return normalizeIp(fallback)
}

function isPrivateIp(ip) {
  if (!ip) return true
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true
  if (/^10\./.test(ip)) return true
  if (/^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip)) return true
  return false
}

function normalizeGuidePayload(payload, ip) {
  const location = payload?.location || {}
  const network = payload?.network || {}
  const autonomousSystem = network?.autonomous_system || {}

  return {
    ip: payload?.ip || ip || null,
    network: {
      cidr: network?.cidr || null,
      hosts: {
        start: network?.hosts?.start || null,
        end: network?.hosts?.end || null,
      },
      autonomousSystem: {
        asn: autonomousSystem?.asn ? Number(autonomousSystem.asn) : null,
        name: autonomousSystem?.name || null,
        organization: autonomousSystem?.organization || null,
        country: autonomousSystem?.country || null,
        rir: autonomousSystem?.rir || null,
      },
    },
    location: {
      city: location?.city || null,
      country: location?.country || null,
      timezone: location?.timezone || null,
      latitude: typeof location?.latitude === 'number' ? location.latitude : null,
      longitude: typeof location?.longitude === 'number' ? location.longitude : null,
    },
    raw: payload || null,
  }
}

export async function lookupIpGuide(rawIp) {
  const ip = normalizeIp(rawIp)
  if (!ip || isPrivateIp(ip)) {
    return null
  }

  const cached = cache.get(ip)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  try {
    const response = await fetch(`https://ip.guide/${encodeURIComponent(ip)}`, {
      headers: {
        accept: 'application/json',
      },
      signal: AbortSignal.timeout(3500),
    })

    if (!response.ok) return null

    const payload = await response.json().catch(() => null)
    if (!payload || typeof payload !== 'object') return null

    const value = normalizeGuidePayload(payload, ip)
    cache.set(ip, { value, expiresAt: Date.now() + CACHE_TTL_MS })
    return value
  } catch {
    return null
  }
}

export function serializeGeoSnapshot(geo) {
  if (!geo) return null
  return JSON.stringify(geo)
}

export function parseGeoSnapshot(value) {
  if (!value) return null
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}
