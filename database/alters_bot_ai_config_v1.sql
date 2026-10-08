-- Adds configurable hybrid AI runtime settings to system_config
-- Safe to run multiple times on existing installs.

ALTER TABLE `system_config`
  ADD COLUMN `bot_ai_config` JSON DEFAULT NULL AFTER `bot_ai_max_tokens`;

UPDATE `system_config`
SET `bot_ai_config` = JSON_OBJECT(
  'instructions', 'Eres el router inteligente del chat de soporte. Tu tarea es entender lo que quiere el cliente y elegir la mejor accion disponible dentro del bot manual existente. No inventes cuentas, montos, reglas ni respuestas que no esten en el sistema.',
  'faqEnabled', TRUE,
  'operationalHandoffEnabled', TRUE,
  'showFaqFallback', TRUE,
  'faqMatchThreshold', 0.55,
  'rules', JSON_ARRAY(
    JSON_OBJECT(
      'id', 'withdrawal_issue',
      'label', 'No me deja retirar',
      'enabled', TRUE,
      'action', 'handoff',
      'reply', 'Te derivo con soporte para revisar tu retiro.',
      'keywords', JSON_ARRAY('no me deja retirar', 'no puedo retirar', 'fallo al retirar', 'retiro rechazado', 'retiro pendiente', 'retiro trabado', 'problema con el retiro')
    ),
    JSON_OBJECT(
      'id', 'receipt_issue',
      'label', 'Subi mal el comprobante',
      'enabled', TRUE,
      'action', 'handoff',
      'reply', 'Te derivo con soporte para revisar el comprobante.',
      'keywords', JSON_ARRAY('subi mal el comprobante', 'subi mal comprobante', 'comprobante mal', 'me equivoque de comprobante', 'subi el comprobante equivocado', 'error en el comprobante', 'no se ve el comprobante')
    ),
    JSON_OBJECT(
      'id', 'wrong_amount',
      'label', 'Me equivoque de monto',
      'enabled', TRUE,
      'action', 'handoff',
      'reply', 'Te derivo con soporte para revisar el monto cargado.',
      'keywords', JSON_ARRAY('me equivoque de monto', 'mande mal el monto', 'cargue mal el monto', 'importe incorrecto', 'monto incorrecto', 'error de monto', 'puse mal el monto')
    ),
    JSON_OBJECT(
      'id', 'generic_support',
      'label', 'Reclamo o error de cuenta',
      'enabled', TRUE,
      'action', 'handoff',
      'reply', 'Te derivo con soporte para revisar tu caso.',
      'keywords', JSON_ARRAY('reclamo', 'queja', 'error', 'problema de cuenta', 'cuenta bloqueada', 'usuario bloqueado', 'no me funciona', 'no funciona', 'no me deja entrar', 'acceso', 'login fallando', 'cbu incorrecto', 'alias incorrecto')
    )
  )
)
WHERE `id` = 1 AND `bot_ai_config` IS NULL;
