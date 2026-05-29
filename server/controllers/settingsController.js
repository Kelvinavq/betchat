import { createHash } from 'crypto'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { query, transaction } from '../config/database.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { getIo } from '../socket/socketServer.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROFILE_DIR = join(__dirname, '..', 'public', 'profiles')
const BRANDING_DIR = join(__dirname, '..', 'public', 'branding')
const PUBLIC_PROFILE_PREFIX = process.env.PROFILE_PUBLIC_PATH || '/profiles/'
const PUBLIC_BRANDING_PREFIX = process.env.BRANDING_PUBLIC_PATH || '/branding/'
const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function parseJson(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function normalizeText(value) {
  return String(value ?? '').trim()
}

const VALID_BUBBLE_STYLES = ['default', 'open', 'wide', 'minimal']
const VALID_BUBBLE_ICONS = [
  'ChatOutlined', 'ChatBubbleOutlineOutlined', 'SupportAgent', 'Forum',
  'MessageOutlined', 'HelpOutline', 'QuestionAnswerOutlined', 'PhoneOutlined',
  'HeadsetMicOutlined', 'LiveHelp', 'ContactSupportOutlined', 'SmartToyOutlined',
]

function normStyleEntry(e, defText) {
  const entry = e && typeof e === 'object' ? e : {}
  return {
    text: entry.text != null ? String(entry.text).slice(0, 60) : defText,
    icon: VALID_BUBBLE_ICONS.includes(entry.icon) ? entry.icon : 'ChatOutlined',
  }
}

function normalizeBubbleConfig(raw = {}) {
  return {
    style:   VALID_BUBBLE_STYLES.includes(raw.style) ? raw.style : 'default',
    default: normStyleEntry(raw.default, ''),
    open:    normStyleEntry(raw.open, 'Chatear'),
    wide:    normStyleEntry(raw.wide, '¿Necesitas ayuda?'),
    minimal: normStyleEntry(raw.minimal, ''),
  }
}

const RECEIPT_MODELS = new Set([
  'google/gemini-3.1-flash-lite',
  'google/gemini-2.0-flash-001',
  'openai/gpt-4o-mini',
  'google/gemini-2.5-flash',
  'openai/gpt-4o',
])

function normalizeReceiptModel(value) {
  const model = normalizeText(value)
  return RECEIPT_MODELS.has(model) ? model : 'openai/gpt-4o-mini'
}

const BOT_MODES = new Set(['manual', 'hybrid_ai'])

function normalizeBotMode(value) {
  const mode = normalizeText(value).toLowerCase()
  return BOT_MODES.has(mode) ? mode : 'manual'
}

function normalizeBotModel(value) {
  const model = normalizeText(value)
  return model.slice(0, 120)
}

function normalizeBotTemperature(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0.1
  return Math.max(0, Math.min(2, Number(num.toFixed(2))))
}

function normalizeBotMaxTokens(value) {
  const num = Number.parseInt(value, 10)
  if (!Number.isFinite(num) || num <= 0) return 250
  return Math.max(1, Math.min(2000, num))
}

const SUPPORTED_CURRENCIES = ['USD', 'ARS', 'MXN', 'COP', 'CLP', 'UYU']
const SUPPORTED_OPERATIONS = ['deposit', 'withdrawal']

function normalizeCurrency(value) {
  return normalizeText(value).toUpperCase()
}

function validateAmountEntry(item) {
  const currency = normalizeCurrency(item.currency || '')
  const operation = normalizeText(item.operation || '').toLowerCase()
  const amount = Number(item.amount)
  const is_active = item.is_active === false ? 0 : 1

  if (!SUPPORTED_CURRENCIES.includes(currency)) {
    return { valid: false, message: `Moneda no soportada: ${currency}` }
  }
  if (!SUPPORTED_OPERATIONS.includes(operation)) {
    return { valid: false, message: `Operacion invalida: ${operation}` }
  }
  if (Number.isNaN(amount) || amount < 0) {
    return { valid: false, message: 'Monto invalido' }
  }

  return {
    valid: true,
    value: {
      currency,
      operation,
      amount,
      is_active,
    },
  }
}

function sanitizeUser(row) {
  return {
    id: row.id,
    username: row.username,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    avatar_url: row.avatar_url || null,
  }
}

function dataUrlToFile(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=]+)$/i)
  if (!match) return null

  const mime = match[1].toLowerCase()
  const buffer = Buffer.from(match[2], 'base64')
  if (!IMAGE_TYPES[mime] || buffer.length === 0 || buffer.length > 3 * 1024 * 1024) return null

  const hash = createHash('sha256')
    .update(buffer)
    .update(String(Date.now()))
    .digest('hex')
  const filename = `${hash}.${IMAGE_TYPES[mime]}`
  return { buffer, filename, url: `${PUBLIC_PROFILE_PREFIX}${filename}` }
}

