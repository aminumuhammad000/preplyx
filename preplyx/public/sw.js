const CACHE_NAME = 'preplyx-cbt-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/logo.svg',
  '/favicon.svg'
];

// Install Event: Cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA Service Worker] Caching Static App Shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA Service Worker] Some assets failed to pre-cache during install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA Service Worker] Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignore non-GET requests or browser extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    return;
  }

  // 2. Pass cross-origin requests (e.g., API at api.preplyx.com.ng) directly to the network
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. Pass API requests directly to the network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 4. Handle Navigation Requests (Single Page Application routing like /login, /dashboard, etc.)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(async () => {
          // If offline or network error, fallback to cached index.html or root
          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;

          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;

          return new Response(
            '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Preplyx CBT - Offline</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center;"><h2>You are currently offline</h2><p>Please check your internet connection to continue using Preplyx CBT.</p><button onclick="location.reload()" style="padding:10px 20px;border-radius:8px;background:#6d28d9;color:#fff;border:none;cursor:pointer;font-weight:600;margin-top:1rem;">Retry</button></body></html>',
            {
              status: 200,
              headers: { 'Content-Type': 'text/html' },
            }
          );
        })
    );
    return;
  }

  // 5. Static Assets: Stale-While-Revalidate with guaranteed Response fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch((err) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('', { status: 408, statusText: 'Offline or asset unavailable' });
        });

      return cachedResponse || fetchPromise;
    })
  );
});
