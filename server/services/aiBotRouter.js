import moment from 'moment-timezone'
import { query } from '../config/database.js'
import { config } from '../config/config.js'
import { io } from '../app.js'
import { persistMessage, emitChatRefresh } from '../controllers/chatController.js'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const BOT_AVATAR = 'BC'
const DEFAULT_MODEL = 'openai/gpt-4o-mini'
const ALLOWED_MODELS = new Set([
  'google/gemini-3.1-flash-lite',
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
  'openai/gpt-4o',
])
const CONFIDENCE_THRESHOLD = 0.72
const TZ = 'America/Buenos_Aires'

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeId(value) {
  return normalizeText(value)
}

function normalizeSearchText(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function stripCodeFences(input) {
  let text = String(input || '').trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\s*/m, '')
    text = text.replace(/```$/m, '').trim()
  }
  return text.trim()
}

function safeJsonParse(raw) {
  const original = String(raw || '').trim()
  try {
    return JSON.parse(original)
  } catch {}
  const noFences = stripCodeFences(original)
  try {
    return JSON.parse(noFences)
  } catch {}
  const start = noFences.indexOf('{')
  const end = noFences.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return JSON.parse(noFences.slice(start, end + 1))
  }
  throw new Error(`No se pudo parsear JSON. Preview: ${original.slice(0, 200)}`)
}

function normalizeModel(model) {
  const value = normalizeText(model)
  return ALLOWED_MODELS.has(value) ? value : DEFAULT_MODEL
}

function toTimeLabel(date = new Date()) {
  return moment(date).tz(TZ).format('HH:mm')
}

function parseJsonArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseJsonObject(value) {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function normalizeFormConfig(rawConfig, fallbackTitle = '') {
  const config = parseJsonObject(rawConfig)
  const fields = Array.isArray(config.fields) ? config.fields : []
  return {
    title: normalizeText(config.title || fallbackTitle || 'Formulario').slice(0, 120),
    description: normalizeText(config.description || '').slice(0, 500),
    submitLabel: normalizeText(config.submitLabel || config.submit_label || 'Enviar').slice(0, 60) || 'Enviar',
    withdrawalMinAmount: config.withdrawalMinAmount == null ? null : Number(config.withdrawalMinAmount),
    responseMessages: parseJsonArray(config.responseMessages || config.response_messages)
      .map(message => normalizeText(message))
      .filter(Boolean)
      .slice(0, 8),
    isWithdrawal: Boolean(config.isWithdrawal || config.is_withdrawal),
    fields: fields.map((field, index) => ({
      key: normalizeId(field.key || field.id || `campo_${index + 1}`).replace(/[^a-z0-9_-]/gi, '_').slice(0, 40) || `campo_${index + 1}`,
      label: normalizeText(field.label || `Campo ${index + 1}`).slice(0, 80),
      type: ['text', 'number', 'dni', 'select'].includes(String(field.type || 'text')) ? String(field.type || 'text') : 'text',
      placeholder: normalizeText(field.placeholder || '').slice(0, 120),
      required: field.required !== false,
      max: field.max === '' || field.max == null ? null : Number(field.max),
      ...(Array.isArray(field.options)
        ? { options: field.options.map(option => normalizeText(option)).filter(Boolean).slice(0, 20) }
        : {}),
    })).filter(field => field.label).slice(0, 12),
  }
}

function sanitizeScreen(screen) {
  return {
    id: screen.id,
    name: screen.name,
    isRoot: Boolean(screen.is_root),
    items: [],
  }
}

function sanitizeItem(item) {
  return {
    id: item.id,
    type: item.type,
    text: item.text || '',
    label: item.label || '',
    formConfig: normalizeFormConfig(item.form_config, item.label || item.text),
    buttonType: item.button_type || 'navigate',
    receiptProcessing: item.receipt_processing || 'manual',
    receiptPrompt: item.receipt_prompt || '',
    showReceiptAfter: Boolean(item.show_receipt_after) || item.button_type === 'receipt_request',
    responseMessages: parseJsonArray(item.response_messages).map(message => normalizeText(message)).filter(Boolean),
    actionScreenId: item.action_screen_id || '',
    isBack: Boolean(item.is_back),
    order: Number(item.sort_order || 0),
  }
}

async function getBotRuntimeConfig() {
  const { rows, error } = await query(
    'SELECT bot_mode, bot_ai_model, bot_ai_temperature, bot_ai_max_tokens FROM system_config WHERE id = 1 LIMIT 1',
    []
  )
  if (error) throw error
  const row = rows?.[0] || {}
  return {
    mode: String(row.bot_mode || 'manual').toLowerCase() === 'hybrid_ai' ? 'hybrid_ai' : 'manual',
    model: normalizeText(row.bot_ai_model || ''),
    temperature: Number.isFinite(Number(row.bot_ai_temperature)) ? Math.max(0, Math.min(2, Number(row.bot_ai_temperature))) : 0.1,
    maxTokens: Number.isFinite(Number(row.bot_ai_max_tokens)) ? Math.max(1, Math.min(2000, Math.floor(Number(row.bot_ai_max_tokens)))) : 250,
  }
}

async function getOpenRouterConfig() {
  const { rows, error } = await query('SELECT api_key, model FROM config_openrouter WHERE id = 1 LIMIT 1', [])
  if (error) throw error
  const row = rows?.[0] || {}
  if (!row.api_key) throw new Error('OpenRouter API key no configurada')
  return {
    apiKey: row.api_key,
    model: normalizeModel(row.model),
  }
}

const SAFE_BANK_FIELDS_AI = new Set(['nombre_titular', 'alias', 'cbu', 'email', 'cuit', 'currency'])

async function resolveReceiptPrompt(text) {
  if (!text || !text.includes('{{bank.')) return text
  const { rows, error } = await query(
    `SELECT ba.account_data, ba.currency
       FROM chat_processing_config cpc
       INNER JOIN bank_accounts ba ON ba.id = cpc.bank_account_id AND ba.is_active = 1
      WHERE cpc.id = 1
      LIMIT 1`,
    []
  )
  if (error || !rows?.length) return text
  const raw = rows[0].account_data
  const data = typeof raw === 'object' ? raw : (() => { try { return JSON.parse(raw) } catch { return {} } })()
  const fields = {
    nombre_titular: data.nombre_titular || '',
    alias: data.alias || '',
    cbu: data.cbu || '',
    email: data.email || '',
    cuit: data.cuit || '',
    currency: rows[0].currency || 'ARS',
  }
  return text.replace(/\{\{bank\.(\w+)\}\}/g, (match, key) =>
    SAFE_BANK_FIELDS_AI.has(key) ? (fields[key] || match) : match
  )
}

async function loadBotFlow() {
  const { rows: screenRows, error: screenError } = await query(
    `SELECT id, name, is_root, sort_order
       FROM bot_screens
       ORDER BY sort_order ASC, created_at ASC`
  )
  if (screenError) throw screenError

  const { rows: itemRows, error: itemError } = await query(
    `SELECT id, screen_id, type, text, label, form_config, button_type, receipt_processing, receipt_prompt, show_receipt_after, response_messages, action_screen_id, is_back, sort_order
       FROM bot_items
       ORDER BY screen_id ASC, sort_order ASC, created_at ASC`
  )
  if (itemError) throw itemError

  const screens = (screenRows || []).map(sanitizeScreen)
  const byId = new Map(screens.map(screen => [screen.id, screen]))
  for (const item of itemRows || []) {
    const screen = byId.get(item.screen_id)
    if (screen) screen.items.push(sanitizeItem(item))
  }
  return { screens }
}

async function loadChatContext(chatId) {
  const { rows, error } = await query(
    `SELECT ch.id, ch.bot_screen_id, ch.bot_last_button_id, ch.assigned_user_id,
            c.id AS client_id, c.username, c.full_name, c.cuil AS tax_id, c.is_temporary, c.note
       FROM chats ch
       INNER JOIN clients c ON c.id = ch.client_id
      WHERE ch.id = ?
      LIMIT 1`,
    [chatId]
  )
  if (error) throw error
  const chat = rows?.[0] || null
  if (!chat) return null
  const { rows: providerRows, error: providerError } = await query(
    `SELECT bp.slug AS active_provider
       FROM chat_processing_config cpc
       LEFT JOIN bank_accounts ba ON ba.id = cpc.bank_account_id
       LEFT JOIN bank_providers bp ON bp.id = ba.provider_id
      WHERE cpc.id = 1
      LIMIT 1`,
    []
  )
  if (providerError) throw providerError
  return { ...chat, active_provider: providerRows?.[0]?.active_provider || null }
}

async function loadRecentMessages(chatId, limit = 10) {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limit) || 10)))
  const { rows, error } = await query(
    `SELECT sender_type, message_type, content, file_name, created_at
       FROM messages
      WHERE chat_id = ?
      ORDER BY id DESC
      LIMIT ${safeLimit}`,
    [chatId]
  )
  if (error) throw error
  return (rows || []).reverse()
}

function buildBotContext({ flow, chat, currentScreen, activeProvider, runtime }) {
  const rootScreen = (flow.screens || []).find(screen => screen.isRoot) || flow.screens?.[0] || null
  const screens = (flow.screens || []).map(screen => ({
    id: screen.id,
    name: screen.name,
    isRoot: Boolean(screen.isRoot),
    buttons: (screen.items || []).filter(item => item.type === 'button').map(button => ({
      id: button.id,
      label: button.label,
      buttonType: button.buttonType,
      actionScreenId: button.actionScreenId || null,
      isBack: Boolean(button.isBack),
      showReceiptAfter: Boolean(button.showReceiptAfter),
      receiptProcessing: button.receiptProcessing || 'manual',
      responseMessages: button.responseMessages || [],
    })),
    forms: (screen.items || []).filter(item => item.type === 'form').map(form => ({
      id: form.id,
      title: form.formConfig?.title || form.label || form.text || '',
      isWithdrawal: Boolean(form.formConfig?.isWithdrawal),
    })),
  }))

  const rootButtons = rootScreen
    ? (rootScreen.items || []).filter(item => item.type === 'button').map(button => ({
        id: button.id,
        label: button.label,
        buttonType: button.buttonType,
        actionScreenId: button.actionScreenId || null,
        isBack: Boolean(button.isBack),
        showReceiptAfter: Boolean(button.showReceiptAfter),
        receiptProcessing: button.receiptProcessing || 'manual',
        responseMessages: button.responseMessages || [],
      }))
    : []

  const currentButtons = (currentScreen?.items || [])
    .filter(item => item.type === 'button')
    .map(button => ({
      id: button.id,
      label: button.label,
      buttonType: button.buttonType,
      actionScreenId: button.actionScreenId || null,
      isBack: Boolean(button.isBack),
      showReceiptAfter: Boolean(button.showReceiptAfter),
      receiptProcessing: button.receiptProcessing || 'manual',
      receiptPrompt: button.receiptPrompt || '',
    }))

  return {
    runtime,
    chat: {
      id: Number(chat?.id || 0),
      currentScreenId: chat?.bot_screen_id || null,
      lastButtonId: chat?.bot_last_button_id || null,
      assignedUserId: chat?.assigned_user_id || null,
      activeProvider: activeProvider || null,
    },
    client: {
      id: Number(chat?.client_id || 0),
      username: chat?.username || '',
      fullName: chat?.full_name || '',
      taxId: normalizeText(chat?.tax_id || ''),
      isTemporary: Boolean(chat?.is_temporary),
      note: chat?.note || '',
    },
    screens,
    currentScreen: currentScreen ? {
      id: currentScreen.id,
      name: currentScreen.name,
      isRoot: Boolean(currentScreen.isRoot),
      buttons: currentButtons,
      rootButtons,
      forms: (currentScreen.items || []).filter(item => item.type === 'form').map(form => ({
        id: form.id,
        title: form.formConfig?.title || form.label || form.text || '',
        fields: form.formConfig?.fields || [],
      })),
    } : null,
  }
}

function buildFlowButtons(flow) {
  const buttons = []
  for (const screen of flow?.screens || []) {
    for (const item of screen.items || []) {
      if (item.type !== 'button' || !item.label) continue
      buttons.push({
        id: item.id,
        label: item.label,
        buttonType: item.buttonType || 'navigate',
        receiptProcessing: item.receiptProcessing || 'manual',
        receiptPrompt: item.receiptPrompt || '',
        showReceiptAfter: Boolean(item.showReceiptAfter),
        actionScreenId: item.actionScreenId || '',
        isBack: Boolean(item.isBack),
        responseMessages: item.responseMessages || [],
        sourceScreenId: screen.id,
        sourceScreenName: screen.name,
      })
    }
  }
  return buttons
}

function buildBotButtonsFromDefinitions(buttonDefs, { buttonIds = null, reason = 'ai', receiptRequest = null } = {}) {
  const time = toTimeLabel()
  const buttonIdSet = buttonIds ? new Set(buttonIds.map(String)) : null
  const buttons = (buttonDefs || [])
    .filter(button => button && button.label)
    .filter(button => !buttonIdSet || buttonIdSet.has(String(button.id)))
    .map(button => ({
      id: button.id,
      label: button.label,
      buttonType: button.buttonType || 'navigate',
      receiptProcessing: button.receiptProcessing || 'manual',
      receiptPrompt: button.receiptPrompt || '',
      showReceiptAfter: Boolean(button.showReceiptAfter),
      actionScreenId: button.actionScreenId || '',
      isBack: Boolean(button.isBack),
      ...(receiptRequest ? { receiptRequest } : {}),
    }))

  if (buttons.length === 0) return []
  return [{
    id: `bot-buttons-ai-${reason}-${Date.now()}`,
    type: 'bot-buttons',
    buttons,
    received: true,
    time,
    avatar: BOT_AVATAR,
  }]
}

function buildPrompt({ botContext, chatContext, recentMessages, clientMessage }) {
  return `Eres el enrutador inteligente del chat de soporte de una plataforma de apuestas/casino online.

Tu tarea NO es resolver todo libremente.
Tu tarea es entender qué quiere el cliente y elegir la mejor acción disponible dentro del bot manual existente.

Reglas principales:
- Responde siempre en español neutro, breve y claro.
- No prometas acreditaciones, retiros aprobados, bonos, saldos ni resultados.
- No inventes alias, CBU, CVU, cuentas bancarias, montos mínimos, promociones ni reglas.
- No pidas datos sensibles salvo que el flujo disponible lo solicite.
- Si el cliente quiere cargar/depositar, usa la opción o acción relacionada con carga, depósito, transferencia, alias, CBU, CVU o comprobante.
- Si el cliente quiere retirar/cobrar/sacar dinero, usa la opción o acción relacionada con retiro.
- Si el cliente tiene problemas de acceso, usuario, contraseña, cuenta bloqueada o error técnico, deriva a soporte humano si existe esa opción.
- Si el cliente pregunta algo que no se puede resolver con las opciones disponibles, muestra opciones útiles o deriva a soporte.
- Si no estás seguro, no inventes: pide una aclaración muy corta o muestra los botones disponibles.
- Si el cliente saluda, responde amable y muestra las opciones principales.
- Si el cliente insulta o está molesto, responde con calma y ofrece soporte.
- Si el cliente manda algo relacionado con comprobantes, pagos pendientes o acreditación, guíalo al flujo de carga/comprobante si está disponible.

Debes devolver ÚNICAMENTE JSON válido, sin markdown, sin explicaciones y sin texto fuera del JSON.

Formato de respuesta:
{
  "reply": "mensaje corto para el cliente",
  "action": "select_button | show_buttons | ask_clarification | handoff | none",
  "buttonId": "id_del_boton_o_null",
  "buttonIds": ["ids_de_botones_sugeridos"],
  "confidence": 0.0,
  "reason": "motivo interno breve"
}

Significado de acciones:
- select_button: cuando una opción disponible coincide claramente con lo que quiere el cliente.
- show_buttons: cuando conviene mostrar una o varias opciones disponibles.
- ask_clarification: cuando falta información para elegir.
- handoff: cuando debe intervenir un operador humano.
- none: cuando solo corresponde responder brevemente sin activar flujo.

Criterios:
- Usa select_button solo si tienes alta confianza.
- Usa show_buttons si hay varias opciones posibles.
- Usa ask_clarification si el mensaje es ambiguo.
- Usa handoff si hay reclamos, errores, problemas de cuenta, casos no cubiertos o riesgo operativo.
- Mantén "reply" en máximo 160 caracteres.
- "buttonId" debe ser null salvo action = "select_button".
- "buttonIds" debe contener solo IDs existentes en las opciones disponibles.
- Nunca uses IDs que no estén en la lista de opciones disponibles.

Contexto del bot manual:
${JSON.stringify(botContext, null, 2)}

Estado actual del cliente/chat:
${JSON.stringify(chatContext, null, 2)}

Últimos mensajes:
${JSON.stringify(recentMessages, null, 2)}

Mensaje actual del cliente:
${JSON.stringify({ content: clientMessage }, null, 2)}`
}

async function callOpenRouter({ model, temperature, maxTokens, prompt }) {
  const { apiKey } = await getOpenRouterConfig()
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://betchat.app',
      'X-Title': 'BetChat',
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: 'Eres un clasificador de intención para un bot de soporte.' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 200)}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  if (!normalizeText(content)) {
    throw new Error('OpenRouter no devolvió contenido utilizable')
  }
  return content
}

function normalizeDecision(rawDecision, availableButtons, fallbackButtonIds = []) {
  const decision = {
    reply: '',
    action: 'none',
    buttonId: null,
    buttonIds: [],
    confidence: 0,
    reason: '',
  }

  const availableButtonMap = new Map((availableButtons || []).map(button => [String(button.id), button]))
  const fallbackButtons = Array.isArray(fallbackButtonIds) ? fallbackButtonIds : []

  if (!rawDecision || typeof rawDecision !== 'object') {
    return { ...decision, action: 'show_buttons', buttonIds: fallbackButtons, confidence: 0, reason: 'invalid_json' }
  }

  decision.reply = normalizeText(rawDecision.reply).slice(0, 160)
  decision.action = ['select_button', 'show_buttons', 'ask_clarification', 'handoff', 'none'].includes(rawDecision.action)
    ? rawDecision.action
    : 'none'
  decision.buttonId = rawDecision.buttonId ? String(rawDecision.buttonId) : null
  decision.buttonIds = Array.isArray(rawDecision.buttonIds)
    ? rawDecision.buttonIds.map(id => String(id)).filter(Boolean)
    : []
  decision.confidence = Number.isFinite(Number(rawDecision.confidence))
    ? Math.max(0, Math.min(1, Number(rawDecision.confidence)))
    : 0
  decision.reason = normalizeText(rawDecision.reason).slice(0, 200)

  decision.buttonIds = [...new Set(decision.buttonIds)].filter(id => availableButtonMap.has(id))
  if (decision.buttonId && !availableButtonMap.has(decision.buttonId)) {
    decision.buttonId = null
  }

  if (decision.action === 'select_button') {
    if (!decision.buttonId || decision.confidence < CONFIDENCE_THRESHOLD) {
      return {
        ...decision,
        action: 'show_buttons',
        buttonId: null,
        buttonIds: decision.buttonIds.length ? decision.buttonIds : fallbackButtons,
        reason: decision.reason || 'fallback_from_low_confidence',
      }
    }
    return decision
  }

  if (decision.action === 'show_buttons') {
    return {
      ...decision,
      buttonIds: decision.buttonIds.length ? decision.buttonIds : fallbackButtons,
    }
  }

  return decision
}

function buildBotButtonsFromItems(items, { buttonIds = null, reason = 'ai', receiptRequest = null } = {}) {
  const time = toTimeLabel()
  const buttonIdSet = buttonIds ? new Set(buttonIds.map(String)) : null
  const buttons = (items || [])
    .filter(item => item.type === 'button' && item.label)
    .filter(item => !buttonIdSet || buttonIdSet.has(String(item.id)))
    .map(item => ({
      id: item.id,
      label: item.label,
      buttonType: item.buttonType || 'navigate',
      receiptProcessing: item.receiptProcessing || 'manual',
      receiptPrompt: item.receiptPrompt || '',
      showReceiptAfter: Boolean(item.showReceiptAfter),
      actionScreenId: item.actionScreenId || '',
      isBack: Boolean(item.isBack),
      ...(receiptRequest ? { receiptRequest } : {}),
    }))

  const forms = (items || [])
    .filter(item => item.type === 'form' && item.formConfig?.fields?.length)
    .map(form => ({
    id: `bot-form-ai-${reason}-${form.id}-${Date.now()}`,
    type: 'bot-form',
    form,
    received: true,
    time,
    avatar: BOT_AVATAR,
    }))

  const messages = [...forms]
  if (buttons.length > 0) {
    messages.push({
      id: `bot-buttons-ai-${reason}-${Date.now()}`,
      type: 'bot-buttons',
      buttons,
      received: true,
      time,
      avatar: BOT_AVATAR,
    })
  }
  return messages
}

function buildReceiptButtons({ request, actionLabel, reason = 'ai' }) {
  if (!request) return []
  const buttons = [
    {
      id: `receipt-upload-btn-${request.buttonId}`,
      label: actionLabel,
      buttonType: 'receipt_upload',
      receiptRequest: request,
    },
    ...(request.backButtons || []),
  ]
  return [{
    id: `bot-receipt-upload-${request.buttonId}-${Date.now()}`,
    type: 'bot-buttons',
    buttons,
    received: true,
    time: toTimeLabel(),
    avatar: BOT_AVATAR,
  }]
}

function buildFallbackReply(action) {
  switch (action) {
    case 'select_button':
      return 'Perfecto, te guío por esa opción.'
    case 'show_buttons':
      return 'Te muestro las opciones disponibles.'
    case 'ask_clarification':
      return '¿Me das un poco más de detalle para ayudarte mejor?'
    case 'handoff':
      return 'Te derivo con un operador para revisar tu caso.'
    default:
      return 'Te muestro las opciones disponibles.'
  }
}

function buildCurrentScreenButtons(screen, buttonIds = null, reason = 'ai') {
  if (!screen) return []
  const buttonDefs = (screen.items || [])
    .filter(item => item.type === 'button' && item.label)
    .map(item => ({
      id: item.id,
      label: item.label,
      buttonType: item.buttonType || 'navigate',
      receiptProcessing: item.receiptProcessing || 'manual',
      receiptPrompt: item.receiptPrompt || '',
      showReceiptAfter: Boolean(item.showReceiptAfter),
      actionScreenId: item.actionScreenId || '',
      isBack: Boolean(item.isBack),
      responseMessages: item.responseMessages || [],
    }))
  return buildBotButtonsFromDefinitions(buttonDefs, { buttonIds, reason })
}

function buildTargetScreenButtons(screen, receiptRequest, buttonIds = null, reason = 'ai') {
  if (!screen) return []
  if (receiptRequest) return buildReceiptButtons({ request: receiptRequest, actionLabel: receiptRequest.actionLabel || '📎 Subir comprobante', reason })
  return buildCurrentScreenButtons(screen, buttonIds, reason)
}

function buildButtonsFromFlow(flow, buttonIds = null, reason = 'ai', receiptRequest = null) {
  const buttons = buildFlowButtons(flow)
  return receiptRequest
    ? buildReceiptButtons({ request: receiptRequest, actionLabel: receiptRequest.actionLabel || '📎 Subir comprobante', reason })
    : buildBotButtonsFromDefinitions(buttons, { buttonIds, reason })
}

function inferQuickNavigationDecision({ clientMessage, flow, currentScreen }) {
  const text = normalizeSearchText(clientMessage)
  if (!text) return null
  const rootScreen = (flow?.screens || []).find(screen => screen.isRoot) || flow?.screens?.[0] || null
  const rootButtons = buildFlowButtons({ screens: [rootScreen].filter(Boolean) })
  const allButtons = buildFlowButtons(flow)

  const resetMatch = /(restablec|reinicia|reiniciar|volver al inicio|volver al comienzo|inicio|pantalla principal|menu principal|empezar de nuevo|empezar otra vez)/i.test(text)
  if (resetMatch && rootScreen) {
    return {
      reply: 'Claro, volvamos al inicio.',
      action: 'show_buttons',
      buttonIds: rootButtons.map(button => button.id),
      confidence: 1,
      reason: 'quick_reset',
      targetScreenId: rootScreen.id,
    }
  }

  // Intención: subir comprobante / ya pagué / datos de pago / alias / cbu / cvu
  // Ambos casos van por el handler alias_request en processHybridBotTextMessage,
  // que muestra directamente los datos bancarios (card copiable) + botón de subir
  // comprobante + botón volver — sin navegar a pantallas intermedias.
  const receiptUploadMatch = /(comprobante|subi comprobante|subir comprobante|ya pague|ya transfer|ya deposite|adjuntar|foto del pago|imagen del pago|enviar pago|ya cargue|ya realice)/i.test(text)
  const aliasMatch = /(alias|cbu|cvu|datos de pago|datos bancarios|como transfer|como depositar|a donde deposito|donde envio|quiero pagar|quiero depositar)/i.test(text)
  if (receiptUploadMatch || aliasMatch) {
    const reply = receiptUploadMatch && !aliasMatch
      ? 'Aquí tienes los datos y el botón para subir tu comprobante.'
      : 'Aquí tienes los datos para transferir y el botón para subir el comprobante.'
    return {
      reply,
      action: 'show_buttons',
      buttonIds: [],
      confidence: 0.94,
      reason: 'alias_request',
    }
  }

  const deposits = /(cargar|deposit|depositar|carga|saldo|transfer|alias|cbu|comprobante|comprobantes)/i.test(text)
  const withdrawals = /(retirar|retiro|cobrar|sacar dinero|cashout)/i.test(text)
  const support = /(soporte|ayuda|problema|error|no funciona|no puedo|bloquead|acceso|usuario|contrase|login)/i.test(text)
  const promo = /(cuponera|promo|bono|promocion|promoción)/i.test(text)

  const pickRootButton = (matchers) => rootButtons.find(button => matchers.some(matcher => matcher(normalizeSearchText(button.label), normalizeSearchText(button.sourceScreenName || ''))))
  const targetButton =
    withdrawals ? pickRootButton([
      (label) => label.includes('retirar') || label.includes('retiro'),
    ]) :
    deposits ? pickRootButton([
      (label) => label.includes('cargar') || label.includes('deposit') || label.includes('carga'),
    ]) :
    support ? pickRootButton([
      (label) => label.includes('soporte') || label.includes('ayuda'),
    ]) :
    promo ? pickRootButton([
      (label) => label.includes('cuponera') || label.includes('promo') || label.includes('bono'),
    ]) :
    null

  if (targetButton) {
    const pretty = normalizeText(targetButton.label || '').replace(/^[^a-zA-Z0-9]+/, '').trim()
    return {
      reply: `Perfecto, te llevo a ${pretty || 'esa opción'}.`,
      action: 'select_button',
      buttonId: targetButton.id,
      buttonIds: [targetButton.id],
      confidence: 0.96,
      reason: 'quick_navigation',
      targetScreenId: targetButton.actionScreenId || rootScreen?.id || currentScreen?.id || null,
    }
  }

  return null
}

function emitBotProcessing(chatId, isProcessing, text = 'IA procesando...') {
  io.to(`chat:${chatId}`).emit('bot:processing', {
    chatId: Number(chatId),
    isProcessing: Boolean(isProcessing),
    text: text || 'IA procesando...',
  })
}

async function persistReplyMessage({ chatId, reply, messageId, clientMessageId }) {
  const content = normalizeText(reply)
  if (!content) return null
  return persistMessage({
    chatId,
    senderType: 'system',
    content: content.slice(0, 160),
    messageType: 'text',
    clientMessageId: `ai-router-${messageId}-reply`,
  })
}

async function executeSelectedButton({
  chatId,
  chat,
  flow,
  currentScreen,
  button,
  reply,
  messageId,
  clientMessageId,
}) {
  const isReceiptRequest = button.buttonType === 'receipt_request'
  const isMessagesOnly = button.buttonType === 'messages_only'
  const showReceiptAfter = Boolean(button.showReceiptAfter) || isReceiptRequest
  const stayOnScreen = isReceiptRequest || isMessagesOnly
  const targetScreen = stayOnScreen
    ? (currentScreen || flow.screens.find(screen => screen.id === chat.bot_screen_id) || currentScreen)
    : (flow.screens.find(screen => screen.id === button.actionScreenId) || currentScreen)
  const targetScreenId = targetScreen?.id || chat.bot_screen_id || button.actionScreenId || currentScreen?.id || null
  const targetButtons = (targetScreen?.items || []).filter(item => item.type === 'button' && item.isBack && item.label)

  const responseMessages = parseJsonArray(button.responseMessages)
    .map(text => normalizeText(text))
    .filter(Boolean)
    .map((text, index) => ({ id: `${button.id}-response-${index}`, text }))

  const receiptPromptRaw = showReceiptAfter
    ? await resolveReceiptPrompt(normalizeText(button.receiptPrompt || 'Subi el comprobante para continuar.'))
    : ''
  const receiptPromptItem = receiptPromptRaw ? [{ id: `${button.id}-receipt-prompt`, text: receiptPromptRaw }] : []

  const botTexts = responseMessages.length > 0
    ? [...responseMessages, ...receiptPromptItem]
    : showReceiptAfter
      ? receiptPromptItem
      : (targetScreen?.items || []).filter(item => item.type === 'message' && item.text)

  const createdMessages = []
  const replyResult = await persistReplyMessage({
    chatId,
    reply,
    messageId,
    clientMessageId,
  })
  if (replyResult?.message) createdMessages.push(replyResult.message)

  for (const [index, item] of botTexts.entries()) {
    const resolvedContent = await resolveReceiptPrompt(normalizeText(item.text || ''))
    const result = await persistMessage({
      chatId,
      senderType: 'system',
      content: resolvedContent,
      messageType: 'text',
      clientMessageId: `ai-router-${messageId}-${button.id}-${index}`,
    })
    createdMessages.push(result.message)
  }

  const updateRows = isMessagesOnly || isReceiptRequest
    ? await query(
        `UPDATE chats
         SET bot_screen_id = ?, bot_last_button_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [targetScreenId, button.id, chatId]
      )
    : await query(
        `UPDATE chats
         SET bot_screen_id = ?, bot_last_button_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [targetScreenId, button.id, chatId]
      )
  if (button.isBack) {
    await query(
      `UPDATE chats
       SET bot_screen_id = ?, bot_last_button_id = NULL, assigned_user_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [targetScreenId, chatId]
    )
  }

  const receiptRequest = showReceiptAfter
    ? {
        buttonId: button.id,
        label: button.label,
        processing: button.receiptProcessing || 'manual',
        activeProvider: chat.active_provider || null,
        screenId: targetScreenId,
        backButtons: targetButtons,
        forceUpload: false,
        actionLabel: button.buttonType === 'receipt_request' ? '📎 Subir comprobante' : '📎 Subir comprobante',
      }
    : null

  const botMessages = receiptRequest
    ? buildReceiptButtons({
        request: receiptRequest,
        actionLabel: '📎 Subir comprobante',
        reason: `select-${button.id}`,
      })
    : buildBotButtonsFromItems(targetScreen?.items || [], { reason: `select-${button.id}` })

  return {
    createdMessages,
    state: {
      chatId,
      currentScreenId: targetScreenId,
      lastButtonId: button.isBack ? null : button.id,
    },
    receiptRequest,
    botMessages,
    button,
  }
}

