-- ============================================================
--  Retiros automáticos con HG Cash — Migración v1
--  Ejecutar DESPUÉS de alters.sql
-- ============================================================

-- ─── 1. Extender withdrawal_requests con columnas estructuradas y de auditoría ───

ALTER TABLE `withdrawal_requests`
  -- Monto declarado (extraído del form_data al crear la solicitud)
  ADD COLUMN `amount`             DECIMAL(18,2)    DEFAULT NULL AFTER `form_data`,

  -- Datos estructurados del destino (extraídos del formulario en el momento de la solicitud)
  ADD COLUMN `holder_name`        VARCHAR(255)     DEFAULT NULL AFTER `amount`,
  ADD COLUMN `method`             ENUM('alias','cbu','cvu') DEFAULT NULL AFTER `holder_name`,
  ADD COLUMN `alias`              VARCHAR(100)     DEFAULT NULL AFTER `method`,
  ADD COLUMN `cbu`                VARCHAR(22)      DEFAULT NULL AFTER `alias`,
  ADD COLUMN `dni`                VARCHAR(8)       DEFAULT NULL AFTER `cbu`,
  ADD COLUMN `withdrawable_balance` DECIMAL(18,2)  DEFAULT NULL AFTER `dni`,

  -- Resultado HG Cash
  ADD COLUMN `bank_transaction_id` VARCHAR(255)    DEFAULT NULL AFTER `withdrawable_balance`,
  ADD COLUMN `bank_external_id`    VARCHAR(255)    DEFAULT NULL AFTER `bank_transaction_id`,
  ADD COLUMN `raw_request`         JSON            DEFAULT NULL AFTER `bank_external_id`,
  ADD COLUMN `raw_status`          JSON            DEFAULT NULL AFTER `raw_request`,

  -- Control de despacho (idempotencia)
  ADD COLUMN `correlation_id`     CHAR(36)         DEFAULT NULL AFTER `raw_status`,
  ADD COLUMN `idempotency_key`    VARCHAR(180)     DEFAULT NULL AFTER `correlation_id`,
  ADD COLUMN `dispatched_at`      DATETIME         DEFAULT NULL AFTER `idempotency_key`,
  ADD COLUMN `balance_debited_at` DATETIME         DEFAULT NULL AFTER `dispatched_at`,
  ADD COLUMN `auto_message_sent_at` DATETIME       DEFAULT NULL AFTER `balance_debited_at`,
  ADD COLUMN `last_error`         TEXT             DEFAULT NULL AFTER `auto_message_sent_at`,

  -- Motor de riesgo
  ADD COLUMN `risk_score`         SMALLINT UNSIGNED DEFAULT NULL AFTER `last_error`,
  ADD COLUMN `fraud_alerts`       JSON             DEFAULT NULL AFTER `risk_score`,
  ADD COLUMN `risk_reason`        VARCHAR(255)     DEFAULT NULL AFTER `fraud_alerts`,
  ADD COLUMN `review_mode`        ENUM('auto','manual') NOT NULL DEFAULT 'manual' AFTER `risk_reason`,

  -- Contexto de la solicitud (IP / geo / dispositivo)
  ADD COLUMN `request_ip`           VARCHAR(45)    DEFAULT NULL AFTER `review_mode`,
  ADD COLUMN `request_device`       VARCHAR(255)   DEFAULT NULL AFTER `request_ip`,
  ADD COLUMN `request_user_agent`   TEXT           DEFAULT NULL AFTER `request_device`,
  ADD COLUMN `request_country_code` VARCHAR(10)    DEFAULT NULL AFTER `request_user_agent`,
  ADD COLUMN `request_country_name` VARCHAR(100)   DEFAULT NULL AFTER `request_country_code`,
  ADD COLUMN `request_city`         VARCHAR(100)   DEFAULT NULL AFTER `request_country_name`,
  ADD COLUMN `request_region`       VARCHAR(100)   DEFAULT NULL AFTER `request_city`,
  ADD COLUMN `request_latitude`     DECIMAL(10,7)  DEFAULT NULL AFTER `request_region`,
  ADD COLUMN `request_longitude`    DECIMAL(10,7)  DEFAULT NULL AFTER `request_latitude`,
  ADD COLUMN `request_asn_number`   INT UNSIGNED   DEFAULT NULL AFTER `request_longitude`,
  ADD COLUMN `request_asn_name`     VARCHAR(255)   DEFAULT NULL AFTER `request_asn_number`,
  ADD COLUMN `request_asn_org`      VARCHAR(255)   DEFAULT NULL AFTER `request_asn_name`,
  ADD COLUMN `request_timezone`     VARCHAR(80)    DEFAULT NULL AFTER `request_asn_org`,

  -- Revisión manual
  ADD COLUMN `reviewed_by`          VARCHAR(150)   DEFAULT NULL AFTER `processed_at`,
  ADD COLUMN `reviewed_by_username` VARCHAR(150)   DEFAULT NULL AFTER `reviewed_by`,
  ADD COLUMN `reviewed_at`          DATETIME       DEFAULT NULL AFTER `reviewed_by_username`,
  ADD COLUMN `review_note`          TEXT           DEFAULT NULL AFTER `reviewed_at`;

