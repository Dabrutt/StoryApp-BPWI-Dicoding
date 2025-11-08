const CACHE_NAME = 'storyapp-shell-v1';
const RUNTIME_CACHE = 'storyapp-runtime-v1';

const PRECACHE_URLS = [
  '/index.html',
  '/favicon.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
          return null;
        })
      )
    )
  );
  self.clients.claim();
});

// Simple caching strategy: network-first for API, cache-first for app shell
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle API requests (story-api) with network-first then cache fallback
  if (url.origin.includes('story-api.dicoding.dev')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Only cache GET and http(s) responses and OK responses
          try {
            if (
              event.request.method === 'GET' &&
              (event.request.url.startsWith('http://') || event.request.url.startsWith('https://')) &&
              response && response.ok
            ) {
              const copy = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                try {
                  cache.put(event.request, copy);
                } catch (err) {
                  // ignore cache put errors (e.g., unsupported schemes)
                  console.warn('Cache put skipped for', event.request.url, err);
                }
              });
            }
          } catch (e) {
            // defensive
            console.warn('Error while caching response', e);
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For navigation / app shell — try cache then network
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match('/index.html')))
    );
    return;
  }

  // For other requests — cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          // Only cache GET http(s) and ok responses
          if (
            event.request.method === 'GET' &&
            (event.request.url.startsWith('http://') || event.request.url.startsWith('https://')) &&
            res && res.ok
          ) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              try {
                cache.put(event.request, copy);
              } catch (err) {
                console.warn('Cache put skipped for', event.request.url, err);
              }
            });
          }
          return res;
        })
        .catch(() => null);
    })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  let payload = { title: 'StoryApp', body: 'You have a new notification', url: '/' };
  try {
    if (event.data) payload = event.data.json();
  } catch (err) {
    // ignore parse error
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.png',
    badge: payload.badge || '/favicon.png',
    data: { url: payload.url || '/' , storyId: payload.storyId},
    actions: [
      { action: 'open', title: 'Buka' }
    ],
    tag: payload.tag || 'storyapp-notification',
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  // Jika action adalah 'open', navigasi ke detail story jika ada storyId
  if (event.action === 'open' && event.notification.data && event.notification.data.storyId) {
    url = `/#/story/${event.notification.data.storyId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
