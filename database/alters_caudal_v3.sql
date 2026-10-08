SET NAMES utf8mb4;

-- ============================================================
-- betchat: alters_caudal_v3.sql
-- Complementa los alters de Caudal sobre el dump actual
-- database/betchat.sql
--
-- Este archivo solo deja los cambios que faltan en el dump base
-- y evita re-aplicar columnas que ya estaban en alters_caudal_v1.sql.
-- ============================================================

-- ============================================================
-- 1. Proveedor Caudal
-- ============================================================
INSERT INTO `bank_providers` (`slug`, `name`, `is_active`)
VALUES ('caudal', 'Caudal', 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `is_active` = VALUES(`is_active`);

-- ============================================================
-- 2. Eventos de depósitos entrantes Caudal
-- ============================================================
CREATE TABLE  `caudal_transaction_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` CHAR(36) NOT NULL,
  `event_name` ENUM(
    'transferencia.detectada',
    'transferencia.actualizada',
    'retiro.resuelto'
  ) NOT NULL,
  `occurred_at` DATETIME NOT NULL,
  `bank_account_id` INT UNSIGNED DEFAULT NULL COMMENT 'FK -> bank_accounts.id (proveedor caudal)',
  `external_transaction_id` VARCHAR(64) NOT NULL,
  `account_external_id` VARCHAR(64) DEFAULT NULL COMMENT 'ID externo de la cuenta en la API de Caudal',
  `direction` VARCHAR(20) DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT NULL,
  `amount` DECIMAL(14,2) DEFAULT NULL,
  `currency` CHAR(3) DEFAULT NULL,
  `transfer_date` DATETIME DEFAULT NULL,
  `coelsa_code` VARCHAR(80) DEFAULT NULL,
  `from_name` VARCHAR(255) DEFAULT NULL,
  `from_cuit` VARCHAR(11) DEFAULT NULL,
  `from_cbu` VARCHAR(22) DEFAULT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `client_cuit_cuil` VARCHAR(11) DEFAULT NULL,
  `match_source` ENUM(
    'none',
    'client_cuit_cuil',
    'client_name_exact',
    'client_name_exact_ambiguous',
    'client_name',
    'manual'
  ) NOT NULL DEFAULT 'none',
  `matched_at` DATETIME DEFAULT NULL,
  `our_status` ENUM('pending', 'paid', 'duplicate') NOT NULL DEFAULT 'pending',
  `reviewed_by_admin_id` INT DEFAULT NULL,
  `reviewed_by_admin_username` VARCHAR(100) DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `review_note` VARCHAR(500) DEFAULT NULL,
  `balance_credited_at` DATETIME DEFAULT NULL,
  `raw_payload` JSON NOT NULL,
  `raw_headers` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_caudal_tx_event_id` (`event_id`),
  KEY `idx_caudal_tx_external_id` (`external_transaction_id`),
  KEY `idx_caudal_tx_account_external_id` (`account_external_id`),
  KEY `idx_caudal_tx_bank_account_id` (`bank_account_id`),
  KEY `idx_caudal_tx_client_id` (`client_id`),
  KEY `idx_caudal_tx_client_cuit` (`client_cuit_cuil`),
  KEY `idx_caudal_tx_from_cuit` (`from_cuit`),
  KEY `idx_caudal_tx_status` (`status`),
  KEY `idx_caudal_tx_our_status` (`our_status`),
  KEY `idx_caudal_tx_event_name` (`event_name`),
  KEY `idx_caudal_tx_occurred_at` (`occurred_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Retiros automáticos Caudal
-- ============================================================
CREATE TABLE  `caudal_withdrawal_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bank_account_id` INT UNSIGNED DEFAULT NULL COMMENT 'FK -> bank_accounts.id (proveedor caudal)',
  `account_external_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'ID externo de la cuenta en Caudal (de-normalizado)',
  `client_id` INT UNSIGNED DEFAULT NULL,
  `chat_id` INT UNSIGNED DEFAULT NULL,
  `client_cuit_cuil` VARCHAR(11) DEFAULT NULL,
  `client_username` VARCHAR(120) DEFAULT NULL,
  `client_name` VARCHAR(255) DEFAULT NULL,
  `correlation_id` CHAR(36) DEFAULT NULL,
  `client_reference_id` VARCHAR(100) NOT NULL DEFAULT '' COMMENT 'Referencia que enviamos a Caudal (deduplicación)',
  `external_id` CHAR(36) DEFAULT NULL COMMENT 'ID de retiro generado por Caudal',
  `amount` DECIMAL(14,2) NOT NULL,
  `destination_cbu` VARCHAR(30) NOT NULL,
  `destination_alias` VARCHAR(100) DEFAULT NULL,
  `destination_name` VARCHAR(255) DEFAULT NULL,
  `destination_cuit` VARCHAR(11) DEFAULT NULL,
  `destination_bank` VARCHAR(255) DEFAULT NULL,
  `concept` VARCHAR(30) DEFAULT 'VAR',
  `status` VARCHAR(50) NOT NULL DEFAULT 'INITIATED',
  `provider_status` VARCHAR(50) DEFAULT NULL,
  `provider_reason` VARCHAR(255) DEFAULT NULL,
  `coelsa_id` VARCHAR(120) DEFAULT NULL,
  `raw_request` JSON DEFAULT NULL,
  `raw_response` JSON DEFAULT NULL,
  `raw_webhook` JSON DEFAULT NULL,
  `resolved_at` DATETIME DEFAULT NULL,
  `status_message_sent_at` DATETIME DEFAULT NULL,
  `last_error` TEXT DEFAULT NULL,
  `dispatched_at` DATETIME DEFAULT NULL,
  `balance_debited_at` DATETIME DEFAULT NULL,
  `risk_score` INT UNSIGNED NOT NULL DEFAULT 0,
  `risk_flags` JSON DEFAULT NULL,
  `risk_reason` TEXT DEFAULT NULL,
  `request_ip` VARCHAR(45) DEFAULT NULL,
  `request_device` VARCHAR(255) DEFAULT NULL,
  `request_user_agent` TEXT DEFAULT NULL,
  `request_country_code` VARCHAR(255) DEFAULT NULL,
  `request_country_name` VARCHAR(255) DEFAULT NULL,
  `request_city` VARCHAR(255) DEFAULT NULL,
  `request_region` VARCHAR(255) DEFAULT NULL,
  `request_latitude` DECIMAL(10,7) DEFAULT NULL,
  `request_longitude` DECIMAL(10,7) DEFAULT NULL,
  `request_asn_number` INT UNSIGNED DEFAULT NULL,
  `request_asn_name` VARCHAR(255) DEFAULT NULL,
  `request_asn_org` VARCHAR(255) DEFAULT NULL,
  `request_timezone` VARCHAR(255) DEFAULT NULL,
  `reviewed_by` VARCHAR(255) DEFAULT NULL,
  `reviewed_at` DATETIME DEFAULT NULL,
  `review_note` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_caudal_withdrawal_correlation_id` (`correlation_id`),
  UNIQUE KEY `uq_caudal_withdrawal_external_id` (`external_id`),
  UNIQUE KEY `uq_caudal_withdrawal_source_ref` (`account_external_id`, `client_reference_id`),
  KEY `idx_caudal_withdrawal_client_id` (`client_id`, `created_at`),
  KEY `idx_caudal_withdrawal_chat_id` (`chat_id`, `created_at`),
  KEY `idx_caudal_withdrawal_client_cuit` (`client_cuit_cuil`, `created_at`),
  KEY `idx_caudal_withdrawal_status` (`status`, `created_at`),
  KEY `idx_caudal_withdrawal_provider_status` (`provider_status`, `created_at`),
  KEY `idx_caudal_withdrawal_destination_cbu` (`destination_cbu`),
  KEY `idx_caudal_withdrawal_account` (`bank_account_id`, `created_at`),
  KEY `idx_caudal_withdrawal_reviewed_at` (`reviewed_at`),
  KEY `idx_caudal_withdrawal_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Auditoría de depósitos Caudal
-- ============================================================
CREATE TABLE  `caudal_payment_audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `source` ENUM('ocr_image', 'ocr_pdf', 'report_payment', 'webhook', 'admin_action') NOT NULL,
  `decision` ENUM('accepted', 'rejected', 'duplicate', 'ignored', 'error') NOT NULL,
  `reason_code` VARCHAR(100) NOT NULL,
  `reason_detail` VARCHAR(500) DEFAULT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `chat_id` INT UNSIGNED DEFAULT NULL,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `comprobante_id` BIGINT UNSIGNED DEFAULT NULL,
  `caudal_transaction_event_id` BIGINT UNSIGNED DEFAULT NULL,
  `external_transaction_id` VARCHAR(64) DEFAULT NULL,
  `amount` DECIMAL(14,2) DEFAULT NULL,
  `currency` CHAR(3) DEFAULT NULL,
  `from_name` VARCHAR(255) DEFAULT NULL,
  `from_cuit` VARCHAR(11) DEFAULT NULL,
  `coelsa_code` VARCHAR(80) DEFAULT NULL,
  `match_source` VARCHAR(50) DEFAULT NULL,
  `ai_confidence` VARCHAR(20) DEFAULT NULL,
  `request_ip` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `payload` JSON DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_caudal_payment_audit_client` (`client_id`, `created_at`),
  KEY `idx_caudal_payment_audit_chat` (`chat_id`, `created_at`),
  KEY `idx_caudal_payment_audit_user` (`user_id`, `created_at`),
  KEY `idx_caudal_payment_audit_tx` (`external_transaction_id`),
  KEY `idx_caudal_payment_audit_decision` (`decision`, `created_at`),
  KEY `idx_caudal_payment_audit_reason` (`reason_code`, `created_at`),
  KEY `idx_caudal_payment_audit_event` (`caudal_transaction_event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Auditoría de retiros Caudal
-- ============================================================
CREATE TABLE  `caudal_withdrawal_audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `source` VARCHAR(50) NOT NULL,
  `decision` VARCHAR(30) NOT NULL,
  `reason_code` VARCHAR(80) NOT NULL,
  `reason_detail` VARCHAR(500) DEFAULT NULL,
  `caudal_withdrawal_request_id` BIGINT UNSIGNED DEFAULT NULL,
  `client_id` INT UNSIGNED DEFAULT NULL,
  `chat_id` INT UNSIGNED DEFAULT NULL,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `bank_account_id` INT UNSIGNED DEFAULT NULL,
  `external_id` CHAR(36) DEFAULT NULL,
  `client_reference_id` VARCHAR(100) DEFAULT NULL,
  `amount` DECIMAL(14,2) DEFAULT NULL,
  `currency` CHAR(3) DEFAULT NULL,
  `destination_cbu` VARCHAR(30) DEFAULT NULL,
  `provider_status` VARCHAR(50) DEFAULT NULL,
  `request_ip` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `payload` JSON DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_caudal_withdrawal_audit_request` (`caudal_withdrawal_request_id`, `created_at`),
  KEY `idx_caudal_withdrawal_audit_client` (`client_id`, `created_at`),
  KEY `idx_caudal_withdrawal_audit_chat` (`chat_id`, `created_at`),
  KEY `idx_caudal_withdrawal_audit_external` (`external_id`, `created_at`),
  KEY `idx_caudal_withdrawal_audit_source` (`source`, `decision`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Señales de confianza para retiros de clientes
-- ============================================================
CREATE TABLE  `client_withdrawal_trusted_signals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL,
  `source_session_id` BIGINT UNSIGNED DEFAULT NULL,
  `signal_type` ENUM('ip', 'device', 'asn_number', 'asn_name', 'asn_org') NOT NULL,
  `signal_value` VARCHAR(255) NOT NULL,
  `created_by_admin_id` INT DEFAULT NULL,
  `created_by_admin_username` VARCHAR(100) DEFAULT NULL,
  `created_by_admin_label` VARCHAR(120) DEFAULT NULL,
  `created_by_admin_role` VARCHAR(50) DEFAULT NULL,
  `reason` VARCHAR(255) DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_client_trusted_signal` (`client_id`, `signal_type`, `signal_value`),
  KEY `idx_client_trusted_signal_client_active` (`client_id`, `active`, `signal_type`),
  KEY `idx_client_trusted_signal_session` (`source_session_id`),
  KEY `idx_client_trusted_signal_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. Auditoría de cambios en campos sensibles del perfil del cliente
-- ============================================================
CREATE TABLE  `client_profile_audit_log` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` INT NOT NULL,
  `field_name` ENUM('cuit_cuil', 'cbu_cvu', 'verified_titular_name') NOT NULL,
  `old_value` VARCHAR(255) DEFAULT NULL,
  `new_value` VARCHAR(255) NOT NULL,
  `changed_by_admin_id` BIGINT UNSIGNED DEFAULT NULL,
  `changed_by_admin_email` VARCHAR(150) DEFAULT NULL,
  `changed_by_admin_label` VARCHAR(150) DEFAULT NULL,
  `changed_by_admin_role` VARCHAR(40) DEFAULT NULL,
  `changed_by_admin_username` VARCHAR(150) DEFAULT NULL,
  `change_source` VARCHAR(60) NOT NULL DEFAULT 'admin_panel',
  `change_reason` VARCHAR(255) DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_client_profile_audit_client` (`client_id`, `created_at`),
  KEY `idx_client_profile_audit_field` (`field_name`, `created_at`),
  KEY `idx_client_profile_audit_admin` (`changed_by_admin_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. Whitelist CBU/CVU: permitir origen de retiros Caudal
-- ============================================================
ALTER TABLE `client_cbu_whitelist`
  MODIFY COLUMN `source` ENUM('manual', 'approved_withdrawal', 'profile', 'hgcash_movement', 'caudal_withdrawal') NOT NULL DEFAULT 'manual';

-- ============================================================
-- 9. Receipt logs: permitir proveedor Caudal
-- ============================================================
ALTER TABLE `receipt_logs`
  MODIFY COLUMN `provider` ENUM('mercadopago', 'hgcash', 'manual', 'caudal') NOT NULL;

-- ============================================================
-- 10. System config: toggle del menú Caudal en cliente
-- ============================================================
ALTER TABLE `system_config`
  ADD COLUMN  `client_menu_caudal` TINYINT(1) NOT NULL DEFAULT 0 AFTER `client_menu_faq`;

-- ============================================================
-- 11. Mensajes automáticos Caudal
-- ============================================================
INSERT INTO `receipt_auto_messages` (`event`, `message`, `is_active`)
VALUES
  ('caudal_deposito_completado',
   '¡Tu depósito fue acreditado con éxito! Ya podés jugar.',
   1),
  ('caudal_request_name',
   'Necesitamos tu nombre y apellido para continuar con el pago Caudal.',
   1),
  ('caudal_no_pending',
   'No encontramos un pago pendiente. Subí el comprobante para revisarlo manualmente.',
   1),
  ('caudal_pending',
   'Tu pago quedó en revisión manual. Un administrador lo va a revisar y, si hace falta, se va a contactar con vos.',
   1),
  ('caudal_comprobante_duplicado',
   'El comprobante ingresado ya se encuentra registrado previamente.',
   1),
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
  `message` = VALUES(`message`),
  `is_active` = VALUES(`is_active`);
