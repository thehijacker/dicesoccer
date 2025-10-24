// Service Worker for Dice Soccer PWA
const CACHE_NAME = 'dice-soccer-v1.0.11';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './game.js',
  './multiplayer.js',
  './translations.js',
  './manifest.json',
  
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
