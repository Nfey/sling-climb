/* Minimal service worker for PWA installability + light offline fallback. */
const CACHE = "sling-climb-v1"

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      for (const url of ["/", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png"]) {
        try {
          await cache.add(url)
        } catch {
          /* ignore individual precache misses */
        }
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request)
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          const cache = await caches.open(CACHE)
          cache.put(request, response.clone())
        }
        return response
      } catch {
        const cached = await caches.match(request)
        return cached || (await caches.match("/")) || Response.error()
      }
    })(),
  )
})
