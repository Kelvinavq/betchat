import { useCallback, useEffect, useRef } from 'react'
import { api } from '../utils/api'

const TOKEN_KEY = 'push_fcm_token'
const SW_PATH   = '/firebase-messaging-sw.js'

export async function registerPush(clientId) {
  if (!clientId) return false
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false
  if (Notification.permission === 'denied') return false

  try {
    // Permission must be requested FIRST — any prior async call breaks the
    // browser's user-gesture chain and the dialog will never appear.
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return false
    }

    const config = await api.get('/api/push/firebase-config').catch(() => null)
    if (!config?.configured || !config.apiKey || !config.vapidKey) return true // granted but firebase not configured yet

    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
    await navigator.serviceWorker.ready

    const sw = reg.installing || reg.waiting || reg.active
    if (sw) sw.postMessage({ type: 'INIT_FIREBASE', config })

    const { initializeApp, getApps } = await import('firebase/app')
    const { getMessaging, getToken }  = await import('firebase/messaging')

    const apps = getApps()
    const app  = apps.find(a => a.name === 'betchat-push') || initializeApp(config, 'betchat-push')
    const msg  = getMessaging(app)

    const token = await getToken(msg, {
      vapidKey: config.vapidKey,
      serviceWorkerRegistration: reg,
    }).catch(() => null)

    if (!token) return false

    const cached = localStorage.getItem(TOKEN_KEY)
    if (cached !== token) {
      await api.post('/api/push/token', {
        clientId,
        token,
        device: navigator.userAgent.slice(0, 200),
      })
      localStorage.setItem(TOKEN_KEY, token)
    }

    return true
  } catch (err) {
    console.warn('[Push] Registration error:', err.message)
    return false
  }
}

export function usePushNotification(clientId) {
  const done = useRef(false)

  // Silent auto-register only if permission already granted
  useEffect(() => {
    if (!clientId || done.current) return
    if (Notification.permission !== 'granted') return
    done.current = true
    const t = setTimeout(() => registerPush(clientId), 3000)
    return () => clearTimeout(t)
  }, [clientId])

  // Manual trigger (called from the permission prompt UI)
  const triggerPush = useCallback(async () => {
    if (!clientId || done.current) return false
    done.current = true
    return registerPush(clientId)
  }, [clientId])

  return { triggerPush }
}
