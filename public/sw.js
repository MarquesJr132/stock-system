const CACHE_NAME = 'stock-system-v1.0.0';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Get base path for GitHub Pages deployment
const BASE_PATH = '/stock-system';

// Critical resources to cache immediately
const PRECACHE_URLS = [
  BASE_PATH + '/',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/favicon.ico'
];

// API endpoints to cache for offline functionality
const API_CACHE_PATTERNS = [
  /\/api\/products/,
  /\/api\/customers/,
  /\/api\/sales/,
  /supabase\.co.*\/rest\/v1\/(products|customers|sales)/
];

// Install event - cache critical resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      console.log('Caching critical resources');
      await cache.addAll(PRECACHE_URLS);
      
      // Skip waiting to activate immediately
      await self.skipWaiting();
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
          .map(cacheName => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
      
      // Claim all clients
      await self.clients.claim();
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(
    (async () => {
      try {
        // Check if it's an API request that should be cached
        const isApiRequest = API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
        
        if (isApiRequest) {
          return await handleApiRequest(request);
        }
        
        // For other requests, try network first, fallback to cache
        return await handleGeneralRequest(request);
        
      } catch (error) {
        console.error('Fetch error:', error);
        
        // Return cached response if available
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Return offline page or error response
        return new Response('Offline - Content not available', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});

// Handle API requests with cache-first strategy for offline capability
async function handleApiRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    // If network fails, try cache
    const cachedResponse = await cache.match(request);
    return cachedResponse || networkResponse;
    
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('Serving cached API response:', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

// Handle general requests (HTML, CSS, JS, images)
async function handleGeneralRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses (except for same-origin requests to avoid caching too much)
      if (request.url.startsWith(self.location.origin)) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }
    
    // If network response is not ok, try cache
    const cachedResponse = await cache.match(request);
    return cachedResponse || networkResponse;
    
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('Serving cached response:', request.url);
      return cachedResponse;
    }
    
    // For navigation requests, try to return the main app
    if (request.mode === 'navigate') {
      const appResponse = await cache.match(BASE_PATH + '/');
      if (appResponse) {
        return appResponse;
      }
    }
    
    throw error;
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  let notificationData = {
    title: 'Sistema de Stock',
    body: 'Nova notificação disponível',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: {}
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      requireInteraction: false,
      vibrate: [200, 100, 200]
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || BASE_PATH + '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB or other storage
    // This would sync any actions performed while offline
    console.log('Syncing offline actions...');
    
    // Example: sync offline sales, stock movements, etc.
    // Implementation would depend on your offline storage strategy
    
  } catch (error) {
    console.error('Error syncing offline actions:', error);
  }
}