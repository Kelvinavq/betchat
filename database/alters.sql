SET NAMES utf8mb4;

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
