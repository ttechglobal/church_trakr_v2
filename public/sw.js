// ChurchTrakr Service Worker v4
// Must be at /public/sw.js so it's served at /sw.js
// Commit this file to git — Vercel won't serve it otherwise.

const CACHE = 'ct-v4'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  const { request } = e
  const url = new URL(request.url)

  // Only handle same-origin GETs
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  // Never cache API calls
  if (url.pathname.startsWith('/api/')) return
  // Never cache Next.js HMR / dev
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/manifest.json' ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg')

  if (isStatic) {
    // Cache-first: serve from cache, update cache in background
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(res => {
            // Clone BEFORE returning so we can put a copy in cache
            if (res.ok) cache.put(request, res.clone())
            return res
          }).catch(() => cached)
          return cached || fetchPromise
        })
      )
    )
    return
  }

  // Navigation requests: network-first, cache fallback
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            // Clone BEFORE using the response, then cache the clone
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(request, clone))
          }
          return res
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match('/dashboard'))
        )
    )
  }
})

// Push notifications
self.addEventListener('push', e => {
  if (!e.data) return
  let p = { title: 'ChurchTrakr', body: '', url: '/dashboard' }
  try { p = { ...p, ...e.data.json() } } catch { p.body = e.data.text() }
  e.waitUntil(
    self.registration.showNotification(p.title, {
      body: p.body, icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png', tag: 'ct', data: { url: p.url },
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/dashboard'
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      for (const c of clients) {
        if (c.url.includes(self.location.origin)) { c.navigate(url); c.focus(); return }
      }
      return self.clients.openWindow(url)
    })
  )
})

self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
