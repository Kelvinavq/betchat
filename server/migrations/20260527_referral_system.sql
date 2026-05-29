-- Referral system: track who referred whom and reward config
ALTER TABLE clients
  ADD COLUMN referred_by      VARCHAR(20) NULL DEFAULT NULL COMMENT 'referral_code of the user who referred this client',
  ADD COLUMN referral_reward_paid TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 once the first-deposit referral reward has been processed';

-- Referral settings live in system_config (singleton row id=1)
ALTER TABLE system_config
  ADD COLUMN referral_enabled TINYINT(1)   NOT NULL DEFAULT 1,
  ADD COLUMN referral_fichas  INT UNSIGNED NOT NULL DEFAULT 0;
