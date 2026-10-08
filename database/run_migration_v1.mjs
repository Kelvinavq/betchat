/**
 * Ejecutar: node database/run_migration_v1.mjs
 * Agrega las columnas necesarias para el sistema de retiros automáticos.
 * Es idempotente: verifica si cada columna ya existe antes de intentar agregarla.
 */
import { createRequire } from 'node:module'

const require = createRequire(new URL('../server/package.json', import.meta.url))
const mysql = require('mysql2/promise')
const dotenv = require('dotenv')
dotenv.config()

const conn = await mysql.createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 3306),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || process.env.DB_DATABASE || 'betchat',
  multipleStatements: true,
})

async function columnExists(table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )
  return rows[0].cnt > 0
}

async function tableExists(table) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  )
  return rows[0].cnt > 0
}

async function indexExists(table, indexName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  )
  return rows[0].cnt > 0
}

async function indexIsUnique(table, indexName) {
  const [rows] = await conn.query(
    `SELECT MIN(NON_UNIQUE) AS non_unique FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  )
  return rows?.[0]?.non_unique === 0
}

async function addColumn(table, col, definition, afterCol) {
  if (await columnExists(table, col)) {
    console.log(`  ↩  ${table}.${col} ya existe, skip`)
    return
  }
  const after = afterCol ? `AFTER \`${afterCol}\`` : ''
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${definition} ${after}`)
  console.log(`  ✓  ${table}.${col} agregada`)
}

// ─── withdrawal_requests ─────────────────────────────────────────────────────

console.log('\n[1] withdrawal_requests — columnas de datos')
await addColumn('withdrawal_requests', 'amount',              'DECIMAL(18,2) DEFAULT NULL',               'form_data')
await addColumn('withdrawal_requests', 'holder_name',         'VARCHAR(255) DEFAULT NULL',                'amount')
await addColumn('withdrawal_requests', 'method',              "ENUM('alias','cbu','cvu') DEFAULT NULL",   'holder_name')
await addColumn('withdrawal_requests', 'alias',               'VARCHAR(100) DEFAULT NULL',                'method')
await addColumn('withdrawal_requests', 'cbu',                 'VARCHAR(22) DEFAULT NULL',                 'alias')
await addColumn('withdrawal_requests', 'dni',                 'VARCHAR(8) DEFAULT NULL',                  'cbu')
await addColumn('withdrawal_requests', 'withdrawable_balance','DECIMAL(18,2) DEFAULT NULL',               'dni')

console.log('\n[2] withdrawal_requests — HG Cash')
await addColumn('withdrawal_requests', 'bank_transaction_id', 'VARCHAR(255) DEFAULT NULL',               'withdrawable_balance')
await addColumn('withdrawal_requests', 'bank_external_id',    'VARCHAR(255) DEFAULT NULL',               'bank_transaction_id')
await addColumn('withdrawal_requests', 'raw_request',         'JSON DEFAULT NULL',                       'bank_external_id')
await addColumn('withdrawal_requests', 'raw_status',          'JSON DEFAULT NULL',                       'raw_request')

console.log('\n[3] withdrawal_requests — control de despacho')
await addColumn('withdrawal_requests', 'correlation_id',      'CHAR(36) DEFAULT NULL',                   'raw_status')
await addColumn('withdrawal_requests', 'idempotency_key',     'VARCHAR(180) DEFAULT NULL',               'correlation_id')
await addColumn('withdrawal_requests', 'dispatched_at',       'DATETIME DEFAULT NULL',                   'idempotency_key')
await addColumn('withdrawal_requests', 'balance_debited_at',  'DATETIME DEFAULT NULL',                   'dispatched_at')
await addColumn('withdrawal_requests', 'auto_message_sent_at','DATETIME DEFAULT NULL',                   'balance_debited_at')
await addColumn('withdrawal_requests', 'last_error',          'TEXT DEFAULT NULL',                       'auto_message_sent_at')

console.log('\n[4] withdrawal_requests — motor de riesgo')
await addColumn('withdrawal_requests', 'risk_score',          'SMALLINT UNSIGNED DEFAULT NULL',          'last_error')
await addColumn('withdrawal_requests', 'fraud_alerts',        'JSON DEFAULT NULL',                       'risk_score')
await addColumn('withdrawal_requests', 'risk_reason',         'VARCHAR(255) DEFAULT NULL',               'fraud_alerts')
await addColumn('withdrawal_requests', 'review_mode',         "ENUM('auto','manual') NOT NULL DEFAULT 'manual'", 'risk_reason')

console.log('\n[5] withdrawal_requests — contexto de solicitud')
await addColumn('withdrawal_requests', 'request_ip',           'VARCHAR(45) DEFAULT NULL',               'review_mode')
await addColumn('withdrawal_requests', 'request_device',       'VARCHAR(255) DEFAULT NULL',              'request_ip')
await addColumn('withdrawal_requests', 'request_user_agent',   'TEXT DEFAULT NULL',                      'request_device')
await addColumn('withdrawal_requests', 'request_country_code', 'VARCHAR(10) DEFAULT NULL',               'request_user_agent')
await addColumn('withdrawal_requests', 'request_country_name', 'VARCHAR(100) DEFAULT NULL',              'request_country_code')
await addColumn('withdrawal_requests', 'request_city',         'VARCHAR(100) DEFAULT NULL',              'request_country_name')
await addColumn('withdrawal_requests', 'request_region',       'VARCHAR(100) DEFAULT NULL',              'request_city')
await addColumn('withdrawal_requests', 'request_latitude',     'DECIMAL(10,7) DEFAULT NULL',             'request_region')
await addColumn('withdrawal_requests', 'request_longitude',    'DECIMAL(10,7) DEFAULT NULL',             'request_latitude')
await addColumn('withdrawal_requests', 'request_asn_number',   'INT UNSIGNED DEFAULT NULL',              'request_longitude')
await addColumn('withdrawal_requests', 'request_asn_name',     'VARCHAR(255) DEFAULT NULL',              'request_asn_number')
await addColumn('withdrawal_requests', 'request_asn_org',      'VARCHAR(255) DEFAULT NULL',              'request_asn_name')
await addColumn('withdrawal_requests', 'request_timezone',     'VARCHAR(80) DEFAULT NULL',               'request_asn_org')

console.log('\n[6] withdrawal_requests — revisión manual')
await addColumn('withdrawal_requests', 'reviewed_by',          'VARCHAR(150) DEFAULT NULL',              'processed_at')
await addColumn('withdrawal_requests', 'reviewed_by_username', 'VARCHAR(150) DEFAULT NULL',              'reviewed_by')
await addColumn('withdrawal_requests', 'reviewed_at',          'DATETIME DEFAULT NULL',                  'reviewed_by_username')
await addColumn('withdrawal_requests', 'review_note',          'TEXT DEFAULT NULL',                      'reviewed_at')

// ─── ENUM status ─────────────────────────────────────────────────────────────

console.log('\n[7] Ampliando ENUM status')
try {
  await conn.query(`
    ALTER TABLE \`withdrawal_requests\`
    MODIFY COLUMN \`status\` ENUM(
      'pending','review_pending','approved',
      'initiated','processing','done','failed',
      'rejected','cancelled'
    ) NOT NULL DEFAULT 'pending'
  `)
  console.log('  ✓  status ENUM actualizado')
} catch (e) {
  console.log('  ↩  status ENUM sin cambios o ya actualizado:', e.message)
}

