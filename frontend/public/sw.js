/**
 * Nestera Service Worker
 * Strategy:
 *   - App shell (HTML/JS/CSS): Network-first, fallback to cache
 *   - Static assets (images, fonts): Cache-first
 *   - API requests: Network-only (never cache sensitive financial data)
 *   - Offline fallback: /offline.html
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `nestera-shell-${CACHE_VERSION}`;
const ASSETS_CACHE = `nestera-assets-${CACHE_VERSION}`;

/** App-shell resources to pre-cache on install */
const SHELL_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

/** Static asset patterns to cache on first fetch */
const ASSET_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.woff', '.woff2'];

// ── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS))
  );
  // Activate immediately, replacing any previous SW
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const validCaches = new Set([SHELL_CACHE, ASSETS_CACHE]);

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !validCaches.has(k)).map((k) => caches.delete(k))
      )
    )
  );
  // Take control of all open clients without requiring a reload
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Never cache API calls — financial data must always be fresh
  if (url.pathname.startsWith('/api/')) return;

  // Next.js internal routes (HMR, data fetching)
  if (url.pathname.startsWith('/_next/data/') && url.pathname.endsWith('.json')) return;

  const isStaticAsset = ASSET_EXTENSIONS.some((ext) => url.pathname.endsWith(ext))
    || url.pathname.startsWith('/_next/static/');

  if (isStaticAsset) {
    // Cache-first for static assets
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
  } else {
    // Network-first for HTML navigation (app shell)
    event.respondWith(networkFirst(request, SHELL_CACHE));
  }
});

// ── Strategies ─────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Asset unavailable offline.', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Final fallback: offline page
    const offline = await caches.match('/offline.html');
    return offline || new Response('Offline', { status: 503 });
  }
}

// ── Background Sync (deposit/withdrawal queue) ─────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-transactions') {
    event.waitUntil(syncPendingTransactions());
  }
});

async function syncPendingTransactions() {
  // Clients handle the actual retry logic via postMessage
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => client.postMessage({ type: 'SYNC_TRANSACTIONS' }));
}

// ── Push Notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Nestera', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Nestera', {
      body: data.body || '',
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-72x72.svg',
      tag: data.tag || 'nestera-notification',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === targetUrl && 'focus' in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
  );
});
