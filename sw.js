const CACHE_NAME = 'super-fatout-v3';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // لا نعمل Cache للأيقونات حتى تظهر النسخة الجديدة مباشرة
  if (
    url.pathname.endsWith('/icon-192.png') ||
    url.pathname.endsWith('/icon-512.png')
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
    );
    return;
  }

  // صفحة اللعبة نفسها: Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put('./index.html', copy);
          });

          return response;
        })
        .catch(() => caches.match('./index.html'))
    );

    return;
  }

  // باقي الملفات
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, copy);
          });
        }

        return response;
      });
    })
  );
});
