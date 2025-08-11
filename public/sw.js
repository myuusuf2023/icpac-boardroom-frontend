// ICPAC Booking System - Service Worker
const CACHE_NAME = 'icpac-booking-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icpaclogo.png',
  '/favicon.ico',
  // Add other static assets as needed
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients for current page');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  console.log('[ServiceWorker] Fetch', event.request.url);

  // Handle navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If we got a response, clone it and store it in the cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // If fetch fails, try to get the page from cache
          return caches.match(event.request)
            .then((response) => {
              if (response) {
                return response;
              }
              // If not in cache, return offline page
              return caches.match('/');
            });
        })
    );
    return;
  }

  // Handle other requests (API, assets, etc.)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('[ServiceWorker] Serving from cache', event.request.url);
          return response;
        }

        // Fetch from network and cache the response
        return fetch(event.request)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response to cache it
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Only cache GET requests
                if (event.request.method === 'GET') {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, show offline message
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
            
            // For other requests, return a basic offline response
            return new Response(
              JSON.stringify({
                error: 'Offline',
                message: 'You are currently offline. Some features may not be available.'
              }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          });
      })
  );
});

// Background sync for offline bookings
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync', event.tag);
  
  if (event.tag === 'booking-sync') {
    event.waitUntil(
      syncOfflineBookings()
    );
  }
});

// Sync offline bookings when connection is restored
async function syncOfflineBookings() {
  try {
    // Get offline bookings from IndexedDB or localStorage
    const offlineBookings = await getOfflineBookings();
    
    for (const booking of offlineBookings) {
      try {
        // Attempt to send booking to server
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(booking)
        });
        
        if (response.ok) {
          // Remove from offline storage
          await removeOfflineBooking(booking.id);
          console.log('[ServiceWorker] Synced booking', booking.id);
        }
      } catch (error) {
        console.log('[ServiceWorker] Failed to sync booking', booking.id, error);
      }
    }
  } catch (error) {
    console.log('[ServiceWorker] Sync failed', error);
  }
}

// Helper functions for offline storage
async function getOfflineBookings() {
  // In a real implementation, this would use IndexedDB
  // For now, return empty array
  return [];
}

async function removeOfflineBooking(bookingId) {
  // Remove booking from offline storage
  console.log('[ServiceWorker] Removing offline booking', bookingId);
}

// Push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push Received.');
  
  const options = {
    body: 'Meeting reminder: Your booking starts in 30 minutes',
    icon: '/icpaclogo.png',
    badge: '/icpaclogo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    },
    actions: [
      {
        action: 'explore',
        title: 'View Booking',
        icon: '/icpaclogo.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icpaclogo.png'
      }
    ]
  };

  const title = 'ICPAC Booking Reminder';
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click Received.');

  event.notification.close();

  if (event.action === 'explore') {
    // Open the app to show booking details
    event.waitUntil(
      clients.openWindow('/?view=my-bookings')
    );
  } else {
    // Close notification
    event.notification.close();
  }
});

console.log('[ServiceWorker] Service Worker registered successfully');