// ─── Índices ──────────────────────────────────────────────────────────────────

console.log('\n[8] Índices')
const indices = [
  ['idx_wr_correlation',   'withdrawal_requests', '(`correlation_id`)', false],
  ['idx_wr_idempotency',   'withdrawal_requests', '(`chat_id`, `idempotency_key`)', true],
  ['idx_wr_dispatched_at', 'withdrawal_requests', '(`dispatched_at`)', false],
  ['idx_wr_created_at',    'withdrawal_requests', '(`created_at`)', false],
]
for (const [name, table, cols, unique] of indices) {
  if (await indexExists(table, name)) {
    if (unique && !(await indexIsUnique(table, name))) {
      await conn.query(`ALTER TABLE \`${table}\` DROP INDEX \`${name}\`, ADD UNIQUE INDEX \`${name}\` ${cols}`)
      console.log(`  ✓  ${name} convertido a UNIQUE`)
    } else {
      console.log(`  ↩  ${name} ya existe, skip`)
    }
  } else {
    await conn.query(`CREATE ${unique ? 'UNIQUE ' : ''}INDEX \`${name}\` ON \`${table}\` ${cols}`)
    console.log(`  ✓  ${name} creado`)
  }
}

// ─── clients — cbu_cvu ────────────────────────────────────────────────────────

console.log('\n[9] clients — cbu_cvu')
await addColumn('clients', 'cbu_cvu',           'VARCHAR(22) DEFAULT NULL',  'cuil')
await addColumn('clients', 'cbu_cvu_locked_at', 'DATETIME DEFAULT NULL',     'cbu_cvu')
await addColumn('clients', 'cbu_cvu_source',    'VARCHAR(40) DEFAULT NULL',  'cbu_cvu_locked_at')

// ─── Nuevas tablas ────────────────────────────────────────────────────────────

console.log('\n[10] Tablas nuevas')

