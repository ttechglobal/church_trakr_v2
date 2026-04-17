'use client'

import { useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'
import { scheduleLocalNotifications } from '@/hooks/useNotifications'

/**
 * Drop this into the app layout.
 * Silently registers the service worker and schedules notifications.
 * No UI — purely functional.
 */
export default function PWAInit({ pendingFollowUps = 0 }) {
  const { swReady, permission } = usePWA()

  useEffect(() => {
    if (!swReady || permission !== 'granted') return
    try {
      const raw   = localStorage.getItem('ct_notification_prefs')
      const prefs = raw ? JSON.parse(raw) : {}
      scheduleLocalNotifications(prefs, pendingFollowUps)
    } catch {}
  }, [swReady, permission, pendingFollowUps])

  return null
}
