SET NAMES utf8mb4;

ALTER TABLE `chats`
  ADD COLUMN `bot_screen_id` VARCHAR(80) DEFAULT NULL COMMENT 'current bot screen for the client' AFTER `last_message_at`,
  ADD COLUMN `bot_last_button_id` VARCHAR(80) DEFAULT NULL COMMENT 'last selected bot option' AFTER `bot_screen_id`;

ALTER TABLE `messages`
  ADD COLUMN `delivered_at` DATETIME DEFAULT NULL COMMENT 'when recipient received the message' AFTER `is_read`,
  ADD COLUMN `read_at` DATETIME DEFAULT NULL COMMENT 'when recipient viewed the message' AFTER `delivered_at`;
