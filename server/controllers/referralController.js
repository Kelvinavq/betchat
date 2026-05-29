import { query } from '../config/database.js'
import { persistMessage } from './chatController.js'
import { getSystemConfig } from './settingsController.js'
import { randomBytes } from 'crypto'

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeCode(value) {
  return normalizeText(value).toUpperCase()
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
let referralRewardsTableReady = null

function generateReferralCode() {
  const bytes = randomBytes(8)
  const prefix = Array.from({ length: 4 }, (_, i) => LETTERS[bytes[i] % LETTERS.length]).join('')
  const suffix = Array.from({ length: 4 }, (_, i) => ALNUM[bytes[4 + i] % ALNUM.length]).join('')
  return `${prefix}-${suffix}`
}

export async function ensureReferralCode(clientId) {
  const { rows, error } = await query('SELECT referral_code FROM clients WHERE id = ? LIMIT 1', [Number(clientId)])
  if (error) throw error
  if (rows?.[0]?.referral_code) return rows[0].referral_code

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode()
    try {
      await query(
        'UPDATE clients SET referral_code = ? WHERE id = ? AND referral_code IS NULL',
        [code, Number(clientId)],
      )
      const { rows: checkRows, error: checkError } = await query(
        'SELECT referral_code FROM clients WHERE id = ? LIMIT 1',
        [Number(clientId)],
      )
      if (checkError) throw checkError
      if (checkRows?.[0]?.referral_code) return checkRows[0].referral_code
    } catch (err) {
      if (err?.code !== 'ER_DUP_ENTRY') throw err
    }
  }

  throw new Error('No se pudo generar codigo de referido unico.')
}

