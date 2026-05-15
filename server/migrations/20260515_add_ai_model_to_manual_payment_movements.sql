ALTER TABLE manual_payment_movements
  ADD COLUMN ai_model VARCHAR(120) NULL AFTER ai_status;

