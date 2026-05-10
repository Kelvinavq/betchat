import { query } from '../config/database.js'

let _messaging = null
let _credHash = ''

async function loadCreds() {
  const { rows } = await query(`
    SELECT project_id, client_email, private_key
    FROM push_credentials
    WHERE id = 1
    LIMIT 1
  `)

  return rows?.[0] || null
}

function normalizePrivateKey(rawKey) {
  if (!rawKey) return ''

  let key = String(rawKey).trim()

  if (key.startsWith('{')) {
    try {
      const parsed = JSON.parse(key)
      key = parsed.private_key || ''
    } catch {
      // ignore
    }
  }

  key = String(key)
    .trim()
    .replace(/^"|"$/g, '')
    .replace(/^'|'$/g, '')
    .replace(/\\n/g, '\n')

  if (!key.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('La private_key no contiene BEGIN PRIVATE KEY')
  }

  if (!key.includes('-----END PRIVATE KEY-----')) {
    throw new Error('La private_key no contiene END PRIVATE KEY')
  }

  return key
}

function safeText(value, fallback) {
  const text = String(value || '').trim()
  return text || fallback
}

function normalizeData(data = {}) {
  return Object.fromEntries(
    Object.entries(data || {}).map(([k, v]) => [String(k), String(v ?? '')])
  )
}

export async function getFirebaseMessaging() {
  const creds = await loadCreds()

  if (!creds?.project_id || !creds?.client_email || !creds?.private_key) {
    return null
  }

  let privateKey

  try {
    privateKey = normalizePrivateKey(creds.private_key)
  } catch (err) {
    console.error('[Firebase] Private key inválida:', err.message)
    return null
  }

  const hash = `${creds.project_id}|${creds.client_email}|${privateKey.slice(0, 40)}`

  if (_messaging && _credHash === hash) {
    return _messaging
  }

  try {
    const { initializeApp, getApps, deleteApp, cert } = await import('firebase-admin/app')
    const { getMessaging } = await import('firebase-admin/messaging')

    for (const app of getApps()) {
      try {
        await deleteApp(app)
      } catch {
        // ignore
      }
    }

    const app = initializeApp({
      credential: cert({
        projectId: creds.project_id,
        clientEmail: creds.client_email,
        privateKey,
      }),
    })

    _messaging = getMessaging(app)
    _credHash = hash

    console.log('[Firebase] Inicializado correctamente')

    return _messaging
  } catch (err) {
    console.error('[Firebase] Init error:', err.message)
    _messaging = null
    _credHash = ''
    return null
  }
}

/**
 * tokenRows: [{ id, client_id, token }]
 */
export async function sendMulticast(tokenRows, title, body, data = {}, image = null) {
  const messaging = await getFirebaseMessaging()

  if (!messaging) {
    throw new Error('Firebase no configurado. Revisá project_id, client_email y private_key.')
  }

  const finalTitle = safeText(title, 'Nueva notificación')
  const finalBody = safeText(body, 'Tenés una nueva notificación')

  const BATCH = 500
  const result = {
    sent: 0,
    failed: 0,
    invalidTokenIds: [],
  }

  for (let i = 0; i < tokenRows.length; i += BATCH) {
    const batch = tokenRows.slice(i, i + BATCH)

    try {
      const resp = await messaging.sendEachForMulticast({
        tokens: batch.map(t => t.token).filter(Boolean),

        notification: {
          title: finalTitle,
          body: finalBody,
        },

        webpush: {
          notification: {
            title: finalTitle,
            body: finalBody,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            ...(image ? { image } : {}),
          },
          fcmOptions: {
            link: '/',
          },
        },

        data: {
          title: finalTitle,
          body: finalBody,
          ...(image ? { image } : {}),
          ...normalizeData(data),
        },
      })

      resp.responses.forEach((r, idx) => {
        if (r.success) {
          result.sent++
          return
        }

        result.failed++

        const code = r.error?.code || ''

        console.error('[Firebase] Token error:', {
          tokenId: batch[idx]?.id,
          clientId: batch[idx]?.client_id,
          code,
          message: r.error?.message,
        })

        if (
          code.includes('invalid-registration-token') ||
          code.includes('registration-token-not-registered') ||
          code.includes('not-registered')
        ) {
          result.invalidTokenIds.push(batch[idx].id)
        }
      })
    } catch (err) {
      result.failed += batch.length
      console.error('[Firebase] sendEachForMulticast error:', err.message)
    }
  }

  return result
}