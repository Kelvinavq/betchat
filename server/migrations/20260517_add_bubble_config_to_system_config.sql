-- Run only if the column doesn't exist (MySQL 5.7 compatible)
ALTER TABLE system_config
  ADD COLUMN bubble_config JSON NULL;
