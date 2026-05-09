import jwt from 'jsonwebtoken'
import { query, transaction } from '../config/database.js'
import { config } from '../config/config.js'
import { getCookieValue } from '../middlewares/authMiddleware.js'
import { persistMessage } from './chatController.js'

const ITEM_TYPES = ['message', 'button', 'form']
const BUTTON_TYPES = ['navigate', 'receipt_request', 'messages_only']
const RECEIPT_PROCESSING = ['auto', 'manual']
const FORM_FIELD_TYPES = ['text', 'number', 'dni', 'select']

const SAFE_BANK_FIELDS = new Set(['nombre_titular', 'alias', 'cbu', 'email', 'cuit', 'currency'])

async function resolveBankPlaceholders(text) {
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
    SAFE_BANK_FIELDS.has(key) ? (fields[key] || match) : match
  )
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
    title: String(config.title || fallbackTitle || 'Formulario').trim().slice(0, 120),
    description: String(config.description || '').trim().slice(0, 500),
    submitLabel: String(config.submitLabel || config.submit_label || 'Enviar').trim().slice(0, 60) || 'Enviar',
    responseMessages: parseJsonArray(config.responseMessages || config.response_messages)
      .map(message => String(message || '').trim())
      .filter(Boolean)
      .slice(0, 8),
    isWithdrawal: Boolean(config.isWithdrawal || config.is_withdrawal),
    fields: fields.map((field, index) => {
      const type = FORM_FIELD_TYPES.includes(String(field.type || 'text')) ? String(field.type || 'text') : 'text'
      const key = normalizeId(field.key || field.id || `campo_${index + 1}`).replace(/[^a-z0-9_-]/gi, '_').slice(0, 40) || `campo_${index + 1}`
      const max = field.max === '' || field.max == null ? null : Number(field.max)
      const options = type === 'select'
        ? (Array.isArray(field.options) ? field.options.map(o => String(o || '').trim()).filter(Boolean).slice(0, 20) : [])
        : undefined
      const rawCF = type === 'select' && field.conditionalFields && typeof field.conditionalFields === 'object' && !Array.isArray(field.conditionalFields)
        ? field.conditionalFields : {}
      const conditionalFields = type === 'select'
        ? Object.fromEntries(
            Object.entries(rawCF)
              .filter(([, cf]) => cf && typeof cf === 'object')
              .slice(0, 20)
              .map(([opt, cf]) => {
                const cfType = FORM_FIELD_TYPES.includes(String(cf.type || 'text')) && cf.type !== 'select' ? String(cf.type) : 'text'
                const cfMax = cf.max === '' || cf.max == null ? null : Number(cf.max)
                return [String(opt).slice(0, 80), {
                  key: normalizeId(cf.key || '').replace(/[^a-z0-9_-]/gi, '_').slice(0, 40) || `${key}_cf_${String(opt).slice(0, 10).replace(/\s/g, '_')}`,
                  label: String(cf.label || '').trim().slice(0, 80),
                  type: cfType,
                  placeholder: String(cf.placeholder || '').trim().slice(0, 120),
                  required: cf.required !== false,
                  max: cfType === 'number' && !Number.isNaN(cfMax) ? cfMax : null,
                }]
              })
              .filter(([, cf]) => cf.label)
          )
        : undefined
      return {
        key,
        label: String(field.label || `Campo ${index + 1}`).trim().slice(0, 80),
        type,
        placeholder: String(field.placeholder || '').trim().slice(0, 120),
        required: field.required !== false,
        max: type === 'number' && !Number.isNaN(max) ? max : null,
        ...(options !== undefined && { options }),
        ...(conditionalFields !== undefined && { conditionalFields }),
      }
    }).filter(field => field.label).slice(0, 12),
  }
}

const sanitizeScreen = (screen) => ({
  id: screen.id,
  name: screen.name,
  isRoot: Boolean(screen.is_root),
  items: [],
})

