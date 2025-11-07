// Service Worker for Dice Soccer PWA
const CACHE_VERSION = '2.0.0';
const CACHE_NAME = `dice-soccer-${CACHE_VERSION}`;
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/game.js',
  './js/multiplayer-websocket.js',
  './js/translations.js',
  './js/tsparticles.confetti.bundle.min.js',
  './manifest.json',
  './config.json',
  
  // Dice images
  './images/dice1.png',
  './images/dice2.png',
  './images/dice3.png',
  './images/dice4.png',
  './images/dice5.png',
  './images/dice6.png',
  
  // All shirt colors (all numbers 1-6 for each color)
  './images/blue1.png',
  './images/blue2.png',
  './images/blue3.png',
  './images/blue4.png',
  './images/blue5.png',
  './images/blue6.png',
  './images/green1.png',
  './images/green2.png',
  './images/green3.png',
  './images/green4.png',
  './images/green5.png',
  './images/green6.png',
  './images/red1.png',
  './images/red2.png',
  './images/red3.png',
  './images/red4.png',
  './images/red5.png',
  './images/red6.png',
  './images/yellow1.png',
  './images/yellow2.png',
  './images/yellow3.png',
  './images/yellow4.png',
  './images/yellow5.png',
  './images/yellow6.png',
  './images/orange1.png',
  './images/orange2.png',
  './images/orange3.png',
  './images/orange4.png',
  './images/orange5.png',
  './images/orange6.png',
  './images/pink1.png',
  './images/pink2.png',
  './images/pink3.png',
  './images/pink4.png',
  './images/pink5.png',
  './images/pink6.png',
  './images/purple1.png',
  './images/purple2.png',
  './images/purple3.png',
  './images/purple4.png',
  './images/purple5.png',
  './images/purple6.png',
  './images/barca1.png',
  './images/barca2.png',
  './images/barca3.png',
  './images/barca4.png',
  './images/barca5.png',
  './images/barca6.png',
  './images/argentina1.png',
  './images/argentina2.png',
  './images/argentina3.png',
  './images/argentina4.png',
  './images/argentina5.png',
  './images/argentina6.png',
  './images/slovenija1.png',
  './images/slovenija2.png',
  './images/slovenija3.png',
  './images/slovenija4.png',
  './images/slovenija5.png',
  './images/slovenija6.png',
  
  // Menu icons (128px - most commonly used)
  './images/newgame128.png',
  './images/hostgame128.png',
  './images/joingame128.png',
  './images/language128.png',
  './images/soundon128.png',
  './images/soundoff128.png',
  './images/twoplayers128.png',
  './images/ai128.png',
  './images/orientation128.png',
  './images/orientationportrait128.png',
  './images/orientationlandscape128.png',
  './images/selectcolor128.png',
  './images/exit128.png',
  './images/hintson128.png',
  './images/hintsoff128.png',
  './images/autodice128.png',
  './images/settings128.png',
  
  // AI difficulty icons
  './images/difficultyeasy128.png',
  './images/difficultymedium128.png',
  './images/difficultyhard128.png',
  
  // Language flags
  './images/flagenglish64.png',
  './images/flagslovenian64.png',
  './images/flaggerman64.png',
  './images/flagfrench64.png',
  './images/flagitalian64.png',
  './images/flagspanish64.png',
  './images/flagcroatian64.png',
  './images/flaghungarian64.png',
  
  // Game state icons
  './images/goal128.png',
  './images/win128.png',
  './images/statistics128.png',
  './images/connerror128.png',
  './images/waiting128.png',
  './images/nomoves128.png',
  './images/wrongplayer128.png',
  
  // Logo and backgrounds
  './images/logo.png',
  './images/dicesoccer.png',
  './images/footballfield.jpg',
  
  // Sound files
  './sounds/crowd-cheers.mp3',
  './sounds/pop.mp3',
  './sounds/rolling-dice.mp3',
  './sounds/walk.mp3',
  './sounds/whistle.mp3'
];

// 🔹 Install service worker and cache assets
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing new version:', CACHE_VERSION);
  self.skipWaiting(); // activate new SW immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('[ServiceWorker] Cache add error:', err))
  );
});

// 🔹 Activate and clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      // Clean up old caches first.
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => {
          // Only delete old dice-soccer caches
          if (name.startsWith('dice-soccer-') && name !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
      // Then, take control of all open clients.
      await self.clients.claim();
      
      // Notify all clients that a new version is active
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({
          type: 'SW_UPDATED',
          version: CACHE_VERSION
        });
      });
    })()
  );
});

// 🔹 Network-first for JS/CSS/HTML to get updates quickly
// and cache-first for images/sounds for performance
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Determine if this is a critical file that needs network-first strategy
  const isCriticalFile = 
    request.mode === 'navigate' || 
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.json');

  if (isCriticalFile) {
    // Network-first strategy for critical files (HTML, JS, CSS, JSON)
    event.respondWith(
      (async () => {
        try {
          // Try the network first
          const networkResponse = await fetch(request);
          
          // Cache the new response if successful
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
          }
          
          return networkResponse;
        } catch (error) {
          // If the network fails, fall back to the cache
          console.log('[ServiceWorker] Network fetch failed, falling back to cache for:', url.pathname);
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(request);
          
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // If it's a navigation request and no cache, return index.html
          if (request.mode === 'navigate') {
            return cache.match('./index.html');
          }
          
          // Return error for other resources
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })()
    );
  } else {
    // Cache-first strategy for static assets (images, sounds)
    event.respondWith(
      (async () => {
        // 1. Check the cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // 2. If not in cache, go to the network
        try {
          const networkResponse = await fetch(request);
          
          // 3. Cache the new response and return it
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          console.error('[ServiceWorker] Fetch failed for:', url.pathname, error);
          return new Response('Network error', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })()
    );
  }
});
