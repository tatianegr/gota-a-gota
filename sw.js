const CACHE_PREFIX = 'gota-a-gota-web-';
const CACHE = CACHE_PREFIX + 'v4';
const APP_FILES = ['./','./index.html','./styles.css?v=4','./app.js','./push.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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

// A notificação é apresentada imediatamente, como exige o Safari.
self.addEventListener('push', event => {
  let data={};
  try {data=event.data ? event.data.json() : {}} catch {}
  const title=typeof data.title==='string' ? data.title : 'Gota a Gota';
  const body=typeof data.body==='string' ? data.body : 'Hora de beber água.';
  event.waitUntil(self.registration.showNotification(title,{
    body,icon:'./icon-192.png',badge:'./icon-192.png',
    tag:typeof data.tag==='string' ? data.tag : 'gota-a-gota',
    data:{url:'https://tatianegr.github.io/gota-a-gota/'}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const appUrl='https://tatianegr.github.io/gota-a-gota/';
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{
    for(const client of clients){
      if(client.url.startsWith(appUrl)&&'focus' in client)return client.focus();
    }
    return self.clients.openWindow(appUrl);
  }));
});
