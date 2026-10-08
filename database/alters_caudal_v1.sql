SET NAMES utf8mb4;

-- ============================================================
-- betchat: alters_caudal_v1.sql
-- Soporte para depósitos y retiros Caudal (webhook + API)
-- Ejecutar manualmente sobre la base de datos betchat
-- Fecha: 2026-07-10
-- ============================================================

-- ============================================================
-- 0. geo_json en sesiones (por si alters.sql no fue ejecutado)
-- ============================================================
ALTER TABLE `client_sessions`
  ADD COLUMN `geo_json` JSON DEFAULT NULL AFTER `ip_address`;

ALTER TABLE `user_sessions`
  ADD COLUMN `geo_json` JSON DEFAULT NULL AFTER `ip_address`;

-- ============================================================
-- 1. Proveedor Caudal en bank_providers
-- ============================================================
INSERT INTO `bank_providers` (slug, name, is_active)
VALUES ('caudal', 'Caudal', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = VALUES(is_active);

-- ============================================================
-- 2. auto_message_type en messages
--    Permite rastrear qué mensaje automático se envió (retiro,
--    depósito, revisión, etc.) para vincular con audit logs.
-- ============================================================
ALTER TABLE `messages`
  ADD COLUMN `auto_message_type` VARCHAR(80) NULL AFTER `message_type`,
  ADD COLUMN `caudal_audit_id`   BIGINT UNSIGNED NULL AFTER `auto_message_type`,
  ADD INDEX `idx_messages_auto_message_type` (`auto_message_type`),
  ADD INDEX `idx_messages_caudal_audit_id`   (`caudal_audit_id`);

-- ============================================================
-- 3. Campos de titular verificado en clients
--    Matching por nombre en eventos Caudal cuando el CUIL
--    no está disponible.
-- ============================================================
ALTER TABLE `clients`
  ADD COLUMN `verified_titular_name`       VARCHAR(255) NULL
    AFTER `cbu_cvu_source`,
  ADD COLUMN `verified_titular_source`
    ENUM('hgcash_movements', 'caudal_transactions', 'manual') NULL
    AFTER `verified_titular_name`,
  ADD COLUMN `verified_titular_updated_at` DATETIME NULL
    AFTER `verified_titular_source`,
  ADD KEY `idx_clients_verified_titular_name` (`verified_titular_name`);

-- ============================================================
-- 4. Eventos/transferencias entrantes de Caudal (webhooks)
--    Una fila por evento recibido de Caudal.
--    bank_account_id → bank_accounts.id (provider slug = 'caudal')
-- ============================================================
CREATE TABLE `caudal_transaction_events` (
  `id`                         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id`                   CHAR(36)        NOT NULL,
  `event_name`                 ENUM(
                                 'transferencia.detectada',
                                 'transferencia.actualizada',
                                 'retiro.resuelto'
                               ) NOT NULL,
  `occurred_at`                DATETIME        NOT NULL,

  `bank_account_id`            INT UNSIGNED    NULL
    COMMENT 'FK → bank_accounts.id (proveedor caudal)',
  `external_transaction_id`   VARCHAR(64)     NOT NULL,
  `account_external_id`       VARCHAR(64)     NULL
    COMMENT 'ID externo de la cuenta en la API de Caudal',
  `direction`                  VARCHAR(20)     NULL,
  `status`                     VARCHAR(50)     NULL,
  `amount`                     DECIMAL(14,2)   NULL,
  `currency`                   CHAR(3)         NULL,
  `transfer_date`              DATETIME        NULL,
  `coelsa_code`                VARCHAR(80)     NULL,

  `from_name`                  VARCHAR(255)    NULL,
  `from_cuit`                  VARCHAR(11)     NULL,
  `from_cbu`                   VARCHAR(22)     NULL,

  `client_id`                  INT UNSIGNED    NULL,
  `client_cuit_cuil`           VARCHAR(11)     NULL,
  `match_source`               ENUM(
                                 'none',
                                 'client_cuit_cuil',
                                 'client_name_exact',
                                 'client_name_exact_ambiguous',
                                 'client_name',
                                 'manual'
                               ) NOT NULL DEFAULT 'none',
  `matched_at`                 DATETIME        NULL,
  `our_status`                 ENUM('pending', 'paid', 'duplicate')
                               NOT NULL DEFAULT 'pending',
  `reviewed_by_admin_id`       INT             NULL,
  `reviewed_by_admin_username` VARCHAR(100)    NULL,
  `reviewed_at`                DATETIME        NULL,
  `review_note`                VARCHAR(500)    NULL,
  `balance_credited_at`        DATETIME        NULL,

  `raw_payload`                JSON            NOT NULL,
  `raw_headers`                JSON            NULL,
  `created_at`                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_caudal_tx_event_id`          (`event_id`),
  KEY `idx_caudal_tx_external_id`             (`external_transaction_id`),
  KEY `idx_caudal_tx_account_external_id`     (`account_external_id`),
  KEY `idx_caudal_tx_bank_account_id`         (`bank_account_id`),
  KEY `idx_caudal_tx_client_id`               (`client_id`),
  KEY `idx_caudal_tx_client_cuit`             (`client_cuit_cuil`),
  KEY `idx_caudal_tx_from_cuit`               (`from_cuit`),
  KEY `idx_caudal_tx_status`                  (`status`),
  KEY `idx_caudal_tx_our_status`              (`our_status`),
  KEY `idx_caudal_tx_event_name`              (`event_name`),
  KEY `idx_caudal_tx_occurred_at`             (`occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Retiros Caudal (flujo separado de withdrawal_requests/HG Cash)
--    bank_account_id → bank_accounts.id (provider slug = 'caudal')
-- ============================================================
CREATE TABLE `caudal_withdrawal_requests` (
  `id`                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  -- Relación con betchat
  `bank_account_id`        INT UNSIGNED    NULL
    COMMENT 'FK → bank_accounts.id (proveedor caudal)',
  `account_external_id`   VARCHAR(64)     NOT NULL DEFAULT ''
    COMMENT 'ID externo de la cuenta en Caudal (de-normalizado)',
  `client_id`              INT UNSIGNED    NULL,
  `chat_id`                INT UNSIGNED    NULL,
  `client_cuit_cuil`       VARCHAR(11)     NULL,
  `client_username`        VARCHAR(120)    NULL,
  `client_name`            VARCHAR(255)    NULL,

  -- Idempotencia / correlación con Caudal
  `correlation_id`         CHAR(36)        NULL,
  `client_reference_id`   VARCHAR(100)    NOT NULL DEFAULT ''
    COMMENT 'Referencia que enviamos a Caudal (deduplicación)',
  `external_id`            CHAR(36)        NULL
    COMMENT 'ID de retiro generado por Caudal',

  -- Datos del retiro
  `amount`                 DECIMAL(14,2)   NOT NULL,
  `destination_cbu`        VARCHAR(30)     NOT NULL,
  `destination_alias`      VARCHAR(100)    NULL,
  `destination_name`       VARCHAR(255)    NULL,
  `destination_cuit`       VARCHAR(11)     NULL,
  `destination_bank`       VARCHAR(255)    NULL,
  `concept`                VARCHAR(30)     NULL DEFAULT 'VAR',

  -- Estado interno y estado en Caudal
  `status`                 VARCHAR(50)     NOT NULL DEFAULT 'INITIATED',
  `provider_status`        VARCHAR(50)     NULL,
  `provider_reason`        VARCHAR(255)    NULL,
  `coelsa_id`              VARCHAR(120)    NULL,

  -- Trazabilidad técnica
  `raw_request`            JSON            NULL,
  `raw_response`           JSON            NULL,
  `raw_webhook`            JSON            NULL,
  `resolved_at`            DATETIME        NULL,
  `status_message_sent_at` DATETIME        NULL,
  `last_error`             TEXT            NULL,
  `dispatched_at`          DATETIME        NULL,
  `balance_debited_at`     DATETIME        NULL,

  -- Riesgo y revisión manual
  `risk_score`             INT UNSIGNED    NOT NULL DEFAULT 0,
  `risk_flags`             JSON            NULL,
  `risk_reason`            TEXT            NULL,
  `request_ip`             VARCHAR(45)     NULL,
  `request_device`         VARCHAR(255)    NULL,
  `request_user_agent`     TEXT            NULL,
  `request_country_code`   VARCHAR(255)    NULL,
  `request_country_name`   VARCHAR(255)    NULL,
  `request_city`           VARCHAR(255)    NULL,
  `request_region`         VARCHAR(255)    NULL,
  `request_latitude`       DECIMAL(10,7)   NULL,
  `request_longitude`      DECIMAL(10,7)   NULL,
  `request_asn_number`     INT UNSIGNED    NULL,
  `request_asn_name`       VARCHAR(255)    NULL,
  `request_asn_org`        VARCHAR(255)    NULL,
  `request_timezone`       VARCHAR(255)    NULL,
  `reviewed_by`            VARCHAR(255)    NULL,
  `reviewed_at`            DATETIME        NULL,
  `review_note`            TEXT            NULL,

  `created_at`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_caudal_withdrawal_correlation_id`  (`correlation_id`),
  UNIQUE KEY `uq_caudal_withdrawal_external_id`     (`external_id`),
  UNIQUE KEY `uq_caudal_withdrawal_source_ref`      (`account_external_id`, `client_reference_id`),
  KEY `idx_caudal_withdrawal_client_id`             (`client_id`, `created_at`),
  KEY `idx_caudal_withdrawal_chat_id`               (`chat_id`, `created_at`),
  KEY `idx_caudal_withdrawal_client_cuit`           (`client_cuit_cuil`, `created_at`),
  KEY `idx_caudal_withdrawal_status`                (`status`, `created_at`),
  KEY `idx_caudal_withdrawal_provider_status`       (`provider_status`, `created_at`),
  KEY `idx_caudal_withdrawal_destination_cbu`       (`destination_cbu`),
  KEY `idx_caudal_withdrawal_account`               (`bank_account_id`, `created_at`),
  KEY `idx_caudal_withdrawal_reviewed_at`           (`reviewed_at`),
  KEY `idx_caudal_withdrawal_created_at`            (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Auditoría de depósitos Caudal
-- ============================================================
CREATE TABLE `caudal_payment_audit_log` (
  `id`                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `source`                      ENUM(
                                  'ocr_image', 'ocr_pdf', 'report_payment',
                                  'webhook', 'admin_action'
                                ) NOT NULL,
  `decision`                    ENUM(
                                  'accepted', 'rejected', 'duplicate',
                                  'ignored', 'error'
                                ) NOT NULL,
  `reason_code`                 VARCHAR(100)    NOT NULL,
  `reason_detail`               VARCHAR(500)    NULL,

  `client_id`                   INT UNSIGNED    NULL,
  `chat_id`                     INT UNSIGNED    NULL,
  `user_id`                     INT UNSIGNED    NULL,
  `comprobante_id`              BIGINT UNSIGNED NULL,
  `caudal_transaction_event_id` BIGINT UNSIGNED NULL,

  `external_transaction_id`    VARCHAR(64)     NULL,
  `amount`                      DECIMAL(14,2)   NULL,
  `currency`                    CHAR(3)         NULL,
  `from_name`                   VARCHAR(255)    NULL,
  `from_cuit`                   VARCHAR(11)     NULL,
  `coelsa_code`                 VARCHAR(80)     NULL,
  `match_source`                VARCHAR(50)     NULL,
  `ai_confidence`               VARCHAR(20)     NULL,

  `request_ip`                  VARCHAR(45)     NULL,
  `user_agent`                  TEXT            NULL,
  `payload`                     JSON            NULL,
  `metadata`                    JSON            NULL,

  `created_at`                  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_caudal_payment_audit_client`   (`client_id`, `created_at`),
  KEY `idx_caudal_payment_audit_chat`     (`chat_id`, `created_at`),
  KEY `idx_caudal_payment_audit_user`     (`user_id`, `created_at`),
  KEY `idx_caudal_payment_audit_tx`       (`external_transaction_id`),
  KEY `idx_caudal_payment_audit_decision` (`decision`, `created_at`),
  KEY `idx_caudal_payment_audit_reason`   (`reason_code`, `created_at`),
  KEY `idx_caudal_payment_audit_event`    (`caudal_transaction_event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. Auditoría de retiros Caudal
-- ============================================================
CREATE TABLE `caudal_withdrawal_audit_log` (
  `id`                             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `source`                         VARCHAR(50)     NOT NULL,
  `decision`                       VARCHAR(30)     NOT NULL,
  `reason_code`                    VARCHAR(80)     NOT NULL,
  `reason_detail`                  VARCHAR(500)    NULL,
  `caudal_withdrawal_request_id`  BIGINT UNSIGNED NULL,
  `client_id`                      INT UNSIGNED    NULL,
  `chat_id`                        INT UNSIGNED    NULL,
  `user_id`                        INT UNSIGNED    NULL,
  `bank_account_id`                INT UNSIGNED    NULL,
  `external_id`                    CHAR(36)        NULL,
  `client_reference_id`           VARCHAR(100)    NULL,
  `amount`                         DECIMAL(14,2)   NULL,
  `currency`                       CHAR(3)         NULL,
  `destination_cbu`                VARCHAR(30)     NULL,
  `provider_status`                VARCHAR(50)     NULL,
  `request_ip`                     VARCHAR(45)     NULL,
  `user_agent`                     TEXT            NULL,
  `payload`                        JSON            NULL,
  `metadata`                       JSON            NULL,
  `created_at`                     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  KEY `idx_caudal_withdrawal_audit_request`  (`caudal_withdrawal_request_id`, `created_at`),
  KEY `idx_caudal_withdrawal_audit_client`   (`client_id`, `created_at`),
  KEY `idx_caudal_withdrawal_audit_chat`     (`chat_id`, `created_at`),
  KEY `idx_caudal_withdrawal_audit_external` (`external_id`, `created_at`),
  KEY `idx_caudal_withdrawal_audit_source`   (`source`, `decision`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. Señales de confianza para retiros de clientes (whitelist dinámica)
--    Permite marcar IPs, ASNs o dispositivos como confiables para
--    un cliente, reduciendo su puntaje de riesgo en retiros.
-- ============================================================
CREATE TABLE `client_withdrawal_trusted_signals` (
  `id`                       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id`                INT             NOT NULL,
  `source_session_id`        BIGINT UNSIGNED NULL,
  `signal_type`              ENUM('ip','device','asn_number','asn_name','asn_org') NOT NULL,
  `signal_value`             VARCHAR(255)    NOT NULL,
  `created_by_admin_id`      INT             NULL,
  `created_by_admin_username` VARCHAR(100)   NULL,
  `created_by_admin_label`   VARCHAR(120)    NULL,
  `created_by_admin_role`    VARCHAR(50)     NULL,
  `reason`                   VARCHAR(255)    NULL,
  `active`                   TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_client_trusted_signal`           (`client_id`, `signal_type`, `signal_value`),
  KEY `idx_client_trusted_signal_client_active`   (`client_id`, `active`, `signal_type`),
  KEY `idx_client_trusted_signal_session`         (`source_session_id`),
  KEY `idx_client_trusted_signal_created_at`      (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. Auditoría de cambios en campos sensibles del perfil del cliente
--    Ej: CUIL/CUIT, CBU/CVU, nombre titular verificado.
-- ============================================================
CREATE TABLE `client_profile_audit_log` (
  `id`                         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id`                  INT             NOT NULL,
  `field_name`                 ENUM('cuit_cuil', 'cbu_cvu', 'verified_titular_name') NOT NULL,
  `old_value`                  VARCHAR(255)    NULL,
  `new_value`                  VARCHAR(255)    NOT NULL,
  `changed_by_admin_id`        BIGINT UNSIGNED NULL,
  `changed_by_admin_email`     VARCHAR(150)    NULL,
  `changed_by_admin_label`     VARCHAR(150)    NULL,
  `changed_by_admin_role`      VARCHAR(40)     NULL,
  `changed_by_admin_username`  VARCHAR(150)    NULL,
  `change_source`              VARCHAR(60)     NOT NULL DEFAULT 'admin_panel',
  `change_reason`              VARCHAR(255)    NULL,
  `ip_address`                 VARCHAR(45)     NULL,
  `user_agent`                 TEXT            NULL,
  `created_at`                 DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_client_profile_audit_client` (`client_id`, `created_at`),
  INDEX `idx_client_profile_audit_field`  (`field_name`, `created_at`),
  INDEX `idx_client_profile_audit_admin`  (`changed_by_admin_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 10. Ampliar source en client_cbu_whitelist para retiros Caudal
-- ============================================================
ALTER TABLE `client_cbu_whitelist`
  MODIFY COLUMN `source`
    ENUM('manual','approved_withdrawal','profile','hgcash_movement','caudal_withdrawal')
    NOT NULL DEFAULT 'manual';

-- ============================================================
-- 11. Ampliar provider en receipt_logs para Caudal
-- ============================================================
ALTER TABLE `receipt_logs`
  MODIFY COLUMN `provider`
    ENUM('mercadopago','hgcash','manual','caudal')
    NOT NULL;

-- ============================================================
-- 12. Mensajes automáticos para estados de retiro Caudal
--     Administrables desde el panel de mensajes automáticos.
-- ============================================================
INSERT INTO `receipt_auto_messages` (event, message, is_active)
VALUES
  ('caudal_withdrawal_processing',
   'Tu retiro quedó en proceso. Te avisaremos apenas esté resuelto.',
   1),
  ('caudal_withdrawal_review',
   'Tu solicitud quedó en revisión manual. Un administrador la va a revisar y te va a contactar si hace falta.',
   1),
  ('caudal_withdrawal_rejected',
   'Tu solicitud de retiro no pudo procesarse en este momento. Por favor revisá los datos e intentá nuevamente o contactá soporte.',
   1)
ON DUPLICATE KEY UPDATE
  message   = VALUES(message),
  is_active = VALUES(is_active);
