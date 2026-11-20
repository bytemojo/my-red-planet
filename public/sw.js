// My Red Planet offline cache. Only this site's own files (same origin GET). NASA DONKI and other sites are never touched.
const CACHE = 'mrp-v8';
// Step 30b: the microscope pictures are cached on install so the microscope works offline on the first visit. Keep in step with src/story/microscope.ts (tests/sw.test.ts checks it).
const MICROSCOPE = ['01-mars-meteorite.jpg', '03-mars-spherules.jpg', '04-mars-dust-particle.jpg', '05-plant-root-cells.jpg', '06-pollen-grains.jpg', '07-clean-room-bacteria.jpg', '08-jezero-rock-grains.jpg', '10-sandstone-nodules.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './favicon.svg', './menu-cover.png', './menu-cover-mobile.png', './menu-logo.png', './audio/indoor-lofi-jpop.mp3', './audio/outdoor-scifi-mystery.mp3', './audio/astronaut-quiz-monume.mp3', './audio/tapjoy-victory.mp3']).catch(() => {}).then(() => Promise.all(MICROSCOPE.map(f => c.add('./microscope/' + f).catch(() => {}))))).then(() => self.skipWaiting())); });
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
