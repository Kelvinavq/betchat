import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { query } from '../config/database.js';
import { config } from '../config/config.js';
import { verifyPassword } from '../utils/password.js';
import { getCookieValue } from '../middlewares/authMiddleware.js';
import { rowsToPermissions } from '../utils/userPermissions.js';

const ALLOWED_ROLES = ['admin', 'cashier'];
const DUMMY_PASSWORD_HASH = '$2a$12$KIXxJp7LNqCAQsfyi.W8VOe3vlqZ29wxs2jR7NpuTR5sMBUy3eL8W';

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url || null,
    is_active: Boolean(user.is_active),
    last_login_at: user.last_login_at,
    online: Boolean(user.online),
    permissions: user.permissions,
  };
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const { rows, error } = await query(
      'SELECT id, username, full_name, email, password_hash, role, avatar_url, is_active, last_login_at FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    if (error) {
      return next(error);
    }

    const user = rows?.[0];
    const passwordHash = user?.password_hash || DUMMY_PASSWORD_HASH;
    const passwordMatches = await verifyPassword(password, passwordHash);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Usuario desactivado',
        code: 'USER_INACTIVE',
      });
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({
        error: 'Usuario no autorizado',
        code: 'ROLE_NOT_ALLOWED',
      });
    }

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Contraseña incorrecta',
        code: 'INVALID_PASSWORD',
      });
    }

    const sessionToken = randomUUID();
    const tokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      jti: sessionToken,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
      issuer: config.jwtIssuer,
      algorithm: 'HS256',
    });

    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    const expiresAt = new Date(Date.now() + (config.jwtExpiresInSeconds || 86400) * 1000);

    await query(
      `INSERT INTO user_sessions
        (user_id, session_token, ip_address, browser, device_type, is_active, last_activity_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?)`,
      [
        user.id,
        sessionToken,
        req.ip || null,
        String(req.headers['user-agent'] || '').slice(0, 120) || null,
        /mobile/i.test(req.headers['user-agent'] || '') ? 'mobile' : 'desktop',
        expiresAt,
      ]
    );

    const { rows: permissionRows, error: permissionsError } = await query(
      'SELECT module, can_view, can_create, can_edit, can_delete FROM user_permissions WHERE user_id = ?',
      [user.id]
    );

    if (permissionsError) {
      return next(permissionsError);
    }

    res.cookie(config.jwtCookieName, token, {
      ...config.jwtCookieOptions,
      maxAge: config.jwtCookieOptions.maxAge,
    });

    res.json({
      expiresIn: config.jwtExpiresIn,
      user: sanitizeUser({
        ...user,
        online: true,
        permissions: rowsToPermissions(permissionRows, user.role),
      }),
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const token = getCookieValue(req, config.jwtCookieName) || getCookieValue(req, 'auth_token');
    if (token) {
      try {
        const payload = jwt.verify(token, config.jwtSecret, {
          algorithms: ['HS256'],
          issuer: config.jwtIssuer,
        });
        if (payload?.sub && payload?.jti) {
          await query(
            'UPDATE user_sessions SET is_active = 0, last_activity_at = CURRENT_TIMESTAMP WHERE user_id = ? AND session_token = ?',
            [payload.sub, payload.jti]
          );
        }
      } catch {
        // The cookie is still cleared even when the token is expired or malformed.
      }
    }

    res.clearCookie(config.jwtCookieName, {
      ...config.jwtCookieOptions,
      maxAge: 0,
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({
        error: 'Token de autorización inválido',
        code: 'INVALID_TOKEN',
      });
    }

    const { rows, error } = await query(
      `SELECT
        u.id, u.username, u.full_name, u.email, u.role, u.avatar_url, u.is_active, u.last_login_at,
        EXISTS(
          SELECT 1 FROM user_sessions us
          WHERE us.user_id = u.id AND us.is_active = 1
            AND (us.expires_at IS NULL OR us.expires_at > CURRENT_TIMESTAMP)
        ) AS online
       FROM users u
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );

    if (error) {
      return next(error);
    }

    const user = rows?.[0];
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND',
      });
    }

    const { rows: permissionRows, error: permissionsError } = await query(
      'SELECT module, can_view, can_create, can_edit, can_delete FROM user_permissions WHERE user_id = ?',
      [userId]
    );

    if (permissionsError) {
      return next(permissionsError);
    }

    res.json({
      user: sanitizeUser({
        ...user,
        permissions: rowsToPermissions(permissionRows, user.role),
      }),
    });
  } catch (error) {
    next(error);
  }
}
