const CACHE = 'gota-a-gota-web-v2';
const APP_FILES = ['./','./index.html','./styles.css?v=2','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if(request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));}
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
    return response;
  })));
});