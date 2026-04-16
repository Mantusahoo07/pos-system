// public/sw.js

const CACHE_NAME = 'pos-system-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/splash.html',
  '/manifest.json',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-128.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-384.png',
  '/icon-512.png',
  '/sounds/new-dine-in.mp3',
  '/sounds/new-takeaway.mp3',
  '/sounds/new-zomato.mp3',
  '/sounds/new-swiggy.mp3',
  '/sounds/new-delivery.mp3',
  '/sounds/order-modified.mp3',
  '/sounds/order-cancelled.mp3',
  '/sounds/order-ready.mp3',
  '/sounds/cancellation-request.mp3',
  '/sounds/instant-order.mp3'
];

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Cache add error:', err))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/sounds/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
    return;
  }
  
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Push notification handler
self.addEventListener('push', event => {
  console.log('🔔 Push notification received');
  
  let data = {
    title: 'POS System',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    tag: 'notification',
    vibrate: [200, 100, 200],
    sound: '/sounds/new-dine-in.mp3'
  };
  
  if (event.data) {
    try {
      const parsedData = event.data.json();
      data = { ...data, ...parsedData };
      console.log('📨 Notification data:', data);
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  // Play sound via client
  if (data.sound) {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PLAY_SOUND',
            sound: data.sound
          });
        });
      })
    );
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    vibrate: data.vibrate,
    data: { url: data.data?.url || '/', ...data.data },
    requireInteraction: true,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Message handler for sound
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'PLAY_SOUND') {
    console.log('🔊 Sound request:', event.data.sound);
  }
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});