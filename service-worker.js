// Service Worker for Dice Soccer PWA
const CACHE_NAME = 'dice-soccer-v1.0.1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './game.js',
  './multiplayer.js',
  './translations.js',
  './images/dice1.png',
  './images/dice2.png',
  './images/dice3.png',
  './images/dice4.png',
  './images/dice5.png',
  './images/dice6.png'
];

// Install service worker and cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch from cache first, then network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// Update service worker and clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
