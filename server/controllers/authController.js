import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { query } from '../config/database.js';
import { config } from '../config/config.js';
import { verifyPassword } from '../utils/password.js';
import { getCookieValue } from '../middlewares/authMiddleware.js';
import { rowsToPermissions } from '../utils/userPermissions.js';
import { extractPublicIpFromHeaders, lookupIpGuide, serializeGeoSnapshot } from '../services/ipGuideService.js';
import { hasColumn } from '../services/schemaSupport.js';

const ALLOWED_ROLES = ['admin', 'cashier'];
const DUMMY_PASSWORD_HASH = '$2a$12$KIXxJp7LNqCAQsfyi.W8VOe3vlqZ29wxs2jR7NpuTR5sMBUy3eL8W';
const WEBAUTHN_RP_ID = config.webAuthnRpId || 'localhost';
const WEBAUTHN_RP_NAME = config.webAuthnRpName || 'BetChat';
const WEBAUTHN_ORIGIN = config.webAuthnOrigin || 'http://localhost:5173';
const googleClient = config.googleAuth.clientId ? new OAuth2Client(config.googleAuth.clientId) : null;

function base64urlEncode(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url');
}

function sanitizeCredentialId(credentialId) {
  return String(credentialId || '').slice(0, 255);
}

function parseCosePublicKey(cose) {
  const key = new Uint8Array(cose);
  let offset = 0;

  function readUInt(additional) {
    if (additional < 24) return additional;
    if (additional === 24) return key[offset++];
    if (additional === 25) {
      const value = (key[offset] << 8) | key[offset + 1];
      offset += 2;
      return value;
    }
    if (additional === 26) {
      const value = (key[offset] * 2 ** 24) + (key[offset + 1] << 16) + (key[offset + 2] << 8) + key[offset + 3];
      offset += 4;
      return value >>> 0;
    }
    throw new Error('Unsupported CBOR integer length');
  }

  function decodeItem() {
    const byte = key[offset++];
    const major = byte >> 5;
    const minor = byte & 0x1f;

    if (major === 0) return readUInt(minor);
    if (major === 1) return -1 - readUInt(minor);
    if (major === 2) {
      const len = readUInt(minor);
      const value = key.slice(offset, offset + len);
      offset += len;
      return value;
    }
    if (major === 3) {
      const len = readUInt(minor);
      const bytes = key.slice(offset, offset + len);
      offset += len;
      return new TextDecoder().decode(bytes);
    }
    if (major === 4) {
      const len = readUInt(minor);
      const arr = [];
      for (let i = 0; i < len; i += 1) arr.push(decodeItem());
      return arr;
    }
    if (major === 5) {
      const len = readUInt(minor);
      const map = new Map();
      for (let i = 0; i < len; i += 1) {
        map.set(decodeItem(), decodeItem());
      }
      return map;
    }
    throw new Error('Unsupported CBOR type');
  }

  const decoded = decodeItem();
  const x = decoded.get(-2);
  const y = decoded.get(-3);
  if (!(x instanceof Uint8Array) || !(y instanceof Uint8Array)) {
    throw new Error('Invalid WebAuthn public key');
  }
  return { x: Buffer.from(x), y: Buffer.from(y) };
}

function decodeCbor(buffer) {
  const data = new Uint8Array(buffer);
  let offset = 0;

  function readLength(additional) {
    if (additional < 24) return additional;
    if (additional === 24) return data[offset++];
    if (additional === 25) {
      const value = (data[offset] << 8) | data[offset + 1];
      offset += 2;
      return value;
    }
    if (additional === 26) {
      const value = (data[offset] * 2 ** 24) + (data[offset + 1] << 16) + (data[offset + 2] << 8) + data[offset + 3];
      offset += 4;
      return value >>> 0;
    }
    throw new Error('Unsupported CBOR length');
  }

  function decodeItem() {
    const byte = data[offset++];
    const major = byte >> 5;
    const minor = byte & 0x1f;

    if (major === 0) return readLength(minor);
    if (major === 1) return -1 - readLength(minor);
    if (major === 2) {
      const len = readLength(minor);
      const value = data.slice(offset, offset + len);
      offset += len;
      return Buffer.from(value);
    }
    if (major === 3) {
      const len = readLength(minor);
      const value = data.slice(offset, offset + len);
      offset += len;
      return new TextDecoder().decode(value);
    }
    if (major === 4) {
      const len = readLength(minor);
      const arr = [];
      for (let i = 0; i < len; i += 1) arr.push(decodeItem());
      return arr;
    }
    if (major === 5) {
      const len = readLength(minor);
      const map = {};
      for (let i = 0; i < len; i += 1) {
        const key = decodeItem();
        map[String(key)] = decodeItem();
      }
      return map;
    }
    throw new Error('Unsupported CBOR major type');
  }

  return decodeItem();
}

