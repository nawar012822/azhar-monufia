// Service worker: offline shell. Never caches API or storage calls.
const VERSION = 'azhar-v1';
const STATIC = VERSION + '-static';
const PAGES = VERSION + '-pages';
const SHELL = ['/offline', '/icon-192.png', '/logo.jpg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/static/') || /\.(png|jpg|svg|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.open(STATIC).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !/^\/(dashboard|login|register|forgot-password|profile|deposit)/.test(url.pathname)) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match('/offline')))
    );
  }
});
