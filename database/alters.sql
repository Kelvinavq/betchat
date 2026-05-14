SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `chat_processing_config` (
  `id` INT UNSIGNED NOT NULL DEFAULT 1,
  `bank_account_id` INT UNSIGNED DEFAULT NULL COMMENT 'active account for incoming deposits',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_cpc_bank_account` (`bank_account_id`),
  CONSTRAINT `chk_chat_processing_config_singleton` CHECK (`id` = 1),
  CONSTRAINT `fk_cpc_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `chat_processing_config` (`id`) VALUES (1);

ALTER TABLE `chats`
  ADD COLUMN `bot_screen_id` VARCHAR(80) DEFAULT NULL COMMENT 'current bot screen for the client' AFTER `last_message_at`,
  ADD COLUMN `bot_last_button_id` VARCHAR(80) DEFAULT NULL COMMENT 'last selected bot option' AFTER `bot_screen_id`;

ALTER TABLE `messages`
  ADD COLUMN `delivered_at` DATETIME DEFAULT NULL COMMENT 'when recipient received the message' AFTER `is_read`,
  ADD COLUMN `read_at` DATETIME DEFAULT NULL COMMENT 'when recipient viewed the message' AFTER `delivered_at`;

ALTER TABLE `messages`
  ADD INDEX `idx_msg_chat_created_at` (`chat_id`, `created_at`, `id`);

ALTER TABLE `messages`
  ADD COLUMN `reply_to_message_id` BIGINT UNSIGNED DEFAULT NULL AFTER `file_size`,
  ADD INDEX `idx_msg_reply_to` (`reply_to_message_id`);

ALTER TABLE `messages`
  ADD CONSTRAINT `fk_msg_reply_to`
    FOREIGN KEY (`reply_to_message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL;

UPDATE `messages` m
INNER JOIN `chats` ch ON ch.id = m.chat_id
SET m.client_id = ch.client_id
WHERE m.sender_type = 'client'
  AND m.client_id IS NULL;

ALTER TABLE `messages`
  MODIFY COLUMN `message_type` ENUM('text','image','pdf','file','audio') NOT NULL DEFAULT 'text';

ALTER TABLE `chats`
  MODIFY COLUMN `last_message_type` ENUM('text','image','pdf','file','audio','system') DEFAULT 'text';

CREATE TABLE IF NOT EXISTS `system_config` (
  `id`                            INT UNSIGNED NOT NULL DEFAULT 1,
  `app_name`                      VARCHAR(120) NOT NULL DEFAULT 'BetChat',
  `logo_url`                      VARCHAR(512) DEFAULT NULL,
  `client_registration_enabled`   TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at`                    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_system_config_singleton` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `system_config` (`id`) VALUES (1);

ALTER TABLE `system_config`
  ADD COLUMN `client_logout_enabled` TINYINT(1) NOT NULL DEFAULT 1 AFTER `client_registration_enabled`;

ALTER TABLE `bot_items`
  MODIFY COLUMN `type` ENUM('message','button','form') NOT NULL,
  ADD COLUMN `form_config` TEXT DEFAULT NULL AFTER `label`;

ALTER TABLE `clients`
  ADD COLUMN `is_temporary` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_online`,
  ADD COLUMN `temp_session_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `is_temporary`;

ALTER TABLE `chats`
  ADD COLUMN `is_help_request` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_archived`,
  ADD COLUMN `help_reason` VARCHAR(40) DEFAULT NULL AFTER `is_help_request`,
  ADD COLUMN `help_note` TEXT DEFAULT NULL AFTER `help_reason`,
  ADD COLUMN `closed_at` DATETIME DEFAULT NULL AFTER `updated_at`;

ALTER TABLE `bot_items`
  ADD COLUMN `button_type` ENUM('navigate','receipt_request') NOT NULL DEFAULT 'navigate' AFTER `label`,
  ADD COLUMN `receipt_processing` ENUM('auto','manual') NOT NULL DEFAULT 'manual' AFTER `button_type`,
  ADD COLUMN `receipt_prompt` TEXT DEFAULT NULL AFTER `receipt_processing`,
  ADD COLUMN `response_messages` TEXT DEFAULT NULL AFTER `receipt_prompt`;

ALTER TABLE `bot_items`
  MODIFY COLUMN `button_type` ENUM('navigate','receipt_request','messages_only') NOT NULL DEFAULT 'navigate',
  ADD COLUMN `show_receipt_after` TINYINT(1) NOT NULL DEFAULT 0 AFTER `receipt_prompt`;

CREATE TABLE IF NOT EXISTS `manual_payment_movements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` INT UNSIGNED NOT NULL,
  `chat_id` INT UNSIGNED NOT NULL,
  `message_id` BIGINT UNSIGNED NOT NULL,
  `bank_account_id` INT UNSIGNED DEFAULT NULL,
  `status` ENUM('pending','paid','rejected') NOT NULL DEFAULT 'pending',
  `amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `ai_extracted_text` JSON DEFAULT NULL,
  `ai_status` ENUM('ok','error') DEFAULT NULL,
  `transaction_id` VARCHAR(160) DEFAULT NULL,
  `is_duplicate` TINYINT(1) NOT NULL DEFAULT 0,
  `duplicate_of_id` BIGINT UNSIGNED DEFAULT NULL,
  `processed_by_user_id` INT UNSIGNED DEFAULT NULL,
  `processed_at` DATETIME DEFAULT NULL,
  `status_updated_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mpm_client_created` (`client_id`, `created_at`),
  KEY `idx_mpm_chat` (`chat_id`),
  KEY `idx_mpm_message` (`message_id`),
  KEY `idx_mpm_account` (`bank_account_id`),
  KEY `idx_mpm_status` (`status`),
  KEY `idx_mpm_transaction_amount` (`transaction_id`, `amount`),
  KEY `idx_mpm_duplicate_of` (`duplicate_of_id`),
  CONSTRAINT `fk_mpm_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mpm_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mpm_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mpm_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mpm_duplicate_of` FOREIGN KEY (`duplicate_of_id`) REFERENCES `manual_payment_movements` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mpm_processed_by` FOREIGN KEY (`processed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hgcash_movements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` INT UNSIGNED NOT NULL,
  `chat_id` INT UNSIGNED NOT NULL,
  `message_id` BIGINT UNSIGNED NOT NULL,
  `bank_account_id` INT UNSIGNED DEFAULT NULL,
  `cuit` VARCHAR(20) DEFAULT NULL,
  `receipt_date` DATE DEFAULT NULL,
  `receipt_time` TIME DEFAULT NULL,
  `amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `cbu_cvu` VARCHAR(32) DEFAULT NULL,
  `bank_status` VARCHAR(80) DEFAULT NULL,
  `coelsa_id` VARCHAR(160) DEFAULT NULL,
  `status` ENUM('pending','paid','rejected') NOT NULL DEFAULT 'pending',
  `game_platform_load_id` VARCHAR(160) DEFAULT NULL,
  `game_load_date` DATE DEFAULT NULL,
  `game_load_time` TIME DEFAULT NULL,
  `game_load_amount` DECIMAL(18,2) DEFAULT NULL,
  `sync_status` ENUM('synced','not_synced','error') NOT NULL DEFAULT 'not_synced',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_hgc_client_created` (`client_id`, `created_at`),
  KEY `idx_hgc_chat` (`chat_id`),
  KEY `idx_hgc_message` (`message_id`),
  KEY `idx_hgc_account` (`bank_account_id`),
  KEY `idx_hgc_status` (`status`),
  KEY `idx_hgc_coelsa` (`coelsa_id`),
  KEY `idx_hgc_amount` (`amount`),
  CONSTRAINT `fk_hgc_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hgc_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hgc_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hgc_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `telepagos_movements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` INT UNSIGNED NOT NULL,
  `chat_id` INT UNSIGNED NOT NULL,
  `message_id` BIGINT UNSIGNED NOT NULL,
  `bank_account_id` INT UNSIGNED DEFAULT NULL,
  `cuit` VARCHAR(20) DEFAULT NULL,
  `receipt_date` DATE DEFAULT NULL,
  `receipt_time` TIME DEFAULT NULL,
  `amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `description` VARCHAR(255) DEFAULT NULL,
  `account_holder` VARCHAR(160) DEFAULT NULL,
  `cbu_cvu` VARCHAR(32) DEFAULT NULL,
  `bank_status` VARCHAR(80) DEFAULT NULL,
  `coelsa_id` VARCHAR(160) DEFAULT NULL,
  `status` ENUM('pending','paid','rejected') NOT NULL DEFAULT 'pending',
  `game_platform_load_id` VARCHAR(160) DEFAULT NULL,
  `game_load_date` DATE DEFAULT NULL,
  `game_load_time` TIME DEFAULT NULL,
  `game_load_amount` DECIMAL(18,2) DEFAULT NULL,
  `sync_status` ENUM('synced','not_synced','error') NOT NULL DEFAULT 'not_synced',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tpl_client_created` (`client_id`, `created_at`),
  KEY `idx_tpl_chat` (`chat_id`),
  KEY `idx_tpl_message` (`message_id`),
  KEY `idx_tpl_account` (`bank_account_id`),
  KEY `idx_tpl_status` (`status`),
  KEY `idx_tpl_coelsa` (`coelsa_id`),
  KEY `idx_tpl_amount` (`amount`),
  CONSTRAINT `fk_tpl_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tpl_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tpl_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tpl_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `mercadopago_movements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id` INT UNSIGNED NOT NULL,
  `chat_id` INT UNSIGNED NOT NULL,
  `message_id` BIGINT UNSIGNED NOT NULL,
  `bank_account_id` INT UNSIGNED DEFAULT NULL,
  `cuit` VARCHAR(20) DEFAULT NULL,
  `receipt_date` DATE DEFAULT NULL,
  `receipt_time` TIME DEFAULT NULL,
  `amount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
  `transaction_id` VARCHAR(160) DEFAULT NULL,
  `transaction_id_type` ENUM('numeric','alphanumeric','undefined') NOT NULL DEFAULT 'undefined',
  `status` ENUM('pending','paid','error') NOT NULL DEFAULT 'pending',
  `mercadopago_id` VARCHAR(160) DEFAULT NULL,
  `coelsa_id` VARCHAR(160) DEFAULT NULL,
  `game_platform_load_id` VARCHAR(160) DEFAULT NULL,
  `game_load_date` DATE DEFAULT NULL,
  `game_load_time` TIME DEFAULT NULL,
  `game_load_amount` DECIMAL(18,2) DEFAULT NULL,
  `sync_status` ENUM('synced','not_synced','error') NOT NULL DEFAULT 'not_synced',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mp_client_created` (`client_id`, `created_at`),
  KEY `idx_mp_chat` (`chat_id`),
  KEY `idx_mp_message` (`message_id`),
  KEY `idx_mp_account` (`bank_account_id`),
  KEY `idx_mp_status` (`status`),
  KEY `idx_mp_transaction` (`transaction_id`),
  KEY `idx_mp_coelsa` (`coelsa_id`),
  KEY `idx_mp_amount` (`amount`),
  CONSTRAINT `fk_mp_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mp_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mp_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mp_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Mensajes automáticos para comprobantes y movimientos
-- ============================================================
CREATE TABLE IF NOT EXISTS `receipt_auto_messages` (
  `event`      VARCHAR(40)  NOT NULL,
  `message`    TEXT         NOT NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `receipt_auto_messages` (`event`, `message`, `is_active`) VALUES
  ('receipt_received',        'Recibimos tu comprobante. Lo estamos procesando, te avisamos en breve.',            1),
  ('receipt_duplicate',       'Este comprobante ya fue enviado anteriormente. Por favor sube uno diferente.',      1),
  ('receipt_invalid',         'No pudimos validar tu comprobante. Asegurate de enviar una imagen clara del comprobante de pago.',  1),
  ('receipt_insufficient_info','La imagen del comprobante no tiene suficiente información. Por favor subí una foto más clara y completa.', 1),
  ('deposit_completed',       '¡Tu depósito fue acreditado con éxito! Ya podés jugar.',                           1),
  ('deposit_failed',          'No pudimos procesar tu depósito. Contactá a soporte para más información.',        1),
  ('receipt_reupload',        'Necesitamos que vuelvas a enviar el comprobante. Por favor subí una imagen más clara.',            1),
  ('receipt_amount_low',      'El monto de tu comprobante es inferior al mínimo permitido. Realizá un depósito por el monto mínimo requerido.', 1)
ON DUPLICATE KEY UPDATE `event` = `event`;

ALTER TABLE `chats` ADD COLUMN `is_pinned` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'pinned in admin chat list' AFTER `is_archived`;

-- ============================================================
--  Solicitudes de retiro
-- ============================================================
CREATE TABLE IF NOT EXISTS `withdrawal_requests` (
  `id`                 INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `chat_id`            INT UNSIGNED     NOT NULL,
  `client_id`          INT UNSIGNED     NOT NULL,
  `form_id`            VARCHAR(120)     DEFAULT NULL,
  `message_id`         BIGINT UNSIGNED  DEFAULT NULL,
  `status`             ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `form_data`          TEXT             DEFAULT NULL,
  `rejection_message`  TEXT             DEFAULT NULL,
  `processed_by`       VARCHAR(255)     DEFAULT NULL,
  `processed_at`       DATETIME         DEFAULT NULL,
  `created_at`         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wr_chat`    (`chat_id`),
  KEY `idx_wr_client`  (`client_id`),
  KEY `idx_wr_status`  (`status`),
  CONSTRAINT `fk_wr_chat`    FOREIGN KEY (`chat_id`)    REFERENCES `chats`    (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wr_client`  FOREIGN KEY (`client_id`)  REFERENCES `clients`  (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wr_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `receipt_auto_messages` (`event`, `message`, `is_active`) VALUES
  ('withdrawal_approved', '¡Tu retiro fue aprobado y procesado con éxito! En breve recibirás el dinero.', 1),
  ('withdrawal_rejected', 'Tu solicitud de retiro fue rechazada. Contactá a soporte para más información.', 1)
ON DUPLICATE KEY UPDATE `event` = `event`;

-- ============================================================
--  Códigos de referido y sesiones de clientes
-- ============================================================
-- ============================================================
--  Retiros: configuración y análisis anti-fraude
-- ============================================================

CREATE TABLE IF NOT EXISTS `withdrawal_config` (
  `id`                INT UNSIGNED  NOT NULL DEFAULT 1,
  `mode`              ENUM('auto','manual') NOT NULL DEFAULT 'manual',
  `manual_threshold`  DECIMAL(18,2) NOT NULL DEFAULT 80000.00 COMMENT 'withdrawals above this go to manual review',
  `max_per_day`       INT UNSIGNED  NOT NULL DEFAULT 5,
  `updated_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_wc_singleton` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `withdrawal_config` (`id`) VALUES (1);

ALTER TABLE `withdrawal_requests`
  ADD COLUMN `risk_score`    TINYINT UNSIGNED DEFAULT NULL AFTER `rejection_message`,
  ADD COLUMN `fraud_alerts`  JSON             DEFAULT NULL AFTER `risk_score`,
  ADD COLUMN `review_mode`   ENUM('auto','manual') NOT NULL DEFAULT 'manual' AFTER `fraud_alerts`;

-- ============================================================
--  Permisos granulares por módulo + restricción horaria
-- ============================================================

ALTER TABLE `user_permissions`
  MODIFY COLUMN `module` VARCHAR(60) NOT NULL;

ALTER TABLE `users`
  ADD COLUMN `access_start` TIME DEFAULT NULL COMMENT 'start of daily access window (NULL = unrestricted)',
  ADD COLUMN `access_end`   TIME DEFAULT NULL COMMENT 'end of daily access window (NULL = unrestricted)';

ALTER TABLE `clients`
  ADD COLUMN `referral_code` VARCHAR(20) UNIQUE DEFAULT NULL COMMENT 'unique referral code, e.g. ABCD-XY12';

-- ============================================================
--  HGCash: allow webhook/poll movements without a client context
-- ============================================================

ALTER TABLE `hgcash_movements`
  MODIFY COLUMN `client_id`  INT UNSIGNED DEFAULT NULL,
  MODIFY COLUMN `chat_id`    INT UNSIGNED DEFAULT NULL,
  MODIFY COLUMN `message_id` BIGINT UNSIGNED DEFAULT NULL;

ALTER TABLE `mercadopago_movements`
  MODIFY COLUMN `client_id`  INT UNSIGNED DEFAULT NULL,
  MODIFY COLUMN `chat_id`    INT UNSIGNED DEFAULT NULL,
  MODIFY COLUMN `message_id` BIGINT UNSIGNED DEFAULT NULL;

ALTER TABLE `telepagos_movements`
  MODIFY COLUMN `client_id`  INT UNSIGNED DEFAULT NULL,
  MODIFY COLUMN `chat_id`    INT UNSIGNED DEFAULT NULL,
  MODIFY COLUMN `message_id` BIGINT UNSIGNED DEFAULT NULL;

CREATE TABLE IF NOT EXISTS `client_sessions` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id`   INT UNSIGNED    NOT NULL,
  `ip_address`  VARCHAR(45)     DEFAULT NULL,
  `user_agent`  VARCHAR(512)    DEFAULT NULL,
  `device_type` VARCHAR(20)     DEFAULT NULL,
  `browser`     VARCHAR(80)     DEFAULT NULL,
  `os`          VARCHAR(80)     DEFAULT NULL,
  `country`     VARCHAR(80)     DEFAULT NULL,
  `city`        VARCHAR(80)     DEFAULT NULL,
  `fingerprint` VARCHAR(255)    DEFAULT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_cs_client_created` (`client_id`, `created_at`),
  CONSTRAINT `fk_cs_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- push_blocked flag on clients (needed by push subscriber management)
ALTER TABLE `clients`
  ADD COLUMN IF NOT EXISTS `push_blocked` TINYINT(1) NOT NULL DEFAULT 0;

-- ============================================================
--  PUSH NOTIFICATION SYSTEM (Firebase FCM)
-- ============================================================

CREATE TABLE IF NOT EXISTS `push_credentials` (
  `id`                   INT UNSIGNED NOT NULL DEFAULT 1,
  `project_id`           VARCHAR(255)  DEFAULT NULL,
  `client_email`         VARCHAR(500)  DEFAULT NULL,
  `private_key`          MEDIUMTEXT    DEFAULT NULL,
  `api_key`              VARCHAR(500)  DEFAULT NULL,
  `auth_domain`          VARCHAR(500)  DEFAULT NULL,
  `storage_bucket`       VARCHAR(500)  DEFAULT NULL,
  `messaging_sender_id`  VARCHAR(255)  DEFAULT NULL,
  `app_id`               VARCHAR(500)  DEFAULT NULL,
  `vapid_key`            TEXT          DEFAULT NULL,
  `updated_at`           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `push_credentials` (`id`) VALUES (1);

CREATE TABLE IF NOT EXISTS `push_global_settings` (
  `id`                INT UNSIGNED NOT NULL DEFAULT 1,
  `is_active`         TINYINT(1)   NOT NULL DEFAULT 1,
  `quiet_start`       INT          NOT NULL DEFAULT 2,
  `quiet_end`         INT          NOT NULL DEFAULT 9,
  `max_per_day`       INT          NOT NULL DEFAULT 3,
  `check_interval`    INT          NOT NULL DEFAULT 15,
  `timezone`          VARCHAR(100) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  `engagement_active` TINYINT(1)   NOT NULL DEFAULT 1,
  `events_active`     TINYINT(1)   NOT NULL DEFAULT 0,
  `onboarding_active` TINYINT(1)   NOT NULL DEFAULT 0,
  `vip_active`        TINYINT(1)   NOT NULL DEFAULT 0,
  `updated_at`        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `push_global_settings` (`id`) VALUES (1);

CREATE TABLE IF NOT EXISTS `push_tokens` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id`  INT UNSIGNED NOT NULL,
  `token`      TEXT         NOT NULL,
  `device`     VARCHAR(255) DEFAULT NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_seen`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pt_client` (`client_id`),
  KEY `idx_pt_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_campaigns` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type`       ENUM('retention','reconsumo','engagement','events','onboarding','vip') NOT NULL,
  `name`       VARCHAR(255) NOT NULL DEFAULT '',
  `title`      VARCHAR(500) NOT NULL DEFAULT '',
  `body`       TEXT         NOT NULL DEFAULT '',
  `config`     JSON         DEFAULT NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order` INT          NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pc_type` (`type`),
  KEY `idx_pc_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_history` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `campaign_id`     INT UNSIGNED DEFAULT NULL,
  `campaign_type`   VARCHAR(50)  NOT NULL DEFAULT '',
  `campaign_name`   VARCHAR(255) NOT NULL DEFAULT '',
  `title`           VARCHAR(500) NOT NULL DEFAULT '',
  `body`            TEXT         NOT NULL DEFAULT '',
  `target_count`    INT          NOT NULL DEFAULT 0,
  `sent_count`      INT          NOT NULL DEFAULT 0,
  `failed_count`    INT          NOT NULL DEFAULT 0,
  `trigger_type`    ENUM('scheduler','manual') NOT NULL DEFAULT 'scheduler',
  `sent_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ph_campaign` (`campaign_id`),
  KEY `idx_ph_sent_at` (`sent_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_history_tokens` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `history_id`   INT UNSIGNED NOT NULL,
  `client_id`    INT UNSIGNED DEFAULT NULL,
  `token_prefix` VARCHAR(60)  DEFAULT NULL,
  `status`       ENUM('sent','failed') NOT NULL DEFAULT 'sent',
  `error_code`   VARCHAR(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pht_history` (`history_id`),
  KEY `idx_pht_client` (`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_daily_sent` (
  `client_id` INT UNSIGNED NOT NULL,
  `date`      DATE         NOT NULL,
  `count`     INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (`client_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_onboarding_log` (
  `client_id`   INT UNSIGNED NOT NULL,
  `campaign_id` INT UNSIGNED NOT NULL,
  `sent_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_id`, `campaign_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_retention_log` (
  `client_id`   INT UNSIGNED NOT NULL,
  `campaign_id` INT UNSIGNED NOT NULL,
  `date`        DATE NOT NULL,
  PRIMARY KEY (`client_id`, `campaign_id`, `date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- ============================================================
--  PUSH IMAGES SUPPORT
-- ============================================================

ALTER TABLE `push_campaigns` ADD COLUMN `image` VARCHAR(500) DEFAULT NULL AFTER `body`;
ALTER TABLE `push_history` ADD COLUMN `image` VARCHAR(500) DEFAULT NULL AFTER `body`;

-- Bloqueo push a nivel cliente (no recibe FCM; registerToken rechaza hasta desbloquear)
ALTER TABLE `clients` ADD COLUMN `push_blocked` TINYINT(1) NOT NULL DEFAULT 0 AFTER `is_active`;

ALTER TABLE `clients` ADD `phone` VARCHAR(100) NULL AFTER `full_name`;

CREATE TABLE IF NOT EXISTS `webauthn_credentials` (
  `id`             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`        INT UNSIGNED    NOT NULL,
  `credential_id`  VARCHAR(255)    NOT NULL,
  `public_key`     TEXT            NOT NULL,
  `sign_count`     INT UNSIGNED    NOT NULL DEFAULT 0,
  `transports`     JSON            DEFAULT NULL,
  `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_webauthn_credential` (`credential_id`),
  KEY `idx_webauthn_user` (`user_id`),
  CONSTRAINT `fk_webauthn_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `webauthn_challenges` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`     INT UNSIGNED    NOT NULL,
  `challenge`   VARCHAR(255)    NOT NULL,
  `type`        ENUM('register','auth') NOT NULL,
  `expires_at`  DATETIME        NOT NULL,
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_webauthn_user_type` (`user_id`, `type`),
  KEY `idx_webauthn_challenge` (`challenge`),
  KEY `idx_webauthn_expires` (`expires_at`),
  CONSTRAINT `fk_webauthn_challenge_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
