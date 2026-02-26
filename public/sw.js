self.addEventListener('install', (e) => {
  self.skipWaiting();
  console.log('[SW] Installed and skipping waiting');
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
  console.log('[SW] Activated and claimed clients');
});

self.addEventListener('fetch', (e) => {
  // 絕對不要攔截 Google 或 氣象 API
  const url = e.request.url;
  if (url.includes('google.com') || url.includes('open-meteo.com')) {
    return;
  }
  
  e.respondWith(
    fetch(e.request).catch(() => {
        // 失敗時不拋出異常到 console，讓瀏覽器自然處理
        return undefined;
    })
  );
});