function dataUrlToBrandFile(dataUrl) {
  const file = dataUrlToFile(dataUrl)
  if (!file) return null
  return { ...file, url: `${PUBLIC_BRANDING_PREFIX}${file.filename}` }
}

async function removeProfileFile(url) {
  if (!url || !url.startsWith(PUBLIC_PROFILE_PREFIX)) return
  const name = url.replace(PUBLIC_PROFILE_PREFIX, '')
  if (!name || name.includes('/') || name.includes('\\')) return

  try {
    await unlink(join(PROFILE_DIR, name))
  } catch {
    // Missing old avatars are harmless.
  }
}

async function removeBrandingFile(url) {
  if (!url || !url.startsWith(PUBLIC_BRANDING_PREFIX)) return
  const name = url.replace(PUBLIC_BRANDING_PREFIX, '')
  if (!name || name.includes('/') || name.includes('\\')) return

  try {
    await unlink(join(BRANDING_DIR, name))
  } catch {
    // Missing old logos are harmless.
  }
}

export async function getSystemConfig() {
  const { rows, error } = await query(
    'SELECT app_name, logo_url, favicon_url, iframe_url, timezone, support_type, support_value, support_text, client_registration_enabled, client_logout_enabled, bot_mode, bot_ai_model, bot_ai_temperature, bot_ai_max_tokens, bubble_config, referral_enabled, referral_fichas FROM system_config WHERE id = 1 LIMIT 1',
    []
  )
  if (error) throw error
  const row = rows?.[0] || {}
  return {
    appName: row.app_name || 'BetChat',
    logoUrl: row.logo_url || '',
    faviconUrl: row.favicon_url || '',
    iframeUrl: row.iframe_url || '',
    timezone: row.timezone || 'America/Bogota',
    supportType: row.support_type || 'phone',
    supportValue: row.support_value || '',
    supportText: row.support_text || '',
    clientRegistrationEnabled: row.client_registration_enabled !== 0,
    clientLogoutEnabled: row.client_logout_enabled !== 0,
    botMode: normalizeBotMode(row.bot_mode),
    botAiModel: normalizeBotModel(row.bot_ai_model),
    botAiTemperature: normalizeBotTemperature(row.bot_ai_temperature),
    botAiMaxTokens: normalizeBotMaxTokens(row.bot_ai_max_tokens),
    bubbleConfig: normalizeBubbleConfig(parseJson(row.bubble_config)),
    referralEnabled: row.referral_enabled !== 0,
    referralFichas:  Number(row.referral_fichas) || 0,
  }
}

async function ensureSystemConfig() {
  const { error } = await query('INSERT IGNORE INTO system_config (id) VALUES (1)', [])
  if (error) throw error
}

async function getProfile(userId) {
  const { rows, error } = await query(
    'SELECT id, username, full_name, email, role, avatar_url FROM users WHERE id = ? LIMIT 1',
    [userId]
  )
  if (error) throw error
  return rows?.[0] || null
}

async function getAmounts() {
  const { rows, error } = await query(
    `SELECT currency, operation, min_amount, max_amount, is_active
     FROM amounts
     WHERE operation IN ("deposit", "withdrawal")
     ORDER BY operation, is_active DESC, updated_at DESC, id DESC`,
    []
  )
  if (error) throw error

  const result = {
    carga: { amount: '10', currency: 'USD' },
    retiro: { amount: '50', currency: 'USD' },
  }
  const assigned = {
    carga: false,
    retiro: false,
  }

  rows.forEach(row => {
    const key = row.operation === 'deposit' ? 'carga' : 'retiro'
    if (row.is_active && !assigned[key]) {
      result[key] = {
        amount: String(row.min_amount ?? '0'),
        currency: row.currency || 'USD',
      }
      assigned[key] = true
    }
  })

  return result
}

async function getAmountsList() {
  const { rows, error } = await query(
    'SELECT currency, operation, min_amount, is_active FROM amounts WHERE operation IN ("deposit", "withdrawal") ORDER BY operation, currency',
    []
  )
  if (error) throw error

  return rows.map(row => ({
    currency: row.currency || 'USD',
    operation: row.operation,
    amount: String(row.min_amount ?? '0'),
    is_active: Boolean(row.is_active),
  }))
}

function buildAmountResponse(amountEntry) {
  return {
    currency: amountEntry.currency,
    operation: amountEntry.operation,
    amount: String(amountEntry.amount),
    is_active: Boolean(amountEntry.is_active),
  }
}

