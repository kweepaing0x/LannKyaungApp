// sw.js — Lann Kyaing Service Worker
// Caches the app shell for offline/fast load
// Does NOT cache map tiles or Supabase data (always fresh)

const CACHE_NAME = "lann-kyaing-v1";

// Only cache the app shell — not external CDN assets
const SHELL = [
  "/",
  "/index.html",
];

// ── Install: cache app shell ──────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: clear old caches ────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch strategy ────────────────────────────────────────────
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always go to network for:
  // - Supabase API calls
  // - Map tiles (Carto, OSM)
  // - CDN assets (Leaflet, Tabler icons)
  const bypass =
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("basemaps.cartocdn.com") ||
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.hostname.includes("unpkg.com") ||
    url.pathname.includes("/rest/") ||
    url.pathname.includes("/realtime/");

  if (bypass) {
    e.respondWith(fetch(e.request));
    return;
  }

  // App shell: network first, fall back to cache
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Update cache with fresh response
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
