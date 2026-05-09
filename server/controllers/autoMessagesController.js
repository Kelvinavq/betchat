import { query } from '../config/database.js'

const EVENTS = [
  'receipt_received',
  'receipt_duplicate',
  'receipt_invalid',
  'receipt_insufficient_info',
  'deposit_completed',
  'deposit_failed',
  'receipt_reupload',
  'receipt_amount_low',
  'withdrawal_approved',
  'withdrawal_rejected',
]

const DEFAULTS = {
  receipt_received:         'Recibimos tu comprobante. Lo estamos procesando, te avisamos en breve.',
  receipt_duplicate:        'Este comprobante ya fue enviado anteriormente. Por favor sube uno diferente.',
  receipt_invalid:          'No pudimos validar tu comprobante. Asegurate de enviar una imagen clara del comprobante de pago.',
  receipt_insufficient_info:'La imagen del comprobante no tiene suficiente información. Por favor subí una foto más clara y completa.',
  deposit_completed:        '¡Tu depósito fue acreditado con éxito! Ya podés jugar.',
  deposit_failed:           'No pudimos procesar tu depósito. Contactá a soporte para más información.',
  receipt_reupload:         'Necesitamos que vuelvas a enviar el comprobante. Por favor subí una imagen más clara.',
  receipt_amount_low:       'El monto de tu comprobante es inferior al mínimo permitido. Realizá un depósito por el monto mínimo requerido.',
  withdrawal_approved:      '¡Tu retiro fue aprobado y procesado con éxito! En breve recibirás el dinero.',
  withdrawal_rejected:      'Tu solicitud de retiro fue rechazada. Contactá a soporte para más información.',
}

export async function getAutoMessages(req, res, next) {
  try {
    const { rows, error } = await query(
      'SELECT event, message, is_active FROM receipt_auto_messages'
    )
    if (error) throw error

    const stored = {}
    for (const row of rows || []) {
      stored[row.event] = { message: row.message, isActive: Boolean(row.is_active) }
    }

    const messages = EVENTS.map(event => ({
      event,
      message: stored[event]?.message ?? DEFAULTS[event] ?? '',
      isActive: stored[event] ? Boolean(stored[event].isActive) : true,
    }))

    res.json({ messages })
  } catch (error) {
    next(error)
  }
}

export async function updateAutoMessages(req, res, next) {
  try {
    const { messages } = req.body
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'Se esperaba un array de mensajes' })
    }

    const valid = messages.filter(
      m => EVENTS.includes(m?.event) && typeof m?.message === 'string'
    )
    if (!valid.length) {
      return res.status(400).json({ error: 'Sin mensajes válidos para guardar' })
    }

    for (const m of valid) {
      await query(
        `INSERT INTO receipt_auto_messages (event, message, is_active) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_active = VALUES(is_active)`,
        [m.event, m.message.trim(), m.isActive !== false ? 1 : 0]
      )
    }

    res.json({ success: true })
  } catch (error) {
    next(error)
  }
}

/** Obtiene un mensaje activo por evento. Retorna null si no existe o está inactivo. */
export async function getAutoMessage(event) {
  const { rows, error } = await query(
    'SELECT message, is_active FROM receipt_auto_messages WHERE event = ? LIMIT 1',
    [event]
  )
  if (error || !rows?.length) return DEFAULTS[event] ?? null
  if (!rows[0].is_active) return null
  return rows[0].message || DEFAULTS[event] || null
}