async function getApis() {
  const [casinoResult, openrouterResult] = await Promise.all([
    query('SELECT api_url, api_key, api_secret FROM config_casino WHERE id = 1 LIMIT 1'),
    query('SELECT api_key, model FROM config_openrouter WHERE id = 1 LIMIT 1'),
  ])

  if (casinoResult.error) throw casinoResult.error
  if (openrouterResult.error) throw openrouterResult.error

  const casino = casinoResult.rows?.[0] || {}
  const openrouter = openrouterResult.rows?.[0] || {}

  return {
    casino: { token: casino.api_key || '', url: casino.api_url || '', secret: casino.api_secret || '' },
    openrouter: { apiKey: openrouter.api_key || '', model: normalizeReceiptModel(openrouter.model) },
  }
}

async function getChatBank() {
  const { rows, error } = await query(
    `SELECT cpc.bank_account_id, bp.slug AS provider
     FROM chat_processing_config cpc
     LEFT JOIN bank_accounts ba ON ba.id = cpc.bank_account_id
     LEFT JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE cpc.id = 1
     LIMIT 1`,
    []
  )
  if (error) throw error

  return {
    provider: rows?.[0]?.provider || null,
    accountId: rows?.[0]?.bank_account_id ? String(rows[0].bank_account_id) : '',
  }
}

export async function getThemeConfig() {
  const { rows, error } = await query(
    'SELECT client_theme, admin_theme FROM theme_config WHERE id = 1 LIMIT 1',
    []
  )
  if (error) throw error

  return {
    clientTheme: rows?.[0]?.client_theme || 'betchat-dark',
    adminTheme: rows?.[0]?.admin_theme || 'dark-blue',
    customThemes: await getCustomThemes(),
  }
}

function sanitizeThemeRow(row) {
  const config = parseJson(row.config)
  return {
    ...config,
    id: `${row.scope}-custom-${row.id}`,
    dbId: Number(row.id),
    name: row.name,
    custom: true,
  }
}

async function getCustomThemes() {
  const { rows, error } = await query(
    'SELECT id, name, scope, config FROM themes WHERE is_custom = 1 ORDER BY updated_at DESC, id DESC',
    []
  )
  if (error) throw error

  return {
    client: (rows || []).filter(row => row.scope === 'client').map(sanitizeThemeRow),
    admin: (rows || []).filter(row => row.scope === 'admin').map(sanitizeThemeRow),
  }
}

function normalizeThemePayload(scope, rawTheme) {
  const theme = parseJson(rawTheme)
  const name = normalizeText(theme.name)
  if (!name) {
    const error = new Error('Nombre de tema requerido')
    error.status = 400
    throw error
  }

  if (scope === 'client') {
    return {
      name,
      config: {
        desc: theme.desc || 'Tema personalizado',
        headerBg: theme.headerBg || '#0f1122',
        headerColor: theme.headerColor || '#ffffff',
        bodyBg: theme.bodyBg || '#08080f',
        sentBubble: theme.sentBubble || '#1e40af',
        sentText: theme.sentText || '#dbeafe',
        recvBubble: theme.recvBubble || '#1a1a2e',
        recvText: theme.recvText || '#e2e8f0',
        inputBg: theme.inputBg || '#111124',
        accent: theme.accent || '#2563eb',
        waTheme: false,
      },
    }
  }

  return {
    name,
    config: {
      desc: theme.desc || name,
      sidebarBg: theme.sidebarBg || '#0b0b18',
      sidebarAccent: theme.sidebarAccent || '#1e85ff',
      topbarBg: theme.topbarBg || '#0d0d1f',
      contentBg: theme.contentBg || '#08080f',
      cardBg: theme.cardBg || '#111124',
      swatches: [
        theme.sidebarBg || '#0b0b18',
        theme.sidebarAccent || '#1e85ff',
        theme.contentBg || '#08080f',
      ],
    },
  }
}

export async function getPublicThemeConfig(req, res, next) {
  try {
    res.json({ themeConfig: await getThemeConfig() })
  } catch (err) {
    next(err)
  }
}

export async function getPublicSystemConfig(req, res, next) {
  try {
    await ensureSystemConfig()
    res.json({ system: await getSystemConfig() })
  } catch (err) {
    next(err)
  }
}

