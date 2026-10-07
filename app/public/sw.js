// Offline support: the app shell is cached so FuerzaFlow opens without signal.
// Pages are network-first (you always get the latest version when online);
// other same-origin files and Google Fonts are served from cache, refreshed in the background.
const CACHE = "fuerzaflow-v1";
// Relative to this script, so the app works under any base path (it is served from /app/).
const HOME = new URL("./", self.location).href;
const SHELL = ["./", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(HOME, copy));
          return res;
        })
        .catch(() => caches.match(HOME)),
    );
    return;
  }

  const cacheable = url.origin === self.location.origin || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if (!cacheable) return; // Supabase, Open Food Facts: always live

  event.respondWith(
    caches.match(req).then((hit) => {
      const live = fetch(req)
        .then((res) => {
          if (res.ok || res.type === "opaque") caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => hit);
      return hit || live;
    }),
  );
});