function buildEcPublicKeyPem(cosePublicKey) {
  const { x, y } = parseCosePublicKey(cosePublicKey);
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64urlEncode(x),
    y: base64urlEncode(y),
    ext: true,
  };
  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
}

function parseAuthData(authData) {
  const data = Buffer.from(authData);
  const rpIdHash = data.subarray(0, 32);
  const flags = data[32];
  const signCount = data.readUInt32BE(33);
  let offset = 37;
  let credentialId = null;
  let credentialPublicKey = null;

  if (flags & 0x40) {
    offset += 16;
    const credentialIdLength = data.readUInt16BE(offset);
    offset += 2;
    credentialId = data.subarray(offset, offset + credentialIdLength);
    offset += credentialIdLength;
    credentialPublicKey = data.subarray(offset);
  }

  return { rpIdHash, flags, signCount, credentialId, credentialPublicKey };
}

async function loadCredentialByUserAndId(userId, credentialId) {
  const { rows, error } = await query(
    'SELECT * FROM webauthn_credentials WHERE user_id = ? AND credential_id = ? LIMIT 1',
    [userId, sanitizeCredentialId(credentialId)]
  );
  if (error) throw error;
  return rows?.[0] || null;
}

async function issueLoginResponse(req, res, user) {
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
  const forwardedIp = extractPublicIpFromHeaders(req.headers, req.ip || req.connection?.remoteAddress || null)
  const geo = await lookupIpGuide(forwardedIp || req.ip || null)
  const hasGeoColumn = await hasColumn('user_sessions', 'geo_json')

  if (hasGeoColumn) {
    await query(
      `INSERT INTO user_sessions
        (user_id, session_token, ip_address, browser, device_type, is_active, last_activity_at, expires_at, geo_json)
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?, ?)`,
      [
        user.id,
        sessionToken,
        forwardedIp || req.ip || null,
        String(req.headers['user-agent'] || '').slice(0, 120) || null,
        /mobile/i.test(req.headers['user-agent'] || '') ? 'mobile' : 'desktop',
        expiresAt,
        serializeGeoSnapshot(geo),
      ]
    );
  } else {
    await query(
      `INSERT INTO user_sessions
        (user_id, session_token, ip_address, browser, device_type, is_active, last_activity_at, expires_at)
       VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, ?)`,
      [
        user.id,
        sessionToken,
        forwardedIp || req.ip || null,
        String(req.headers['user-agent'] || '').slice(0, 120) || null,
        /mobile/i.test(req.headers['user-agent'] || '') ? 'mobile' : 'desktop',
        expiresAt,
      ]
    );
  }

  const { rows: permissionRows, error: permissionsError } = await query(
    'SELECT module, can_view, can_create, can_edit, can_delete FROM user_permissions WHERE user_id = ?',
    [user.id]
  );

  if (permissionsError) {
    throw permissionsError;
  }

  res.cookie(config.jwtCookieName, token, {
    ...config.jwtCookieOptions,
    maxAge: config.jwtCookieOptions.maxAge,
  });

  return {
    expiresIn: config.jwtExpiresIn,
    user: sanitizeUser({
      ...user,
      online: true,
      permissions: rowsToPermissions(permissionRows, user.role),
    }),
  };
}

