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

firebase.messaging()

// Sin onBackgroundMessage + showNotification: si el servidor envía `notification` /
// `webpush`, FCM ya muestra una notificación del sistema. Llamar a
// showNotification aquí duplicaba el mismo aviso en escritorio y móvil.