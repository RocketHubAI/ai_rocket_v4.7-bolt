const CACHE_NAME = 'astra-intelligence-v6';
const RUNTIME_CACHE = 'astra-runtime-v6';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png'
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] Installed, waiting for activation request');
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // Never cache version.json or sw.js - always fetch fresh
  if (event.request.url.includes('/version.json') || event.request.url.includes('/sw.js')) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
        .then((response) => {
          return response;
        })
        .catch(() => {
          if (event.request.url.includes('/version.json')) {
            return new Response(JSON.stringify({ version: '1.0.0' }), {
              headers: { 'Content-Type': 'application/json' }
            });
          }
          return response;
        })
    );
    return;
  }

  // Network-first strategy for index.html to always get latest version
  if (event.request.url.endsWith('/') || event.request.url.includes('index.html')) {
    event.respondWith(
      fetch(event.request, {
        cache: 'no-store'
      })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first strategy for other resources
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // Return cached version but fetch in background to update cache
          fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {});
          return response;
        }

        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const shouldCache =
            event.request.url.includes('/assets/') ||
            event.request.url.includes('.js') ||
            event.request.url.includes('.css') ||
            event.request.url.includes('.png') ||
            event.request.url.includes('.jpg') ||
            event.request.url.includes('.jpeg') ||
            event.request.url.includes('.svg') ||
            event.request.url.includes('.woff') ||
            event.request.url.includes('.woff2');

          if (shouldCache) {
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Received SKIP_WAITING message');
    self.skipWaiting();
  }
});
