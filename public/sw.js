// ChurchTrakr Service Worker v3
// Placed in /public/sw.js — served at /sw.js
// IMPORTANT: This file MUST be committed to git so Vercel includes it in the build.

const CACHE_NAME = 'churchtrakr-v3'
const STATIC_URLS = ['/dashboard', '/manifest.json']

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(STATIC_URLS.map(url => cache.add(url).catch(() => null)))
    )
  )
})

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Never intercept API calls — always go to network
  if (url.pathname.startsWith('/api/')) return

  // Static assets: cache first
  if (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/manifest.json' ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.ico')) {
    event.respondWith(
      caches.match(request).then(hit => {
        if (hit) return hit
        return fetch(request).then(res => {
          if (res.ok) {
            caches.open(CACHE_NAME).then(c => c.put(request, res.clone()))
          }
          return res
        }).catch(() => hit)
      })
    )
    return
  }

  // Navigation: network first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(CACHE_NAME).then(c => c.put(request, res.clone()))
          return res
        })
        .catch(() => caches.match(request) || caches.match('/dashboard'))
    )
    return
  }
})

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  let payload = { title: 'ChurchTrakr', body: '' }
  try { payload = { ...payload, ...event.data.json() } } catch { payload.body = event.data.text() }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:  payload.body,
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag:   payload.tag || 'churchtrakr',
      data:  { url: payload.url || '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin)) { c.navigate(url); c.focus(); return }
      }
      return self.clients.openWindow(url)
    })
  )
})

// ── Messages from app ─────────────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
    // Signal back to the app to process the offline queue
    self.clients.matchAll().then(clients =>
      clients.forEach(c => c.postMessage({ type: 'SYNC_OFFLINE_QUEUE' }))
    )
  }
})
