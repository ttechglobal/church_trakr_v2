'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY  = 'ct_notification_prefs'
const SW_SCOPE     = '/'

const DEFAULTS = {
  sundayMorning:    true,   // 9am Sunday — take attendance
  sundayAfternoon:  true,   // 1pm Sunday — if not yet taken
  attendanceAlert:  true,   // when attendance is submitted by a team member
  mondayFollowUp:   true,   // Mon 9am — follow up reminder
  wednesdayFollowUp: true,  // Wed 9am — midweek reminder if still pending
}

// ── Notification preference hook ──────────────────────────────────────────────
export function useNotificationPrefs() {
  const [prefs, setPrefsState] = useState(DEFAULTS)
  const [loaded, setLoaded]    = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setPrefsState({ ...DEFAULTS, ...JSON.parse(stored) })
    } catch {}
    setLoaded(true)
  }, [])

  function setPrefs(updates) {
    const next = { ...prefs, ...updates }
    setPrefsState(next)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  function toggle(key) { setPrefs({ [key]: !prefs[key] }) }

  return { prefs, toggle, setPrefs, loaded }
}

// ── Main notifications hook ───────────────────────────────────────────────────
export function useSmartNotifications(pendingFollowUps = 0) {
  const [permission,   setPermission]   = useState('default')
  const [swReady,      setSwReady]      = useState(false)
  const [subscription, setSubscription] = useState(null)

  // ── Register service worker ───────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js', { scope: SW_SCOPE })
      .then(reg => {
        setSwReady(true)

        // Listen for offline queue flush messages
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data?.type === 'FLUSH_OFFLINE_QUEUE') {
            flushOfflineQueue()
          }
        })

        return reg
      })
      .catch(err => console.warn('[SW] Registration failed:', err))

    // Sync current permission state
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // ── Request permission + subscribe to push ────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported'

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === 'granted' && swReady) {
      await subscribeToPush()
    }

    return result
  }, [swReady])

  // ── Subscribe to Web Push ─────────────────────────────────────────────────
  async function subscribeToPush() {
    try {
      const reg = await navigator.serviceWorker.ready

      // Check for existing subscription
      let sub = await reg.pushManager.getSubscription()

      if (!sub) {
        // Only subscribe if VAPID key is configured
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) {
          // No VAPID — fall back to local notifications only
          return null
        }

        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }

      setSubscription(sub)

      // Save to server
      await fetch('/api/notifications/subscribe', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(sub.toJSON()),
      }).catch(() => {})

      return sub
    } catch (err) {
      console.warn('[Push] Subscribe failed:', err)
      return null
    }
  }

  // ── Schedule local (in-session) notifications ─────────────────────────────
  // These fire via setTimeout — work while the app is open.
  // The service worker handles notifications when the app is closed.
  const scheduleLocal = useCallback((prefs) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return

    const now       = new Date()
    const day       = now.getDay()  // 0=Sun
    const hour      = now.getHours()
    const minutes   = now.getMinutes()

    function msUntil(targetHour, targetMin = 0) {
      const target = new Date(now)
      target.setHours(targetHour, targetMin, 0, 0)
      return target.getTime() - now.getTime()
    }

    // Sunday 9am — take attendance reminder
    if (day === 0 && prefs.sundayMorning && hour < 9) {
      const ms = msUntil(9)
      if (ms > 0) setTimeout(() => showNotification(
        "Time to take attendance 📋",
        "Mark who's present at today's service.",
        '/attendance',
        'sunday-morning'
      ), ms)
    }

    // Sunday 1pm — if attendance not yet taken today
    if (day === 0 && prefs.sundayAfternoon && hour < 13) {
      const ms = msUntil(13)
      if (ms > 0) setTimeout(() => {
        const lastDate = localStorage.getItem('ct_last_attendance_date')
        const today    = new Date().toISOString().slice(0, 10)
        if (lastDate !== today) {
          showNotification(
            "Have you taken attendance? 🙏",
            "Don't forget to mark who came today.",
            '/attendance',
            'sunday-afternoon'
          )
        }
      }, ms)
    }

    // Monday 9am — follow-up reminder
    if (day === 1 && prefs.mondayFollowUp && hour < 9 && pendingFollowUps > 0) {
      const ms = msUntil(9)
      if (ms > 0) setTimeout(() => showNotification(
        `${pendingFollowUps} people need follow-up 🙏`,
        "Reach out to members who missed Sunday's service.",
        '/absentees',
        'monday-followup'
      ), ms)
    }

    // Wednesday 9am — midweek nudge if still pending
    if (day === 3 && prefs.wednesdayFollowUp && hour < 9 && pendingFollowUps > 0) {
      const ms = msUntil(9)
      if (ms > 0) setTimeout(() => showNotification(
        "Midweek follow-up check 🕊️",
        `${pendingFollowUps} members still haven't heard from you this week.`,
        '/absentees',
        'wednesday-followup'
      ), ms)
    }
  }, [pendingFollowUps])

  return { permission, swReady, subscription, requestPermission, scheduleLocal }
}

