ALTER TABLE system_config
  ADD COLUMN integration_mode ENUM('iframe','script') NOT NULL DEFAULT 'iframe' AFTER logo_url;
