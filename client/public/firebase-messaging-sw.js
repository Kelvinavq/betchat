importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBv_vrMnrNaVb61oWW3B_2HRavguJkfgok',
  authDomain: 'betchatpush.firebaseapp.com',
  projectId: 'betchatpush',
  storageBucket: 'betchatpush.firebasestorage.app',
  messagingSenderId: '334468398209',
  appId: '1:334468398209:web:5678e849ee8453d2f56180',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] payload:', payload)

  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    'Nueva notificación'

  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    'Tenés una nueva notificación'

  self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload?.data || {},
  })
})