ALTER TABLE `client_sessions`
  ADD COLUMN IF NOT EXISTS `geo_json` JSON DEFAULT NULL AFTER `ip_address`;

ALTER TABLE `user_sessions`
  ADD COLUMN IF NOT EXISTS `geo_json` JSON DEFAULT NULL AFTER `ip_address`;
