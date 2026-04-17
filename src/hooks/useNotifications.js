'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ct_notification_prefs'

const DEFAULTS = {
  sundayMorning:    true,   // 9am Sunday reminder to take attendance
  sundayAfternoon:  true,   // 1pm Sunday reminder if not yet taken
  attendanceAlert:  true,   // Alert team when attendance is submitted
  mondayFollowUp:   true,   // Monday morning follow-up reminder
  wednesdayFollowUp: true,  // Wednesday midweek reminder
}

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function toggle(key) {
    setPrefs({ [key]: !prefs[key] })
  }

  return { prefs, toggle, setPrefs, loaded }
}

// ── Schedule local notifications ─────────────────────────────────────────────
// Since true push requires a server, we use a hybrid approach:
// - In-app: schedule via setTimeout for the current session
// - Persistent: store scheduled times and check on app open

export function scheduleLocalNotifications(prefs, pendingFollowUps = 0) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const now      = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, etc.
  const hour      = now.getHours()

  // Sunday reminders
  if (dayOfWeek === 0 && prefs.sundayMorning && hour < 9) {
    const msUntil9am = new Date(now).setHours(9, 0, 0, 0) - now.getTime()
    if (msUntil9am > 0) {
      setTimeout(() => {
        showLocalNotification(
          "Time to take attendance 📋",
          "It's Sunday — don't forget to mark who's present today.",
          '/attendance'
        )
      }, msUntil9am)
    }
  }

  if (dayOfWeek === 0 && prefs.sundayAfternoon && hour < 13) {
    const msUntil1pm = new Date(now).setHours(13, 0, 0, 0) - now.getTime()
    if (msUntil1pm > 0) {
      setTimeout(() => {
        // Only show if attendance hasn't been recorded today
        const lastAttendance = localStorage.getItem('ct_last_attendance_date')
        const today          = new Date().toISOString().split('T')[0]
        if (lastAttendance !== today) {
          showLocalNotification(
            "Have you taken attendance? 🙏",
            "Mark who came today so you can follow up this week.",
            '/attendance'
          )
        }
      }, msUntil1pm)
    }
  }

  // Monday follow-up reminder
  if (dayOfWeek === 1 && prefs.mondayFollowUp && hour < 9 && pendingFollowUps > 0) {
    const msUntil9am = new Date(now).setHours(9, 0, 0, 0) - now.getTime()
    if (msUntil9am > 0) {
      setTimeout(() => {
        showLocalNotification(
          `${pendingFollowUps} pending follow-up${pendingFollowUps !== 1 ? 's' : ''} 🙏`,
          "Reach out to members who missed service on Sunday.",
          '/absentees'
        )
      }, msUntil9am)
    }
  }

  // Wednesday midweek reminder
  if (dayOfWeek === 3 && prefs.wednesdayFollowUp && hour < 9 && pendingFollowUps > 0) {
    const msUntil9am = new Date(now).setHours(9, 0, 0, 0) - now.getTime()
    if (msUntil9am > 0) {
      setTimeout(() => {
        showLocalNotification(
          "Midweek check-in 🕊️",
          `${pendingFollowUps} members still haven't been followed up. Take a moment to reach out.`,
          '/absentees'
        )
      }, msUntil9am)
    }
  }
}

export function showLocalNotification(title, body, url = '/dashboard') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return

  const n = new Notification(title, {
    body,
    icon:  '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag:   'churchtrakr-local',
    data:  { url },
  })

  n.onclick = () => {
    window.focus()
    window.location.href = url
    n.close()
  }
}

// Show in-app attendance submitted notification to team
export function notifyAttendanceSubmitted(displayName, present, absent) {
  showLocalNotification(
    `Attendance recorded by ${displayName} ✅`,
    `${present} present, ${absent} absent. Check the follow-up list.`,
    '/absentees'
  )
}