async function ensureReferralRewardsTable() {
  if (!referralRewardsTableReady) {
    referralRewardsTableReady = (async () => {
      const { error } = await query(`
        CREATE TABLE IF NOT EXISTS referral_rewards (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          referrer_client_id INT UNSIGNED NOT NULL,
          referred_client_id INT UNSIGNED NOT NULL,
          source_table VARCHAR(80) NOT NULL,
          source_movement_id BIGINT UNSIGNED NOT NULL,
          reward_amount INT UNSIGNED NOT NULL DEFAULT 0,
          reward_status ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
          source_movement_amount DECIMAL(18,2) DEFAULT NULL,
          source_movement_created_at DATETIME DEFAULT NULL,
          error_message TEXT DEFAULT NULL,
          paid_at DATETIME DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_referral_source_movement (source_table, source_movement_id),
          KEY idx_referral_referrer (referrer_client_id, created_at),
          KEY idx_referral_referred (referred_client_id, created_at),
          CONSTRAINT fk_referral_referrer FOREIGN KEY (referrer_client_id) REFERENCES clients (id) ON DELETE CASCADE,
          CONSTRAINT fk_referral_referred FOREIGN KEY (referred_client_id) REFERENCES clients (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      if (error) throw error
    })().catch(err => {
      referralRewardsTableReady = null
      throw err
    })
  }
  return referralRewardsTableReady
}

async function getCasinoConfig() {
  const { rows, error } = await query('SELECT api_url, api_key FROM config_casino WHERE id = 1 LIMIT 1')
  if (error) throw error
  const row = rows?.[0] || {}
  if (!row.api_url || !row.api_key) {
    throw new Error('Configuracion de casino no encontrada.')
  }
  return {
    apiUrl: String(row.api_url).trim(),
    apiKey: String(row.api_key).trim(),
  }
}

async function getClientExternalId(clientId) {
  const { rows, error } = await query(
    'SELECT external_id FROM clients WHERE id = ? LIMIT 1',
    [Number(clientId)],
  )
  if (error) throw error
  const externalId = rows?.[0]?.external_id
  return externalId ? String(externalId).trim() : ''
}

async function creditPanelBalance({ clientId, amountArs }) {
  const n = Number(amountArs)
  if (!Number.isFinite(n) || n <= 0) {
    return { ok: false, error: 'invalid_amount', message: 'Monto invalido para el panel' }
  }

  const externalId = await getClientExternalId(clientId)
  if (!externalId) {
    return { ok: false, error: 'missing_external_id', message: 'El cliente no tiene ID externo asignado' }
  }

  const { apiUrl, apiKey } = await getCasinoConfig()
  const panelUrl = `${apiUrl}index.php?act=admin&area=balance&response=js&type=frame&id=${encodeURIComponent(externalId)}`
  const formData = new URLSearchParams()
  formData.append('operation', 'in')
  formData.append('send', 'true')
  formData.append('amount', String(n))
  formData.append('balance_currency', 'ARS')
  formData.append('api_token', apiKey)
  const response = await fetch(panelUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData,
  }).catch(() => null)

  if (!response) {
    return { ok: false, error: 'network_error', message: 'No se pudo conectar con el panel' }
  }

  let data = {}
  try {
    data = await response.json()
  } catch {
    data = {}
  }

  const successMessage = data?.successMessage || data?.message || data?.success || ''
  const ok = Boolean(successMessage)
  return {
    ok,
    status: response.status,
    data,
    message: successMessage || data?.errorMessage || data?.error || null,
  }
}

async function countPaidDeposits(clientId) {
  const { rows, error } = await query(
    `SELECT COUNT(*) AS cnt FROM (
      SELECT 1 FROM manual_payment_movements WHERE client_id = ? AND status = 'paid'
      UNION ALL
      SELECT 1 FROM hgcash_movements WHERE client_id = ? AND status = 'paid'
      UNION ALL
      SELECT 1 FROM telepagos_movements WHERE client_id = ? AND status = 'paid'
      UNION ALL
      SELECT 1 FROM mercadopago_movements WHERE client_id = ? AND status = 'paid'
    ) paid_deposits`,
    [clientId, clientId, clientId, clientId],
  )
  if (error) throw error
  return Number(rows?.[0]?.cnt) || 0
}

async function findReferrerByCode(referralCode) {
  const code = normalizeCode(referralCode)
  if (!code) return null

  const { rows, error } = await query(
    `SELECT c.id, c.username, c.full_name, c.external_id, c.referral_code,
            ch.id AS chat_id
     FROM clients c
     LEFT JOIN chats ch ON ch.client_id = c.id AND ch.is_archived = 0
     WHERE c.referral_code = ?
     ORDER BY ch.id DESC
     LIMIT 1`,
    [code],
  )
  if (error) throw error
  return rows?.[0] || null
}

async function resolveRewardChatId(referrerClientId) {
  const { rows, error } = await query(
    `SELECT id
     FROM chats
     WHERE client_id = ? AND is_archived = 0
     ORDER BY id DESC
     LIMIT 1`,
    [Number(referrerClientId)],
  )
  if (error) throw error

  const existingChatId = rows?.[0]?.id ? Number(rows[0].id) : null
  if (existingChatId) return existingChatId

  const { rows: insertRows, error: insertError } = await query(
    `INSERT INTO chats (client_id, is_open, is_archived, unread_count, created_at)
     VALUES (?, 1, 0, 0, CURRENT_TIMESTAMP)`,
    [Number(referrerClientId)],
  )
  if (insertError) throw insertError
  return Number(insertRows?.insertId) || null
}

export async function getReferralDetails(clientId) {
  const { rows: clientRows, error: clientError } = await query(
    `SELECT id, username, full_name, referral_code, referred_by, referral_reward_paid, registered_at
     FROM clients
     WHERE id = ?
     LIMIT 1`,
    [clientId],
  )
  if (clientError) throw clientError

  const client = clientRows?.[0] || null
  if (!client) return null

  const referralCode = client.referral_code || await ensureReferralCode(client.id).catch(() => '')
  client.referral_code = referralCode

  await ensureReferralRewardsTable().catch(() => {})

  const [referrerData, referralsData, rewardData] = await Promise.all([
    client.referred_by ? findReferrerByCode(client.referred_by) : Promise.resolve(null),
    query(
      `SELECT c.id AS client_id, c.username, c.full_name, c.registered_at
       FROM clients c
       WHERE c.referred_by = ?
       ORDER BY c.registered_at DESC, c.id DESC`,
      [client.referral_code || ''],
    ),
    query(
      `SELECT rr.id, rr.referrer_client_id, rr.referred_client_id, rr.reward_amount, rr.reward_status,
              rr.error_message, rr.paid_at, rr.created_at, rr.updated_at,
              rr.source_table, rr.source_movement_id, rr.source_movement_amount, rr.source_movement_created_at,
              c.username AS referred_username, c.full_name AS referred_full_name, c.referred_by
       FROM referral_rewards rr
       INNER JOIN clients c ON c.id = rr.referred_client_id
       WHERE rr.referrer_client_id = ?
       ORDER BY rr.created_at DESC, rr.id DESC`,
      [client.id],
    ).catch(() => ({ rows: [], error: null })),
  ])

  if (referralsData.error) throw referralsData.error
  if (rewardData.error) throw rewardData.error

  const rewards = (rewardData.rows || []).map(row => ({
    id: Number(row.id),
    referrerClientId: Number(row.referrer_client_id),
    referredClientId: Number(row.referred_client_id),
    referredUsername: row.referred_username,
    referredFullName: row.referred_full_name || '',
    amount: Number(row.reward_amount) || 0,
    status: row.reward_status || 'pending',
    errorMessage: row.error_message || '',
    paidAt: row.paid_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    sourceTable: row.source_table || '',
    sourceMovementId: row.source_movement_id ? Number(row.source_movement_id) : null,
    sourceMovementAmount: row.source_movement_amount == null ? null : Number(row.source_movement_amount),
    sourceMovementCreatedAt: row.source_movement_created_at || null,
  }))

  const rewardsByReferredId = new Map()
  for (const reward of rewards) {
    if (!rewardsByReferredId.has(reward.referredClientId)) {
      rewardsByReferredId.set(reward.referredClientId, reward)
    }
  }

  const referrals = (referralsData.rows || []).map(row => ({
    clientId: Number(row.client_id),
    username: row.username,
    fullName: row.full_name || '',
    registeredAt: row.registered_at || null,
    reward: rewardsByReferredId.get(Number(row.client_id)) || null,
  }))

  const summary = {
    referredCount: referrals.length,
    rewardedCount: referrals.filter(item => item.reward?.status === 'paid').length,
    pendingCount: referrals.filter(item => item.reward && item.reward.status !== 'paid').length,
    totalRewardedFichas: rewards
      .filter(item => item.status === 'paid')
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
  }

  return {
    client: {
      id: Number(client.id),
      username: client.username,
      fullName: client.full_name || '',
      referralCode: client.referral_code || '',
      referredBy: client.referred_by || '',
      referralRewardPaid: client.referral_reward_paid !== 0,
      registeredAt: client.registered_at || null,
    },
    referrer: referrerData ? {
      id: Number(referrerData.id),
      username: referrerData.username,
      fullName: referrerData.full_name || '',
      externalId: referrerData.external_id || '',
      referralCode: referrerData.referral_code || '',
      chatId: referrerData.chat_id ? Number(referrerData.chat_id) : null,
    } : null,
    referrals,
    rewards,
    summary,
  }
}

export async function processReferralRewardForMovement({
  sourceTable,
  sourceMovementId,
  clientId,
  chatId,
  amount,
}) {
  const referredClientId = Number(clientId)
  const movementId = Number(sourceMovementId)
  if (!referredClientId || !movementId || !sourceTable) {
    return { status: 'skipped', reason: 'invalid_input' }
  }

  const { rows: clientRows, error: clientError } = await query(
    `SELECT id, username, referred_by, referral_reward_paid
     FROM clients
     WHERE id = ?
     LIMIT 1`,
    [referredClientId],
  )
  if (clientError) throw clientError
  const client = clientRows?.[0]
  if (!client?.referred_by) return { status: 'skipped', reason: 'no_referrer' }

  const paidCount = await countPaidDeposits(referredClientId)
  if (paidCount !== 1) return { status: 'skipped', reason: 'not_first_deposit', paidCount }

  const cfg = await getSystemConfig()
  if (!cfg.referralEnabled || Number(cfg.referralFichas) <= 0) {
    return { status: 'skipped', reason: 'referrals_disabled' }
  }

  const referrer = await findReferrerByCode(client.referred_by)
  if (!referrer?.id) return { status: 'skipped', reason: 'referrer_not_found' }

  const rewardAmount = Number(cfg.referralFichas) || 0
  const rewardPayload = {
    referrer_client_id: Number(referrer.id),
    referred_client_id: referredClientId,
    source_table: String(sourceTable),
    source_movement_id: movementId,
    reward_amount: rewardAmount,
    reward_status: 'pending',
    source_movement_amount: Number(amount) || null,
    source_movement_created_at: null,
  }

  const { rows: movementRows, error: movementError } = await query(
    `SELECT created_at FROM ${sourceTable} WHERE id = ? LIMIT 1`,
    [movementId],
  )
  if (movementError) throw movementError
  rewardPayload.source_movement_created_at = movementRows?.[0]?.created_at || null

  const { rows: insertRows, error: insertError } = await query(
    `INSERT IGNORE INTO referral_rewards
      (referrer_client_id, referred_client_id, source_table, source_movement_id, reward_amount, reward_status, source_movement_amount, source_movement_created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [
      rewardPayload.referrer_client_id,
      rewardPayload.referred_client_id,
      rewardPayload.source_table,
      rewardPayload.source_movement_id,
      rewardPayload.reward_amount,
      rewardPayload.source_movement_amount,
      rewardPayload.source_movement_created_at,
    ],
  )
  if (insertError) throw insertError

  const inserted = Number(insertRows?.affectedRows || 0) > 0
  if (!inserted) {
    const { rows: existingRows, error: existingError } = await query(
      `SELECT id, reward_status
       FROM referral_rewards
       WHERE source_table = ? AND source_movement_id = ?
       LIMIT 1`,
      [sourceTable, movementId],
    )
    if (existingError) throw existingError
    const existing = existingRows?.[0]
    if (existing?.reward_status === 'paid') {
      return { status: 'paid', referrerId: referrer.id, rewardAmount, alreadyPaid: true }
    }
    if (existing?.reward_status === 'pending') {
      return { status: 'skipped', reason: 'processing', referrerId: referrer.id, rewardAmount }
    }
    if (existing?.id) {
      await query(
        `UPDATE referral_rewards
         SET reward_status = 'pending', error_message = NULL, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [existing.id],
      )
    }
  }

  const creditResult = await creditPanelBalance({ clientId: referrer.id, amountArs: rewardAmount })
  if (!creditResult.ok) {
    const errorMessage = creditResult.message || creditResult.error || 'Error al acreditar la recompensa'
    await query(
      `UPDATE referral_rewards
       SET reward_status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
       WHERE source_table = ? AND source_movement_id = ?`,
      [errorMessage, sourceTable, movementId],
    )
    return { status: 'failed', error: errorMessage, referrerId: referrer.id, rewardAmount }
  }

  await query(
    `UPDATE referral_rewards
     SET reward_status = 'paid', paid_at = CURRENT_TIMESTAMP, error_message = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE source_table = ? AND source_movement_id = ?`,
    [sourceTable, movementId],
  )

  await query(
    `UPDATE clients
     SET referral_reward_paid = 1
     WHERE id = ?`,
    [referredClientId],
  )

  const rewardChatId = await resolveRewardChatId(referrer.id).catch(() => Number(referrer.chatId) || null)
  if (rewardChatId) {
    const rewardText = `Ganaste ${rewardAmount} ficha${rewardAmount !== 1 ? 's' : ''} por referido. El usuario ${client.username} realizo su primer deposito usando tu codigo.`
    await persistMessage({
      chatId: rewardChatId,
      senderType: 'system',
      content: rewardText,
      extra: {
        referralEvent: 'referral_reward',
        referralFichas: rewardAmount,
        referredUsername: client.username,
      },
    }).catch(() => {})
  }

  return {
    status: 'paid',
    referrerId: referrer.id,
    rewardAmount,
    creditResult,
  }
}