async function getBankProviders() {
  const { rows, error } = await query(
    `SELECT
      bp.id,
      bp.slug,
      bp.name,
      COUNT(ba.id) AS total
     FROM bank_providers bp
     LEFT JOIN bank_accounts ba ON ba.provider_id = bp.id AND ba.is_active = 1
     WHERE bp.is_active = 1
     GROUP BY bp.id, bp.slug, bp.name
     ORDER BY bp.id ASC`,
    []
  )
  if (error) throw error

  const { rows: accountRows, error: accountError } = await query(
    `SELECT
      ba.id,
      ba.alias,
      ba.account_data,
      bp.slug AS provider
     FROM bank_accounts ba
     INNER JOIN bank_providers bp ON bp.id = ba.provider_id
     WHERE ba.is_active = 1
     ORDER BY ba.updated_at DESC, ba.id DESC`,
    []
  )
  if (accountError) throw accountError

  const accounts = accountRows.reduce((acc, row) => {
    const data = parseJson(row.account_data)
    if (!acc[row.provider]) acc[row.provider] = []
    acc[row.provider].push({
      id: row.id,
      label: `${data.nombre_titular || row.alias || 'Cuenta'} - ${row.alias || data.alias || row.id}`,
    })
    return acc
  }, {})

  return {
    providers: rows.map(row => ({
      id: row.slug,
      label: row.name,
      count: Number(row.total || 0),
    })),
    accounts,
  }
}

export async function getSettings(req, res, next) {
  try {
    await ensureSystemConfig()
    const [profile, amounts, amountsList, apis, chatBank, bankData, themeConfig, systemConfig] = await Promise.all([
      getProfile(req.user.sub),
      getAmounts(),
      getAmountsList(),
      getApis(),
      getChatBank(),
      getBankProviders(),
      getThemeConfig(),
      getSystemConfig(),
    ])

    if (!profile) return res.status(404).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' })

    res.json({
      profile: sanitizeUser(profile),
      amounts,
      amountsList,
      supportedCurrencies: SUPPORTED_CURRENCIES,
      apis,
      chatBank,
      bankProviders: bankData.providers,
      bankAccounts: bankData.accounts,
      themeConfig,
      systemConfig,
    })
  } catch (err) {
    next(err)
  }
}

export async function updateSystemConfig(req, res, next) {
  try {
    await ensureSystemConfig()
    const current = await getSystemConfig()
    const appName = normalizeText(req.body.appName || req.body.app_name || current.appName) || 'BetChat'
    const registrationValue = req.body.clientRegistrationEnabled ?? req.body.client_registration_enabled ?? current.clientRegistrationEnabled
    const clientRegistrationEnabled = registrationValue === false || registrationValue === 0 || registrationValue === '0' ? 0 : 1
    const logoutValue = req.body.clientLogoutEnabled ?? req.body.client_logout_enabled ?? current.clientLogoutEnabled
    const clientLogoutEnabled = logoutValue === false || logoutValue === 0 || logoutValue === '0' ? 0 : 1
    let logoUrl    = normalizeText(req.body.logoUrl    || req.body.logo_url    || current.logoUrl)
    let faviconUrl = normalizeText(req.body.faviconUrl || req.body.favicon_url || current.faviconUrl)

    if (req.body.logoDataUrl || req.body.logo_data_url) {
      const image = dataUrlToBrandFile(req.body.logoDataUrl || req.body.logo_data_url)
      if (!image) return res.status(400).json({ error: 'Logo invalido', code: 'INVALID_LOGO' })
      await mkdir(BRANDING_DIR, { recursive: true })
      await writeFile(join(BRANDING_DIR, image.filename), image.buffer)
      await removeBrandingFile(current.logoUrl)
      logoUrl = image.url
    }

    if (req.body.clearLogo) {
      await removeBrandingFile(current.logoUrl)
      logoUrl = ''
    }

    if (req.body.faviconDataUrl || req.body.favicon_data_url) {
      const image = dataUrlToBrandFile(req.body.faviconDataUrl || req.body.favicon_data_url)
      if (!image) return res.status(400).json({ error: 'Favicon invalido', code: 'INVALID_FAVICON' })
      await mkdir(BRANDING_DIR, { recursive: true })
      await writeFile(join(BRANDING_DIR, image.filename), image.buffer)
      await removeBrandingFile(current.faviconUrl)
      faviconUrl = image.url
    }

    if (req.body.clearFavicon) {
      await removeBrandingFile(current.faviconUrl)
      faviconUrl = ''
    }

    const isValidTimezone = (tz) => {
      if (!tz || typeof tz !== 'string') return false
      try { new Intl.DateTimeFormat(undefined, { timeZone: tz }); return true } catch { return false }
    }
    const timezone = isValidTimezone(req.body.timezone) ? req.body.timezone : (current.timezone || 'America/Bogota')
    const supportType = ['link', 'phone'].includes(req.body.supportType) ? req.body.supportType : (current.supportType || 'phone')
    const supportValue = normalizeText(req.body.supportValue ?? req.body.support_value ?? current.supportValue ?? '').slice(0, 500)
    const supportText  = normalizeText(req.body.supportText  ?? req.body.support_text  ?? current.supportText  ?? '').slice(0, 200)
    const iframeUrl = normalizeText(req.body.iframeUrl ?? req.body.iframe_url ?? current.iframeUrl ?? '').slice(0, 2048)
    const botMode = normalizeBotMode(req.body.botMode ?? req.body.bot_mode ?? current.botMode ?? 'manual')
    const botAiModel = normalizeBotModel(req.body.botAiModel ?? req.body.bot_ai_model ?? current.botAiModel ?? '')
    const botAiTemperature = normalizeBotTemperature(req.body.botAiTemperature ?? req.body.bot_ai_temperature ?? current.botAiTemperature ?? 0.1)
    const botAiMaxTokens = normalizeBotMaxTokens(req.body.botAiMaxTokens ?? req.body.bot_ai_max_tokens ?? current.botAiMaxTokens ?? 250)

    const bubbleConfig = normalizeBubbleConfig(
      req.body.bubbleConfig ?? req.body.bubble_config ?? current.bubbleConfig ?? {}
    )

    const referralEnabledRaw = req.body.referralEnabled ?? req.body.referral_enabled ?? current.referralEnabled
    const referralEnabled = (referralEnabledRaw === false || referralEnabledRaw === 0 || referralEnabledRaw === '0') ? 0 : 1
    const referralFichas  = Math.max(0, Math.min(99999, parseInt(req.body.referralFichas ?? req.body.referral_fichas ?? current.referralFichas ?? 0, 10) || 0))

    const { error } = await query(
      `INSERT INTO system_config (id, app_name, logo_url, favicon_url, iframe_url, timezone, support_type, support_value, support_text, client_registration_enabled, client_logout_enabled, bot_mode, bot_ai_model, bot_ai_temperature, bot_ai_max_tokens, bubble_config, referral_enabled, referral_fichas)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE app_name = VALUES(app_name), logo_url = VALUES(logo_url), favicon_url = VALUES(favicon_url), iframe_url = VALUES(iframe_url), timezone = VALUES(timezone), support_type = VALUES(support_type), support_value = VALUES(support_value), support_text = VALUES(support_text), client_registration_enabled = VALUES(client_registration_enabled), client_logout_enabled = VALUES(client_logout_enabled), bot_mode = VALUES(bot_mode), bot_ai_model = VALUES(bot_ai_model), bot_ai_temperature = VALUES(bot_ai_temperature), bot_ai_max_tokens = VALUES(bot_ai_max_tokens), bubble_config = VALUES(bubble_config), referral_enabled = VALUES(referral_enabled), referral_fichas = VALUES(referral_fichas)`,
      [appName.slice(0, 120), logoUrl || null, faviconUrl || null, iframeUrl || null, timezone, supportType, supportValue || null, supportText || null, clientRegistrationEnabled, clientLogoutEnabled, botMode, botAiModel || null, botAiTemperature, botAiMaxTokens, JSON.stringify(bubbleConfig), referralEnabled, referralFichas]
    )
    if (error) return next(error)

    res.json({ systemConfig: await getSystemConfig() })
  } catch (err) {
    next(err)
  }
}

