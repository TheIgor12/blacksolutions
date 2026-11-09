/* BlackFlow web: busca sempre a versão mais nova e usa a cópia guardada só quando estiver sem internet */
const CACHE = 'blackflow-v7';
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'icone-192.png', 'icone-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const proprio = url.origin === location.origin;
  const biblioteca = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.host);
  if (!proprio && !biblioteca) return;
  e.respondWith(fetch(req).then(r => {
    if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return r;
  }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
});
