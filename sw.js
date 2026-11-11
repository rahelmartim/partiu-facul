// Service worker: the network first, so that a new version shows at once,
// and the cache when the device is offline.

const CACHE = "partiufacul-v2";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "src/styles.css",
  "src/main.js",
  "src/lib/auth.js",
  "src/lib/crypto.js",
  "src/lib/dates.js",
  "src/lib/demo.js",
  "src/lib/schedule.js",
  "src/lib/settings.js",
  "src/lib/storage.js",
  "src/lib/trips.js",
  "src/lib/validation.js",
  "src/ui/app.js",
  "src/ui/dom.js",
  "src/ui/forms.js",
  "src/ui/icons.js",
  "src/ui/swipe.js",
  "src/ui/screens/config.js",
  "src/ui/screens/home.js",
  "src/ui/screens/login.js",
  "src/ui/screens/profile.js",
  "src/ui/screens/register.js",
  "src/ui/screens/schedule.js",
  "assets/img/background.png",
  "assets/img/bus-logo.png",
  "assets/img/bus-counter.png",
  "assets/img/bus.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? caches.match("index.html"))),
  );
});
