/* River Business service worker. Navigations are network-first with a short timeout,
 * then the last saved page. API and Firebase auth are never cached. */
const GEN = "rb-v1";
const PAGES = `${GEN}-pages`;
const ASSETS = `${GEN}-assets`;
const SHELL = ["/open", "/login", "/dashboard", "/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/brand/river-logo-navy.svg"];

const skip = (url) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/__/") || url.pathname === "/sw.js";

async function plain(res) {
  if (!res || !res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PAGES);
    await Promise.all(SHELL.map(async (path) => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok) await cache.put(path, await plain(response));
      } catch { /* next visit */ }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key !== PAGES && key !== ASSETS) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.origin !== self.location.origin || skip(url)) return;
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(PAGES);
          await cache.put(url.pathname, await plain(response.clone()));
        }
        return response;
      } catch {
        return (await caches.match(url.pathname)) || (await caches.match("/offline.html")) || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(ASSETS);
        await cache.put(request, response.clone());
      }
      return response;
    }).catch(() => cached);
    return cached || network;
  })());
});
