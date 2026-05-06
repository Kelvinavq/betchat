import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { config } from '../config/config.js';
import { verifyPassword } from '../utils/password.js';

const ALLOWED_ROLES = ['admin', 'cashier'];
const DUMMY_PASSWORD_HASH = '$2a$12$KIXxJp7LNqCAQsfyi.W8VOe3vlqZ29wxs2jR7NpuTR5sMBUy3eL8W';

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    is_active: Boolean(user.is_active),
    last_login_at: user.last_login_at,
  };
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const { rows, error } = await query(
      'SELECT id, username, full_name, email, password_hash, role, is_active, last_login_at FROM users WHERE username = ? LIMIT 1',
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

    const tokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    await query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

    res.json({
      token,
      expiresIn: config.jwtExpiresIn,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
}