const sanitizeItem = (item) => ({
  id: item.id,
  type: item.type,
  text: item.text || '',
  label: item.label || '',
  formConfig: normalizeFormConfig(item.form_config, item.label || item.text),
  buttonType: item.button_type || 'navigate',
  receiptProcessing: item.receipt_processing || 'manual',
  receiptPrompt: item.receipt_prompt || '',
  showReceiptAfter: Boolean(item.show_receipt_after) || item.button_type === 'receipt_request',
  responseMessages: parseJsonArray(item.response_messages).map(message => String(message || '').trim()).filter(Boolean),
  actionScreenId: item.action_screen_id || '',
  isBack: Boolean(item.is_back),
  order: Number(item.sort_order || 0),
})

function normalizeId(value) {
  return String(value || '').trim()
}

function formatFormSubmission(formConfig, values) {
  const title = formConfig.title || 'Formulario'
  const lines = [`Formulario: ${title}`]
  for (const field of formConfig.fields || []) {
    const raw = String(values?.[field.key] ?? '').trim()
    lines.push(`${field.label}: ${raw}`)
    if (field.type === 'select' && raw && field.conditionalFields?.[raw]) {
      const cf = field.conditionalFields[raw]
      const cfRaw = String(values?.[cf.key] ?? '').trim()
      if (cfRaw) lines.push(`${cf.label}: ${cfRaw}`)
    }
  }
  return lines.join('\n')
}

function validateFormValues(formConfig, values) {
  const errors = []
  for (const field of formConfig.fields || []) {
    const raw = String(values?.[field.key] ?? '').trim()
    if (field.required && !raw) {
      errors.push(`Completa "${field.label}"`)
      continue
    }
    if (!raw) continue
    if (field.type === 'number') {
      const value = Number(raw)
      if (Number.isNaN(value)) {
        errors.push(`"${field.label}" debe ser numerico`)
      } else if (field.max != null && value > Number(field.max)) {
        errors.push(`"${field.label}" debe ser menor o igual a ${field.max}`)
      }
    }
    if (field.type === 'dni') {
      if (!/^\d{8}$/.test(raw)) {
        errors.push(`"${field.label}" debe tener exactamente 8 dígitos numéricos`)
      }
    }
    if (field.type === 'select' && Array.isArray(field.options) && field.options.length) {
      if (!field.options.includes(raw)) {
        errors.push(`"${field.label}" tiene un valor no permitido`)
      } else if (field.conditionalFields?.[raw]) {
        const cf = field.conditionalFields[raw]
        const cfRaw = String(values?.[cf.key] ?? '').trim()
        if (cf.required && !cfRaw) {
          errors.push(`Completa "${cf.label}"`)
        } else if (cfRaw) {
          if (cf.type === 'dni' && !/^\d{8}$/.test(cfRaw)) {
            errors.push(`"${cf.label}" debe tener exactamente 8 dígitos numéricos`)
          }
          if (cf.type === 'number') {
            const v = Number(cfRaw)
            if (Number.isNaN(v)) errors.push(`"${cf.label}" debe ser numérico`)
            else if (cf.max != null && v > Number(cf.max)) errors.push(`"${cf.label}" debe ser menor o igual a ${cf.max}`)
          }
        }
      }
    }
  }
  return errors
}

