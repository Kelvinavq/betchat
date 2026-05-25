import { query } from '../config/database.js'

const EVENTS = [
  'receipt_received',
  'receipt_duplicate',
  'receipt_invalid',
  'receipt_insufficient_info',
  'deposit_completed',
  'deposit_completed_report',
  'deposit_failed',
  'receipt_reupload',
  'receipt_amount_low',
  'hgcash_payment_not_found',
  'withdrawal_approved',
  'withdrawal_rejected',
]

const DEFAULTS = {
  receipt_received:         'Recibimos tu comprobante. Lo estamos procesando, te avisamos en breve.',
  receipt_duplicate:        'Este comprobante ya fue enviado anteriormente. Por favor sube uno diferente.',
  receipt_invalid:          'No pudimos validar tu comprobante. Asegurate de enviar una imagen clara del comprobante de pago.',
  receipt_insufficient_info:'La imagen del comprobante no tiene suficiente información. Por favor subí una foto más clara y completa.',
  deposit_completed:        '¡Tu depósito fue acreditado con éxito! Ya podés jugar.',
  deposit_completed_report: '¡Tu pago fue reportado y acreditado con éxito! Ya podés jugar.',
  deposit_failed:           'No pudimos procesar tu depósito. Contactá a soporte para más información.',
  receipt_reupload:         'Necesitamos que vuelvas a enviar el comprobante. Por favor subí una imagen más clara.',
  receipt_amount_low:       'El monto de tu comprobante es inferior al mínimo permitido. Realizá un depósito por el monto mínimo requerido.',
  hgcash_payment_not_found:  'No encontramos ningún pago pendiente con tu CUIL. Por favor subí el comprobante para que podamos validarlo.',
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

// ============================================================
//  Placeholder resolution
// ============================================================

const PLACEHOLDER_RE = /\{\{(\w+)\}\}/g

/**
 * Replaces {{variable}} tokens in a template string.
 * context: { clientId?, bankAccountId?, amount? }
 */
export async function resolveMessage(template, context = {}) {
  if (!template || !template.includes('{{')) return template

  const needed = new Set([...template.matchAll(PLACEHOLDER_RE)].map(m => m[1]))
  const vars   = {}

  if (context.amount != null && needed.has('amount')) {
    vars.amount = `$${new Intl.NumberFormat('es-AR').format(Number(context.amount))}`
  }

  if ((needed.has('username') || needed.has('password')) && context.clientId) {
    const { rows } = await query(
      'SELECT username, password FROM clients WHERE id = ? LIMIT 1',
      [context.clientId]
    )
    if (rows?.[0]) {
      vars.username = rows[0].username || ''
      vars.password = rows[0].password || ''
    }
  }

  if (needed.has('cbu') || needed.has('alias') || needed.has('titular')) {
    let baRow = null
    if (context.bankAccountId) {
      const { rows } = await query(
        'SELECT account_data FROM bank_accounts WHERE id = ? LIMIT 1',
        [context.bankAccountId]
      )
      baRow = rows?.[0]
    }
    if (!baRow) {
      const { rows } = await query(
        `SELECT ba.account_data
         FROM chat_processing_config cpc
         INNER JOIN bank_accounts ba ON ba.id = cpc.bank_account_id
         WHERE cpc.id = 1 LIMIT 1`
      )
      baRow = rows?.[0]
    }
    if (baRow) {
      const d = typeof baRow.account_data === 'object'
        ? baRow.account_data
        : JSON.parse(baRow.account_data || '{}')
      vars.cbu     = d.cbu            || ''
      vars.alias   = d.alias          || ''
      vars.titular = d.nombre_titular || ''
    }
  }

  return template.replace(PLACEHOLDER_RE, (_, key) => vars[key] ?? `{{${key}}}`)
}

/** Obtiene un mensaje activo por evento, resolviendo placeholders. Retorna null si inactivo. */
export async function getAutoMessage(event, context = {}) {
  const { rows, error } = await query(
    'SELECT message, is_active FROM receipt_auto_messages WHERE event = ? LIMIT 1',
    [event]
  )
  if (error || !rows?.length) {
    const tpl = DEFAULTS[event] ?? null
    return tpl ? resolveMessage(tpl, context) : null
  }
  if (!rows[0].is_active) return null
  const tpl = rows[0].message || DEFAULTS[event] || null
  return tpl ? resolveMessage(tpl, context) : null
}
