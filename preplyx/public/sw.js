const CACHE_NAME = 'preplyx-cbt-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/logo.svg',
  '/favicon.svg'
];

// Fallback HTML string when totally offline and no cached index.html
const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preplyx CBT - Offline</title>
</head>
<body style="font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;margin:0;padding:2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;background:#0f172a;color:#f8fafc;text-align:center;">
  <div style="max-width:400px;background:#1e293b;padding:2rem;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
    <h2 style="margin-top:0;color:#a855f7;">You are offline</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.5;">Please check your internet connection to continue using Preplyx CBT.</p>
    <button onclick="location.reload()" style="padding:10px 24px;border-radius:8px;background:#7c3aed;color:#ffffff;border:none;cursor:pointer;font-weight:600;font-size:14px;margin-top:1rem;">Retry</button>
  </div>
</body>
</html>`;

// Install Event: Pre-cache Static App Shell gracefully
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          const res = await fetch(asset, { cache: 'no-cache' });
          if (res && res.ok) {
            await cache.put(asset, res);
          }
        } catch (err) {
          console.warn(`[PWA Service Worker] Asset skipped during install (${asset}):`, err);
        }
      }
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

  // 1. Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // 2. Ignore non-HTTP/HTTPS schemes (e.g. chrome-extension://, moz-extension://)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 3. Ignore cross-origin requests (e.g., API at api.preplyx.com.ng, Cloudinary, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 4. Ignore API routes
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 5. Handle Navigation Requests (Single Page Application HTML routes: /, /login, /dashboard, etc.)
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Attempt network first for fresh SPA HTML
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone()).catch(() => {});
            return networkResponse;
          }
        } catch (fetchErr) {
          // Network failed (offline or connection issue)
        }

        // Fallback 1: Match requested URL in cache
        const cachedNavigation = await caches.match(request);
        if (cachedNavigation) return cachedNavigation;

        // Fallback 2: Match index.html from cache
        const cachedIndex = await caches.match('/index.html');
        if (cachedIndex) return cachedIndex;

        // Fallback 3: Match root "/" from cache
        const cachedRoot = await caches.match('/');
        if (cachedRoot) return cachedRoot;

        // Fallback 4: Guaranteed offline fallback response
        return new Response(OFFLINE_FALLBACK_HTML, {
          status: 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      })()
    );
    return;
  }

  // 6. Static Assets (CSS, JS, Images, Fonts, Icons)
  event.respondWith(
    (async () => {
      // Check cache first
      const cachedResponse = await caches.match(request);

      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone()).catch(() => {});
        }
        return networkResponse;
      } catch (err) {
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response('', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      }
    })()
  );
});
