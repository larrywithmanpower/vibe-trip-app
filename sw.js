// Minimal Service Worker to satisfy PWA requirements
self.addEventListener('install', (e) => {
  console.log('[SW] Installed');
});

self.addEventListener('fetch', (e) => {
  // Pass-through for now
  e.respondWith(fetch(e.request));
});
