// Service Worker pour Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Configuration Firebase (identique à celle de l'app principale)
const firebaseConfig = {
  apiKey: "AIzaSyCU5lL7xYMPQK5xUcNpKP4fKf8J7YvVkws",
  authDomain: "scanbook-27440.firebaseapp.com",
  projectId: "scanbook-27440",
  storageBucket: "scanbook-27440.firebasestorage.app",
  messagingSenderId: "738050767325",
  appId: "1:738050767325:web:e8de5b9c4f8e8f8a5f8e8f"
};

// Initialiser Firebase dans le service worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Gérer les notifications en arrière-plan
messaging.onBackgroundMessage((payload) => {
  console.log('Notification reçue en arrière-plan:', payload);

  const notificationTitle = payload.notification?.title || 'Nouvelle annonce';
  const notificationOptions = {
    body: payload.notification?.body || 'Vous avez une nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: payload.data,
    tag: 'scanbook-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Voir'
      },
      {
        action: 'dismiss',
        title: 'Ignorer'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gérer les clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  console.log('Clic sur notification:', event);

  event.notification.close();

  if (event.action === 'open') {
    // Ouvrir ou focuser l'application
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Si l'app est déjà ouverte, la focuser
          for (const client of clientList) {
            if (client.url.includes(location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          // Sinon ouvrir une nouvelle fenêtre
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
  // Pour 'dismiss', ne rien faire (notification déjà fermée)
});

// Gérer la fermeture des notifications
self.addEventListener('notificationclose', (event) => {
  console.log('Notification fermée:', event.notification.tag);
});