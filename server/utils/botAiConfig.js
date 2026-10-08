const DEFAULT_INSTRUCTIONS = `Eres el router inteligente del chat de soporte.
Tu tarea es entender lo que quiere el cliente y elegir la mejor acción disponible dentro del bot manual existente.
No inventes cuentas, montos, reglas ni respuestas que no estén en el sistema.`

const DEFAULT_RULES = [
  {
    id: 'withdrawal_issue',
    label: 'No me deja retirar',
    enabled: true,
    action: 'handoff',
    reply: 'Te derivo con soporte para revisar tu retiro.',
    keywords: ['no me deja retirar', 'no puedo retirar', 'fallo al retirar', 'retiro rechazado', 'retiro pendiente', 'retiro trabado', 'problema con el retiro'],
  },
  {
    id: 'receipt_issue',
    label: 'Subí mal el comprobante',
    enabled: true,
    action: 'handoff',
    reply: 'Te derivo con soporte para revisar el comprobante.',
    keywords: ['subi mal el comprobante', 'subi mal comprobante', 'comprobante mal', 'me equivoque de comprobante', 'subi el comprobante equivocado', 'error en el comprobante', 'no se ve el comprobante'],
  },
  {
    id: 'wrong_amount',
    label: 'Me equivoqué de monto',
    enabled: true,
    action: 'handoff',
    reply: 'Te derivo con soporte para revisar el monto cargado.',
    keywords: ['me equivoque de monto', 'mande mal el monto', 'cargue mal el monto', 'importe incorrecto', 'monto incorrecto', 'error de monto', 'puse mal el monto'],
  },
  {
    id: 'generic_support',
    label: 'Reclamo o error de cuenta',
    enabled: true,
    action: 'handoff',
    reply: 'Te derivo con soporte para revisar tu caso.',
    keywords: ['reclamo', 'queja', 'error', 'problema de cuenta', 'cuenta bloqueada', 'usuario bloqueado', 'no me funciona', 'no funciona', 'no me deja entrar', 'acceso', 'login fallando', 'cbu incorrecto', 'alias incorrecto'],
  },
]

const VALID_ACTIONS = new Set(['select_button', 'show_buttons', 'ask_clarification', 'handoff', 'none'])

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeKeywords(value) {
  if (Array.isArray(value)) {
    return value.map(keyword => normalizeText(keyword).toLowerCase()).filter(Boolean).slice(0, 20)
  }
  return normalizeText(value)
    .split(/\n|,|;/)
    .map(keyword => normalizeText(keyword).toLowerCase())
    .filter(Boolean)
    .slice(0, 20)
}

function normalizeRule(rule = {}, index = 0) {
  const action = VALID_ACTIONS.has(normalizeText(rule.action).toLowerCase()) ? normalizeText(rule.action).toLowerCase() : 'handoff'
  return {
    id: normalizeText(rule.id || `rule_${index + 1}`).replace(/[^a-z0-9_-]/gi, '_').slice(0, 60) || `rule_${index + 1}`,
    label: normalizeText(rule.label || `Regla ${index + 1}`).slice(0, 80),
    enabled: rule.enabled !== false,
    action,
    reply: normalizeText(rule.reply || '').slice(0, 220),
    keywords: normalizeKeywords(rule.keywords || rule.patterns || rule.terms || []).slice(0, 20),
  }
}

export function getDefaultBotAiConfig() {
  return {
    instructions: DEFAULT_INSTRUCTIONS,
    faqEnabled: true,
    operationalHandoffEnabled: true,
    showFaqFallback: true,
    faqMatchThreshold: 0.55,
    rules: DEFAULT_RULES.map((rule, index) => normalizeRule(rule, index)),
  }
}

export function normalizeBotAiConfig(raw = {}) {
  const source = typeof raw === 'string'
    ? (() => { try { return JSON.parse(raw) } catch { return {} } })()
    : (raw && typeof raw === 'object' ? raw : {})

  const defaults = getDefaultBotAiConfig()
  const rulesSource = Array.isArray(source.rules) ? source.rules : Array.isArray(source.intentRules) ? source.intentRules : []
  const rules = (rulesSource.length > 0 ? rulesSource : defaults.rules).map((rule, index) => normalizeRule(rule, index)).filter(rule => rule.label)

  const faqThreshold = Number(source.faqMatchThreshold ?? source.faq_threshold)
  return {
    instructions: normalizeText(source.instructions || source.systemInstructions || defaults.instructions).slice(0, 4000),
    faqEnabled: source.faqEnabled !== false && source.faq_enabled !== false,
    operationalHandoffEnabled: source.operationalHandoffEnabled !== false && source.operational_handoff_enabled !== false,
    showFaqFallback: source.showFaqFallback !== false && source.show_faq_fallback !== false,
    faqMatchThreshold: Number.isFinite(faqThreshold) ? Math.max(0.2, Math.min(1, faqThreshold)) : defaults.faqMatchThreshold,
    rules,
  }
}

export function serializeBotAiConfig(value) {
  return JSON.stringify(normalizeBotAiConfig(value))
}

export function botAiRuleKeywords(rule = {}) {
  return normalizeKeywords(rule.keywords || rule.patterns || rule.terms || [])
}