function validateFlow(body) {
  const screens = Array.isArray(body?.screens) ? body.screens : []
  const errors = []

  if (screens.length === 0) errors.push('El flujo debe tener al menos una pantalla')

  const screenIds = new Set()
  const itemIds = new Set()
  let rootCount = 0

  const normalizedScreens = screens.map((screen, screenIndex) => {
    const id = normalizeId(screen.id)
    const name = String(screen.name || '').trim()
    const isRoot = Boolean(screen.isRoot || screen.is_root || id === 'root')
    const items = Array.isArray(screen.items) ? screen.items : []

    if (!id) errors.push('Hay una pantalla sin ID')
    else if (!/^[a-z0-9_-]+$/i.test(id)) errors.push(`El ID de pantalla "${id}" no es valido`)
    else if (screenIds.has(id)) errors.push(`La pantalla "${id}" esta duplicada`)
    else screenIds.add(id)

    if (!name) errors.push(`La pantalla "${id || screenIndex + 1}" necesita nombre`)
    if (isRoot) rootCount += 1

    const normalizedItems = items.map((item, itemIndex) => {
      const itemId = normalizeId(item.id)
      const type = String(item.type || '').trim()
      const text = String(item.text || '').trim()
      const label = String(item.label || '').trim()
      const buttonType = BUTTON_TYPES.includes(String(item.buttonType || item.button_type || 'navigate')) ? String(item.buttonType || item.button_type || 'navigate') : 'navigate'
      const receiptProcessing = RECEIPT_PROCESSING.includes(String(item.receiptProcessing || item.receipt_processing || 'manual')) ? String(item.receiptProcessing || item.receipt_processing || 'manual') : 'manual'
      const receiptPrompt = String(item.receiptPrompt || item.receipt_prompt || '').trim()
      const showReceiptAfter = Boolean(item.showReceiptAfter || item.show_receipt_after) || buttonType === 'receipt_request'
      const responseMessages = parseJsonArray(item.responseMessages || item.response_messages)
        .map(message => String(message || '').trim())
        .filter(Boolean)
        .slice(0, 8)
      const actionScreenId = normalizeId(item.actionScreenId || item.action_screen_id)
      const isBack = Boolean(item.isBack || item.is_back)
      const formConfig = normalizeFormConfig(item.formConfig || item.form_config, label || text)

      if (!itemId) errors.push(`Hay un elemento sin ID en "${name || id}"`)
      else if (!/^[a-z0-9_-]+$/i.test(itemId)) errors.push(`El ID de elemento "${itemId}" no es valido`)
      else if (itemIds.has(itemId)) errors.push(`El elemento "${itemId}" esta duplicado`)
      else itemIds.add(itemId)

      if (!ITEM_TYPES.includes(type)) errors.push(`Tipo de elemento invalido en "${name || id}"`)
      if (type === 'message' && !text) errors.push(`Hay un mensaje vacio en "${name || id}"`)
      if (type === 'button' && !label) errors.push(`Hay un boton sin texto en "${name || id}"`)
      if (type === 'form' && formConfig.fields.length === 0) errors.push(`El formulario "${formConfig.title || itemId}" necesita al menos un campo`)
      if (type === 'button' && buttonType === 'receipt_request' && !receiptPrompt) errors.push(`El boton "${label || itemId}" necesita texto para solicitar comprobante`)
      if (type === 'button' && buttonType === 'messages_only' && showReceiptAfter && !receiptPrompt) errors.push(`El boton "${label || itemId}" necesita texto para solicitar comprobante`)
      return {
        id: itemId,
        type,
        text,
        label,
        formConfig,
        buttonType,
        receiptProcessing,
        receiptPrompt,
        showReceiptAfter,
        responseMessages,
        actionScreenId,
        isBack,
        order: itemIndex,
      }
    })

    return {
      id,
      name,
      isRoot,
      order: screenIndex,
      items: normalizedItems,
    }
  })

  for (const screen of normalizedScreens) {
    for (const item of screen.items) {
      if (item.type === 'button' && item.buttonType !== 'receipt_request' && item.actionScreenId && !screenIds.has(item.actionScreenId)) {
        errors.push(`El boton "${item.label}" apunta a una pantalla inexistente`)
      }
    }
  }

  if (rootCount !== 1) errors.push('El flujo debe tener una unica pantalla de inicio')

  return { errors, screens: normalizedScreens }
}

function getClientPayload(req) {
  const token = getCookieValue(req, config.clientJwtCookieName)
  if (!token) return null
  try {
    const payload = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256'],
      issuer: config.jwtIssuer,
    })
    return payload?.type === 'client' ? payload : null
  } catch {
    return null
  }
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

  return { flow: { screens } }
}

export async function getBotFlow(req, res, next) {
  try {
    res.json(await loadBotFlow())
  } catch (error) {
    next(error)
  }
}

export async function getClientBotFlow(req, res, next) {
  try {
    const data = await loadBotFlow()
    const client = getClientPayload(req)
    let state = null

    if (client?.sub) {
      const { rows, error } = await query(
        `SELECT id, bot_screen_id, bot_last_button_id
         FROM chats
         WHERE client_id = ? AND is_archived = 0
         ORDER BY id DESC
         LIMIT 1`,
        [client.sub]
      )
      if (error) return next(error)
      const chat = rows?.[0]
      if (chat) {
        const root = data.flow.screens.find(screen => screen.isRoot) || data.flow.screens[0] || null
        const currentScreenId = chat.bot_screen_id || root?.id || null
        state = {
          chatId: Number(chat.id),
          currentScreenId,
          lastButtonId: chat.bot_last_button_id || null,
        }
      }
    }

    res.json({ ...data, state })
  } catch (error) {
    next(error)
  }
}

