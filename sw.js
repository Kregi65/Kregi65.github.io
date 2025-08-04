// ZMIANA: Zmieniliśmy nazwę cache z v1 na v2, aby wymusić aktualizację
const CACHE_NAME = 'notatnik-treningowy-cache-v2';

// Lista plików do zapisania w pamięci podręcznej, w tym nowa ikona
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/images/icon.png' // DODANO: Ścieżka do Twojej ikony
];

// Usunięcie starych wersji cache podczas aktywacji nowego Service Workera
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Instalacja Service Workera i zapisanie plików w nowym cache
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
