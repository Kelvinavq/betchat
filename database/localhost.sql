-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: May 06, 2026 at 11:35 AM
-- Server version: 8.4.3
-- PHP Version: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `betchat`
--
CREATE DATABASE IF NOT EXISTS `betchat` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `betchat`;

-- --------------------------------------------------------

--
-- Table structure for table `amounts`
--

CREATE TABLE `amounts` (
  `id` int UNSIGNED NOT NULL,
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'USD ARS MXN COP CLP UYU',
  `operation` enum('deposit','withdrawal') COLLATE utf8mb4_unicode_ci NOT NULL,
  `min_amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `max_amount` decimal(18,2) DEFAULT NULL COMMENT 'NULL = no limit',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `amounts`
--

INSERT INTO `amounts` (`id`, `currency`, `operation`, `min_amount`, `max_amount`, `is_active`, `updated_at`) VALUES
(1, 'USD', 'deposit', 10.00, 50000.00, 1, '2026-05-06 00:39:43'),
(2, 'USD', 'withdrawal', 5.00, 50000.00, 1, '2026-05-06 00:39:43'),
(3, 'ARS', 'deposit', 1000.00, 5000000.00, 1, '2026-05-06 00:39:43'),
(4, 'ARS', 'withdrawal', 500.00, 5000000.00, 1, '2026-05-06 00:39:43'),
(5, 'MXN', 'deposit', 200.00, 1000000.00, 1, '2026-05-06 00:39:43'),
(6, 'MXN', 'withdrawal', 100.00, 1000000.00, 1, '2026-05-06 00:39:43'),
(7, 'COP', 'deposit', 5000.00, 50000000.00, 1, '2026-05-06 00:39:43'),
(8, 'COP', 'withdrawal', 2000.00, 50000000.00, 1, '2026-05-06 00:39:43'),
(9, 'CLP', 'deposit', 1000.00, 5000000.00, 1, '2026-05-06 00:39:43'),
(10, 'CLP', 'withdrawal', 500.00, 5000000.00, 1, '2026-05-06 00:39:43'),
(11, 'UYU', 'deposit', 300.00, 200000.00, 1, '2026-05-06 00:39:43'),
(12, 'UYU', 'withdrawal', 100.00, 200000.00, 1, '2026-05-06 00:39:43');

-- --------------------------------------------------------

--
-- Table structure for table `bank_accounts`
--

CREATE TABLE `bank_accounts` (
  `id` int UNSIGNED NOT NULL,
  `provider_id` int UNSIGNED NOT NULL,
  `alias` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'friendly label for this account',
  `account_data` json NOT NULL COMMENT 'flexible: CBU, CVU, wallet ID, etc.',
  `currency` char(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ARS',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `bank_providers`
--

CREATE TABLE `bank_providers` (
  `id` int UNSIGNED NOT NULL,
  `slug` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'machine-readable key e.g. hgcash',
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'display name',
  `logo_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bank_providers`
--

INSERT INTO `bank_providers` (`id`, `slug`, `name`, `logo_url`, `is_active`) VALUES
(1, 'hgcash', 'HGCash', NULL, 1),
(2, 'mercadopago', 'MercadoPago', NULL, 1),
(3, 'telepagos', 'Telepagos', NULL, 1),
(4, 'manual', 'Manual', NULL, 1);

-- --------------------------------------------------------

--
-- Table structure for table `bot_items`
--

CREATE TABLE `bot_items` (
  `id` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `screen_id` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('message','button') COLLATE utf8mb4_unicode_ci NOT NULL,
  `text` text COLLATE utf8mb4_unicode_ci COMMENT 'content for type=message',
  `label` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'button label for type=button',
  `action_screen_id` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'target screen for type=button',
  `is_back` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` smallint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bot_items`
--

INSERT INTO `bot_items` (`id`, `screen_id`, `type`, `text`, `label`, `action_screen_id`, `is_back`, `sort_order`, `created_at`, `updated_at`) VALUES
('i1', 'root', 'message', '¡Hola! 👋 Bienvenido/a a BetChat. ¿En qué podemos ayudarte hoy?', NULL, NULL, 0, 0, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i10', 'screen-soporte', 'message', 'Nuestro equipo de soporte está disponible 24/7. Un agente te atenderá en breve. 🙏', NULL, NULL, 0, 0, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i11', 'screen-soporte', 'button', NULL, '⬅️ Volver al inicio', 'root', 1, 1, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i12', 'screen-cuponera', 'message', '¡Tenemos grandes promociones activas! 🎉 Ingresá a tu cuenta para ver los bonos disponibles.', NULL, NULL, 0, 0, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i13', 'screen-cuponera', 'button', NULL, '⬅️ Volver al inicio', 'root', 1, 1, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i2', 'root', 'button', NULL, '💰 Cargar', 'screen-cargar', 0, 1, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i3', 'root', 'button', NULL, '💸 Retirar', 'screen-retirar', 0, 2, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i4', 'root', 'button', NULL, '🎧 Soporte', 'screen-soporte', 0, 3, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i5', 'root', 'button', NULL, '🎟️ Cuponera', 'screen-cuponera', 0, 4, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i6', 'screen-cargar', 'message', 'Para cargar saldo, realizá una transferencia y envianos el comprobante. 📎', NULL, NULL, 0, 0, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i7', 'screen-cargar', 'button', NULL, '⬅️ Volver al inicio', 'root', 1, 1, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i8', 'screen-retirar', 'message', 'Para procesar tu retiro necesitamos:\n• Monto\n• CBU / Alias\n• Titular de la cuenta', NULL, NULL, 0, 0, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('i9', 'screen-retirar', 'button', NULL, '⬅️ Volver al inicio', 'root', 1, 1, '2026-05-06 00:39:43', '2026-05-06 00:39:43');

-- --------------------------------------------------------

--
-- Table structure for table `bot_screens`
--

CREATE TABLE `bot_screens` (
  `id` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'slug id, e.g. root | screen-cargar',
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_root` tinyint(1) NOT NULL DEFAULT '0',
  `sort_order` smallint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bot_screens`
--

INSERT INTO `bot_screens` (`id`, `name`, `is_root`, `sort_order`, `created_at`, `updated_at`) VALUES
('root', 'Bienvenida', 1, 0, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('screen-cargar', 'Cargar Saldo', 0, 1, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('screen-cuponera', 'Cuponera', 0, 4, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('screen-retirar', 'Retirar', 0, 2, '2026-05-06 00:39:43', '2026-05-06 00:39:43'),
('screen-soporte', 'Soporte', 0, 3, '2026-05-06 00:39:43', '2026-05-06 00:39:43');

-- --------------------------------------------------------

--
-- Table structure for table `chats`
--

CREATE TABLE `chats` (
  `id` int UNSIGNED NOT NULL,
  `client_id` int UNSIGNED NOT NULL,
  `assigned_user_id` int UNSIGNED DEFAULT NULL COMMENT 'cashier or admin attending this chat',
  `is_open` tinyint(1) NOT NULL DEFAULT '1',
  `is_archived` tinyint(1) NOT NULL DEFAULT '0',
  `unread_count` int UNSIGNED NOT NULL DEFAULT '0',
  `last_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'denormalized for list rendering',
  `last_message_type` enum('text','image','pdf','file','system') COLLATE utf8mb4_unicode_ci DEFAULT 'text',
  `last_message_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chat_processing_config`
--

CREATE TABLE `chat_processing_config` (
  `id` int UNSIGNED NOT NULL DEFAULT '1',
  `bank_account_id` int UNSIGNED DEFAULT NULL COMMENT 'active account for incoming deposits',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `chat_processing_config`
--

INSERT INTO `chat_processing_config` (`id`, `bank_account_id`, `updated_at`) VALUES
(1, NULL, '2026-05-06 00:39:43');

-- --------------------------------------------------------

--
-- Table structure for table `clients`
--

CREATE TABLE `clients` (
  `id` int UNSIGNED NOT NULL,
  `username` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text COLLATE utf8mb4_unicode_ci,
  `cuil` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'tax ID / document number',
  `external_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID on the casino platform',
  `is_new` tinyint(1) NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_online` tinyint(1) NOT NULL DEFAULT '0',
  `last_seen_at` datetime DEFAULT NULL,
  `registered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `client_labels`
--

CREATE TABLE `client_labels` (
  `client_id` int UNSIGNED NOT NULL,
  `label_id` int UNSIGNED NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `commands`
--

CREATE TABLE `commands` (
  `id` int UNSIGNED NOT NULL,
  `trigger` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'keyword or phrase that fires the command',
  `response` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `match_type` enum('exact','contains','starts_with') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'contains',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `config_aws`
--

CREATE TABLE `config_aws` (
  `id` int UNSIGNED NOT NULL DEFAULT '1',
  `access_key_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secret_access_key` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `region` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT 'us-east-1',
  `s3_bucket` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sns_topic_arn` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `config_aws`
--

INSERT INTO `config_aws` (`id`, `access_key_id`, `secret_access_key`, `region`, `s3_bucket`, `sns_topic_arn`, `extra`, `updated_at`) VALUES
(1, NULL, NULL, 'us-east-1', NULL, NULL, NULL, '2026-05-06 00:39:43');

-- --------------------------------------------------------

--
-- Table structure for table `config_casino`
--

CREATE TABLE `config_casino` (
  `id` int UNSIGNED NOT NULL DEFAULT '1',
  `api_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `api_key` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `api_secret` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `extra` json DEFAULT NULL COMMENT 'additional platform-specific settings',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `config_casino`
--

INSERT INTO `config_casino` (`id`, `api_url`, `api_key`, `api_secret`, `extra`, `updated_at`) VALUES
(1, NULL, NULL, NULL, NULL, '2026-05-06 00:39:43');

-- --------------------------------------------------------

--
-- Table structure for table `config_openrouter`
--

CREATE TABLE `config_openrouter` (
  `id` int UNSIGNED NOT NULL DEFAULT '1',
  `api_key` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `model` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT 'openai/gpt-4o-mini',
  `temperature` decimal(3,2) DEFAULT '0.70',
  `max_tokens` int UNSIGNED DEFAULT '1024',
  `system_prompt` text COLLATE utf8mb4_unicode_ci,
  `extra` json DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ;

--
-- Dumping data for table `config_openrouter`
--

INSERT INTO `config_openrouter` (`id`, `api_key`, `model`, `temperature`, `max_tokens`, `system_prompt`, `extra`, `updated_at`) VALUES
(1, NULL, 'openai/gpt-4o-mini', 0.70, 1024, NULL, NULL, '2026-05-06 00:39:43');

-- --------------------------------------------------------

--
-- Table structure for table `labels`
--

CREATE TABLE `labels` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `color` char(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#2563eb' COMMENT 'hex color e.g. #ff5733',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` bigint UNSIGNED NOT NULL,
  `chat_id` int UNSIGNED NOT NULL,
  `client_id` int UNSIGNED DEFAULT NULL COMMENT 'NULL when sender is admin/cashier/system',
  `sender_type` enum('client','admin','cashier','system') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_user_id` int UNSIGNED DEFAULT NULL COMMENT 'populated when sender_type = admin | cashier',
  `message_type` enum('text','image','pdf','file') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'text',
  `content` text COLLATE utf8mb4_unicode_ci,
  `file_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int UNSIGNED DEFAULT NULL COMMENT 'bytes',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `modals`
--

CREATE TABLE `modals` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci COMMENT 'HTML or markdown body',
  `type` enum('info','promo','alert','form') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `trigger` enum('on_login','on_deposit','manual','scheduled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `config` json DEFAULT NULL COMMENT 'extra display options (colors, cta, timing…)',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_deliveries`
--

CREATE TABLE `notification_deliveries` (
  `id` bigint UNSIGNED NOT NULL,
  `notification_id` int UNSIGNED NOT NULL,
  `subscription_id` int UNSIGNED NOT NULL,
  `status` enum('pending','sent','failed','clicked') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `error_message` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `clicked_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `push_notifications`
--

CREATE TABLE `push_notifications` (
  `id` int UNSIGNED NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload` json DEFAULT NULL COMMENT 'extra data forwarded to the SW',
  `target` enum('all','segment','individual') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `sent_by` int UNSIGNED DEFAULT NULL COMMENT 'user who triggered the send',
  `sent_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `push_subscriptions`
--

CREATE TABLE `push_subscriptions` (
  `id` int UNSIGNED NOT NULL,
  `client_id` int UNSIGNED NOT NULL,
  `endpoint` varchar(1024) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Web Push endpoint URL',
  `p256dh` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'client public key',
  `auth` varchar(256) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'auth secret',
  `device_hint` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'browser/device label for display',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `subscribed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_messages`
--

CREATE TABLE `support_messages` (
  `id` bigint UNSIGNED NOT NULL,
  `ticket_id` int UNSIGNED NOT NULL,
  `sender_type` enum('client','user','system') COLLATE utf8mb4_unicode_ci NOT NULL,
  `sender_id` int UNSIGNED DEFAULT NULL COMMENT 'client_id or user_id depending on sender_type',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `support_tickets`
--

CREATE TABLE `support_tickets` (
  `id` int UNSIGNED NOT NULL,
  `client_id` int UNSIGNED DEFAULT NULL COMMENT 'NULL = submitted anonymously',
  `assigned_to` int UNSIGNED DEFAULT NULL COMMENT 'user handling the ticket',
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('open','in_progress','resolved','closed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'open',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medium',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `themes`
--

CREATE TABLE `themes` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scope` enum('client','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_custom` tinyint(1) NOT NULL DEFAULT '1' COMMENT '0 = built-in, 1 = user-created',
  `config` json NOT NULL COMMENT 'color tokens: bg, surface, primary, text, etc.',
  `created_by` int UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int UNSIGNED NOT NULL,
  `username` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(180) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','cashier') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cashier',
  `avatar_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `registered_by` int UNSIGNED DEFAULT NULL COMMENT 'admin who created this user',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `full_name`, `email`, `password_hash`, `role`, `avatar_url`, `is_active`, `registered_by`, `last_login_at`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'Administrador Principal', 'admin@betchat.local', '$2a$12$sP.FWJ2t8gunnBxvDHfm2OPKEKqXsE/iQURM2HmNeo0NMekfT5drq', 'admin', NULL, 1, NULL, '2026-05-06 00:44:44', '2026-05-05 23:32:08', '2026-05-06 00:44:44');

-- --------------------------------------------------------

--
-- Table structure for table `user_permissions`
--

CREATE TABLE `user_permissions` (
  `id` int UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `module` enum('dashboard','clients','chats','modals','push_notifications','commands','bot_builder','settings','reports','users','support') COLLATE utf8mb4_unicode_ci NOT NULL,
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_create` tinyint(1) NOT NULL DEFAULT '0',
  `can_edit` tinyint(1) NOT NULL DEFAULT '0',
  `can_delete` tinyint(1) NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` int UNSIGNED NOT NULL,
  `session_token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IPv4 or IPv6',
  `browser` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `browser_version` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `os` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_type` enum('desktop','mobile','tablet','unknown') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unknown',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_activity_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `amounts`
--
ALTER TABLE `amounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_amounts_currency_op` (`currency`,`operation`);

--
-- Indexes for table `bank_accounts`
--
ALTER TABLE `bank_accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ba_provider` (`provider_id`),
  ADD KEY `idx_ba_is_active` (`is_active`);

--
-- Indexes for table `bank_providers`
--
ALTER TABLE `bank_providers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_bank_providers_slug` (`slug`);

--
-- Indexes for table `bot_items`
--
ALTER TABLE `bot_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_bi_screen` (`screen_id`),
  ADD KEY `fk_bi_action_screen` (`action_screen_id`);

--
-- Indexes for table `bot_screens`
--
ALTER TABLE `bot_screens`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `chats`
--
ALTER TABLE `chats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_chats_client` (`client_id`),
  ADD KEY `idx_chats_assigned_user` (`assigned_user_id`),
  ADD KEY `idx_chats_is_open` (`is_open`),
  ADD KEY `idx_chats_is_archived` (`is_archived`),
  ADD KEY `idx_chats_last_message_at` (`last_message_at`);

--
-- Indexes for table `chat_processing_config`
--
ALTER TABLE `chat_processing_config`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cpc_bank_account` (`bank_account_id`);

--
-- Indexes for table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_clients_username` (`username`),
  ADD UNIQUE KEY `uq_clients_external_id` (`external_id`),
  ADD KEY `idx_clients_is_active` (`is_active`),
  ADD KEY `idx_clients_is_online` (`is_online`);
ALTER TABLE `clients` ADD FULLTEXT KEY `ft_clients_search` (`username`,`full_name`,`cuil`);

--
-- Indexes for table `client_labels`
--
ALTER TABLE `client_labels`
  ADD PRIMARY KEY (`client_id`,`label_id`),
  ADD KEY `idx_cl_label` (`label_id`);

--
-- Indexes for table `commands`
--
ALTER TABLE `commands`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_commands_trigger` (`trigger`),
  ADD KEY `idx_commands_is_active` (`is_active`);

--
-- Indexes for table `config_aws`
--
ALTER TABLE `config_aws`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `config_casino`
--
ALTER TABLE `config_casino`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `config_openrouter`
--
ALTER TABLE `config_openrouter`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `labels`
--
ALTER TABLE `labels`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_labels_name` (`name`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_msg_chat` (`chat_id`),
  ADD KEY `idx_msg_client` (`client_id`),
  ADD KEY `idx_msg_sender_user` (`sender_user_id`),
  ADD KEY `idx_msg_created_at` (`created_at`);
ALTER TABLE `messages` ADD FULLTEXT KEY `ft_messages_content` (`content`);

--
-- Indexes for table `modals`
--
ALTER TABLE `modals`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notification_deliveries`
--
ALTER TABLE `notification_deliveries`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_nd_notification` (`notification_id`),
  ADD KEY `idx_nd_subscription` (`subscription_id`),
  ADD KEY `idx_nd_status` (`status`);

--
-- Indexes for table `push_notifications`
--
ALTER TABLE `push_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pn_sent_by` (`sent_by`);

--
-- Indexes for table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_ps_client` (`client_id`),
  ADD KEY `idx_ps_is_active` (`is_active`);

--
-- Indexes for table `support_messages`
--
ALTER TABLE `support_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sm_ticket` (`ticket_id`);

--
-- Indexes for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_st_client` (`client_id`),
  ADD KEY `idx_st_assigned_to` (`assigned_to`),
  ADD KEY `idx_st_status` (`status`);

--
-- Indexes for table `themes`
--
ALTER TABLE `themes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_themes_scope` (`scope`),
  ADD KEY `idx_themes_is_custom` (`is_custom`),
  ADD KEY `fk_themes_created_by` (`created_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_username` (`username`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD KEY `fk_users_registered_by` (`registered_by`);

--
-- Indexes for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_up_user_module` (`user_id`,`module`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_us_token` (`session_token`),
  ADD KEY `idx_us_user` (`user_id`),
  ADD KEY `idx_us_is_active` (`is_active`),
  ADD KEY `idx_us_expires_at` (`expires_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `amounts`
--
ALTER TABLE `amounts`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `bank_accounts`
--
ALTER TABLE `bank_accounts`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bank_providers`
--
ALTER TABLE `bank_providers`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `chats`
--
ALTER TABLE `chats`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `commands`
--
ALTER TABLE `commands`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `labels`
--
ALTER TABLE `labels`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `modals`
--
ALTER TABLE `modals`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_deliveries`
--
ALTER TABLE `notification_deliveries`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `push_notifications`
--
ALTER TABLE `push_notifications`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_messages`
--
ALTER TABLE `support_messages`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `support_tickets`
--
ALTER TABLE `support_tickets`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `themes`
--
ALTER TABLE `themes`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `user_permissions`
--
ALTER TABLE `user_permissions`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user_sessions`
--
ALTER TABLE `user_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bank_accounts`
--
ALTER TABLE `bank_accounts`
  ADD CONSTRAINT `fk_ba_provider` FOREIGN KEY (`provider_id`) REFERENCES `bank_providers` (`id`) ON DELETE RESTRICT;

--
-- Constraints for table `bot_items`
--
ALTER TABLE `bot_items`
  ADD CONSTRAINT `fk_bi_action_screen` FOREIGN KEY (`action_screen_id`) REFERENCES `bot_screens` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_bi_screen` FOREIGN KEY (`screen_id`) REFERENCES `bot_screens` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chats`
--
ALTER TABLE `chats`
  ADD CONSTRAINT `fk_chats_assigned_user` FOREIGN KEY (`assigned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_chats_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `chat_processing_config`
--
ALTER TABLE `chat_processing_config`
  ADD CONSTRAINT `fk_cpc_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `client_labels`
--
ALTER TABLE `client_labels`
  ADD CONSTRAINT `fk_cl_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_cl_label` FOREIGN KEY (`label_id`) REFERENCES `labels` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `fk_msg_chat` FOREIGN KEY (`chat_id`) REFERENCES `chats` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_msg_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_msg_sender_user` FOREIGN KEY (`sender_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notification_deliveries`
--
ALTER TABLE `notification_deliveries`
  ADD CONSTRAINT `fk_nd_notification` FOREIGN KEY (`notification_id`) REFERENCES `push_notifications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_nd_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `push_subscriptions` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `push_notifications`
--
ALTER TABLE `push_notifications`
  ADD CONSTRAINT `fk_pn_sent_by` FOREIGN KEY (`sent_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `push_subscriptions`
--
ALTER TABLE `push_subscriptions`
  ADD CONSTRAINT `fk_ps_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `support_messages`
--
ALTER TABLE `support_messages`
  ADD CONSTRAINT `fk_sm_ticket` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `support_tickets`
--
ALTER TABLE `support_tickets`
  ADD CONSTRAINT `fk_st_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_st_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `themes`
--
ALTER TABLE `themes`
  ADD CONSTRAINT `fk_themes_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_registered_by` FOREIGN KEY (`registered_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_permissions`
--
ALTER TABLE `user_permissions`
  ADD CONSTRAINT `fk_up_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `fk_us_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
