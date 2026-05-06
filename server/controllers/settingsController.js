import { createHash } from 'crypto'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { query } from '../config/database.js'
import { hashPassword, verifyPassword } from '../utils/password.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROFILE_DIR = join(__dirname, '..', 'public', 'profiles')
const PUBLIC_PROFILE_PREFIX = '/profiles/'
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
    'SELECT currency, operation, min_amount, max_amount, is_active FROM amounts WHERE operation IN ("deposit", "withdrawal")',
    []
  )
  if (error) throw error

  const result = {
    carga: { amount: '10', currency: 'USD' },
    retiro: { amount: '50', currency: 'USD' },
  }

  rows.forEach(row => {
    const key = row.operation === 'deposit' ? 'carga' : 'retiro'
    if (row.is_active) {
      result[key] = {
        amount: String(row.min_amount ?? '0'),
        currency: row.currency || 'USD',
      }
    }
  })

  return result
}

async function getApis() {
  const [casinoResult, awsResult, openrouterResult] = await Promise.all([
    query('SELECT api_url, api_key, api_secret FROM config_casino WHERE id = 1 LIMIT 1'),
    query('SELECT access_key_id, secret_access_key, region, s3_bucket FROM config_aws WHERE id = 1 LIMIT 1'),
    query('SELECT api_key, model FROM config_openrouter WHERE id = 1 LIMIT 1'),
  ])

  if (casinoResult.error) throw casinoResult.error
  if (awsResult.error) throw awsResult.error
  if (openrouterResult.error) throw openrouterResult.error

  const casino = casinoResult.rows?.[0] || {}
  const aws = awsResult.rows?.[0] || {}
  const openrouter = openrouterResult.rows?.[0] || {}

  return {
    casino: { token: casino.api_key || '', url: casino.api_url || '', secret: casino.api_secret || '' },
    aws: { accessKey: aws.access_key_id || '', secretKey: aws.secret_access_key || '', region: aws.region || 'us-east-1', bucket: aws.s3_bucket || '' },
    openrouter: { apiKey: openrouter.api_key || '', model: openrouter.model || 'openai/gpt-4o-mini' },
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
    const [profile, amounts, apis, chatBank, bankData] = await Promise.all([
      getProfile(req.user.sub),
      getAmounts(),
      getApis(),
      getChatBank(),
      getBankProviders(),
    ])

    if (!profile) return res.status(404).json({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' })

    res.json({
      profile: sanitizeUser(profile),
      amounts,
      apis,
      chatBank,
      bankProviders: bankData.providers,
      bankAccounts: bankData.accounts,
    })
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
    const carga = req.body.carga || {}
    const retiro = req.body.retiro || {}
    const payloads = [
      { operation: 'deposit', currency: normalizeText(carga.currency || 'USD').toUpperCase(), amount: Number(carga.amount) },
      { operation: 'withdrawal', currency: normalizeText(retiro.currency || 'USD').toUpperCase(), amount: Number(retiro.amount) },
    ]

    if (payloads.some(item => !item.currency || Number.isNaN(item.amount) || item.amount < 0)) {
      return res.status(400).json({ error: 'Montos invalidos', code: 'INVALID_AMOUNTS' })
    }

    for (const item of payloads) {
      const { error } = await query(
        `INSERT INTO amounts (currency, operation, min_amount, is_active)
         VALUES (?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE min_amount = VALUES(min_amount), is_active = 1`,
        [item.currency, item.operation, item.amount]
      )
      if (error) return next(error)
    }

    res.json({ amounts: await getAmounts() })
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
    } else if (provider === 'aws') {
      const { error } = await query(
        `INSERT INTO config_aws (id, access_key_id, secret_access_key, region, s3_bucket)
         VALUES (1, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE access_key_id = VALUES(access_key_id), secret_access_key = VALUES(secret_access_key), region = VALUES(region), s3_bucket = VALUES(s3_bucket)`,
        [normalizeText(req.body.accessKey), normalizeText(req.body.secretKey), normalizeText(req.body.region || 'us-east-1'), normalizeText(req.body.bucket)]
      )
      if (error) return next(error)
    } else if (provider === 'openrouter') {
      const { error } = await query(
        `INSERT INTO config_openrouter (id, api_key, model)
         VALUES (1, ?, ?)
         ON DUPLICATE KEY UPDATE api_key = VALUES(api_key), model = VALUES(model)`,
        [normalizeText(req.body.apiKey), normalizeText(req.body.model || 'openai/gpt-4o-mini')]
      )
      if (error) return next(error)
    } else {
      return res.status(400).json({ error: 'Proveedor invalido', code: 'INVALID_PROVIDER' })
    }

    res.json({ apis: await getApis() })
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

    res.json({ chatBank: await getChatBank() })
  } catch (err) {
    next(err)
  }
}
