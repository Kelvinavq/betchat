import mysql from 'mysql2/promise';
import { getDBConfig } from './config.js';

const logger = console; // Puedes reemplazar con winston/pino después
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 segundos

let pool = null;

/**
 * Crea y configura el pool de conexiones con reintentos
 */
export async function initializePool() {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const dbConfig = getDBConfig();
      
      pool = mysql.createPool({
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        password: dbConfig.password,
        database: dbConfig.database,
        timezone: 'Z',
        dateStrings: true,
        waitForConnections: true,
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || 10),
        queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || 0),
        enableKeepAlive: process.env.DB_ENABLE_KEEP_ALIVE === 'true',
        multipleStatements: false,
      });

      pool.on('connection', (connection) => {
        connection.query("SET time_zone = '+00:00'")
      })

      // Verificar la conexión
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();

      logger.info('✓ Base de datos conectada exitosamente');
      return pool;
    } catch (error) {
      retries++;
      logger.error(
        `✗ Error conectando a BD (intento ${retries}/${MAX_RETRIES}):`,
        error.message
      );

      if (retries < MAX_RETRIES) {
        logger.info(`  Reintentando en ${RETRY_DELAY / 1000} segundos...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      } else {
        logger.error('✗ No se pudo conectar a la BD después de varios intentos');
        throw error;
      }
    }
  }
}

/**
 * Obtiene el pool de conexiones
 */
export function getPool() {
  if (!pool) {
    throw new Error('Pool no inicializado. Llama a initializePool() primero.');
  }
  return pool;
}

/**
 * Ejecuta una query con manejo de errores
 */
export async function query(sql, values = []) {
  try {
    const connection = await getPool().getConnection();
    try {
      const [rows, fields] = await connection.execute(sql, values);
      return { rows, fields, error: null };
    } finally {
      connection.release();
    }
  } catch (error) {
    logger.error('Database query error:', { sql, error: error.message });
    return { rows: null, fields: null, error };
  }
}

/**
 * Ejecuta múltiples queries en una transacción
 */
export async function transaction(callback) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    logger.error('Transaction error:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Cierra el pool de conexiones
 */
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('✓ Pool de conexiones cerrado');
  }
}

export default {
  initializePool,
  getPool,
  query,
  transaction,
  closePool,
};
