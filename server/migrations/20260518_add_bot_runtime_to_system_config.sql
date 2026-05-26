-- Bot runtime configuration for hybrid AI mode
ALTER TABLE system_config
  ADD COLUMN bot_mode VARCHAR(20) NOT NULL DEFAULT 'manual',
  ADD COLUMN bot_ai_model VARCHAR(120) NULL,
  ADD COLUMN bot_ai_temperature DECIMAL(3,2) NOT NULL DEFAULT 0.10,
  ADD COLUMN bot_ai_max_tokens INT NOT NULL DEFAULT 250;
