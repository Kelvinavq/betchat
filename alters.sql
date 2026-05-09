-- ============================================================
--  Mensajes automáticos para comprobantes y movimientos
-- ============================================================
CREATE TABLE IF NOT EXISTS `receipt_auto_messages` (
  `event`      VARCHAR(40)  NOT NULL,
  `message`    TEXT         NOT NULL,
  `is_active`  TINYINT(1)   NOT NULL DEFAULT 1,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `receipt_auto_messages` (`event`, `message`, `is_active`) VALUES
  ('receipt_received',        'Recibimos tu comprobante. Lo estamos procesando, te avisamos en breve.',            1),
  ('receipt_duplicate',       'Este comprobante ya fue enviado anteriormente. Por favor sube uno diferente.',      1),
  ('receipt_invalid',         'No pudimos validar tu comprobante. Asegurate de enviar una imagen clara del comprobante de pago.',  1),
  ('receipt_insufficient_info','La imagen del comprobante no tiene suficiente información. Por favor subí una foto más clara y completa.', 1),
  ('deposit_completed',       '¡Tu depósito fue acreditado con éxito! Ya podés jugar.',                           1),
  ('deposit_failed',          'No pudimos procesar tu depósito. Contactá a soporte para más información.',        1),
  ('receipt_reupload',        'Necesitamos que vuelvas a enviar el comprobante. Por favor subí una imagen más clara.',            1),
  ('receipt_amount_low',      'El monto de tu comprobante es inferior al mínimo permitido. Realizá un depósito por el monto mínimo requerido.', 1)
ON DUPLICATE KEY UPDATE `event` = `event`;
