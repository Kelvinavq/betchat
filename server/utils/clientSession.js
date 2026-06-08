import jwt from 'jsonwebtoken'
import { config } from '../config/config.js'
import { query } from '../config/database.js'
import { getCookieValue } from '../middlewares/authMiddleware.js'

function clearClientCookie(res) {
  if (!res) return
  res.clearCookie(config.clientJwtCookieName, {
    ...config.jwtCookieOptions,
    maxAge: 0,
  })
}

export async function getValidatedClientPayload(req, res = null) {
  try {
    const token = getCookieValue(req, config.clientJwtCookieName)
    if (!token) return null

    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
    })

    if (payload?.type !== 'client' || !payload?.sub) {
      clearClientCookie(res)
      return null
    }

    const { rows, error } = await query(
      `SELECT
        id,
        is_temporary,
        temp_session_active,
        COALESCE(session_version, 0) AS session_version
       FROM clients
       WHERE id = ?
       LIMIT 1`,
      [payload.sub]
    )
    if (error) throw error

    const client = rows?.[0]
    if (!client) {
      clearClientCookie(res)
      return null
    }

    if (client.is_temporary && !client.temp_session_active) {
      clearClientCookie(res)
      return null
    }

    if (Number(payload.sv || 0) !== Number(client.session_version || 0)) {
      clearClientCookie(res)
      return null
    }

    return payload
  } catch {
    clearClientCookie(res)
    return null
  }
}