async function findUserByGoogleEmail(email) {
  const { rows, error } = await query(
    'SELECT id, username, full_name, email, password_hash, role, avatar_url, is_active, last_login_at FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  if (error) throw error;
  return rows?.[0] || null;
}

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

    const payload = await issueLoginResponse(req, res, user);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

export async function googleLogin(req, res, next) {
  try {
    if (!googleClient) {
      return res.status(500).json({ error: 'Google OAuth no configurado', code: 'GOOGLE_NOT_CONFIGURED' });
    }

    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ error: 'Credencial de Google requerida', code: 'GOOGLE_CREDENTIAL_REQUIRED' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleAuth.clientId,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    const emailVerified = Boolean(payload?.email_verified);

    if (!email || !emailVerified) {
      return res.status(401).json({ error: 'Cuenta de Google no verificada', code: 'GOOGLE_EMAIL_UNVERIFIED' });
    }

    const user = await findUserByGoogleEmail(email);
    if (!user) {
      return res.status(403).json({
        error: 'Tu cuenta de Google no está registrada en el sistema',
        code: 'GOOGLE_USER_NOT_REGISTERED',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Usuario desactivado', code: 'USER_INACTIVE' });
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({ error: 'Usuario no autorizado', code: 'ROLE_NOT_ALLOWED' });
    }

    const response = await issueLoginResponse(req, res, user);
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function googleConfig(req, res) {
  res.json({
    clientId: config.googleAuth.clientId || null,
  });
}

export async function webauthnRegisterOptions(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Token de autorizaciÃ³n requerido', code: 'AUTH_REQUIRED' });
    }

    const { rows, error } = await query(
      'SELECT id, username, full_name, email FROM users WHERE id = ? AND is_active = 1 LIMIT 1',
      [userId]
    );
    if (error) return next(error);
    const user = rows?.[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' });

    const challenge = base64urlEncode(crypto.randomBytes(32));
    await query(
      `INSERT INTO webauthn_challenges (user_id, challenge, type, expires_at, created_at)
       VALUES (?, ?, 'register', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE), CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE challenge = VALUES(challenge), type = 'register', expires_at = VALUES(expires_at), created_at = VALUES(created_at)`,
      [userId, challenge]
    );

    res.json({
      rp: { name: WEBAUTHN_RP_NAME, id: WEBAUTHN_RP_ID },
      user: {
        id: base64urlEncode(Buffer.from(String(user.id))),
        name: user.username,
        displayName: user.full_name || user.email || user.username,
      },
      challenge,
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
      attestation: 'none',
      excludeCredentials: [],
    });
  } catch (error) {
    next(error);
  }
}

export async function webauthnRegisterVerify(req, res, next) {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Token de autorizaciÃ³n requerido', code: 'AUTH_REQUIRED' });
    }

    const { credential } = req.body || {};
    const credentialId = credential?.id;
    const rawId = credential?.rawId;
    const response = credential?.response || {};
    if (!credentialId || !rawId || !response.clientDataJSON || !response.attestationObject) {
      return res.status(400).json({ error: 'Credencial invÃ¡lida', code: 'INVALID_CREDENTIAL' });
    }

    const { rows: challengeRows, error: challengeError } = await query(
      'SELECT challenge FROM webauthn_challenges WHERE user_id = ? AND type = \'register\' AND expires_at > CURRENT_TIMESTAMP LIMIT 1',
      [userId]
    );
    if (challengeError) return next(challengeError);
    const challenge = challengeRows?.[0]?.challenge;
    if (!challenge) {
      return res.status(400).json({ error: 'Challenge vencido', code: 'CHALLENGE_EXPIRED' });
    }

    const clientDataJSON = Buffer.from(response.clientDataJSON, 'base64url').toString('utf8');
    const clientData = JSON.parse(clientDataJSON);
    if (clientData.type !== 'webauthn.create' || clientData.challenge !== challenge || clientData.origin !== WEBAUTHN_ORIGIN) {
      return res.status(400).json({ error: 'La respuesta biomÃ©trica no es vÃ¡lida', code: 'INVALID_CREDENTIAL' });
    }

    const attestationObject = Buffer.from(response.attestationObject, 'base64url');
    const attestation = decodeCbor(attestationObject);
    const authData = attestation.authData;
    if (!authData || !attestation.fmt) {
      return res.status(400).json({ error: 'Attestation invÃ¡lida', code: 'INVALID_CREDENTIAL' });
    }
    const parsed = parseAuthData(authData);
    const publicKey = buildEcPublicKeyPem(parsed.credentialPublicKey);

    await query(
      `INSERT INTO webauthn_credentials
        (user_id, credential_id, public_key, sign_count, transports, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE public_key = VALUES(public_key), sign_count = VALUES(sign_count), transports = VALUES(transports), updated_at = VALUES(updated_at)`,
      [
        userId,
        sanitizeCredentialId(credentialId),
        publicKey.export({ type: 'spki', format: 'pem' }),
        parsed.signCount,
        JSON.stringify(credential.transports || []),
      ]
    );

    await query('DELETE FROM webauthn_challenges WHERE user_id = ? AND type = \'register\'', [userId]);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function webauthnAuthOptions(req, res, next) {
  try {
    const { username } = req.body || {};
    if (!username) {
      return res.status(400).json({ error: 'Usuario requerido', code: 'USERNAME_REQUIRED' });
    }

    const { rows, error } = await query(
      'SELECT id, username, full_name, email FROM users WHERE username = ? AND is_active = 1 AND role IN (\'admin\', \'cashier\') LIMIT 1',
      [username]
    );
    if (error) return next(error);
    const user = rows?.[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' });

    const { rows: credentials, error: credError } = await query(
      'SELECT credential_id FROM webauthn_credentials WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );
    if (credError) return next(credError);
    if (!credentials?.length) {
      return res.status(404).json({ error: 'El usuario no tiene biometrÃ­a configurada', code: 'WEBAUTHN_NOT_CONFIGURED' });
    }

    const challenge = base64urlEncode(crypto.randomBytes(32));
    await query(
      `INSERT INTO webauthn_challenges (user_id, challenge, type, expires_at, created_at)
       VALUES (?, ?, 'auth', DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE), CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE challenge = VALUES(challenge), type = 'auth', expires_at = VALUES(expires_at), created_at = VALUES(created_at)`,
      [user.id, challenge]
    );

    res.json({
      challenge,
      rpId: WEBAUTHN_RP_ID,
      timeout: 60000,
      userVerification: 'required',
      allowCredentials: credentials.map(({ credential_id }) => ({
        type: 'public-key',
        id: credential_id,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function webauthnAuthVerify(req, res, next) {
  try {
    const { username, credential } = req.body || {};
    if (!username || !credential?.id || !credential?.rawId || !credential?.response) {
      return res.status(400).json({ error: 'Credencial invÃ¡lida', code: 'INVALID_CREDENTIAL' });
    }

    const { rows: usersRows, error: userError } = await query(
      'SELECT id, username, full_name, email, role, avatar_url, is_active, last_login_at FROM users WHERE username = ? AND is_active = 1 LIMIT 1',
      [username]
    );
    if (userError) return next(userError);
    const user = usersRows?.[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' });
    if (!ALLOWED_ROLES.includes(user.role)) {
      return res.status(403).json({ error: 'Usuario no autorizado', code: 'ROLE_NOT_ALLOWED' });
    }

    const credentialRow = await loadCredentialByUserAndId(user.id, credential.id);
    if (!credentialRow) {
      return res.status(404).json({ error: 'BiometrÃ­a no registrada', code: 'WEBAUTHN_NOT_CONFIGURED' });
    }

    const { rows: challengeRows, error: challengeError } = await query(
      'SELECT challenge FROM webauthn_challenges WHERE user_id = ? AND type = \'auth\' AND expires_at > CURRENT_TIMESTAMP LIMIT 1',
      [user.id]
    );
    if (challengeError) return next(challengeError);
    const challenge = challengeRows?.[0]?.challenge;
    if (!challenge) {
      return res.status(400).json({ error: 'Challenge vencido', code: 'CHALLENGE_EXPIRED' });
    }

    const clientDataJSON = Buffer.from(credential.response.clientDataJSON, 'base64url').toString('utf8');
    const clientData = JSON.parse(clientDataJSON);
    if (clientData.type !== 'webauthn.get' || clientData.challenge !== challenge || clientData.origin !== WEBAUTHN_ORIGIN) {
      return res.status(400).json({ error: 'La respuesta biomÃ©trica no es vÃ¡lida', code: 'INVALID_CREDENTIAL' });
    }

    const authenticatorData = Buffer.from(credential.response.authenticatorData, 'base64url');
    const signature = Buffer.from(credential.response.signature, 'base64url');
    const clientDataHash = crypto.createHash('sha256').update(Buffer.from(credential.response.clientDataJSON, 'base64url')).digest();
    const verificationData = Buffer.concat([authenticatorData, clientDataHash]);

    const publicKeyPem = credentialRow.public_key;
    const verified = crypto.verify('sha256', verificationData, publicKeyPem, signature);
    if (!verified) {
      return res.status(401).json({ error: 'BiometrÃ­a invÃ¡lida', code: 'INVALID_CREDENTIAL' });
    }

    const parsed = parseAuthData(authenticatorData);
    const storedSignCount = Number(credentialRow.sign_count || 0);
    if (parsed.signCount > 0 && parsed.signCount < storedSignCount) {
      return res.status(401).json({ error: 'BiometrÃ­a rechazada', code: 'INVALID_CREDENTIAL' });
    }

    if (parsed.signCount > 0) {
      await query(
        'UPDATE webauthn_credentials SET sign_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [parsed.signCount, credentialRow.id]
      );
    }
    await query('DELETE FROM webauthn_challenges WHERE user_id = ? AND type = \'auth\'', [user.id]);

    const payload = await issueLoginResponse(req, res, user);
    res.json(payload);
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
