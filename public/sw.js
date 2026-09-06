// ChurchTrakr Service Worker
// Handles: push notifications, offline caching, background sync
const CACHE_NAME  = 'churchtrakr-v2'
const CACHE_URLS  = [
  '/',
  '/dashboard',
  '/offline',
]

// ── Install: cache shell ──────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

// ── Activate: clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: network-first for API, cache-first for static ─────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Never cache API calls or Supabase
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    return // let it fall through to network
  }

  // Network-first for navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(request, clone)).catch(() => {})
          return res
        })
        .catch(() => caches.match(request).then(r => r || caches.match('/')))
    )
    return
  }

  // Cache-first for static assets (fonts, icons, CSS, JS chunks)
  if (
    url.pathname.match(/\.(ico|png|svg|webp|woff2?|css|js)$/) ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(request, clone)).catch(() => {})
          return res
        })
      })
    )
    return
  }
})

// ── Push: handle push notifications from server ───────────────────────────────
self.addEventListener('push', event => {
  let data = { title: 'ChurchTrakr', body: 'You have a new notification', url: '/dashboard' }

  if (event.data) {
    try { data = { ...data, ...event.data.json() } } catch {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icons/icon-192.png',
      badge:   '/icons/icon-72.png',
      tag:     data.tag || 'churchtrakr',
      data:    { url: data.url || '/dashboard' },
      actions: data.actions || [],
      vibrate: [200, 100, 200],
      requireInteraction: data.requireInteraction || false,
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/dashboard'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing window if open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Otherwise open new window
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

// ── Background sync: flush offline attendance queue ──────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'attendance-sync') {
    event.waitUntil(flushOfflineQueue())
  }
})

async function flushOfflineQueue() {
  try {
    // IndexedDB access via idb-keyval not available in SW without import,
    // so we message the client to flush instead
    const allClients = await clients.matchAll({ type: 'window' })
    for (const client of allClients) {
      client.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' })
    }
  } catch {}
}
