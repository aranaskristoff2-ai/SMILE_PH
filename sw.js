/*
 * SMILE service worker.
 * Purpose: make the site installable and let the app shell (HTML, CSS, JS, logo, poster) open quickly
 * and offline. It NEVER touches POST requests or anything on another origin (Apps Script, Google Fonts,
 * Google Maps, AI services): those always go straight to the network.
 * Bump VERSION whenever you upload changed frontend files, so installed copies pick up the new files.
 */
var VERSION = 'smile-shell-v13.1.0';
var SHELL = [
  './',
  './index.html',
  './download.html',
  './style.css',
  './config.js',
  './api.js',
  './app.js',
  './manifest.webmanifest',
  './assets/logo-512.webp',
  './assets/favicon.png',
  './assets/favicon-32.png',
  './assets/logo-160.webp',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/poster.webp',
  './assets/poster.jpg',
  './assets/poster-blur.jpg',
  './assets/vendor/jsQR.min.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(VERSION).then(function (cache) {
    // One missing file must not break the whole install.
    return Promise.all(SHELL.map(function (u) { return cache.add(u).catch(function () { /* skip */ }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION && (k.indexOf('smile-') === 0); }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;                       // check-ins, Isidro, photobooth: never touched
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // Apps Script, fonts, maps: straight to the network
  // Network first (so updates arrive), falling back to the cached shell when offline.
  event.respondWith(fetch(req).then(function (res) {
    if (res && res.ok && res.type === 'basic') {
      var copy = res.clone();
      caches.open(VERSION).then(function (cache) { cache.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then(function (hit) {
      return hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
    });
  }));
});
