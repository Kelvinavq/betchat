import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { query } from '../config/database.js';

export function getCookieValue(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  return cookieHeader
    .split(';')
    .map(cookie => cookie.trim())
    .reduce((found, cookie) => {
      if (found) return found;
      const [key, ...value] = cookie.split('=');
      if (key === name) {
        return decodeURIComponent(value.join('='));
      }
      return null;
    }, null);
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = null;

  if (authHeader && typeof authHeader === 'string') {
    const [scheme, value] = authHeader.split(' ');
    if (scheme === 'Bearer' && value) {
      token = value;
    }
  }

  if (!token) {
    token = getCookieValue(req, config.jwtCookieName) || getCookieValue(req, 'auth_token');
  }

  if (!token) {
    return res.status(401).json({
      error: 'Token de autorización requerido',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
    });

    if (payload.jti) {
      const { rows, error } = await query(
        `SELECT us.id, u.access_start, u.access_end
         FROM user_sessions us
         JOIN users u ON u.id = us.user_id
         WHERE us.user_id = ? AND us.session_token = ? AND us.is_active = 1
           AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
         LIMIT 1`,
        [payload.sub, payload.jti]
      );

      if (error) {
        return next(error);
      }

      if (!rows?.length) {
        return res.status(401).json({
          error: 'La sesión no está activa',
          code: 'SESSION_INACTIVE',
        });
      }

      const session = rows[0];

      if (session.access_start && session.access_end) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [sh, sm] = String(session.access_start).split(':').map(Number);
        const [eh, em] = String(session.access_end).split(':').map(Number);
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;

        const inWindow = startMinutes <= endMinutes
          ? currentMinutes >= startMinutes && currentMinutes < endMinutes
          : currentMinutes >= startMinutes || currentMinutes < endMinutes;

        if (!inWindow) {
          await query(
            'UPDATE user_sessions SET is_active = 0 WHERE user_id = ? AND session_token = ?',
            [payload.sub, payload.jti]
          );
          return res.status(401).json({
            error: 'Acceso fuera del horario permitido',
            code: 'OUTSIDE_SCHEDULE',
            access_start: String(session.access_start).substring(0, 5),
            access_end: String(session.access_end).substring(0, 5),
          });
        }
      }

      await query(
        'UPDATE user_sessions SET last_activity_at = CURRENT_TIMESTAMP WHERE user_id = ? AND session_token = ?',
        [payload.sub, payload.jti]
      );
    }

    req.user = payload;
    next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError'
      ? 'El token ha expirado'
      : 'Token de autorización inválido';

    return res.status(401).json({
      error: message,
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
    });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'No tienes permisos para acceder a esta ruta',
        code: 'FORBIDDEN',
      });
    }
    next();
  };
}

export function requirePermission(moduleName, action = 'can_view') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        error: 'No tienes permisos para acceder a esta ruta',
        code: 'FORBIDDEN',
      });
    }

    try {
      const userId = Number(req.user.sub)
      if (!userId || !moduleName) {
        return res.status(403).json({
          error: 'No tienes permisos para acceder a esta ruta',
          code: 'FORBIDDEN',
        });
      }

      const actionColumn = {
        can_view: 'can_view',
        can_create: 'can_create',
        can_edit: 'can_edit',
        can_delete: 'can_delete',
      }[action]

      if (!actionColumn) {
        return res.status(403).json({
          error: 'No tienes permisos para acceder a esta ruta',
          code: 'FORBIDDEN',
        })
      }

      const { rows, error } = await query(
        `SELECT ${actionColumn} AS permitted
         FROM user_permissions
         WHERE user_id = ? AND module = ?
         LIMIT 1`,
        [userId, moduleName]
      )
      if (error) return next(error)

      if (rows?.length) {
        if (!rows[0]?.permitted) {
          return res.status(403).json({
            error: 'No tienes permisos para acceder a esta ruta',
            code: 'FORBIDDEN',
          })
        }
        return next()
      }

      if (req.user.role === 'admin') {
        return next()
      }

      return res.status(403).json({
        error: 'No tienes permisos para acceder a esta ruta',
        code: 'FORBIDDEN',
      })
    } catch (error) {
      next(error)
    }
  }
}