export async function updateProfile(req, res, next) {
  try {
    const userId = req.user.sub
    const username = normalizeText(req.body.username)
    const fullName = normalizeText(req.body.full_name || req.body.username)
    const email = normalizeText(req.body.email).toLowerCase()

    if (!username || !email) {
      return res.status(400).json({ error: 'Usuario y correo son requeridos', code: 'INVALID_PROFILE' })
    }

    const { rows: conflicts, error: conflictError } = await query(
      'SELECT id, username, email FROM users WHERE (username = ? OR email = ?) AND id != ? LIMIT 1',
      [username, email, userId]
    )
    if (conflictError) return next(conflictError)
    if (conflicts?.length) {
      return res.status(409).json({ error: 'El usuario o correo ya esta en uso', code: 'USER_CONFLICT' })
    }

    const current = await getProfile(userId)
    if (!current) return res.status(404).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' })

    let avatarUrl = current.avatar_url || null
    if (req.body.clearAvatar) {
      await removeProfileFile(current.avatar_url)
      avatarUrl = null
    }
    if (req.body.avatar_data_url) {
      const image = dataUrlToFile(req.body.avatar_data_url)
      if (!image) return res.status(400).json({ error: 'Imagen de perfil invalida', code: 'INVALID_AVATAR' })

      await mkdir(PROFILE_DIR, { recursive: true })
      await writeFile(join(PROFILE_DIR, image.filename), image.buffer)
      await removeProfileFile(current.avatar_url)
      avatarUrl = image.url
    }

    const { error } = await query(
      'UPDATE users SET username = ?, full_name = ?, email = ?, avatar_url = ? WHERE id = ?',
      [username, fullName || username, email, avatarUrl, userId]
    )
    if (error) return next(error)

    const updated = await getProfile(userId)
    res.json({ profile: sanitizeUser(updated) })
  } catch (err) {
    next(err)
  }
}

