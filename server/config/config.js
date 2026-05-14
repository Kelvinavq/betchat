import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const isProduction = process.env.MODE === 'production';

function parseDuration(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (!value || typeof value !== 'string') {
    return 0;
  }

  const normalized = value.trim();
  const matches = normalized.match(/^([0-9]+)(s|m|h|d)?$/i);
  if (!matches) {
    return 0;
  }

  const amount = Number(matches[1]);
  const unit = matches[2]?.toLowerCase() || 's';

  switch (unit) {
    case 'd':
      return amount * 86400;
    case 'h':
      return amount * 3600;
    case 'm':
      return amount * 60;
    case 's':
    default:
      return amount;
  }
}

/**
 * Configuración de base de datos según el modo (dev/prod)
 */
export function getDBConfig() {
  const mode = process.env.MODE || 'development';
  
  if (mode === 'production') {
    return {
      host: process.env.DB_HOST_PROD,
      port: process.env.DB_PORT_PROD,
      user: process.env.DB_USER_PROD,
      password: process.env.DB_PASSWORD_PROD,
      database: process.env.DB_NAME_PROD,
    };
  }

  return {
    host: process.env.DB_HOST_DEV || 'localhost',
    port: process.env.DB_PORT_DEV || 3306,
    user: process.env.DB_USER_DEV || 'root',
    password: process.env.DB_PASSWORD_DEV || '',
    database: process.env.DB_NAME_DEV || 'betchat',
  };
}

/**
 * Configuración de CORS
 */
export function getCorsOrigins() {
  const originsString = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';
  return originsString.split(',').map(origin => origin.trim());
}

/**
 * Configuración general de la aplicación
 */
export const config = {
  // Servidor
  port: parseInt(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mode: process.env.MODE || 'development',
  isProduction,

  // Autenticación
  jwtSecret: process.env.JWT_SECRET || 'change_me_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  jwtExpiresInSeconds: parseDuration(process.env.JWT_EXPIRES_IN || '24h'),
  jwtIssuer: process.env.JWT_ISSUER || 'BetChat',
  jwtCookieName: process.env.JWT_COOKIE_NAME || 'betchat_session',
  clientJwtCookieName: process.env.CLIENT_JWT_COOKIE_NAME || 'betchat_client_session',
  jwtCookieOptions: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: parseDuration(process.env.JWT_EXPIRES_IN || '24h') * 1000,
  },

  // Base de datos
  db: getDBConfig(),

  // CORS
  corsOrigins: getCorsOrigins(),

  // AWS (opcional)
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET,
  },

  // Public profile assets
  profiles: {
    publicPath: process.env.PROFILE_PUBLIC_PATH || '/profiles/',
  },

  // OpenRouter LLM
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
  },

  // Google OAuth / Google Identity Services
  googleAuth: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  },

  // Redis cache (opcional)
  redis: {
    enabled: process.env.REDIS_ENABLED === 'true' || Boolean(process.env.REDIS_URL),
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    messageTtlSeconds: Math.max(30, parseInt(process.env.REDIS_MESSAGE_TTL_SECONDS || '300', 10) || 300),
    chatListTtlSeconds: Math.max(5, parseInt(process.env.REDIS_CHAT_LIST_TTL_SECONDS || '30', 10) || 30),
    logCache: process.env.REDIS_LOG_CACHE === 'true',
  },

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};

/**
 * Valida que todas las variables críticas estén configuradas
 */
export function validateConfig() {
  const errors = [];

  if (!config.jwtSecret || config.jwtSecret === 'change_me_in_production') {
    if (isProduction) {
      errors.push('JWT_SECRET no configurado o usando valor por defecto en PRODUCCIÓN');
    }
  }

  if (!config.db.host || !config.db.database) {
    errors.push('Configuración de BD incompleta: DB_HOST y DB_NAME requeridos');
  }

  if (isProduction) {
    if (!config.db.password) {
      errors.push('Contraseña de BD vacía en PRODUCCIÓN');
    }
    if (!config.googleAuth.clientId) {
      errors.push('GOOGLE_CLIENT_ID no configurado en PRODUCCIÓN');
    }
    if (!config.googleAuth.clientSecret) {
      errors.push('GOOGLE_CLIENT_SECRET no configurado en PRODUCCIÓN');
    }
  } else if (!config.googleAuth.clientId) {
    console.warn('Google OAuth deshabilitado: GOOGLE_CLIENT_ID no está configurado');
  }

  if (errors.length > 0) {
    console.error('✗ Errores de configuración:');
    errors.forEach(err => console.error(`  - ${err}`));
    throw new Error('Configuración inválida');
  }

  console.info(`✓ Configuración validada (Modo: ${config.mode})`);
}

export default config;
