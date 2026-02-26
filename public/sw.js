self.addEventListener('install', (e) => {
  self.skipWaiting();
  console.log('[SW] Installed and skipping waiting');
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
  console.log('[SW] Activated and claimed clients');
});

self.addEventListener('fetch', (e) => {
  // 絕對不要攔截 Google Apps Script
  if (e.request.url.includes('google.com')) {
    return;
  }
  
  e.respondWith(
    fetch(e.request).catch(() => {
        // 失敗時不拋出異常到 console，讓瀏覽器自然處理
        return undefined;
    })
  );
});
