-- ============================================================
--  BetChat · MySQL Schema
--  Engine: InnoDB · Charset: utf8mb4 · Collation: utf8mb4_unicode_ci
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET TIME_ZONE = '+00:00';

-- ============================================================
--  1. USERS  (no self-ref FK yet — added via ALTER at the end)
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `username`        VARCHAR(60)      NOT NULL,
  `full_name`       VARCHAR(120)     NOT NULL,
  `email`           VARCHAR(180)     NOT NULL,
  `password_hash`   VARCHAR(255)     NOT NULL,
  `role`            ENUM('admin','cashier') NOT NULL DEFAULT 'cashier',
  `avatar_url`      VARCHAR(512)     DEFAULT NULL,
  `is_active`       TINYINT(1)       NOT NULL DEFAULT 1,
  `registered_by`   INT UNSIGNED     DEFAULT NULL  COMMENT 'admin who created this user',
  `last_login_at`   DATETIME         DEFAULT NULL,
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email`    (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  2. CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS `clients` (
  `id`              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `username`        VARCHAR(60)      NOT NULL,
  `full_name`       VARCHAR(120)     NOT NULL,
  `password_hash`   VARCHAR(255)     NOT NULL,
  `note`            TEXT             DEFAULT NULL,
  `cuil`            VARCHAR(20)      DEFAULT NULL         COMMENT 'tax ID / document number',
  `external_id`     VARCHAR(120)     DEFAULT NULL         COMMENT 'ID on the casino platform',
  `is_new`          TINYINT(1)       NOT NULL DEFAULT 1,
  `is_active`       TINYINT(1)       NOT NULL DEFAULT 1,
  `is_online`       TINYINT(1)       NOT NULL DEFAULT 0,
  `last_seen_at`    DATETIME         DEFAULT NULL,
  `registered_at`   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clients_username`    (`username`),
  UNIQUE KEY `uq_clients_external_id` (`external_id`),
  KEY `idx_clients_is_active`  (`is_active`),
  KEY `idx_clients_is_online`  (`is_online`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  3. LABELS
-- ============================================================
CREATE TABLE IF NOT EXISTS `labels` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(80)   NOT NULL,
  `color`      CHAR(7)       NOT NULL DEFAULT '#2563eb' COMMENT 'hex color e.g. #ff5733',
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_labels_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  4. CLIENT_LABELS  (pivot)
-- ============================================================
CREATE TABLE IF NOT EXISTS `client_labels` (
  `client_id` INT UNSIGNED NOT NULL,
  `label_id`  INT UNSIGNED NOT NULL,
  `assigned_at` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_id`, `label_id`),
  KEY `idx_cl_label` (`label_id`),
  CONSTRAINT `fk_cl_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cl_label`  FOREIGN KEY (`label_id`)  REFERENCES `labels`  (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  5. COMMANDS
-- ============================================================
CREATE TABLE IF NOT EXISTS `commands` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `trigger`     VARCHAR(100)  NOT NULL                   COMMENT 'keyword or phrase that fires the command',
  `response`    TEXT          NOT NULL,
  `match_type`  ENUM('exact','contains','starts_with') NOT NULL DEFAULT 'contains',
  `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_commands_trigger` (`trigger`),
  KEY `idx_commands_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  6. BANK PROVIDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS `bank_providers` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `slug`       VARCHAR(60)   NOT NULL  COMMENT 'machine-readable key e.g. hgcash',
  `name`       VARCHAR(120)  NOT NULL  COMMENT 'display name',
  `logo_url`   VARCHAR(512)  DEFAULT NULL,
  `is_active`  TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bank_providers_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  7. BANK ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS `bank_accounts` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `provider_id`  INT UNSIGNED  NOT NULL,
  `alias`        VARCHAR(120)  DEFAULT NULL  COMMENT 'friendly label for this account',
  `account_data` JSON          NOT NULL      COMMENT 'flexible: CBU, CVU, wallet ID, etc.',
  `currency`     CHAR(3)       NOT NULL DEFAULT 'ARS',
  `is_active`    TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ba_provider`  (`provider_id`),
  KEY `idx_ba_is_active` (`is_active`),
  CONSTRAINT `fk_ba_provider` FOREIGN KEY (`provider_id`) REFERENCES `bank_providers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  8. AMOUNTS  (min/max per currency per operation type)
-- ============================================================
CREATE TABLE IF NOT EXISTS `amounts` (
  `id`             INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `currency`       CHAR(3)        NOT NULL COMMENT 'USD ARS MXN COP CLP UYU',
  `operation`      ENUM('deposit','withdrawal') NOT NULL,
  `min_amount`     DECIMAL(18,2)  NOT NULL DEFAULT 0.00,
  `max_amount`     DECIMAL(18,2)  DEFAULT NULL COMMENT 'NULL = no limit',
  `is_active`      TINYINT(1)     NOT NULL DEFAULT 1,
  `updated_at`     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_amounts_currency_op` (`currency`, `operation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  9. CONFIG: CASINO PLATFORM
-- ============================================================
CREATE TABLE IF NOT EXISTS `config_casino` (
  `id`          INT UNSIGNED  NOT NULL DEFAULT 1,
  `api_url`     VARCHAR(512)  DEFAULT NULL,
  `api_key`     VARCHAR(512)  DEFAULT NULL,
  `api_secret`  VARCHAR(512)  DEFAULT NULL,
  `extra`       JSON          DEFAULT NULL COMMENT 'additional platform-specific settings',
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_config_casino_singleton` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  10. CONFIG: AWS
-- ============================================================
CREATE TABLE IF NOT EXISTS `config_aws` (
  `id`                INT UNSIGNED  NOT NULL DEFAULT 1,
  `access_key_id`     VARCHAR(255)  DEFAULT NULL,
  `secret_access_key` VARCHAR(512)  DEFAULT NULL,
  `region`            VARCHAR(60)   DEFAULT 'us-east-1',
  `s3_bucket`         VARCHAR(120)  DEFAULT NULL,
  `sns_topic_arn`     VARCHAR(512)  DEFAULT NULL,
  `extra`             JSON          DEFAULT NULL,
  `updated_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_config_aws_singleton` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  11. CONFIG: OPENROUTER  (AI / LLM gateway)
-- ============================================================
CREATE TABLE IF NOT EXISTS `config_openrouter` (
  `id`          INT UNSIGNED  NOT NULL DEFAULT 1,
  `api_key`     VARCHAR(512)  DEFAULT NULL,
  `model`       VARCHAR(120)  DEFAULT 'openai/gpt-4o-mini',
  `temperature` DECIMAL(3,2)  DEFAULT 0.70,
  `max_tokens`  INT UNSIGNED  DEFAULT 1024,
  `system_prompt` TEXT        DEFAULT NULL,
  `extra`       JSON          DEFAULT NULL,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_config_openrouter_singleton` CHECK (`id` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  12. CHAT PROCESSING CONFIG  (which bank account handles deposits)
-- ============================================================
CREATE TABLE IF NOT EXISTS `chat_processing_config` (
  `id`              INT UNSIGNED  NOT NULL DEFAULT 1,
  `bank_account_id` INT UNSIGNED  DEFAULT NULL COMMENT 'active account for incoming deposits',
  `updated_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_cpc_singleton`  CHECK (`id` = 1),
  CONSTRAINT `fk_cpc_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  13. CHATS
-- ============================================================
CREATE TABLE IF NOT EXISTS `chats` (
  `id`                INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `client_id`         INT UNSIGNED  NOT NULL,
  `assigned_user_id`  INT UNSIGNED  DEFAULT NULL COMMENT 'cashier or admin attending this chat',
  `is_open`           TINYINT(1)    NOT NULL DEFAULT 1,
  `is_archived`       TINYINT(1)    NOT NULL DEFAULT 0,
  `unread_count`      INT UNSIGNED  NOT NULL DEFAULT 0,
  `last_message`      VARCHAR(500)  DEFAULT NULL COMMENT 'denormalized for list rendering',
  `last_message_type` ENUM('text','image','pdf','file','system') DEFAULT 'text',
  `last_message_at`   DATETIME      DEFAULT NULL,
  `created_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chats_client`         (`client_id`),
  KEY `idx_chats_assigned_user`  (`assigned_user_id`),
  KEY `idx_chats_is_open`        (`is_open`),
  KEY `idx_chats_is_archived`    (`is_archived`),
  KEY `idx_chats_last_message_at`(`last_message_at`),
  CONSTRAINT `fk_chats_client`        FOREIGN KEY (`client_id`)        REFERENCES `clients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_chats_assigned_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users`   (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  14. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS `messages` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `chat_id`         INT UNSIGNED     NOT NULL,
  `client_id`       INT UNSIGNED     DEFAULT NULL COMMENT 'NULL when sender is admin/cashier/system',
  `sender_type`     ENUM('client','admin','cashier','system') NOT NULL,
  `sender_user_id`  INT UNSIGNED     DEFAULT NULL COMMENT 'populated when sender_type = admin | cashier',
  `message_type`    ENUM('text','image','pdf','file') NOT NULL DEFAULT 'text',
  `content`         TEXT             DEFAULT NULL,
  `file_url`        VARCHAR(512)     DEFAULT NULL,
  `file_name`       VARCHAR(255)     DEFAULT NULL,
  `file_size`       INT UNSIGNED     DEFAULT NULL COMMENT 'bytes',
  `is_read`         TINYINT(1)       NOT NULL DEFAULT 0,
  `created_at`      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msg_chat`        (`chat_id`),
  KEY `idx_msg_client`      (`client_id`),
  KEY `idx_msg_sender_user` (`sender_user_id`),
  KEY `idx_msg_created_at`  (`created_at`),
  CONSTRAINT `fk_msg_chat`        FOREIGN KEY (`chat_id`)        REFERENCES `chats`   (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_client`      FOREIGN KEY (`client_id`)      REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_msg_sender_user` FOREIGN KEY (`sender_user_id`) REFERENCES `users`   (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  15. MODALS
-- ============================================================
CREATE TABLE IF NOT EXISTS `modals` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(120)  NOT NULL,
  `title`       VARCHAR(255)  DEFAULT NULL,
  `content`     TEXT          DEFAULT NULL  COMMENT 'HTML or markdown body',
  `type`        ENUM('info','promo','alert','form') NOT NULL DEFAULT 'info',
  `trigger`     ENUM('on_login','on_deposit','manual','scheduled') NOT NULL DEFAULT 'manual',
  `config`      JSON          DEFAULT NULL COMMENT 'extra display options (colors, cta, timing…)',
  `is_active`   TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  16. PUSH NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS `push_notifications` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `title`       VARCHAR(255)  NOT NULL,
  `body`        TEXT          NOT NULL,
  `icon_url`    VARCHAR(512)  DEFAULT NULL,
  `action_url`  VARCHAR(512)  DEFAULT NULL,
  `payload`     JSON          DEFAULT NULL COMMENT 'extra data forwarded to the SW',
  `target`      ENUM('all','segment','individual') NOT NULL DEFAULT 'all',
  `sent_by`     INT UNSIGNED  DEFAULT NULL COMMENT 'user who triggered the send',
  `sent_at`     DATETIME      DEFAULT NULL,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pn_sent_by` (`sent_by`),
  CONSTRAINT `fk_pn_sent_by` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  17. PUSH SUBSCRIPTIONS  (Web Push / FCM tokens per client)
-- ============================================================
CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `id`           INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  `client_id`    INT UNSIGNED   NOT NULL,
  `endpoint`     VARCHAR(1024)  NOT NULL  COMMENT 'Web Push endpoint URL',
  `p256dh`       VARCHAR(512)   DEFAULT NULL COMMENT 'client public key',
  `auth`         VARCHAR(256)   DEFAULT NULL COMMENT 'auth secret',
  `device_hint`  VARCHAR(120)   DEFAULT NULL COMMENT 'browser/device label for display',
  `is_active`    TINYINT(1)     NOT NULL DEFAULT 1,
  `subscribed_at`DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ps_client`    (`client_id`),
  KEY `idx_ps_is_active` (`is_active`),
  CONSTRAINT `fk_ps_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  18. NOTIFICATION DELIVERIES  (tracks per-subscription delivery)
-- ============================================================
CREATE TABLE IF NOT EXISTS `notification_deliveries` (
  `id`              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `notification_id` INT UNSIGNED     NOT NULL,
  `subscription_id` INT UNSIGNED     NOT NULL,
  `status`          ENUM('pending','sent','failed','clicked') NOT NULL DEFAULT 'pending',
  `error_message`   VARCHAR(512)     DEFAULT NULL,
  `sent_at`         DATETIME         DEFAULT NULL,
  `clicked_at`      DATETIME         DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nd_notification` (`notification_id`),
  KEY `idx_nd_subscription` (`subscription_id`),
  KEY `idx_nd_status`       (`status`),
  CONSTRAINT `fk_nd_notification` FOREIGN KEY (`notification_id`) REFERENCES `push_notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_nd_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  19. USER PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_permissions` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED  NOT NULL,
  `module`     ENUM(
    'dashboard','clients','chats','modals','push_notifications',
    'commands','bot_builder','settings','reports','users','support'
  ) NOT NULL,
  `can_view`   TINYINT(1)    NOT NULL DEFAULT 0,
  `can_create` TINYINT(1)    NOT NULL DEFAULT 0,
  `can_edit`   TINYINT(1)    NOT NULL DEFAULT 0,
  `can_delete` TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_up_user_module` (`user_id`, `module`),
  CONSTRAINT `fk_up_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  20. USER SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id`                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `user_id`           INT UNSIGNED     NOT NULL,
  `session_token`     VARCHAR(255)     NOT NULL,
  `ip_address`        VARCHAR(45)      DEFAULT NULL COMMENT 'IPv4 or IPv6',
  `browser`           VARCHAR(120)     DEFAULT NULL,
  `browser_version`   VARCHAR(40)      DEFAULT NULL,
  `os`                VARCHAR(80)      DEFAULT NULL,
  `device_type`       ENUM('desktop','mobile','tablet','unknown') NOT NULL DEFAULT 'unknown',
  `is_active`         TINYINT(1)       NOT NULL DEFAULT 1,
  `last_activity_at`  DATETIME         DEFAULT NULL,
  `expires_at`        DATETIME         DEFAULT NULL,
  `created_at`        DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_us_token`         (`session_token`),
  KEY `idx_us_user`         (`user_id`),
  KEY `idx_us_is_active`    (`is_active`),
  KEY `idx_us_expires_at`   (`expires_at`),
  CONSTRAINT `fk_us_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  21. BOT SCREENS
-- ============================================================
CREATE TABLE IF NOT EXISTS `bot_screens` (
  `id`         VARCHAR(60)   NOT NULL  COMMENT 'slug id, e.g. root | screen-cargar',
  `name`       VARCHAR(120)  NOT NULL,
  `is_root`    TINYINT(1)    NOT NULL DEFAULT 0,
  `sort_order` SMALLINT      NOT NULL DEFAULT 0,
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  22. BOT ITEMS  (messages and buttons inside a screen)
-- ============================================================
CREATE TABLE IF NOT EXISTS `bot_items` (
  `id`               VARCHAR(60)   NOT NULL,
  `screen_id`        VARCHAR(60)   NOT NULL,
  `type`             ENUM('message','button') NOT NULL,
  `text`             TEXT          DEFAULT NULL COMMENT 'content for type=message',
  `label`            VARCHAR(255)  DEFAULT NULL COMMENT 'button label for type=button',
  `action_screen_id` VARCHAR(60)   DEFAULT NULL COMMENT 'target screen for type=button',
  `is_back`          TINYINT(1)    NOT NULL DEFAULT 0,
  `sort_order`       SMALLINT      NOT NULL DEFAULT 0,
  `created_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bi_screen` (`screen_id`),
  CONSTRAINT `fk_bi_screen`        FOREIGN KEY (`screen_id`)        REFERENCES `bot_screens` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bi_action_screen` FOREIGN KEY (`action_screen_id`) REFERENCES `bot_screens` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  23. SUPPORT TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `client_id`    INT UNSIGNED  DEFAULT NULL COMMENT 'NULL = submitted anonymously',
  `assigned_to`  INT UNSIGNED  DEFAULT NULL COMMENT 'user handling the ticket',
  `subject`      VARCHAR(255)  NOT NULL,
  `status`       ENUM('open','in_progress','resolved','closed') NOT NULL DEFAULT 'open',
  `priority`     ENUM('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
  `created_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_st_client`      (`client_id`),
  KEY `idx_st_assigned_to` (`assigned_to`),
  KEY `idx_st_status`      (`status`),
  CONSTRAINT `fk_st_client`      FOREIGN KEY (`client_id`)   REFERENCES `clients` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_st_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users`   (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  24. SUPPORT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS `support_messages` (
  `id`          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `ticket_id`   INT UNSIGNED     NOT NULL,
  `sender_type` ENUM('client','user','system') NOT NULL,
  `sender_id`   INT UNSIGNED     DEFAULT NULL COMMENT 'client_id or user_id depending on sender_type',
  `content`     TEXT             NOT NULL,
  `created_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sm_ticket` (`ticket_id`),
  CONSTRAINT `fk_sm_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  25. THEMES
-- ============================================================
CREATE TABLE IF NOT EXISTS `themes` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(120)  NOT NULL,
  `scope`       ENUM('client','admin') NOT NULL,
  `is_custom`   TINYINT(1)    NOT NULL DEFAULT 1 COMMENT '0 = built-in, 1 = user-created',
  `config`      JSON          NOT NULL             COMMENT 'color tokens: bg, surface, primary, text, etc.',
  `created_by`  INT UNSIGNED  DEFAULT NULL,
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_themes_scope`      (`scope`),
  KEY `idx_themes_is_custom`  (`is_custom`),
  CONSTRAINT `fk_themes_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  SELF-REFERENTIAL FK: users.registered_by → users.id
-- ============================================================
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_registered_by`
    FOREIGN KEY (`registered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;


-- ============================================================
--  FULL-TEXT INDEXES  (search)
-- ============================================================
ALTER TABLE `clients`  ADD FULLTEXT INDEX `ft_clients_search`  (`username`, `full_name`, `cuil`);
ALTER TABLE `messages` ADD FULLTEXT INDEX `ft_messages_content`(`content`);


-- ============================================================
--  SEEDS
-- ============================================================

-- Bank providers
INSERT IGNORE INTO `bank_providers` (`slug`, `name`, `is_active`) VALUES
  ('hgcash',       'HGCash',       1),
  ('mercadopago',  'MercadoPago',  1),
  ('telepagos',    'Telepagos',    1),
  ('manual',       'Manual',       1);

-- Amounts defaults (deposit + withdrawal for each currency)
INSERT IGNORE INTO `amounts` (`currency`, `operation`, `min_amount`, `max_amount`) VALUES
  ('USD', 'deposit',    10.00,   50000.00),
  ('USD', 'withdrawal',  5.00,   50000.00),
  ('ARS', 'deposit',  1000.00, 5000000.00),
  ('ARS', 'withdrawal', 500.00, 5000000.00),
  ('MXN', 'deposit',   200.00, 1000000.00),
  ('MXN', 'withdrawal',100.00, 1000000.00),
  ('COP', 'deposit',  5000.00, 50000000.00),
  ('COP', 'withdrawal',2000.00,50000000.00),
  ('CLP', 'deposit',  1000.00, 5000000.00),
  ('CLP', 'withdrawal', 500.00, 5000000.00),
  ('UYU', 'deposit',   300.00,  200000.00),
  ('UYU', 'withdrawal',100.00,  200000.00);

-- Config stub rows (singleton pattern — id = 1)
INSERT IGNORE INTO `config_casino`     (`id`) VALUES (1);
INSERT IGNORE INTO `config_aws`        (`id`) VALUES (1);
INSERT IGNORE INTO `config_openrouter` (`id`) VALUES (1);
INSERT IGNORE INTO `chat_processing_config` (`id`) VALUES (1);

-- Initial bot flow (mirrors INITIAL_FLOW in BotBuilderPage.jsx)
INSERT IGNORE INTO `bot_screens` (`id`, `name`, `is_root`, `sort_order`) VALUES
  ('root',            'Bienvenida',    1, 0),
  ('screen-cargar',   'Cargar Saldo',  0, 1),
  ('screen-retirar',  'Retirar',       0, 2),
  ('screen-soporte',  'Soporte',       0, 3),
  ('screen-cuponera', 'Cuponera',      0, 4);

INSERT IGNORE INTO `bot_items` (`id`, `screen_id`, `type`, `text`, `label`, `action_screen_id`, `is_back`, `sort_order`) VALUES
  ('i1',  'root',           'message', '¡Hola! 👋 Bienvenido/a a BetChat. ¿En qué podemos ayudarte hoy?', NULL, NULL, 0, 0),
  ('i2',  'root',           'button',  NULL, '💰 Cargar',          'screen-cargar',   0, 1),
  ('i3',  'root',           'button',  NULL, '💸 Retirar',         'screen-retirar',  0, 2),
  ('i4',  'root',           'button',  NULL, '🎧 Soporte',         'screen-soporte',  0, 3),
  ('i5',  'root',           'button',  NULL, '🎟️ Cuponera',       'screen-cuponera', 0, 4),
  ('i6',  'screen-cargar',  'message', 'Para cargar saldo, realizá una transferencia y envianos el comprobante. 📎', NULL, NULL, 0, 0),
  ('i7',  'screen-cargar',  'button',  NULL, '⬅️ Volver al inicio', 'root', 1, 1),
  ('i8',  'screen-retirar', 'message', 'Para procesar tu retiro necesitamos:\n• Monto\n• CBU / Alias\n• Titular de la cuenta', NULL, NULL, 0, 0),
  ('i9',  'screen-retirar', 'button',  NULL, '⬅️ Volver al inicio', 'root', 1, 1),
  ('i10', 'screen-soporte', 'message', 'Nuestro equipo de soporte está disponible 24/7. Un agente te atenderá en breve. 🙏', NULL, NULL, 0, 0),
  ('i11', 'screen-soporte', 'button',  NULL, '⬅️ Volver al inicio', 'root', 1, 1),
  ('i12', 'screen-cuponera','message', '¡Tenemos grandes promociones activas! 🎉 Ingresá a tu cuenta para ver los bonos disponibles.', NULL, NULL, 0, 0),
  ('i13', 'screen-cuponera','button',  NULL, '⬅️ Volver al inicio', 'root', 1, 1);


SET FOREIGN_KEY_CHECKS = 1;
