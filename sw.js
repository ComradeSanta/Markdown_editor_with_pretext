const CACHE_NAME = 'markdown-editor-v5';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './image.png?v=4',
  './image-192.png?v=4',
  './vendor/pretext/layout.js',
  './vendor/pretext/measurement.js',
  './vendor/pretext/analysis.js',
  './vendor/pretext/line-break.js',
  './vendor/pretext/line-text.js',
  './vendor/pretext/bidi.js',
  './vendor/pretext/rich-inline.js',
  './vendor/pretext/generated/bidi-data.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for the app shell (index.html, sw.js, manifest) so updates
  // take effect on the next reload. Cache-first for everything else.
  const isAppShell = url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/sw.js');
  if (isAppShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      }
      return res;
    }))
  );
});
