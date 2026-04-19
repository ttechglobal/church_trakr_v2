'use client'

import { useEffect, useState, useCallback } from 'react'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

// ── Global install prompt singleton ──────────────────────────────────────────
// beforeinstallprompt fires once per page load. Store it module-level so every
// usePWA() instance shares it regardless of mount order.
let _deferredPrompt = null
const _promptListeners = new Set()

function notifyPromptListeners(e) {
  _promptListeners.forEach(fn => { try { fn(e) } catch {} })
}

export function usePWA() {
  const [swReady,      setSwReady]      = useState(false)
  const [permission,   setPermission]   = useState('default')
  const [subscription, setSubscription] = useState(null)
  const [canInstall,   setCanInstall]   = useState(false)
  const [isInstalled,  setIsInstalled]  = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Sync current permission
    if ('Notification' in window) setPermission(Notification.permission)

    // Check if already running as installed PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                       !!window.navigator.standalone
    if (standalone) { setIsInstalled(true) }

    // If another instance already captured the prompt, sync immediately
    if (_deferredPrompt) setCanInstall(true)

    // Capture the install prompt.
    // IMPORTANT: Do NOT call e.preventDefault() here.
    // Calling preventDefault() suppresses Chrome's built-in mini-infobar and
    // forces you to call prompt() from a user gesture — if you don't call it
    // fast enough Chrome discards it and logs the "Banner not shown" warning.
    // Without preventDefault(), the browser mini-infobar appears naturally AND
    // we also capture the event to power our own UI.
    function onBeforeInstall(e) {
      _deferredPrompt = e
      setCanInstall(true)
      notifyPromptListeners(e)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // Detect successful installation
    function onInstalled() {
      _deferredPrompt = null
      setCanInstall(false)
      setIsInstalled(true)
      notifyPromptListeners(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    // Subscribe so this instance is updated when any other instance changes the prompt
    function onPromptChange(e) {
      setCanInstall(!!e)
      if (!e) setIsInstalled(true)
    }
    _promptListeners.add(onPromptChange)

    // Register service worker (non-blocking — never throws)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          setSwReady(true)
          reg.pushManager?.getSubscription().then(s => s && setSubscription(s)).catch(() => {})
        })
        .catch(err => console.warn('[SW] Registration failed:', err.message))
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      _promptListeners.delete(onPromptChange)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted' && VAPID_PUBLIC_KEY && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
        setSubscription(sub)
        await fetch('/api/notifications/subscribe', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub }),
        })
      } catch (err) { console.warn('[Push] Subscription failed:', err) }
    }
    return result === 'granted'
  }, [])

  // MUST be called directly from a user click handler (synchronous user gesture).
  // Do not wrap in setTimeout or await before calling prompt().
  const promptInstall = useCallback(async () => {
    const p = _deferredPrompt
    if (!p) { console.warn('[PWA] No install prompt captured yet'); return false }

    // Clear before calling so double-taps don't re-trigger
    _deferredPrompt = null
    setCanInstall(false)
    notifyPromptListeners(null)

    try {
      p.prompt()                              // must be synchronous from user gesture
      const { outcome } = await p.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        localStorage.setItem('ct_install_done', '1')
      } else {
        // User dismissed — restore so they can try again later
        _deferredPrompt = p
        setCanInstall(true)
        notifyPromptListeners(p)
      }
      return outcome === 'accepted'
    } catch (err) {
      console.warn('[PWA] prompt() failed:', err)
      _deferredPrompt = p
      setCanInstall(true)
      notifyPromptListeners(p)
      return false
    }
  }, [])

  return {
    swReady,
    permission,
    subscription,
    installPrompt: canInstall,
    isInstalled,
    requestPermission,
    promptInstall,
  }
}

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0))
}

async function processOfflineQueue() {
  const raw = localStorage.getItem('ct_offline_queue')
  if (!raw) return
  const queue = JSON.parse(raw)
  const remaining = []
  for (const item of queue) {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      if (!res.ok) remaining.push(item)
    } catch { remaining.push(item) }
  }
  localStorage.setItem('ct_offline_queue', JSON.stringify(remaining.length ? remaining : []))
  if (!remaining.length) localStorage.removeItem('ct_offline_queue')
}
