-- ============================================================
-- Whitelist / blacklist de retiros con auditoria
-- Idempotente: puede ejecutarse aunque las tablas ya existan.
-- ============================================================

CREATE TABLE IF NOT EXISTS `withdrawal_audit_log` (
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
  KEY `idx_wal_request` (`withdrawal_request_id`, `created_at`),
  KEY `idx_wal_event` (`event_type`),
  KEY `idx_wal_actor` (`actor_type`, `actor_id`),
  KEY `idx_wal_rate` (`actor_id`, `event_type`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `withdrawal_blacklist` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type`        ENUM('cbu','cuit','dni') NOT NULL,
  `value`       VARCHAR(22) NOT NULL,
  `reason`      TEXT DEFAULT NULL,
  `created_by`  VARCHAR(150) DEFAULT NULL,
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bl_type_value` (`type`, `value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `client_cbu_whitelist` (
  `id`             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id`      INT UNSIGNED NOT NULL,
  `cbu`            VARCHAR(22) NOT NULL,
  `label`          VARCHAR(120) DEFAULT NULL,
  `source`         ENUM('manual','approved_withdrawal','profile','hgcash_movement','caudal_withdrawal') NOT NULL DEFAULT 'manual',
  `source_ref_id`  BIGINT UNSIGNED DEFAULT NULL,
  `verified_by`    VARCHAR(150) DEFAULT NULL,
  `verified_at`    DATETIME DEFAULT NULL,
  `last_used_at`   DATETIME DEFAULT NULL,
  `active`         TINYINT(1) NOT NULL DEFAULT 1,
  `created_at`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ccw_client_cbu` (`client_id`, `cbu`),
  KEY `idx_ccw_cbu` (`cbu`),
  KEY `idx_ccw_client_active` (`client_id`, `active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `client_cbu_whitelist`
  MODIFY COLUMN `source` ENUM(
    'manual','approved_withdrawal','profile','hgcash_movement','caudal_withdrawal'
  ) NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS `client_profile_audit_log` (
  `id`                         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `client_id`                  INT NOT NULL,
  `field_name`                 ENUM('cuit_cuil','cbu_cvu','verified_titular_name') NOT NULL,
  `old_value`                  VARCHAR(255) DEFAULT NULL,
  `new_value`                  VARCHAR(255) NOT NULL,
  `changed_by_admin_id`        BIGINT UNSIGNED DEFAULT NULL,
  `changed_by_admin_email`     VARCHAR(150) DEFAULT NULL,
  `changed_by_admin_label`     VARCHAR(150) DEFAULT NULL,
  `changed_by_admin_role`      VARCHAR(40) DEFAULT NULL,
  `changed_by_admin_username`  VARCHAR(150) DEFAULT NULL,
  `change_source`              VARCHAR(60) NOT NULL DEFAULT 'admin_panel',
  `change_reason`              VARCHAR(255) DEFAULT NULL,
  `ip_address`                 VARCHAR(45) DEFAULT NULL,
  `user_agent`                 TEXT DEFAULT NULL,
  `created_at`                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_client_profile_audit_client` (`client_id`, `created_at`),
  KEY `idx_client_profile_audit_field` (`field_name`, `created_at`),
  KEY `idx_client_profile_audit_admin` (`changed_by_admin_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
