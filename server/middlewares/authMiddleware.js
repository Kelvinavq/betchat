import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

function getCookieValue(req, name) {
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

export function authenticateToken(req, res, next) {
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
