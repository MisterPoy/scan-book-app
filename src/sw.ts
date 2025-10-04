/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Prendre le contrôle immédiatement
clientsClaim();

// Nettoyer les anciens caches
cleanupOutdatedCaches();

// Precache des assets générés par Vite
precacheAndRoute(self.__WB_MANIFEST);

// Route de navigation avec fallback
const handler = createHandlerBoundToURL('/index.html');
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
});
registerRoute(navigationRoute);

// Cache stratégique pour OpenLibrary covers
registerRoute(
  ({ url }) => url.origin === 'https://covers.openlibrary.org',
  new CacheFirst({
    cacheName: 'openlibrary-covers',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 jours
      }),
    ],
  })
);

// Cache pour Firebase Storage (images de livres)
registerRoute(
  ({ url }) => url.origin === 'https://firebasestorage.googleapis.com',
  new CacheFirst({
    cacheName: 'firebase-storage-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 jours
      }),
    ],
  })
);

// Cache pour Google Books API
registerRoute(
  ({ url }) => url.origin === 'https://www.googleapis.com' && url.pathname.includes('/books/'),
  new NetworkFirst({
    cacheName: 'google-books-api',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 jour
      }),
    ],
  })
);

// ==========================================
// Firebase Cloud Messaging
// ==========================================

// Import Firebase Messaging (modular SDK)
// Note: Les imports dynamiques dans SW nécessitent importScripts
// On utilisera la version compat pour compatibilité SW
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Configuration Firebase (injectée au build via Vite define)
// Les variables globales sont définies dans vite.config.ts via define
declare const __VITE_FIREBASE_API_KEY__: string;
declare const __VITE_FIREBASE_AUTH_DOMAIN__: string;
declare const __VITE_FIREBASE_PROJECT_ID__: string;
declare const __VITE_FIREBASE_STORAGE_BUCKET__: string;
declare const __VITE_FIREBASE_MESSAGING_SENDER_ID__: string;
declare const __VITE_FIREBASE_APP_ID__: string;

const firebaseConfig = {
  apiKey: __VITE_FIREBASE_API_KEY__,
  authDomain: __VITE_FIREBASE_AUTH_DOMAIN__,
  projectId: __VITE_FIREBASE_PROJECT_ID__,
  storageBucket: __VITE_FIREBASE_STORAGE_BUCKET__,
  messagingSenderId: __VITE_FIREBASE_MESSAGING_SENDER_ID__,
  appId: __VITE_FIREBASE_APP_ID__,
};

// Initialiser Firebase
// @ts-expect-error firebase global from compat
firebase.initializeApp(firebaseConfig);

// @ts-expect-error messaging from firebase compat
const messaging = firebase.messaging();

// Gérer les notifications en arrière-plan
messaging.onBackgroundMessage((payload: { notification?: { title?: string; body?: string }; data?: Record<string, unknown> }) => {
  const notificationTitle = payload.notification?.title || 'Nouvelle annonce - Kodeks';
  const notificationOptions = {
    body: payload.notification?.body || 'Vous avez une nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: payload.data,
    tag: 'kodeks-notification',
    requireInteraction: payload.data?.priority === 'high',
    actions: [
      {
        action: 'open',
        title: 'Voir',
      },
      {
        action: 'dismiss',
        title: 'Ignorer',
      },
    ],
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gérer les clics sur notifications
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    // Ouvrir ou focuser l'application
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Si l'app est déjà ouverte, la focuser
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon ouvrir une nouvelle fenêtre
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
  // Pour 'dismiss', ne rien faire (notification déjà fermée)
});

// Gérer la fermeture des notifications
self.addEventListener('notificationclose', () => {
  // Log optionnel pour analytics
  // console.log('Notification fermée');
});

// Activation immédiate du nouveau SW
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

self.skipWaiting();
