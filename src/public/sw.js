// ChurchTrakr Service Worker
// Handles: caching, push notifications, background sync

const CACHE_NAME = 'churchtrakr-v1'
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
]

// ── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache what we can — failures are non-fatal
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => null))
      )
    })
  )
  self.skipWaiting()
})

// ── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch — Network first, cache fallback ────────────────────────────────────

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, cross-origin, and API requests
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  // For navigation requests: network first, fall back to cached dashboard
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
          }
          return response
        })
        .catch(() => {
          return caches.match(request) || caches.match('/dashboard')
        })
    )
    return
  }

  // For static assets: cache first, network fallback
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()))
          }
          return response
        })
      })
    )
  }
})

// ── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', event => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'ChurchTrakr', body: event.data.text() }
  }

  const {
    title = 'ChurchTrakr',
    body  = '',
    icon  = '/icons/icon-192.png',
    badge = '/icons/icon-192.png',
    tag,
    url   = '/dashboard',
    data  = {},
  } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag:            tag || 'churchtrakr',
      requireInteraction: false,
      data:           { url, ...data },
      actions: [
        { action: 'open', title: 'Open app' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', event => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // If app already open, focus it and navigate
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.postMessage({ type: 'NAVIGATE', url: targetUrl })
          return
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(targetUrl)
    })
  )
})

// ── Background sync (for offline queue) ──────────────────────────────────────

self.addEventListener('sync', event => {
  if (event.tag === 'attendance-sync') {
    event.waitUntil(syncOfflineQueue())
  }
})

async function syncOfflineQueue() {
  // Notify the client to process its offline queue
  const clients = await self.clients.matchAll()
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' })
  })
}

// ── Message from app ──────────────────────────────────────────────────────────

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
