/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

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

// SUPPRIMÉ : Cache stratégique pour OpenLibrary covers
// Générait trop d'erreurs "Uncaught (in promise) no-response" pour les ISBN sans couverture (404)
// Les images OpenLibrary seront chargées normalement via le navigateur sans passer par le SW
// OpenLibrary a ses propres headers de cache HTTP, pas besoin de caching côté SW

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

// Activation immédiate du nouveau SW
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

self.skipWaiting();
