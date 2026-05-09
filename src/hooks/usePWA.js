'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Module-level singleton ────────────────────────────────────────────────────
// beforeinstallprompt fires ONCE per page load. After the user dismisses
// the native prompt, the browser does NOT fire it again — but the event
// object is still valid and .prompt() can be called again.
// Storing here (not in React state) prevents the event from losing its
// .prompt() method through React's synthetic event system.
let _installPromptEvent = null
const _listeners = new Set()

function setGlobalPrompt(e) {
  _installPromptEvent = e
  _listeners.forEach(fn => fn(e))
}

function subscribeToPrompt(fn) {
  _listeners.add(fn)
  if (_installPromptEvent) fn(_installPromptEvent)
  return () => _listeners.delete(fn)
}

export function usePWA() {
  const [hasPrompt,    setHasPrompt]    = useState(false)
  const [isInstalled,  setIsInstalled]  = useState(false)
  const [swReady,      setSwReady]      = useState(false)
  const [permission,   setPermission]   = useState('default')
  const [subscription, setSubscription] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if already installed as PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true)
    }

    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Subscribe to the global singleton
    const unsub = subscribeToPrompt(e => setHasPrompt(!!e))

    // Capture beforeinstallprompt into the global singleton
    const handleBeforeInstall = e => {
      e.preventDefault()
      setGlobalPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Track when app gets installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      _installPromptEvent = null
      setHasPrompt(false)
      _listeners.forEach(fn => fn(null))
    }
    window.addEventListener('appinstalled', handleAppInstalled)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          setSwReady(true)
          reg.pushManager?.getSubscription().then(sub => {
            if (sub) setSubscription(sub)
          }).catch(() => {})
          navigator.serviceWorker.addEventListener('message', e => {
            if (e.data?.type === 'NAVIGATE') window.location.href = e.data.url
          })
        })
        .catch(err => {
          console.warn('[usePWA] SW registration failed:', err.message)
        })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
      unsub()
    }
  }, [])

  // Trigger native install prompt
  // IMPORTANT: on dismiss, we do NOT null out the event.
  // The same event object can be used to re-prompt on next click.
  const promptInstall = useCallback(async () => {
    const event = _installPromptEvent
    if (!event) return false
    try {
      await event.prompt()
      const { outcome } = await event.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        _installPromptEvent = null
        setHasPrompt(false)
        _listeners.forEach(fn => fn(null))
        return true
      }
      // Dismissed — keep the event so user can try again
      return false
    } catch (err) {
      console.warn('[usePWA] promptInstall failed:', err.message)
      return false
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  return {
    installPrompt: hasPrompt,  // boolean — native prompt is available
    promptInstall,             // function — triggers native prompt
    isInstalled,
    swReady,
    permission,
    subscription,
    requestPermission,
  }
}
