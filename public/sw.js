// Service Worker for caching dicebear avatars
const AVATAR_CACHE = 'avatar-cache-v1';
const CACHEABLE_AVATAR_PATTERN = /^https:\/\/api\.dicebear\.com\/.*\.svg/;

// Install event - cache dicebear avatars
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(AVATAR_CACHE).then((cache) => {
      // Pre-cache nothing by default, but set up the cache
      return cache;
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== AVATAR_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache-first strategy for avatars
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only cache dicebear avatars
  if (CACHEABLE_AVATAR_PATTERN.test(url.href)) {
    event.respondWith(
      caches.open(AVATAR_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response and update in background
            fetchAndCache(event.request, cache);
            return cachedResponse;
          }

          // Not in cache, fetch and cache
          return fetchAndCache(event.request, cache);
        });
      })
    );
  }
});

// Helper to fetch and update cache
async function fetchAndCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return nothing if fetch fails
    return new Response('', { status: 408 });
  }
}