'use client'

import { useEffect, useState, useCallback } from 'react'

// ── Module-level singleton — shared across ALL usePWA() instances ─────────────
// beforeinstallprompt fires once per page load. Storing it here means
// any component can call promptInstall() regardless of mount order.
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
  const [installPrompt, setInstallPrompt] = useState(null)
  const [isInstalled, setIsInstalled]     = useState(false)
  const [swReady, setSwReady]             = useState(false)
  const [permission, setPermission]       = useState('default')
  const [subscription, setSubscription]   = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Check if already installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone
    ) {
      setIsInstalled(true)
    }

    // Notification permission
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }

    // Subscribe to the global singleton (handles events that fired before mount)
    const unsub = subscribeToPrompt(e => setInstallPrompt(e))

    // Capture beforeinstallprompt into the global singleton
    const handleBeforeInstall = e => {
      e.preventDefault()
      setGlobalPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Register SW — non-blocking, failure does NOT affect install prompt
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
          // SW 404 or security error — log but don't crash
          console.warn('[usePWA] SW registration failed:', err.message)
        })
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      unsub()
    }
  }, [])

  // ── Trigger the native install prompt ─────────────────────────────────────
  // Uses the global singleton directly so it always works regardless of
  // which component instance captured the event.
  const promptInstall = useCallback(async () => {
    const event = _installPromptEvent
    if (!event) return false
    try {
      event.prompt()
      const { outcome } = await event.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        localStorage.setItem('ct_pwa_installed', '1')
      }
      // Clear event — it can only be used once
      _installPromptEvent = null
      setInstallPrompt(null)
      _listeners.forEach(fn => fn(null))
      return outcome === 'accepted'
    } catch (err) {
      console.warn('[usePWA] promptInstall failed:', err.message)
      return false
    }
  }, [])

  // Request push notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  return {
    installPrompt: !!installPrompt,  // boolean — is native prompt available?
    promptInstall,                   // function — triggers prompt or returns false
    isInstalled,
    swReady,
    permission,
    subscription,
    requestPermission,
  }
}
