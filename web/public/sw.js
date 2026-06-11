// Offline shell cache. Network-first for navigations + data so fresh deploys win;
// cache-first for hashed immutable assets. Cache name bumps to evict old builds.
const CACHE = "wb26wc-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        (await caches.open(CACHE)).put(req, net.clone());
        return net;
      } catch {
        const c = await caches.open(CACHE);
        return (await c.match(req)) || (await c.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    if (hit) return hit;
    try {
      const net = await fetch(req);
      if (net.ok) c.put(req, net.clone());
      return net;
    } catch {
      return hit || Response.error();
    }
  })());
});
