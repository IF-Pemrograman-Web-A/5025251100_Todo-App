const VERSION = 'v2';                       
const STATIC_CACHE = `mytodo-static-${VERSION}`;   
const PAGES_CACHE  = `mytodo-pages-${VERSION}`;   
const IMAGES_CACHE = `mytodo-images-${VERSION}`;   
const OFFLINE_URL  = 'offline.html';

const PRECACHE = [
  OFFLINE_URL,
  'index.php?tab=personal',
  'index.php?tab=shared',
  'assets/css/style.css',
  'assets/js/script.js',
  'manifest.json',
  'assets/icons/yuhara-icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const keep = [STATIC_CACHE, PAGES_CACHE, IMAGES_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && !res.redirected) cache.put(req, res.clone());
    return res;
  } catch {
    return (await caches.match(req)) || (await caches.match(OFFLINE_URL));
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(req);
  const network = fetch(req)
    .then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
    .catch(() => cached);
  return cached || network;
}

async function cacheFirst(req) {
  const cache = await caches.open(IMAGES_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                      
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.endsWith('delete.php')) {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
  } else if (url.pathname.includes('/assets/uploads/')) {
    event.respondWith(cacheFirst(req));
  } else if (['style', 'script', 'image', 'manifest'].includes(req.destination)) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(wins => {
      if (wins.length > 0) return wins[0].focus();
      return clients.openWindow('index.php?tab=personal');
    })
  );
});