function buildAvailableButtons(currentScreen) {
  return (currentScreen?.items || [])
    .filter(item => item.type === 'button' && item.label)
    .map(item => ({
      id: item.id,
      label: item.label,
      buttonType: item.buttonType || 'navigate',
      receiptProcessing: item.receiptProcessing || 'manual',
      receiptPrompt: item.receiptPrompt || '',
      showReceiptAfter: Boolean(item.showReceiptAfter),
      actionScreenId: item.actionScreenId || '',
      isBack: Boolean(item.isBack),
      responseMessages: item.responseMessages || [],
    }))
}

export async function processHybridBotTextMessage({
  chatId,
  clientId,
  messageId,
  clientMessageId,
  content,
}) {
  try {
    const runtime = await getBotRuntimeConfig()
    if (runtime.mode !== 'hybrid_ai') {
      return { handled: false, reason: 'manual_mode' }
    }

    const [chat, flow, recentMessages] = await Promise.all([
      loadChatContext(chatId),
      loadBotFlow(),
      loadRecentMessages(chatId, 10),
    ])

    if (!chat || Number(chat.client_id) !== Number(clientId)) {
      return { handled: false, reason: 'chat_not_found' }
    }

    emitBotProcessing(chatId, true, 'IA procesando tu mensaje...')
    const allButtons = buildFlowButtons(flow)
    const availableButtons = buildAvailableButtons(
      flow.screens.find(screen => screen.id === chat.bot_screen_id)
        || flow.screens.find(screen => screen.isRoot)
        || flow.screens[0]
        || null
    )
    const buttonsById = new Map(allButtons.map(button => [String(button.id), button]))
    const quickDecision = inferQuickNavigationDecision({
      clientMessage: content,
      flow,
      currentScreen: flow.screens.find(screen => screen.id === chat.bot_screen_id)
        || flow.screens.find(screen => screen.isRoot)
        || flow.screens[0]
        || null,
    })
    let syntheticDecision = quickDecision || null

    const currentScreen = flow.screens.find(screen => screen.id === chat.bot_screen_id)
      || flow.screens.find(screen => screen.isRoot)
      || flow.screens[0]
      || null
    const prompt = buildPrompt({
      botContext: buildBotContext({ flow, chat, currentScreen, activeProvider: chat.active_provider || null, runtime }),
      chatContext: {
        chatId: Number(chatId),
        clientId: Number(clientId),
        currentScreenId: chat.bot_screen_id || null,
        lastButtonId: chat.bot_last_button_id || null,
        client: {
          username: chat.username || '',
          fullName: chat.full_name || '',
          taxId: normalizeText(chat.tax_id || ''),
        },
      },
      recentMessages: recentMessages.map(message => ({
        senderType: message.sender_type,
        messageType: message.message_type,
        content: message.content || '',
        fileName: message.file_name || '',
        createdAt: message.created_at || '',
      })),
      clientMessage: normalizeText(content),
    })

    let rawDecision = null
    let fallback = false
    let openrouter = null
    if (syntheticDecision) {
      rawDecision = syntheticDecision
    } else {
      try {
        openrouter = await getOpenRouterConfig()
      } catch (error) {
        console.warn('[BotAI] OpenRouter config no disponible, usando fallback', { chatId, error: error.message })
        fallback = true
      }

      if (!fallback && openrouter) {
        try {
          const rawContent = await callOpenRouter({
            model: normalizeModel(runtime.model || openrouter.model),
            temperature: runtime.temperature,
            maxTokens: runtime.maxTokens,
            prompt,
          })
          rawDecision = safeJsonParse(rawContent)
        } catch (error) {
          console.warn('[BotAI] OpenRouter fallback', { chatId, error: error.message })
          fallback = true
        }
      }
    }

    const decision = normalizeDecision(rawDecision, allButtons, availableButtons.map(button => String(button.id)))
    let action = fallback ? 'show_buttons' : decision.action
    const reply = normalizeText(decision.reply || buildFallbackReply(action)).slice(0, 160)

    // ── Special case: alias_request ─────────────────────────────────────────
    // Directly show bank data (alias/CBU) as a copyable card + receipt upload
    // button + back button — bypassing "Usaré ALIAS"/"Usaré CBU" navigation.
    if (decision.reason === 'alias_request' && !fallback) {
      try {
        const bankLine = await resolveReceiptPrompt(
          'Alias: {{bank.alias}}\nCBU/CVU: {{bank.cbu}}\nTitular: {{bank.nombre_titular}}'
        )
        if (bankLine && !bankLine.includes('{{bank.')) {
          // 1. Persist the AI reply ("Aquí tienes los datos…")
          await persistReplyMessage({ chatId, reply, messageId, clientMessageId })
          // 2. Persist the bank data block — frontend parseBankDetails() renders it
          //    as CopyableBankDetails card with one-tap copy buttons.
          await persistMessage({
            chatId,
            senderType: 'system',
            content: bankLine,
            messageType: 'text',
            clientMessageId: `ai-bank-data-${messageId}`,
          })

          // 3. Find the source button for the receiptRequest object.
          //    Prefer receipt_request type; fall back to any showReceiptAfter button.
          const receiptSourceBtn =
            allButtons.find(b => b.buttonType === 'receipt_request') ||
            allButtons.find(b => b.showReceiptAfter)

          // 4. Collect back buttons from the current screen's raw items.
          //    These are included in the receipt upload button row.
          const backItems = (currentScreen?.items || [])
            .filter(item => item.type === 'button' && item.isBack && item.label)
            .map(item => ({
              id: item.id,
              label: item.label,
              isBack: true,
              buttonType: item.buttonType || 'navigate',
              actionScreenId: item.actionScreenId || null,
            }))
          // If the current screen has no back buttons, find one from any screen.
          // Deduplicate by actionScreenId so only ONE "Volver al inicio" appears.
          const dedupeBackButtons = (btns) => {
            const seen = new Set()
            return btns.filter(b => {
              const key = b.actionScreenId || 'root'
              if (seen.has(key)) return false
              seen.add(key)
              return true
            })
          }
          const backButtons = backItems.length > 0
            ? dedupeBackButtons(backItems)
            : dedupeBackButtons(
                allButtons
                  .filter(b => b.isBack)
                  .map(b => ({
                    id: b.id,
                    label: b.label,
                    isBack: true,
                    buttonType: b.buttonType || 'navigate',
                    actionScreenId: b.actionScreenId || null,
                  }))
              )

          let botMessages
          let receiptRequestPayload = null

          if (receiptSourceBtn) {
            // Build the standard receipt-upload row:
            // [📎 Subir comprobante] [🔙 Volver al inicio]
            receiptRequestPayload = {
              buttonId: receiptSourceBtn.id,
              label: receiptSourceBtn.label,
              processing: receiptSourceBtn.receiptProcessing || 'manual',
              activeProvider: chat.active_provider || null,
              screenId: currentScreen?.id || chat.bot_screen_id || null,
              backButtons,
              forceUpload: false,
              actionLabel: '📎 Subir comprobante',
            }
            botMessages = buildReceiptButtons({
              request: receiptRequestPayload,
              actionLabel: '📎 Subir comprobante',
              reason: `alias-${messageId}`,
            })
          } else {
            // No receipt button in the flow — show back buttons only (or root screen).
            const rootScreen = (flow?.screens || []).find(s => s.isRoot) || flow?.screens?.[0] || null
            botMessages = backButtons.length > 0
              ? buildBotButtonsFromDefinitions(
                  backButtons.map(b => ({ ...b, sourceScreenId: currentScreen?.id })),
                  { reason: `alias-back-${messageId}` }
                )
              : buildCurrentScreenButtons(rootScreen, null, `alias-root-${messageId}`)
          }

          // Persist bot state to DB so the receipt upload UI is restored on page reload.
          // The initial load logic in ChatWindow.jsx restores receiptRequest when
          // bot_last_button_id points to a button with showReceiptAfter = true.
          let persistedScreenId = currentScreen?.id || chat.bot_screen_id || null
          let persistedButtonId = chat.bot_last_button_id || null
          if (receiptSourceBtn) {
            // Move the bot to the screen that owns the receipt button so the
            // initial load can locate the button inside currentScreen.items.
            persistedScreenId = receiptSourceBtn.sourceScreenId || persistedScreenId
            persistedButtonId = String(receiptSourceBtn.id)
            await query(
              `UPDATE chats SET bot_screen_id = ?, bot_last_button_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [persistedScreenId, persistedButtonId, chatId]
            )
          }

          io.to(`chat:${chatId}`).emit('bot:ai-transition', {
            chatId: Number(chatId),
            action: 'none',
            reply,
            reason: decision.reason,
            state: {
              chatId: Number(chatId),
              currentScreenId: persistedScreenId,
              lastButtonId: persistedButtonId,
            },
            botMessages,
            receiptRequest: receiptRequestPayload,
            clearBotMessages: true,
          })
          await emitChatRefresh(chatId)
          return { handled: true, action: 'alias_request' }
        }
      } catch (err) {
        console.warn('[BotAI] alias_request direct bank fetch error:', err.message)
      }
      // Fall through to normal flow if bank data unavailable
    }

    if (action === 'select_button') {
      const selected = buttonsById.get(decision.buttonId) || null
      if (!selected) {
        fallback = true
        action = 'show_buttons'
      } else {
        const result = await executeSelectedButton({
          chatId,
          chat: { ...chat, active_provider: chat.active_provider || null },
          flow,
          currentScreen,
          button: {
            ...selected,
            responseMessages: parseJsonArray(selected.responseMessages || []),
          },
          reply,
          messageId,
          clientMessageId,
        })

        io.to(`chat:${chatId}`).emit('bot:ai-transition', {
          chatId: Number(chatId),
          action,
          reply,
          buttonId: selected.id,
          buttonIds: decision.buttonIds,
          confidence: decision.confidence,
          reason: decision.reason,
          state: result.state,
          botMessages: result.botMessages,
          receiptRequest: result.receiptRequest,
          clearBotMessages: result.state?.currentScreenId && result.state.currentScreenId !== currentScreen?.id,
        })

        await emitChatRefresh(chatId)
        return {
          handled: true,
          action,
          buttonId: selected.id,
          state: result.state,
          confidence: decision.confidence,
        }
      }
    }

    const buttonIds = action === 'show_buttons'
      ? (decision.buttonIds.length ? decision.buttonIds : availableButtons.map(button => String(button.id)))
      : []
    const replyResult = await persistReplyMessage({
      chatId,
      reply,
      messageId,
      clientMessageId,
    })

    const targetScreenIdForButtons = action === 'show_buttons'
      ? (() => {
          const sourceScreenIds = [...new Set(buttonIds.map(id => buttonsById.get(id)?.sourceScreenId).filter(Boolean))]
          return sourceScreenIds.length === 1 ? sourceScreenIds[0] : null
        })()
      : null
    const targetScreenForButtons = targetScreenIdForButtons
      ? flow.screens.find(screen => screen.id === targetScreenIdForButtons) || currentScreen
      : currentScreen

    if (decision.reason === 'quick_reset' && targetScreenIdForButtons) {
      await query(
        `UPDATE chats SET bot_screen_id = ?, bot_last_button_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [targetScreenIdForButtons, chatId]
      )
    }

    const buildShowButtons = (screen, ids, tag) => {
      const msgs = buildCurrentScreenButtons(screen, ids && ids.length ? ids : null, tag)
      return msgs.length > 0 ? msgs : buildCurrentScreenButtons(screen, null, `${tag}-all`)
    }
    const botMessages = action === 'show_buttons'
      ? (targetScreenIdForButtons && targetScreenIdForButtons !== currentScreen?.id
          ? buildShowButtons(targetScreenForButtons, buttonIds, `show-${messageId}`)
          : buildShowButtons(currentScreen, buttonIds, `show-${messageId}`))
      : fallback
        ? buildCurrentScreenButtons(currentScreen, availableButtons.map(button => String(button.id)), `fallback-${messageId}`)
        : []

    if (botMessages.length > 0 || replyResult?.message) {
      io.to(`chat:${chatId}`).emit('bot:ai-transition', {
        chatId: Number(chatId),
        action,
        reply,
        buttonId: decision.buttonId,
        buttonIds: buttonIds.length ? buttonIds : decision.buttonIds,
        confidence: decision.confidence,
        reason: decision.reason,
        state: {
          chatId: Number(chatId),
          currentScreenId: targetScreenIdForButtons || currentScreen?.id || chat.bot_screen_id || null,
          lastButtonId: decision.buttonId || chat.bot_last_button_id || null,
        },
        botMessages,
        receiptRequest: null,
        clearBotMessages: Boolean(targetScreenIdForButtons && targetScreenIdForButtons !== currentScreen?.id),
      })
    }

    return {
      handled: true,
      action,
      buttonIds,
      confidence: decision.confidence,
      fallback,
    }
  } catch (error) {
    console.error('[BotAI] Error procesando mensaje híbrido', { chatId, error: error.message })
    try {
      const [chat, flow] = await Promise.allSettled([loadChatContext(chatId), loadBotFlow()])
      const resolvedChat = chat.status === 'fulfilled' ? chat.value : null
      const resolvedFlow = flow.status === 'fulfilled' ? flow.value : null
      const currentScreen = resolvedFlow?.screens?.find(screen => screen.id === resolvedChat?.bot_screen_id)
        || resolvedFlow?.screens?.find(screen => screen.isRoot)
        || resolvedFlow?.screens?.[0]
        || null
      const availableButtons = buildAvailableButtons(currentScreen)
      const replyResult = await persistReplyMessage({
        chatId,
        reply: buildFallbackReply('show_buttons'),
        messageId,
        clientMessageId,
      }).catch(() => null)
      io.to(`chat:${chatId}`).emit('bot:ai-transition', {
        chatId: Number(chatId),
        action: 'show_buttons',
        reply: buildFallbackReply('show_buttons'),
        buttonIds: availableButtons.map(button => button.id),
        confidence: 0,
        reason: 'internal_error',
        state: {
          chatId: Number(chatId),
          currentScreenId: currentScreen?.id || resolvedChat?.bot_screen_id || null,
          lastButtonId: resolvedChat?.bot_last_button_id || null,
        },
        botMessages: buildCurrentScreenButtons(currentScreen, availableButtons.map(button => button.id), `error-${messageId}`),
        receiptRequest: null,
        clearBotMessages: false,
      })
      return {
        handled: true,
        action: 'show_buttons',
        fallback: true,
        replyResult,
      }
    } catch (fallbackError) {
      console.error('[BotAI] Fallback híbrido fallido', { chatId, error: fallbackError.message })
      return { handled: false, error: fallbackError.message }
    }
  } finally {
    emitBotProcessing(chatId, false, '')
  }
}
