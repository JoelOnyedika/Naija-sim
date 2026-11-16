/* One Naija service worker: makes the game installable and playable offline after the first visit.
 *  - install: caches the app shell and every script/style the shell references (found by reading index.html)
 *  - pages: network first (so players always get the newest version when online), the cached shell when offline
 *  - assets (hashed scripts, styles, 3D models, icons, images, audio): cache first, refreshed in the background
 *  - Google Fonts: stale-while-revalidate
 * Bump VERSION to drop every old cache. Nothing about the player is stored here: saves belong to the game itself. */
const VERSION = 'nl-v39-1';
const SHELL = `${VERSION}-shell`, RUNTIME = `${VERSION}-runtime`, FONTS = `${VERSION}-fonts`;
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png', '/icons/favicon-32.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.allSettled(PRECACHE.map((u) => cache.add(u)));
    try { // the hashed bundles the page needs, so the very first offline start works
      const html = await (await fetch('/index.html', { cache: 'no-store' })).text();
      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
      await Promise.allSettled(assets.map((u) => cache.add(u)));
    } catch { /* offline during install: the runtime cache fills as the game is used */ }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.startsWith(VERSION)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

const putIfGood = async (cacheName, req, res) => { if (res && res.ok && res.status === 200 && res.type !== 'opaque') { const c = await caches.open(cacheName); await c.put(req, res.clone()); } return res; };

self.addEventListener('fetch', (event) => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || !/^https?:$/.test(url.protocol) || req.headers.has('range')) return;
  // pages: network first, cached shell when offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try { const res = await fetch(req); putIfGood(SHELL, '/index.html', res.clone()); return res; }
      catch { return (await caches.match('/index.html')) || (await caches.match('/')) || new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } }); }
    })());
    return;
  }
  // Google Fonts: serve the cached copy at once, refresh it in the background
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cached = await caches.match(req), net = fetch(req).then((r) => putIfGood(FONTS, req, r)).catch(() => cached);
      return cached || net;
    })());
    return;
  }
  if (url.origin !== self.location.origin) return;
  // same-origin assets: cache first, quietly refreshed
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const refresh = fetch(req).then((r) => putIfGood(/\/assets\//.test(url.pathname) ? SHELL : RUNTIME, req, r)).catch(() => undefined);
    if (cached) { event.waitUntil(refresh); return cached; }
    const res = await refresh;
    return res || new Response('', { status: 504 });
  })());
});
