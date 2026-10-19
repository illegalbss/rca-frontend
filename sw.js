/* ============================================
   SERVICE WORKER — sw.js (Royal Crystal Academy app)
   ============================================
   What it caches — ONLY public, non-personal static files:
     • the offline page, the app start screen, the manifest
     • images and app icons (badge, photos)
     • stylesheets (network-first, so updates show immediately)
   What it NEVER caches or even touches:
     • anything from the API server (logins, pupils, results, fees,
       receipts, report cards) — those requests go straight to the
       network, so balances and results are always live, and nothing
       private is ever stored on the phone by this file
     • any page (HTML) — pages always load fresh from the network;
       if there's no connection the friendly offline page is shown
     • non-GET requests
   Updates: bump VERSION on any change to this file. A new worker
   activates straight away (it only changes caching of public files, so
   it can't disturb a payment or result being viewed); pwa.js then shows
   a small "new version — refresh" bar instead of reloading by force.
*/
const VERSION = 'rca-pwa-v1';
const PRECACHE = [
  '/offline.html',
  '/app.html',
  '/manifest.webmanifest',
  '/assets/images/logo.png',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const isImage = p => p.startsWith('/assets/images/') || p.startsWith('/assets/icons/');
const isStyle = p => p.startsWith('/assets/css/');

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // API, fonts, CDNs: untouched

  // Pages: always from the network; offline → friendly offline page.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  // Images/icons: cached copy straight away, refreshed in the background.
  if (isImage(url.pathname)) {
    event.respondWith(caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req);
      const network = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
      return cached || network;
    }));
    return;
  }

  // Stylesheets: network first (so design updates arrive), cache as backup.
  if (isStyle(url.pathname)) {
    event.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
  }
  // Everything else (JavaScript etc.): normal network behaviour.
});

// pwa.js can ask the worker to clear its cache (e.g. on logout) — the
// cache only ever holds public files, but this keeps things tidy.
self.addEventListener('message', event => {
  if (event.data === 'clear-cache') caches.delete(VERSION);
});
