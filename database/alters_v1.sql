SET NAMES utf8mb4;

-- ============================================================
--  Usuarios: nuevo rol y permiso de transferencia
-- ============================================================

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin', 'cashier', 'superadmin') NOT NULL DEFAULT 'cashier',
  ADD COLUMN IF NOT EXISTS `can_transfer_client_data` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT 'permite transferir datos entre clientes';

-- ============================================================
--  Auditoría de permisos
-- ============================================================

CREATE TABLE IF NOT EXISTS `user_permission_audit_log` (
  `id`                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `target_user_id`      INT UNSIGNED    NOT NULL,
  `permission_key`      VARCHAR(80)     NOT NULL,
  `old_value`           TINYINT(1)      NOT NULL DEFAULT 0,
  `new_value`           TINYINT(1)      NOT NULL DEFAULT 0,
  `changed_by`          INT UNSIGNED    DEFAULT NULL,
  `changed_by_username` VARCHAR(120)    DEFAULT NULL,
  `reason`              VARCHAR(255)    DEFAULT NULL,
  `created_at`          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_upal_target` (`target_user_id`, `created_at`),
  KEY `idx_upal_changed_by` (`changed_by`, `created_at`),
  KEY `idx_upal_permission` (`permission_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  Auditoría de transferencias entre clientes
-- ============================================================

CREATE TABLE IF NOT EXISTS `client_transfer_audit_log` (
  `id`                           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `source_client_id`             INT UNSIGNED    NOT NULL,
  `target_client_id`             INT UNSIGNED    NOT NULL,
  `actor_user_id`                INT UNSIGNED    DEFAULT NULL,
  `actor_username`               VARCHAR(120)    DEFAULT NULL,
  `reason`                       TEXT            DEFAULT NULL,
  `moved_chats`                  INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_messages`               INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_withdrawals`            INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_balance_adjustments`    INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_manual_movements`       INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_hgcash_movements`       INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_telepagos_movements`    INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_mercadopago_movements`  INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_sessions`               INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_push_tokens`            INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_push_subscriptions`     INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_labels`                 INT UNSIGNED    NOT NULL DEFAULT 0,
  `moved_cbus`                   INT UNSIGNED    NOT NULL DEFAULT 0,
  `created_at`                   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ctal_source` (`source_client_id`, `created_at`),
  KEY `idx_ctal_target` (`target_client_id`, `created_at`),
  KEY `idx_ctal_actor` (`actor_user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