-- Ampliar ENUM de status para cubrir el ciclo completo de HG Cash
ALTER TABLE `withdrawal_requests`
  MODIFY COLUMN `status` ENUM(
    'pending',        -- esperando revisión manual (amount >= manual_threshold)
    'review_pending', -- motor de riesgo envió a revisión manual
    'approved',       -- aprobado por admin (compatibilidad hacia atrás)
    'initiated',      -- enviado a HG Cash, esperando respuesta
    'processing',     -- HG Cash procesando
    'done',           -- HG Cash completado exitosamente
    'failed',         -- HG Cash falló
    'rejected',       -- rechazado (sistema de riesgo o admin)
    'cancelled'       -- cancelado
  ) NOT NULL DEFAULT 'pending';

-- Índices adicionales para el nuevo flujo
CREATE INDEX `idx_wr_correlation`     ON `withdrawal_requests` (`correlation_id`);
CREATE UNIQUE INDEX `idx_wr_idempotency` ON `withdrawal_requests` (`chat_id`, `idempotency_key`);
CREATE INDEX `idx_wr_dispatched_at`   ON `withdrawal_requests` (`dispatched_at`);
CREATE INDEX `idx_wr_created_at`      ON `withdrawal_requests` (`created_at`);

-- ─── 2. Columna cbu_cvu en clients ───────────────────────────────────────────────

ALTER TABLE `clients`
  ADD COLUMN `cbu_cvu`            VARCHAR(22)  DEFAULT NULL AFTER `cuil`,
  ADD COLUMN `cbu_cvu_locked_at`  DATETIME     DEFAULT NULL AFTER `cbu_cvu`,
  ADD COLUMN `cbu_cvu_source`     VARCHAR(40)  DEFAULT NULL AFTER `cbu_cvu_locked_at`;

-- ─── 3. Log de auditoría de retiros ──────────────────────────────────────────────

