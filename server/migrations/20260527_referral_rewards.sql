-- Referral reward history and payout tracking
CREATE TABLE IF NOT EXISTS referral_rewards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  referrer_client_id INT UNSIGNED NOT NULL,
  referred_client_id INT UNSIGNED NOT NULL,
  source_table VARCHAR(40) NOT NULL,
  source_movement_id BIGINT UNSIGNED NOT NULL,
  reward_amount INT UNSIGNED NOT NULL DEFAULT 0,
  reward_status ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  source_movement_amount DECIMAL(18,2) DEFAULT NULL,
  source_movement_created_at DATETIME DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  paid_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_referral_source_movement (source_table, source_movement_id),
  KEY idx_referral_referrer (referrer_client_id, created_at),
  KEY idx_referral_referred (referred_client_id, created_at),
  CONSTRAINT fk_referral_referrer FOREIGN KEY (referrer_client_id) REFERENCES clients (id) ON DELETE CASCADE,
  CONSTRAINT fk_referral_referred FOREIGN KEY (referred_client_id) REFERENCES clients (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
