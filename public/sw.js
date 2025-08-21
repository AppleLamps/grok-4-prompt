// Service Worker for caching and performance optimization
const CACHE_NAME = 'prompt-generator-v1';
const API_CACHE_NAME = 'api-cache-v1';
const STATIC_CACHE_NAME = 'static-cache-v1';

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
];

// Important: Do not cache or intercept API routes.

// Cache strategies
const cacheStrategies = {
  // Cache first for static assets
  cacheFirst: async (request) => {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      return new Response('Offline', { status: 503 });
    }
  },

  // Network first for API calls
  networkFirst: async (request) => {
    const cache = await caches.open(API_CACHE_NAME);
    
    try {
      const response = await fetch(request);
      cache.put(request, response.clone());
      return response;
    } catch (error) {
      const cached = await cache.match(request);
      if (cached) return cached;
      
      return new Response('Offline', { status: 503 });
    }
  },

  // Stale while revalidate for dynamic content
  staleWhileRevalidate: async (request) => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    const fetchPromise = fetch(request).then(response => {
      cache.put(request, response.clone());
      return response;
    });
    
    return cached || fetchPromise;
  }
};

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch((err) => {
        // Avoid failing install due to missing assets; log and continue
        console.warn('SW install: some assets failed to cache', err);
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Never intercept Next.js dev/prod framework assets to avoid HMR issues
  if (url.pathname.startsWith('/_next/')) {
    return; // Let the request hit the network unmodified
  }

  // Do not cache or intercept API requests; let them go to the network
  if (url.pathname.startsWith('/api/')) {
    return; // bypass SW for API calls
  }

  // Handle static assets
  if (url.pathname.startsWith('/favicon.ico') ||
      url.pathname.startsWith('/images/')) {
    event.respondWith(cacheStrategies.cacheFirst(request));
    return;
  }

  // Handle other requests
  event.respondWith(cacheStrategies.staleWhileRevalidate(request));
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      console.log('Background sync triggered')
    );
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'New content available!',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Prompt Generator', options)
  );
});

// Message handling
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
