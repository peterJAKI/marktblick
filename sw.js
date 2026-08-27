/* Marktblick Service Worker – einfacher Offline-Cache.
   Die App-Hülle (HTML/Icon/Manifest) wird gecacht, damit sie auch ohne Netz startet.
   Kursdaten kommen weiter live aus dem Internet und werden NICHT gecacht. */
var CACHE = 'marktblick-v1';
var HUELLE = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(HUELLE); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;
  // Nur die eigene App-Hülle offline bedienen; alles andere (APIs, Chart-Lib) direkt aus dem Netz.
  if (e.request.method !== 'GET' || url.indexOf('http') !== 0) return;
  var eigene = url.indexOf(self.registration.scope) === 0;
  var api = /binance|coingecko|finnhub|alphavantage|gold-api|unpkg|googleapis|gstatic/.test(url);
  if (!eigene || api) return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        var kopie = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, kopie); });
        return res;
      }).catch(function () { return caches.match('./index.html'); });
    })
  );
});
