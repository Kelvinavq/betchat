-- Notification sounds: per-user custom alert tones
CREATE TABLE IF NOT EXISTS notification_sounds (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120)  NOT NULL,
  file_url     VARCHAR(512)  NOT NULL,
  file_size    INT UNSIGNED  NOT NULL DEFAULT 0,
  duration     DECIMAL(4,2)  NOT NULL DEFAULT 0.00,
  created_by   INT UNSIGNED  NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ns_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-user sound preference (sound_id + enabled flag)
ALTER TABLE users
  ADD COLUMN notification_sound_id      INT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN notification_sound_enabled TINYINT(1)   NOT NULL DEFAULT 1;
