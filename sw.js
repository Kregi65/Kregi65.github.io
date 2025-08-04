// Nazwa pamięci podręcznej (cache)
const CACHE_NAME = 'notatnik-treningowy-cache-v1';

// Lista plików do zapisania w pamięci podręcznej
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js'
];

// Instalacja Service Workera i zapisanie plików w cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Otwarto cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Odpowiadanie na żądania - najpierw próba pobrania z sieci, a jeśli nie ma połączenia, to z cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