if (!(await tableExists('withdrawal_audit_log'))) {
  await conn.query(`
    CREATE TABLE \`withdrawal_audit_log\` (
      \`id\`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`withdrawal_request_id\`  BIGINT UNSIGNED          DEFAULT NULL,
      \`event_type\`             VARCHAR(60)     NOT NULL,
      \`actor_type\`             ENUM('client','admin','system') NOT NULL DEFAULT 'system',
      \`actor_id\`               VARCHAR(40)              DEFAULT NULL,
      \`actor_label\`            VARCHAR(150)             DEFAULT NULL,
      \`old_status\`             VARCHAR(50)              DEFAULT NULL,
      \`new_status\`             VARCHAR(50)              DEFAULT NULL,
      \`ip_address\`             VARCHAR(45)              DEFAULT NULL,
      \`device\`                 VARCHAR(255)             DEFAULT NULL,
      \`user_agent\`             TEXT                     DEFAULT NULL,
      \`details_json\`           JSON                     DEFAULT NULL,
      \`created_at\`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_wal_request\`  (\`withdrawal_request_id\`, \`created_at\`),
      KEY \`idx_wal_event\`    (\`event_type\`),
      KEY \`idx_wal_actor\`    (\`actor_type\`, \`actor_id\`),
      KEY \`idx_wal_rate\`     (\`actor_id\`, \`event_type\`, \`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('  ✓  withdrawal_audit_log creada')
} else { console.log('  ↩  withdrawal_audit_log ya existe') }

if (!(await tableExists('hg_cash_api_log'))) {
  await conn.query(`
    CREATE TABLE \`hg_cash_api_log\` (
      \`id\`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`event_id\`               CHAR(36)        NOT NULL,
      \`withdrawal_request_id\`  INT UNSIGNED             DEFAULT NULL,
      \`correlation_id\`         CHAR(36)                 DEFAULT NULL,
      \`direction\`              ENUM('outbound') NOT NULL DEFAULT 'outbound',
      \`endpoint\`               VARCHAR(512)    NOT NULL,
      \`http_method\`            VARCHAR(10)     NOT NULL,
      \`phase\`                  ENUM('request','response','error') NOT NULL,
      \`http_status\`            SMALLINT UNSIGNED        DEFAULT NULL,
      \`latency_ms\`             INT UNSIGNED             DEFAULT NULL,
      \`actor_type\`             VARCHAR(20)              DEFAULT 'system',
      \`actor_id\`               VARCHAR(40)              DEFAULT NULL,
      \`actor_label\`            VARCHAR(150)             DEFAULT NULL,
      \`ip_address\`             VARCHAR(45)              DEFAULT NULL,
      \`device\`                 VARCHAR(255)             DEFAULT NULL,
      \`user_agent\`             TEXT                     DEFAULT NULL,
      \`payload_summary\`        JSON                     DEFAULT NULL,
      \`response_summary\`       JSON                     DEFAULT NULL,
      \`error_message\`          TEXT                     DEFAULT NULL,
      \`created_at\`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_hgcl_event_id\`  (\`event_id\`),
      KEY \`idx_hgcl_correlation\`     (\`correlation_id\`),
      KEY \`idx_hgcl_withdrawal\`      (\`withdrawal_request_id\`, \`created_at\`),
      KEY \`idx_hgcl_phase\`           (\`phase\`, \`http_status\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('  ✓  hg_cash_api_log creada')
} else { console.log('  ↩  hg_cash_api_log ya existe') }

if (!(await tableExists('hg_cash_api_log_outbox'))) {
  await conn.query(`
    CREATE TABLE \`hg_cash_api_log_outbox\` (
      \`id\`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`event_id\`               CHAR(36)        NOT NULL,
      \`correlation_id\`         CHAR(36)                 DEFAULT NULL,
      \`withdrawal_request_id\`  INT UNSIGNED             DEFAULT NULL,
      \`payload\`                JSON            NOT NULL,
      \`attempts\`               INT UNSIGNED    NOT NULL DEFAULT 0,
      \`last_error\`             TEXT                     DEFAULT NULL,
      \`created_at\`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`last_attempt_at\`        DATETIME                 DEFAULT NULL,
      \`processed_at\`           DATETIME                 DEFAULT NULL,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uq_hgco_event_id\` (\`event_id\`),
      KEY \`idx_hgco_pending\` (\`processed_at\`, \`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('  ✓  hg_cash_api_log_outbox creada')
} else { console.log('  ↩  hg_cash_api_log_outbox ya existe') }

if (!(await tableExists('withdrawal_blacklist'))) {
  await conn.query(`
    CREATE TABLE \`withdrawal_blacklist\` (
      \`id\`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
      \`type\`        ENUM('cbu','cuit','dni') NOT NULL,
      \`value\`       VARCHAR(22)     NOT NULL,
      \`reason\`      TEXT                     DEFAULT NULL,
      \`created_by\`  VARCHAR(150)             DEFAULT NULL,
      \`created_at\`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_bl_type_value\` (\`type\`, \`value\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('  ✓  withdrawal_blacklist creada')
} else { console.log('  ↩  withdrawal_blacklist ya existe') }

if (!(await tableExists('client_cbu_whitelist'))) {
  await conn.query(`
    CREATE TABLE \`client_cbu_whitelist\` (
      \`id\`             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
      \`client_id\`      INT UNSIGNED    NOT NULL,
      \`cbu\`            VARCHAR(22)     NOT NULL,
      \`label\`          VARCHAR(120)             DEFAULT NULL,
      \`source\`         ENUM('manual','approved_withdrawal','profile','hgcash_movement','caudal_withdrawal') NOT NULL DEFAULT 'manual',
      \`source_ref_id\`  BIGINT UNSIGNED          DEFAULT NULL,
      \`verified_by\`    VARCHAR(150)             DEFAULT NULL,
      \`verified_at\`    DATETIME                 DEFAULT NULL,
      \`last_used_at\`   DATETIME                 DEFAULT NULL,
      \`active\`         TINYINT(1)      NOT NULL DEFAULT 1,
      \`created_at\`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_ccw_client_cbu\` (\`client_id\`, \`cbu\`),
      KEY \`idx_ccw_cbu\` (\`cbu\`),
      KEY \`idx_ccw_client_active\` (\`client_id\`, \`active\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('  ✓  client_cbu_whitelist creada')
} else { console.log('  ↩  client_cbu_whitelist ya existe') }

await conn.query(`
  ALTER TABLE \`client_cbu_whitelist\`
  MODIFY COLUMN \`source\` ENUM(
    'manual','approved_withdrawal','profile','hgcash_movement','caudal_withdrawal'
  ) NOT NULL DEFAULT 'manual'
`)
console.log('  ✓  client_cbu_whitelist.source admite HG Cash y Caudal')

if (!(await tableExists('client_profile_audit_log'))) {
  await conn.query(`
    CREATE TABLE \`client_profile_audit_log\` (
      \`id\`                         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      \`client_id\`                  INT             NOT NULL,
      \`field_name\`                 ENUM('cuit_cuil','cbu_cvu','verified_titular_name') NOT NULL,
      \`old_value\`                  VARCHAR(255)             DEFAULT NULL,
      \`new_value\`                  VARCHAR(255)    NOT NULL,
      \`changed_by_admin_id\`        BIGINT UNSIGNED          DEFAULT NULL,
      \`changed_by_admin_email\`     VARCHAR(150)             DEFAULT NULL,
      \`changed_by_admin_label\`     VARCHAR(150)             DEFAULT NULL,
      \`changed_by_admin_role\`      VARCHAR(40)              DEFAULT NULL,
      \`changed_by_admin_username\`  VARCHAR(150)             DEFAULT NULL,
      \`change_source\`              VARCHAR(60)     NOT NULL DEFAULT 'admin_panel',
      \`change_reason\`              VARCHAR(255)             DEFAULT NULL,
      \`ip_address\`                 VARCHAR(45)              DEFAULT NULL,
      \`user_agent\`                 TEXT                     DEFAULT NULL,
      \`created_at\`                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_client_profile_audit_client\` (\`client_id\`, \`created_at\`),
      KEY \`idx_client_profile_audit_field\` (\`field_name\`, \`created_at\`),
      KEY \`idx_client_profile_audit_admin\` (\`changed_by_admin_id\`, \`created_at\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  console.log('  ✓  client_profile_audit_log creada')
} else { console.log('  ↩  client_profile_audit_log ya existe') }

// ─── Mensajes automáticos ─────────────────────────────────────────────────────

console.log('\n[11] Mensajes automáticos')
if (await tableExists('receipt_auto_messages')) {
  await conn.query(`
    INSERT IGNORE INTO \`receipt_auto_messages\` (\`event\`, \`message\`, \`is_active\`) VALUES
      ('withdrawal_processed',     '¡Tu retiro fue procesado con éxito! En breve recibirás el dinero en tu cuenta.', 1),
      ('withdrawal_review',        'Tu solicitud de retiro está siendo revisada. Te notificaremos en breve.', 1),
      ('withdrawal_auto_rejected', 'Tu solicitud de retiro no pudo ser procesada en este momento.', 1)
  `)
  console.log('  ✓  Mensajes automáticos insertados (IGNORE si ya existían)')
} else {
  console.log('  ↩  receipt_auto_messages no existe, skip')
}

await conn.end()
console.log('\n✅ Migración completada.\n')