export async function updateClientBotState(req, res, next) {
  try {
    const client = getClientPayload(req)
    if (!client?.sub) {
      return res.status(401).json({ error: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })
    }

    const chatId = Number(req.params.chatId || req.body?.chatId)
    const screenId = normalizeId(req.body?.screenId)
    const buttonId = normalizeId(req.body?.buttonId)
    if (!chatId || !screenId) {
      return res.status(400).json({ error: 'Estado del bot invalido.', code: 'INVALID_BOT_STATE' })
    }

    const { rows: screenRows, error: screenError } = await query(
      'SELECT id FROM bot_screens WHERE id = ? LIMIT 1',
      [screenId]
    )
    if (screenError) return next(screenError)
    if (!screenRows?.length) {
      return res.status(404).json({ error: 'Pantalla del bot no encontrada.', code: 'BOT_SCREEN_NOT_FOUND' })
    }

    const { rows, error } = await query(
      `UPDATE chats
       SET bot_screen_id = ?, bot_last_button_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND client_id = ?`,
      [screenId, buttonId || null, chatId, client.sub]
    )
    if (error) return next(error)
    if (!rows?.affectedRows) {
      return res.status(404).json({ error: 'Chat no encontrado.', code: 'CHAT_NOT_FOUND' })
    }

    res.json({
      success: true,
      state: {
        chatId,
        currentScreenId: screenId,
        lastButtonId: buttonId || null,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function selectClientBotOption(req, res, next) {
  try {
    const client = getClientPayload(req)
    if (!client?.sub) {
      return res.status(401).json({ error: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })
    }

    const chatId = Number(req.params.chatId || req.body?.chatId)
    const buttonId = normalizeId(req.body?.buttonId)
    const clientMessageId = normalizeId(req.body?.clientMessageId)
    const botMessageIds = Array.isArray(req.body?.botMessageIds) ? req.body.botMessageIds.map(normalizeId) : []
    if (!chatId || !buttonId) {
      return res.status(400).json({ error: 'Opcion del bot invalida.', code: 'INVALID_BOT_OPTION' })
    }

    const { rows: chatRows, error: chatError } = await query(
      `SELECT id, bot_screen_id
       FROM chats
       WHERE id = ? AND client_id = ? AND is_archived = 0
       LIMIT 1`,
      [chatId, client.sub]
    )
    if (chatError) return next(chatError)
    const chat = chatRows?.[0]
    if (!chat) {
      return res.status(404).json({ error: 'Chat no encontrado.', code: 'CHAT_NOT_FOUND' })
    }

    const { rows: buttonRows, error: buttonError } = await query(
      `SELECT bi.id, bi.label, bi.button_type, bi.receipt_processing, bi.receipt_prompt, bi.show_receipt_after, bi.response_messages, bi.action_screen_id, bi.screen_id
       FROM bot_items bi
       WHERE bi.id = ? AND bi.type = 'button'
       LIMIT 1`,
      [buttonId]
    )
    if (buttonError) return next(buttonError)
    const button = buttonRows?.[0]
    if (!button) {
      return res.status(404).json({ error: 'Opcion del bot no encontrada.', code: 'BOT_OPTION_NOT_FOUND' })
    }

    const isReceiptRequest = button.button_type === 'receipt_request'
    const isMessagesOnly = button.button_type === 'messages_only'
    const showReceiptAfter = Boolean(button.show_receipt_after) || isReceiptRequest
    const stayOnScreen = isReceiptRequest || isMessagesOnly
    const targetScreenId = stayOnScreen ? (chat.bot_screen_id || button.screen_id) : (button.action_screen_id || chat.bot_screen_id || button.screen_id)
    const { rows: itemRows, error: itemError } = await query(
      `SELECT id, type, text, label, form_config, button_type, receipt_processing, receipt_prompt, response_messages, action_screen_id, is_back, sort_order
       FROM bot_items
       WHERE screen_id = ?
       ORDER BY sort_order ASC, created_at ASC`,
      [targetScreenId]
    )
    if (itemError) return next(itemError)

    const created = []
    const selected = await persistMessage({
      chatId,
      senderType: 'client',
      content: String(button.label || '').trim(),
      messageType: 'text',
      clientMessageId,
    })
    created.push(selected.message)

    const responseMessages = parseJsonArray(button.response_messages)
      .map((text, index) => ({ id: `${button.id}-response-${index}`, text: String(text || '').trim() }))
      .filter(item => item.text)
    const receiptPromptRaw = showReceiptAfter
      ? await resolveBankPlaceholders(button.receipt_prompt || 'Subi el comprobante para continuar.')
      : null
    const receiptPromptItem = receiptPromptRaw
      ? [{ id: `${button.id}-receipt-prompt`, text: receiptPromptRaw }]
      : []
    const botTexts = responseMessages.length > 0
      ? [...responseMessages, ...receiptPromptItem]
      : showReceiptAfter
      ? receiptPromptItem
      : (itemRows || []).filter(item => item.type === 'message' && item.text)
    for (const [index, item] of botTexts.entries()) {
      const resolvedContent = await resolveBankPlaceholders(String(item.text || '').trim())
      const result = await persistMessage({
        chatId,
        senderType: 'system',
        content: resolvedContent,
        messageType: 'text',
        clientMessageId: botMessageIds[index] || `bot-${buttonId}-${item.id}`,
      })
      created.push(result.message)
    }

    const { rows: updateRows, error: updateError } = await query(
      `UPDATE chats
       SET bot_screen_id = ?, bot_last_button_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND client_id = ?`,
      [targetScreenId, buttonId, chatId, client.sub]
    )
    if (updateError) return next(updateError)
    if (!updateRows?.affectedRows) {
      return res.status(404).json({ error: 'Chat no encontrado.', code: 'CHAT_NOT_FOUND' })
    }

    res.status(201).json({
      success: true,
      messages: created,
      button: {
        id: button.id,
        buttonType: button.button_type || 'navigate',
        receiptProcessing: button.receipt_processing || 'manual',
        receiptPrompt: button.receipt_prompt || '',
        showReceiptAfter,
        responseMessages: parseJsonArray(button.response_messages),
      },
      state: {
        chatId,
        currentScreenId: targetScreenId,
        lastButtonId: buttonId,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function submitClientBotForm(req, res, next) {
  try {
    const client = getClientPayload(req)
    if (!client?.sub) {
      return res.status(401).json({ error: 'Sesion de cliente requerida.', code: 'CLIENT_AUTH_REQUIRED' })
    }

    const chatId = Number(req.params.chatId || req.body?.chatId)
    const formId = normalizeId(req.body?.formId)
    const values = req.body?.values && typeof req.body.values === 'object' ? req.body.values : {}
    const clientMessageId = normalizeId(req.body?.clientMessageId)
    const botMessageIds = Array.isArray(req.body?.botMessageIds) ? req.body.botMessageIds.map(normalizeId) : []
    if (!chatId || !formId) {
      return res.status(400).json({ error: 'Formulario del bot invalido.', code: 'INVALID_BOT_FORM' })
    }

    const { rows: chatRows, error: chatError } = await query(
      `SELECT id, bot_screen_id
       FROM chats
       WHERE id = ? AND client_id = ? AND is_archived = 0
       LIMIT 1`,
      [chatId, client.sub]
    )
    if (chatError) return next(chatError)
    const chat = chatRows?.[0]
    if (!chat) {
      return res.status(404).json({ error: 'Chat no encontrado.', code: 'CHAT_NOT_FOUND' })
    }

    const { rows: formRows, error: formError } = await query(
      `SELECT id, screen_id, label, form_config
       FROM bot_items
       WHERE id = ? AND type = 'form'
       LIMIT 1`,
      [formId]
    )
    if (formError) return next(formError)
    const form = formRows?.[0]
    if (!form) {
      return res.status(404).json({ error: 'Formulario del bot no encontrado.', code: 'BOT_FORM_NOT_FOUND' })
    }

    const formConfig = normalizeFormConfig(form.form_config, form.label)
    const validationErrors = validateFormValues(formConfig, values)
    if (validationErrors.length) {
      return res.status(400).json({ error: 'Formulario incompleto.', details: validationErrors, code: 'INVALID_BOT_FORM_VALUES' })
    }

    const created = []
    const formText = formatFormSubmission(formConfig, values)
    const submitted = await persistMessage({
      chatId,
      senderType: 'client',
      content: formText,
      messageType: 'text',
      clientMessageId,
    })
    created.push(submitted.message)

    if (formConfig.isWithdrawal) {
      const { error: wrErr } = await query(
        `INSERT INTO withdrawal_requests (chat_id, client_id, form_id, message_id, status, form_data)
         VALUES (?, ?, ?, ?, 'pending', ?)`,
        [chatId, client.sub, String(formId), submitted.message.id, formText]
      )
      if (wrErr) {
        console.error('[withdrawal_requests] insert error:', wrErr.message)
        return next(wrErr)
      }
    }

    for (const [index, text] of formConfig.responseMessages.entries()) {
      const resolvedContent = await resolveBankPlaceholders(String(text || '').trim())
      if (!resolvedContent) continue
      const result = await persistMessage({
        chatId,
        senderType: 'system',
        content: resolvedContent,
        messageType: 'text',
        clientMessageId: botMessageIds[index] || `bot-form-${formId}-response-${index}`,
      })
      created.push(result.message)
    }

    const targetScreenId = form.screen_id || chat.bot_screen_id
    const { rows: updateRows, error: updateError } = await query(
      `UPDATE chats
       SET bot_screen_id = ?, bot_last_button_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND client_id = ?`,
      [targetScreenId, formId, chatId, client.sub]
    )
    if (updateError) return next(updateError)
    if (!updateRows?.affectedRows) {
      return res.status(404).json({ error: 'Chat no encontrado.', code: 'CHAT_NOT_FOUND' })
    }

    res.status(201).json({
      success: true,
      messages: created,
      form: {
        id: form.id,
        responseMessages: formConfig.responseMessages,
      },
      state: {
        chatId,
        currentScreenId: targetScreenId,
        lastButtonId: formId,
      },
    })
  } catch (error) {
    next(error)
  }
}

export async function saveBotFlow(req, res, next) {
  try {
    const { errors, screens } = validateFlow(req.body?.flow || req.body)
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'No se pudo guardar el flujo del bot',
        details: errors,
        code: 'INVALID_BOT_FLOW',
      })
    }

    await transaction(async (connection) => {
      await connection.execute('DELETE FROM bot_items')
      await connection.execute('DELETE FROM bot_screens')

      for (const screen of screens) {
        await connection.execute(
          `INSERT INTO bot_screens (id, name, is_root, sort_order)
           VALUES (?, ?, ?, ?)`,
          [screen.id, screen.name, screen.isRoot ? 1 : 0, screen.order]
        )
      }

      for (const screen of screens) {
        for (const item of screen.items) {
          await connection.execute(
            `INSERT INTO bot_items
              (id, screen_id, type, text, label, form_config, button_type, receipt_processing, receipt_prompt, show_receipt_after, response_messages, action_screen_id, is_back, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id,
              screen.id,
              item.type,
              item.type === 'message' ? item.text : null,
              item.type === 'button' ? item.label : item.type === 'form' ? item.formConfig.title : null,
              item.type === 'form' ? JSON.stringify(item.formConfig) : null,
              item.type === 'button' ? item.buttonType : 'navigate',
              item.type === 'button' ? item.receiptProcessing : 'manual',
              item.type === 'button' && (item.buttonType === 'receipt_request' || item.showReceiptAfter) ? item.receiptPrompt : null,
              item.type === 'button' && (item.buttonType === 'receipt_request' || item.showReceiptAfter) ? 1 : 0,
              item.type === 'button' && item.responseMessages?.length ? JSON.stringify(item.responseMessages) : null,
              item.type === 'button' && item.buttonType === 'navigate' && item.actionScreenId ? item.actionScreenId : null,
              item.isBack ? 1 : 0,
              item.order,
            ]
          )
        }
      }
    })

    res.json({ success: true, flow: { screens } })
  } catch (error) {
    next(error)
  }
}
