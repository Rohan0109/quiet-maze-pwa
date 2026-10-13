const CACHE = 'quiet-maze-react-v2';
const BASE = new URL('./', self.location.href);
const SHELL = [new URL('./', BASE).href, new URL('manifest.webmanifest', BASE).href];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      void caches.open(CACHE).then(cache => cache.put(request, copy));
      return response;
    }).catch(async () => (await caches.match(request)) || caches.match(new URL('./', BASE))));
    return;
  }
  event.respondWith(caches.match(request).then(hit => hit || fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      void caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});

self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || 'A small pause, just for you.' }; }
  event.waitUntil(self.registration.showNotification(payload.title || 'The Quiet Maze', {
    body: payload.body || 'A small pause, just for you.',
    icon: new URL('icons/icon-192.png', BASE).href,
    badge: new URL('icons/icon-192.png', BASE).href,
    tag: payload.tag || 'quiet-maze-reminder',
    data: { url: new URL('./', BASE).href },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = event.notification.data?.url || new URL('./', BASE).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windows => {
    const existing = windows.find(client => client.url.startsWith(BASE.href));
    return existing ? existing.focus() : self.clients.openWindow(target);
  }));
});