export async function updatePassword(req, res, next) {
  try {
    const currentPassword = String(req.body.current || '')
    const nextPassword = String(req.body.next || '')
    const confirmPassword = String(req.body.confirm || '')

    if (nextPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contrasena debe tener al menos 8 caracteres', code: 'WEAK_PASSWORD' })
    }
    if (nextPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Las contrasenas no coinciden', code: 'PASSWORD_MISMATCH' })
    }

    const { rows, error } = await query('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [req.user.sub])
    if (error) return next(error)
    const user = rows?.[0]
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' })

    const valid = await verifyPassword(currentPassword, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'La contrasena actual no es correcta', code: 'INVALID_PASSWORD' })

    const passwordHash = await hashPassword(nextPassword)
    const { error: updateError } = await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user.sub])
    if (updateError) return next(updateError)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function updateAmounts(req, res, next) {
  try {
    const entries = Array.isArray(req.body)
      ? req.body
      : [
        { operation: 'deposit', currency: normalizeText(req.body.carga?.currency || 'USD').toUpperCase(), amount: Number(req.body.carga?.amount) },
        { operation: 'withdrawal', currency: normalizeText(req.body.retiro?.currency || 'USD').toUpperCase(), amount: Number(req.body.retiro?.amount) },
      ]

    const normalized = entries.map(item => {
      const validation = validateAmountEntry(item)
      if (!validation.valid) {
        throw new Error(validation.message)
      }
      return validation.value
    })

    await transaction(async (connection) => {
      for (const item of normalized) {
        await connection.execute(
          'UPDATE amounts SET is_active = 0 WHERE operation = ? AND currency <> ?',
          [item.operation, item.currency]
        )
        await connection.execute(
        `INSERT INTO amounts (currency, operation, min_amount, is_active)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE min_amount = VALUES(min_amount), is_active = VALUES(is_active), updated_at = CURRENT_TIMESTAMP`,
          [item.currency, item.operation, item.amount, item.is_active]
        )
      }
    })

    res.json({ amounts: await getAmounts(), amountsList: await getAmountsList() })
  } catch (err) {
    if (err.message && err.message.startsWith('Moneda no soportada')) {
      return res.status(400).json({ error: err.message, code: 'INVALID_CURRENCY' })
    }
    if ((err.message && err.message.startsWith('Operacion invalida')) || err.message === 'Monto invalido') {
      return res.status(400).json({ error: err.message, code: 'INVALID_AMOUNTS' })
    }
    next(err)
  }
}

export async function getAmountsListRoute(req, res, next) {
  try {
    res.json({ amountsList: await getAmountsList(), supportedCurrencies: SUPPORTED_CURRENCIES })
  } catch (err) {
    next(err)
  }
}

export async function createAmount(req, res, next) {
  try {
    const validation = validateAmountEntry(req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message, code: 'INVALID_AMOUNTS' })
    }

    const value = validation.value
    const { rows: existing, error: existingError } = await query(
      'SELECT 1 FROM amounts WHERE currency = ? AND operation = ? LIMIT 1',
      [value.currency, value.operation]
    )
    if (existingError) return next(existingError)
    if (existing?.length) {
      return res.status(409).json({ error: 'El monto ya existe para esa moneda y operacion', code: 'AMOUNT_CONFLICT' })
    }

    const { error } = await query(
      'INSERT INTO amounts (currency, operation, min_amount, is_active) VALUES (?, ?, ?, ?)',
      [value.currency, value.operation, value.amount, value.is_active]
    )
    if (error) return next(error)

    res.status(201).json({ amount: buildAmountResponse(value), amountsList: await getAmountsList() })
  } catch (err) {
    if (err.message && err.message.startsWith('Moneda no soportada')) {
      return res.status(400).json({ error: err.message, code: 'INVALID_CURRENCY' })
    }
    next(err)
  }
}

export async function updateAmount(req, res, next) {
  try {
    const originalCurrency = normalizeCurrency(req.params.currency)
    const originalOperation = normalizeText(req.params.operation).toLowerCase()

    const validation = validateAmountEntry(req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.message, code: 'INVALID_AMOUNTS' })
    }

    const value = validation.value

    const { rows: existingRows, error: existingError } = await query(
      'SELECT 1 FROM amounts WHERE currency = ? AND operation = ? LIMIT 1',
      [originalCurrency, originalOperation]
    )
    if (existingError) return next(existingError)
    if (!existingRows?.length) {
      return res.status(404).json({ error: 'Monto no encontrado', code: 'AMOUNT_NOT_FOUND' })
    }

    if ((value.currency !== originalCurrency || value.operation !== originalOperation) && value.is_active) {
      const { rows: conflictRows, error: conflictError } = await query(
        'SELECT 1 FROM amounts WHERE currency = ? AND operation = ? LIMIT 1',
        [value.currency, value.operation]
      )
      if (conflictError) return next(conflictError)
      if (conflictRows?.length) {
        return res.status(409).json({ error: 'Ya existe un monto con esa moneda y operacion', code: 'AMOUNT_CONFLICT' })
      }
    }

    const { error } = await query(
      'UPDATE amounts SET currency = ?, operation = ?, min_amount = ?, is_active = ? WHERE currency = ? AND operation = ?',
      [value.currency, value.operation, value.amount, value.is_active, originalCurrency, originalOperation]
    )
    if (error) return next(error)

    res.json({ amount: buildAmountResponse(value), amountsList: await getAmountsList() })
  } catch (err) {
    if (err.message && err.message.startsWith('Moneda no soportada')) {
      return res.status(400).json({ error: err.message, code: 'INVALID_CURRENCY' })
    }
    next(err)
  }
}

