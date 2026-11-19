// My Red Planet offline cache. Only this site's own files (same origin GET). NASA DONKI and other sites are never touched.
const CACHE = 'mrp-v5';
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './favicon.svg', './menu-cover.png', './menu-cover-mobile.png', './menu-logo.png', './audio/indoor-lofi-jpop.mp3', './audio/outdoor-scifi-mystery.mp3']).catch(() => {})).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(r, { ignoreSearch: true });
    const net = fetch(r).then(res => { if (res.ok) cache.put(r, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || (r.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  }));
});
