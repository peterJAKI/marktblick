/* Marktblick Service Worker.
   App-Hülle (HTML/Icon/Manifest) wird gecacht, damit die App auch offline startet.
   HTML wird "Netz zuerst" geladen, damit Updates sofort ankommen.
   Kursdaten kommen immer live aus dem Internet und werden NIE gecacht. */
var CACHE = 'marktblick-v2';
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
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || req.url.indexOf('http') !== 0) return;
  // APIs und externe Skripte immer direkt aus dem Netz, nie cachen
  if (/binance|coingecko|finnhub|alphavantage|gold-api|unpkg|googleapis|gstatic/.test(req.url)) return;
  // nur eigene Dateien behandeln
  if (req.url.indexOf(self.registration.scope) !== 0) return;

  var rest = req.url.slice(self.registration.scope.length).split('?')[0];
  var istHTML = req.mode === 'navigate' || req.destination === 'document' ||
                rest === '' || rest === 'index.html';

  if (istHTML) {
    // Netz zuerst -> neue Version kommt sofort an; Cache nur als Offline-Reserve
    e.respondWith(
      fetch(req).then(function (res) {
        var kopie = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./index.html', kopie); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (h) { return h || caches.match('./index.html'); });
      })
    );
    return;
  }

  // statische Reste (Icon, Manifest): Cache zuerst
  e.respondWith(
    caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        var kopie = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, kopie); });
        return res;
      });
    })
  );
});
