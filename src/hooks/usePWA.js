'use client'

import { useEffect, useState, useCallback } from 'react'

// ── VAPID key (public) ────────────────────────────────────────────────────────
// In production, generate a real VAPID key pair:
//   npx web-push generate-vapid-keys
// Then set NEXT_PUBLIC_VAPID_PUBLIC_KEY in your .env
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  const output  = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export function usePWA() {
  const [swReady,       setSwReady]       = useState(false)
  const [permission,    setPermission]    = useState('default')
  const [subscription,  setSubscription]  = useState(null)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled,   setIsInstalled]   = useState(false)

  // Register service worker + set up install prompt capture
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone) {
      setIsInstalled(true)
    }

    // Capture beforeinstallprompt BEFORE attempting SW registration
    // This event fires independently of the SW — don't block it on SW success
    const handleBeforeInstall = e => {
      e.preventDefault()
      setInstallPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Register service worker (non-blocking — failure does not affect install prompt)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          setSwReady(true)
          // Check existing push subscription
          reg.pushManager?.getSubscription().then(sub => {
            if (sub) setSubscription(sub)
          }).catch(() => {})
          // Listen for SW messages
          navigator.serviceWorker.addEventListener('message', event => {
            if (event.data?.type === 'NAVIGATE') window.location.href = event.data.url
            if (event.data?.type === 'SYNC_OFFLINE_QUEUE') processOfflineQueue()
          })
        })
        .catch(err => {
          // SW failed (404, security error, etc.) — log but don't throw
          // Install prompt and notifications can still work without SW
          console.warn('[ChurchTrakr] Service worker registration failed:', err.message)
        })
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  // Request notification permission + subscribe to push
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return false

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === 'granted' && VAPID_PUBLIC_KEY) {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
        setSubscription(sub)

        // Send subscription to server
        await fetch('/api/notifications/subscribe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ subscription: sub }),
        })

        return true
      } catch (err) {
        console.warn('Push subscription failed:', err)
      }
    }

    return result === 'granted'
  }, [])

  // Trigger install prompt
  const promptInstall = useCallback(async () => {
    if (!installPrompt) return false
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setInstallPrompt(null)
    return outcome === 'accepted'
  }, [installPrompt])

  return {
    swReady,
    permission,
    subscription,
    installPrompt: !!installPrompt,
    isInstalled,
    requestPermission,
    promptInstall,
  }
}

// ── Offline queue processor ───────────────────────────────────────────────────

async function processOfflineQueue() {
  const raw = localStorage.getItem('ct_offline_queue')
  if (!raw) return
  const queue = JSON.parse(raw)
  if (!queue.length) return

  const remaining = []
  for (const item of queue) {
    try {
      const res = await fetch('/api/attendance', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(item),
      })
      if (!res.ok) remaining.push(item)
    } catch {
      remaining.push(item)
    }
  }

  if (remaining.length) {
    localStorage.setItem('ct_offline_queue', JSON.stringify(remaining))
  } else {
    localStorage.removeItem('ct_offline_queue')
  }
}
