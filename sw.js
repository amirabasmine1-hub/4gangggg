/* چهار داشی - offline application shell
 * This file must be hosted beside index.html on HTTPS (or localhost).
 */
'use strict';
const CACHE_NAME = '4-dashi-shell-v3';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache the app shell. A successful first online visit is required.
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('4-dashi-shell-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation: prefer fresh content, but fall back to the cached app when offline.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          cache.put('./index.html', response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        return (await cache.match(request)) || (await cache.match('./index.html')) ||
          new Response(`<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>چهار داشی</title><body style="margin:0;background:#0b1020;color:#f4f6ff;font-family:Tahoma,Arial,sans-serif;display:grid;min-height:100vh;place-items:center;text-align:center"><main style="padding:28px;max-width:420px"><h1>اتصال اینترنت قطع است</h1><p>چهار داشی به‌صورت آفلاین باز شد. اینترنت را وصل کن؛ برنامه پس از برگشت اتصال خودش تازه‌سازی می‌شود.</p><button onclick="location.reload()" style="padding:12px 18px;border:0;border-radius:12px">تلاش دوباره</button></main></body></html>`, {headers: {'Content-Type': 'text/html; charset=utf-8'}});
      }
    })());
    return;
  }

  // Cache same-origin static resources when possible; otherwise use the network.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      return cached || Response.error();
    }
  })());
});
