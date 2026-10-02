const CACHE_NAME = 'preplyx-cbt-v4';
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
    <h2 style="margin-top:0;color:#a855f7;">📴 You are offline</h2>
    <p style="color:#94a3b8;font-size:14px;line-height:1.5;">
      You can still answer questions you have downloaded for offline use.<br><br>
      Reconnect to sync your answers and download new question sets.
    </p>
    <button onclick="location.reload()" style="padding:10px 24px;border-radius:8px;background:#7c3aed;color:#ffffff;border:none;cursor:pointer;font-weight:600;font-size:14px;margin-top:1rem;">Retry</button>
  </div>
</body>
</html>`;

// ── Install: Pre-cache App Shell ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          const res = await fetch(asset, { cache: 'no-cache' });
          if (res && res.ok) await cache.put(asset, res);
        } catch (err) {
          console.warn(`[SW] Asset skipped during install (${asset}):`, err);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: Cleanup Old Caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Network-first for nav, Cache-first for assets ─────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch { return; }

  // Ignore non http/https
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Pass through cross-origin requests (API, CDN, ALOC)
  if (url.origin !== self.location.origin) return;

  // Pass through API calls
  if (url.pathname.startsWith('/api/')) return;

  // Navigation (SPA routes)
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone()).catch(() => {});
          return networkResponse;
        }
      } catch {}

      const cachedNavigation = await caches.match(request);
      if (cachedNavigation) return cachedNavigation;

      const cachedIndex = await caches.match('/index.html');
      if (cachedIndex) return cachedIndex;

      const cachedRoot = await caches.match('/');
      if (cachedRoot) return cachedRoot;

      return new Response(OFFLINE_FALLBACK_HTML, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    })());
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith((async () => {
    const cachedResponse = await caches.match(request);
    try {
      const networkResponse = await fetch(request);
      if (networkResponse && networkResponse.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone()).catch(() => {});
      }
      return networkResponse;
    } catch {
      if (cachedResponse) return cachedResponse;
      return new Response('', { status: 503, statusText: 'Service Unavailable' });
    }
  })());
});

// ── Background Sync: sync pending answers when connection restored ────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-answers') {
    // Notify all clients to trigger answer sync
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_ANSWERS' });
        });
      })
    );
  }
});

// ── Message Handler ───────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