CREATE TABLE `withdrawal_audit_log` (
  `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `withdrawal_request_id`  BIGINT UNSIGNED          DEFAULT NULL,
  `event_type`             VARCHAR(60)     NOT NULL,
  `actor_type`             ENUM('client','admin','system') NOT NULL DEFAULT 'system',
  `actor_id`               VARCHAR(40)              DEFAULT NULL,
  `actor_label`            VARCHAR(150)             DEFAULT NULL,
  `old_status`             VARCHAR(50)              DEFAULT NULL,
  `new_status`             VARCHAR(50)              DEFAULT NULL,
  `ip_address`             VARCHAR(45)              DEFAULT NULL,
  `device`                 VARCHAR(255)             DEFAULT NULL,
  `user_agent`             TEXT                     DEFAULT NULL,
  `details_json`           JSON                     DEFAULT NULL,
  `created_at`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wal_request`  (`withdrawal_request_id`, `created_at`),
  KEY `idx_wal_event`    (`event_type`),
  KEY `idx_wal_actor`    (`actor_type`, `actor_id`),
  KEY `idx_wal_rate`     (`actor_id`, `event_type`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. Log HTTP de llamadas a HG Cash ───────────────────────────────────────────

CREATE TABLE `hg_cash_api_log` (
  `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id`               CHAR(36)        NOT NULL,
  `withdrawal_request_id`  INT UNSIGNED             DEFAULT NULL,
  `correlation_id`         CHAR(36)                 DEFAULT NULL,
  `direction`              ENUM('outbound') NOT NULL DEFAULT 'outbound',
  `endpoint`               VARCHAR(512)    NOT NULL,
  `http_method`            VARCHAR(10)     NOT NULL,
  `phase`                  ENUM('request','response','error') NOT NULL,
  `http_status`            SMALLINT UNSIGNED        DEFAULT NULL,
  `latency_ms`             INT UNSIGNED             DEFAULT NULL,
  `actor_type`             VARCHAR(20)              DEFAULT 'system',
  `actor_id`               VARCHAR(40)              DEFAULT NULL,
  `actor_label`            VARCHAR(150)             DEFAULT NULL,
  `ip_address`             VARCHAR(45)              DEFAULT NULL,
  `device`                 VARCHAR(255)             DEFAULT NULL,
  `user_agent`             TEXT                     DEFAULT NULL,
  `payload_summary`        JSON                     DEFAULT NULL,
  `response_summary`       JSON                     DEFAULT NULL,
  `error_message`          TEXT                     DEFAULT NULL,
  `created_at`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hgcl_event_id`     (`event_id`),
  KEY `idx_hgcl_correlation`        (`correlation_id`),
  KEY `idx_hgcl_withdrawal`         (`withdrawal_request_id`, `created_at`),
  KEY `idx_hgcl_phase`              (`phase`, `http_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. Outbox de reintentos para hg_cash_api_log ────────────────────────────────

CREATE TABLE `hg_cash_api_log_outbox` (
  `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id`               CHAR(36)        NOT NULL,
  `correlation_id`         CHAR(36)                 DEFAULT NULL,
  `withdrawal_request_id`  INT UNSIGNED             DEFAULT NULL,
  `payload`                JSON            NOT NULL,
  `attempts`               INT UNSIGNED    NOT NULL DEFAULT 0,
  `last_error`             TEXT                     DEFAULT NULL,
  `created_at`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_attempt_at`        DATETIME                 DEFAULT NULL,
  `processed_at`           DATETIME                 DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_hgco_event_id` (`event_id`),
  KEY `idx_hgco_pending` (`processed_at`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. Lista negra de retiros (CBU / CUIT / DNI) ────────────────────────────────

CREATE TABLE `withdrawal_blacklist` (
  `id`          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `type`        ENUM('cbu','cuit','dni') NOT NULL,
  `value`       VARCHAR(22)     NOT NULL,
  `reason`      TEXT                     DEFAULT NULL,
  `created_by`  VARCHAR(150)             DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bl_type_value` (`type`, `value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. Whitelist de CBU/CVU por cliente ─────────────────────────────────────────

CREATE TABLE `client_cbu_whitelist` (
  `id`             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `client_id`      INT UNSIGNED    NOT NULL,
  `cbu`            VARCHAR(22)     NOT NULL,
  `label`          VARCHAR(120)             DEFAULT NULL,
  `source`         ENUM('manual','approved_withdrawal','profile','hgcash_movement') NOT NULL DEFAULT 'manual',
  `source_ref_id`  BIGINT UNSIGNED          DEFAULT NULL,
  `verified_by`    VARCHAR(150)             DEFAULT NULL,
  `verified_at`    DATETIME                 DEFAULT NULL,
  `last_used_at`   DATETIME                 DEFAULT NULL,
  `active`         TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ccw_client_cbu` (`client_id`, `cbu`),
  KEY `idx_ccw_cbu` (`cbu`),
  KEY `idx_ccw_client_active` (`client_id`, `active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. Mensajes automáticos para el flujo de retiros ────────────────────────────

INSERT IGNORE INTO `receipt_auto_messages` (`event`, `message`, `is_active`) VALUES
  ('withdrawal_processed',    '¡Tu retiro fue procesado con éxito! En breve recibirás el dinero en tu cuenta.', 1),
  ('withdrawal_review',       'Tu solicitud de retiro está siendo revisada. Te notificaremos en breve.', 1),
  ('withdrawal_auto_rejected', 'Tu solicitud de retiro no pudo ser procesada en este momento.', 1);
