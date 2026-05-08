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
