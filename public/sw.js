// Service worker: grocery lists work offline (R11).
// - Grocery pages (/grocery, /grocery/<id>): network first; the last copy is
//   kept and served when there's no connection.
// - Next's built files (/_next/static): cache first. They're content-hashed,
//   so a cached file never goes stale, and offline pages can still run.
// - Everything else goes straight to the network and is never stored.
// The grocery cache holds the signed-in user's lists, so the app deletes it
// on sign-out (see lib/offline.ts).

const PAGES = "cwt-grocery-pages-v1";
const ASSETS = "cwt-static-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  // Drop caches from older versions of this file.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isGroceryPage(url) {
  return url.pathname === "/grocery" || /^\/grocery\/[0-9a-f-]{36}$/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Full page loads only; in-app navigations fall back to one when offline.
  if (request.mode === "navigate" && isGroceryPage(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        try {
          const response = await fetch(request);
          // Only keep real pages, not a redirect to the sign-in page.
          if (response.ok && !response.redirected) cache.put(url.pathname, response.clone());
          return response;
        } catch {
          const saved = await cache.match(url.pathname);
          return (
            saved ??
            new Response(
              '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
                '<title>Offline</title><body style="font-family:system-ui;padding:2rem;max-width:30rem;margin:auto">' +
                "<h1>You're offline</h1><p>This list hasn't been opened on this device yet, so there's no saved copy. " +
                "Open your lists while you're online and they'll be here next time.</p>" +
                '<p><a href="/grocery">Back to your lists</a></p>',
              { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
            )
          );
        }
      })(),
    );
  }
});
