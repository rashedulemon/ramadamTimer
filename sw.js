const CACHE_NAME = 'ramadan-timer-v2';
const ASSETS_TO_CACHE = [
    'index.html',
    'style.css',
    'script.js',
    'schedule_data.js',
    'favicon.svg',
    'manifest.json',
    'icons/icon-192.png',
    'icons/icon-512.png'
];

// Install Event - Cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Pre-caching assets');
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('SW: Some assets failed to cache during install', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('SW: Clearing old cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Fetch Event - Stale-while-revalidate
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // If network fails, we rely on cachedResponse below
            });
            return cachedResponse || fetchPromise;
        })
    );
});
