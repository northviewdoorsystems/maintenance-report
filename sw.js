/*
  Northview Maintenance & Tune-Up Report — service worker
  Cache-first app shell so the tool opens and fully functions offline.

  BUMP CACHE_NAME whenever you change index.html / manifest.json / icons
  and re-upload, so returning devices pick up the new version instead of
  serving a stale cached copy forever.
*/
const CACHE_NAME = "nv-tuneup-v8";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          // Cache same-origin responses opportunistically so a first
          // online load keeps working offline afterward too.
          if (response.ok && new URL(event.request.url).origin === self.location.origin){
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached: fall back to the app shell for
          // navigation requests so the app still opens.
          if (event.request.mode === "navigate") return caches.match("./index.html");
        });
    })
  );
});