export async function deleteAmount(req, res, next) {
  try {
    const currency = normalizeCurrency(req.params.currency)
    const operation = normalizeText(req.params.operation).toLowerCase()

    const { rows: existingRows, error: existingError } = await query(
      'SELECT 1 FROM amounts WHERE currency = ? AND operation = ? LIMIT 1',
      [currency, operation]
    )
    if (existingError) return next(existingError)
    if (!existingRows?.length) {
      return res.status(404).json({ error: 'Monto no encontrado', code: 'AMOUNT_NOT_FOUND' })
    }

    const { error } = await query(
      'UPDATE amounts SET is_active = 0 WHERE currency = ? AND operation = ?',
      [currency, operation]
    )
    if (error) return next(error)

    res.json({ amountsList: await getAmountsList() })
  } catch (err) {
    next(err)
  }
}

export async function updateApiConfig(req, res, next) {
  try {
    const provider = String(req.params.provider || '')

    if (provider === 'casino') {
      const { error } = await query(
        `INSERT INTO config_casino (id, api_url, api_key, api_secret)
         VALUES (1, ?, ?, ?)
         ON DUPLICATE KEY UPDATE api_url = VALUES(api_url), api_key = VALUES(api_key), api_secret = VALUES(api_secret)`,
        [normalizeText(req.body.url), normalizeText(req.body.token), normalizeText(req.body.secret)]
      )
      if (error) return next(error)
    } else if (provider === 'openrouter') {
      const model = normalizeReceiptModel(req.body.model)
      const { error } = await query(
        `INSERT INTO config_openrouter (id, api_key, model)
         VALUES (1, ?, ?)
         ON DUPLICATE KEY UPDATE api_key = VALUES(api_key), model = VALUES(model)`,
        [normalizeText(req.body.apiKey), model]
      )
      if (error) return next(error)

      const current = await getSystemConfig()
      const botMode = normalizeBotMode(req.body.botMode ?? req.body.bot_mode ?? current.botMode ?? 'manual')
      const botAiModel = normalizeBotModel(req.body.botAiModel ?? req.body.bot_ai_model ?? current.botAiModel ?? '')
      const botAiTemperature = normalizeBotTemperature(req.body.botAiTemperature ?? req.body.bot_ai_temperature ?? current.botAiTemperature ?? 0.1)
      const botAiMaxTokens = normalizeBotMaxTokens(req.body.botAiMaxTokens ?? req.body.bot_ai_max_tokens ?? current.botAiMaxTokens ?? 250)

      const { error: botError } = await query(
        `INSERT INTO system_config (id, bot_mode, bot_ai_model, bot_ai_temperature, bot_ai_max_tokens)
         VALUES (1, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE bot_mode = VALUES(bot_mode), bot_ai_model = VALUES(bot_ai_model), bot_ai_temperature = VALUES(bot_ai_temperature), bot_ai_max_tokens = VALUES(bot_ai_max_tokens)`,
        [botMode, botAiModel || null, botAiTemperature, botAiMaxTokens]
      )
      if (botError) return next(botError)
    } else {
      return res.status(400).json({ error: 'Proveedor invalido', code: 'INVALID_PROVIDER' })
    }

    const [apis, systemConfig] = await Promise.all([getApis(), getSystemConfig()])
    res.json({ apis, systemConfig })
  } catch (err) {
    next(err)
  }
}

