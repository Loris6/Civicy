/* Civicy – Offline-Speicher: Seite und Dateien aus dem Speicher, dann im Hintergrund aktualisieren */
const CACHE = 'civicy-v1';
const CORE = [
  './', 'index.html', 'manifest.webmanifest',
  'assets/css/style.css', 'assets/js/config.js', 'assets/js/data.js', 'assets/js/icons.js', 'assets/js/auth.js', 'assets/js/app.js',
  'assets/img/logo-sm.webp', 'assets/img/mondturm.jpg',
  'assets/fonts/rubik-latin-wght-normal.woff2', 'assets/fonts/silkscreen-latin-400-normal.woff2',
];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Nur eigene Dateien; Anmeldung (?code=…) und fremde Dienste immer frisch
  if (req.method !== 'GET' || url.origin !== location.origin || url.search.includes('code=')) return;
  e.respondWith(caches.open(CACHE).then((cache) => cache.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