// ── Standalone helpers (imported by other files) ──────────────────────────────
export function showLocalNotification(title, body, url = '/dashboard') {
  showNotification(title, body, url)
}

export function notifyAttendanceSubmitted(displayName, present, absent) {
  showNotification(
    `Attendance recorded ✅`,
    `${displayName} marked ${present} present, ${absent} absent. Check follow-ups.`,
    '/absentees',
    'attendance-submitted'
  )
}

// ── Schedule (legacy export — kept for backward compat) ───────────────────────
export function scheduleLocalNotifications(prefs, pendingFollowUps = 0) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  // Delegates to the hook's scheduleLocal — but can be called standalone
  const hook = { pendingFollowUps }
  const now  = new Date()
  const day  = now.getDay()
  const hour = now.getHours()

  function msUntil(h) {
    const t = new Date(now); t.setHours(h, 0, 0, 0); return t.getTime() - now.getTime()
  }

  if (day === 0 && prefs.sundayMorning    && hour < 9  ) setTimeout(() => showNotification("Time to take attendance 📋",      "Mark who's present at today's service.",                           '/attendance', 'sunday-am'), msUntil(9))
  if (day === 0 && prefs.sundayAfternoon  && hour < 13 ) setTimeout(() => { const l=localStorage.getItem('ct_last_attendance_date'); if(l!==new Date().toISOString().slice(0,10)) showNotification("Have you taken attendance? 🙏","Don't forget to mark who came today.",'/attendance','sunday-pm') }, msUntil(13))
  if (day === 1 && prefs.mondayFollowUp   && hour < 9  && pendingFollowUps > 0) setTimeout(() => showNotification(`${pendingFollowUps} people need follow-up 🙏`, "Reach out to members who missed Sunday.",'/absentees','monday-fu'), msUntil(9))
  if (day === 3 && prefs.wednesdayFollowUp && hour < 9 && pendingFollowUps > 0) setTimeout(() => showNotification("Midweek follow-up check 🕊️",`${pendingFollowUps} members still waiting to hear from you.`,'/absentees','wed-fu'), msUntil(9))
}

// ── Internal helpers ──────────────────────────────────────────────────────────
function showNotification(title, body, url = '/dashboard', tag = 'churchtrakr') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  // Prefer SW notification (survives app close, shows on lock screen)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon:    '/icons/icon-192.png',
        badge:   '/icons/icon-72.png',
        tag,
        data:    { url },
        vibrate: [200, 100, 200],
      }).catch(() => {
        // SW notification failed — fall back to Notification API
        _showBrowserNotification(title, body, url)
      })
    }).catch(() => _showBrowserNotification(title, body, url))
  } else {
    _showBrowserNotification(title, body, url)
  }
}

function _showBrowserNotification(title, body, url) {
  try {
    const n = new Notification(title, {
      body,
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data:  { url },
    })
    n.onclick = () => { window.focus(); window.location.href = url; n.close() }
  } catch {}
}

// Flush offline attendance queue — called when SW signals connectivity restored
async function flushOfflineQueue() {
  try {
    const queue = JSON.parse(localStorage.getItem('ct_offline_queue') ?? '[]')
    if (!queue.length) return

    const remaining = []
    for (const payload of queue) {
      try {
        const res = await fetch('/api/attendance', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })
        if (!res.ok) remaining.push(payload)
      } catch {
        remaining.push(payload)
      }
    }
    localStorage.setItem('ct_offline_queue', JSON.stringify(remaining))
  } catch {}
}

// ── VAPID helper ──────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
