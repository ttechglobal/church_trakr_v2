// ChurchTrakr Service Worker v2
const CACHE = 'churchtrakr-v2'
const STATIC = ['/', '/dashboard', '/manifest.json', '/icons/icon-192.png']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(STATIC.map(u => c.add(u).catch(() => null)))
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  // Skip API calls - always network
  if (url.pathname.startsWith('/api/')) return

  // Static assets: cache-first
  if (url.pathname.startsWith('/_next/static/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname === '/manifest.json') {
    e.respondWith(
      caches.match(request).then(hit => hit || fetch(request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()))
        return res
      }))
    )
    return
  }

  // Navigation: network-first, cache fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()))
          return res
        })
        .catch(() => caches.match(request) || caches.match('/dashboard'))
    )
  }
})

// Push notifications
self.addEventListener('push', e => {
  if (!e.data) return
  let payload
  try { payload = e.data.json() }
  catch { payload = { title: 'ChurchTrakr', body: e.data.text() } }

  e.waitUntil(
    self.registration.showNotification(payload.title || 'ChurchTrakr', {
      body:  payload.body || '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag:   payload.tag || 'churchtrakr',
      data:  { url: payload.url || '/dashboard' },
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/dashboard'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin)) { c.focus(); return }
      }
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