export async function updateChatBank(req, res, next) {
  try {
    const accountId = parseInt(req.body.accountId, 10)
    if (!accountId || isNaN(accountId)) {
      return res.status(400).json({ error: 'Cuenta bancaria requerida', code: 'INVALID_BANK_ACCOUNT' })
    }

    const { rows, error: accountError } = await query(
      'SELECT id FROM bank_accounts WHERE id = ? AND is_active = 1 LIMIT 1',
      [accountId]
    )
    if (accountError) return next(accountError)
    if (!rows?.length) {
      return res.status(404).json({ error: 'Cuenta bancaria no encontrada o inactiva', code: 'BANK_ACCOUNT_NOT_FOUND' })
    }

    const { error } = await query(
      `INSERT INTO chat_processing_config (id, bank_account_id)
       VALUES (1, ?)
       ON DUPLICATE KEY UPDATE bank_account_id = VALUES(bank_account_id)`,
      [accountId]
    )
    if (error) return next(error)

    const updatedBank = await getChatBank()
    res.json({ chatBank: updatedBank })
    const io = getIo()
    if (io) io.to('admins').emit('settings:chat-bank-updated', { chatBank: updatedBank })
  } catch (err) {
    next(err)
  }
}

export async function getChatBankRoute(req, res, next) {
  try {
    const [chatBank, bankData] = await Promise.all([getChatBank(), getBankProviders()])
    res.json({ chatBank, bankAccounts: bankData.accounts })
  } catch (err) {
    next(err)
  }
}

export async function updateThemeConfig(req, res, next) {
  try {
    const clientTheme = String(req.body.clientTheme || '').trim()
    const adminTheme = String(req.body.adminTheme || '').trim()

    if (!clientTheme || !adminTheme) {
      return res.status(400).json({ error: 'Temas de cliente y admin son requeridos', code: 'INVALID_THEMES' })
    }

    const { error } = await query(
      `INSERT INTO theme_config (id, client_theme, admin_theme)
       VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE client_theme = VALUES(client_theme), admin_theme = VALUES(admin_theme)`,
      [clientTheme, adminTheme]
    )
    if (error) return next(error)

    res.json({ themeConfig: await getThemeConfig() })
  } catch (err) {
    next(err)
  }
}

export async function createCustomTheme(req, res, next) {
  try {
    const scope = normalizeText(req.body.scope).toLowerCase()
    if (!['client', 'admin'].includes(scope)) {
      return res.status(400).json({ error: 'Scope de tema invalido', code: 'INVALID_THEME_SCOPE' })
    }

    const payload = normalizeThemePayload(scope, req.body.theme)
    const { rows, error } = await query(
      'INSERT INTO themes (name, scope, is_custom, config, created_by) VALUES (?, ?, 1, ?, ?)',
      [payload.name, scope, JSON.stringify(payload.config), req.user?.sub || null]
    )
    if (error) return next(error)

    const theme = {
      ...payload.config,
      id: `${scope}-custom-${rows.insertId}`,
      dbId: Number(rows.insertId),
      name: payload.name,
      custom: true,
    }
    res.status(201).json({ theme, themeConfig: await getThemeConfig() })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: 'INVALID_THEME' })
    next(err)
  }
}

export async function updateCustomTheme(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    const scope = normalizeText(req.body.scope).toLowerCase()
    if (!id || !['client', 'admin'].includes(scope)) {
      return res.status(400).json({ error: 'Tema invalido', code: 'INVALID_THEME' })
    }

    const payload = normalizeThemePayload(scope, req.body.theme)
    const { error } = await query(
      'UPDATE themes SET name = ?, config = ? WHERE id = ? AND scope = ? AND is_custom = 1',
      [payload.name, JSON.stringify(payload.config), id, scope]
    )
    if (error) return next(error)

    res.json({
      theme: { ...payload.config, id: `${scope}-custom-${id}`, dbId: id, name: payload.name, custom: true },
      themeConfig: await getThemeConfig(),
    })
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message, code: 'INVALID_THEME' })
    next(err)
  }
}

export async function deleteCustomTheme(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10)
    const scope = normalizeText(req.query.scope).toLowerCase()
    if (!id || !['client', 'admin'].includes(scope)) {
      return res.status(400).json({ error: 'Tema invalido', code: 'INVALID_THEME' })
    }

    await query('DELETE FROM themes WHERE id = ? AND scope = ? AND is_custom = 1', [id, scope])
    const themeConfig = await getThemeConfig()
    const fallback = scope === 'client' ? 'betchat-dark' : 'dark-blue'
    if ((scope === 'client' && themeConfig.clientTheme === `client-custom-${id}`) || (scope === 'admin' && themeConfig.adminTheme === `admin-custom-${id}`)) {
      await query(
        `INSERT INTO theme_config (id, client_theme, admin_theme)
         VALUES (1, ?, ?)
         ON DUPLICATE KEY UPDATE ${scope === 'client' ? 'client_theme' : 'admin_theme'} = ?`,
        scope === 'client'
          ? [fallback, themeConfig.adminTheme, fallback]
          : [themeConfig.clientTheme, fallback, fallback]
      )
    }

    res.json({ themeConfig: await getThemeConfig() })
  } catch (err) {
    next(err)
  }
}
