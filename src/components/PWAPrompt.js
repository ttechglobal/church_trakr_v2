'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Storage keys ──────────────────────────────────────────────────────────────
const K = {
  notifDismissed:  'ct_notif_prompt_dismissed_at',   // timestamp
  notifGranted:    'ct_notif_granted',                // '1'
  installDismissed:'ct_install_dismissed_at',          // timestamp
  installDone:     'ct_install_done',                  // '1'
}

const DAY = 24 * 60 * 60 * 1000
const NOTIF_REPROMPT_DAYS  = 3
const INSTALL_REPROMPT_DAYS = 7

function shouldShow(key, repromptDays) {
  const at = localStorage.getItem(key)
  if (!at) return true                              // never dismissed
  return Date.now() - parseInt(at, 10) > repromptDays * DAY
}

// ── Notification prompt sheet ─────────────────────────────────────────────────
function NotifPrompt({ onAccept, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(15,26,19,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      padding: '0 0 env(safe-area-inset-bottom,0)',
      animation: 'ctFadeIn 0.2s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 480,
        padding: '1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom,0))',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        animation: 'ctSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Icon */}
        <div style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(26,58,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a3a2a" strokeWidth="1.75" strokeLinecap="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>

        <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#1a3a2a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Stay on top of follow-ups
        </h2>
        <p style={{ fontSize: 14, color: '#8a9e90', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
          Get reminders to take attendance on Sundays and follow up with members who were absent.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onDismiss} style={{
            flex: 1, height: 48, borderRadius: 13,
            border: '1.5px solid rgba(26,58,42,0.18)',
            background: '#fff', color: '#8a9e90',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>
            Not now
          </button>
          <button onClick={onAccept} style={{
            flex: 1, height: 48, borderRadius: 13, border: 'none',
            background: '#1a3a2a', color: '#e8d5a0',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(26,58,42,0.25)',
          }}>
            Enable
          </button>
        </div>
      </div>
      <style>{`
        @keyframes ctFadeIn   { from { opacity: 0 }                              to { opacity: 1 } }
        @keyframes ctSlideUp  { from { transform: translateY(100%) }             to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}

// ── Install banner (subtle bottom strip after first prompt) ────────────────────
function InstallBanner({ isIOS, onInstall, onDismiss }) {
  // Don't render if no install mechanism available
  if (!isIOS && !onInstall) return null
  return (
    <div style={{
      position: 'fixed', bottom: 72, left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 90, width: 'calc(100% - 2rem)', maxWidth: 420,
      background: '#1a3a2a', borderRadius: 14,
      padding: '0.75rem 1rem',
      boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', gap: 12,
      animation: 'ctSlideUp2 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v14M3 10h14" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#e8d5a0', margin: 0 }}>
          Install ChurchTrakr
        </p>
        <p style={{ fontSize: 11, color: 'rgba(232,213,160,0.55)', margin: '1px 0 0', lineHeight: 1.3 }}>
          {isIOS ? 'Tap Share → "Add to Home Screen"' : 'Add to home screen for faster access'}
        </p>
      </div>
      {!isIOS && onInstall && (
        <button onClick={onInstall} style={{
          height: 32, padding: '0 12px', borderRadius: 9,
          border: 'none', background: '#c9a84c', color: '#1a3a2a',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
        }}>
          Install
        </button>
      )}
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(232,213,160,0.45)', padding: 3, flexShrink: 0,
        display: 'flex', alignItems: 'center',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <style>{`@keyframes ctSlideUp2 { from { opacity:0; transform:translateX(-50%) translateY(16px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }`}</style>
    </div>
  )
}

// ── Re-prompt banner (small, non-blocking) ────────────────────────────────────
function NotifRepromptBanner({ onEnable, onDismiss }) {
  return (
    <div style={{
      position: 'fixed', top: 62, left: 0, right: 0,
      zIndex: 80, padding: '0 0.75rem', pointerEvents: 'none',
    }}>
      <div style={{
        maxWidth: 860, margin: '0 auto',
        background: 'rgba(26,58,42,0.95)', backdropFilter: 'blur(8px)',
        borderRadius: 12, padding: '0.625rem 0.875rem',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 4px 20px rgba(26,58,42,0.2)',
        pointerEvents: 'auto',
        animation: 'ctSlideDown 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#e8d5a0', margin: 0 }}>
          Enable notifications to get Sunday reminders
        </p>
        <button onClick={onEnable} style={{
          height: 28, padding: '0 10px', borderRadius: 8,
          border: 'none', background: '#c9a84c', color: '#1a3a2a',
          fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
        }}>
          Enable
        </button>
        <button onClick={onDismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(232,213,160,0.4)', padding: 2, flexShrink: 0,
          display: 'flex',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <style>{`@keyframes ctSlideDown { from { opacity:0; transform:translateY(-10px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  )
}

// ── Main orchestrator ─────────────────────────────────────────────────────────
export default function PWAPrompt() {
  const [mounted,   setMounted]   = useState(false)
  const [showNotif, setShowNotif] = useState(false)   // full bottom sheet
  const [showBanner,setShowBanner]= useState(false)   // small re-prompt banner
  const [showInstall,setShowInstall]=useState(false)  // install strip
  const [isIOS,     setIsIOS]     = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    setMounted(true)

    // ── Detect platform ──
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    // ── Already installed? ──
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone
    if (!isStandalone) {
      // Capture install prompt for Android/Chrome
      // Show the install banner immediately when the prompt is available
      const handler = (e) => {
        e.preventDefault()
        setInstallPrompt(e)
        // Show install banner unless already done/dismissed recently
        if (!localStorage.getItem(K.installDone) &&
            shouldShow(K.installDismissed, INSTALL_REPROMPT_DAYS)) {
          // Small delay so it doesn't appear before the page loads
          setTimeout(() => setShowInstall(true), 4000)
        }
      }
      window.addEventListener('beforeinstallprompt', handler)
    }

    // ── Decide what to show ──
    // Small delay so the page renders first — never block first paint
    const timer = setTimeout(() => {
      const notifGranted  = localStorage.getItem(K.notifGranted)
      const notifPerm     = 'Notification' in window ? Notification.permission : 'default'

      if (notifPerm === 'granted') {
        // Already granted — mark and maybe show install
        if (!notifGranted) localStorage.setItem(K.notifGranted, '1')
        if (!isStandalone && !localStorage.getItem(K.installDone)) {
          if (shouldShow(K.installDismissed, INSTALL_REPROMPT_DAYS)) {
            setShowInstall(true)
          }
        }
        return
      }

      if (notifPerm === 'denied') return  // browser blocked it — nothing we can do

      // Permission is 'default' — decide which UI to show
      const neverPrompted = !localStorage.getItem(K.notifDismissed)

      if (neverPrompted) {
        // First ever visit — show full bottom sheet after 2s
        setTimeout(() => setShowNotif(true), 2000)
      } else if (shouldShow(K.notifDismissed, NOTIF_REPROMPT_DAYS)) {
        // Re-prompt with small banner after 3 days
        setShowBanner(true)
      }
    }, 500)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', () => {})
    }
  }, [])

  const requestNotifPermission = useCallback(async () => {
    if (!('Notification' in window)) return
    try {
      const result = await Notification.requestPermission()
      if (result === 'granted') {
        localStorage.setItem(K.notifGranted, '1')
        // Try to register SW push subscription
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready
            const existing = await reg.pushManager.getSubscription()
            if (!existing) {
              const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
              if (vapidKey) {
                const sub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: urlBase64ToUint8Array(vapidKey),
                })
                await fetch('/api/notifications/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ subscription: sub }),
                })
              }
            }
          } catch {} // SW/push setup is optional — local notifications still work
        }
      }
    } catch {}
  }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleNotifAccept() {
    setShowNotif(false)
    await requestNotifPermission()
    // After accepting notification, show install prompt if applicable
    if (!window.matchMedia('(display-mode: standalone)').matches &&
        !localStorage.getItem(K.installDone) &&
        shouldShow(K.installDismissed, INSTALL_REPROMPT_DAYS)) {
      setTimeout(() => setShowInstall(true), 800)
    }
  }

  function handleNotifDismiss() {
    setShowNotif(false)
    localStorage.setItem(K.notifDismissed, String(Date.now()))
  }

  function handleBannerEnable() {
    setShowBanner(false)
    requestNotifPermission()
  }

  function handleBannerDismiss() {
    setShowBanner(false)
    localStorage.setItem(K.notifDismissed, String(Date.now()))
  }

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') localStorage.setItem(K.installDone, '1')
    setShowInstall(false)
    setInstallPrompt(null)
  }

  function handleInstallDismiss() {
    setShowInstall(false)
    localStorage.setItem(K.installDismissed, String(Date.now()))
  }

  if (!mounted) return null

  return (
    <>
      {showNotif  && <NotifPrompt onAccept={handleNotifAccept} onDismiss={handleNotifDismiss} />}
      {showBanner && !showNotif && <NotifRepromptBanner onEnable={handleBannerEnable} onDismiss={handleBannerDismiss} />}
      {showInstall && !showNotif && (
        <InstallBanner
          isIOS={isIOS}
          onInstall={installPrompt ? handleInstall : null}
          onDismiss={handleInstallDismiss}
        />
      )}
    </>
  )
}

// VAPID key helper
function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}
