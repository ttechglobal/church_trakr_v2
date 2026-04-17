'use client'

import { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'
import { useNotificationPrefs } from '@/hooks/useNotifications'
import { Bell, BellOff, Smartphone, CheckCircle2 } from 'lucide-react'

const NOTIFICATION_TYPES = [
  {
    key:     'sundayMorning',
    label:   'Sunday morning reminder',
    desc:    '9:00 AM — reminder to take attendance before service',
  },
  {
    key:     'sundayAfternoon',
    label:   'Sunday afternoon nudge',
    desc:    '1:00 PM — reminder if attendance hasn\'t been marked yet',
  },
  {
    key:     'attendanceAlert',
    label:   'Attendance submitted alert',
    desc:    'Notifies you when a team member submits attendance',
  },
  {
    key:     'mondayFollowUp',
    label:   'Monday follow-up reminder',
    desc:    '9:00 AM Monday — shows how many absentees need follow-up',
  },
  {
    key:     'wednesdayFollowUp',
    label:   'Wednesday midweek reminder',
    desc:    'Only sent if there are still pending follow-ups',
  },
]

export default function NotificationSettings() {
  const { permission, requestPermission, swReady, installPrompt, promptInstall, isInstalled } = usePWA()
  const { prefs, toggle, loaded } = useNotificationPrefs()
  const [requesting, setRequesting] = useState(false)
  const [justEnabled, setJustEnabled] = useState(false)

  async function handleEnable() {
    setRequesting(true)
    try {
      // Request permission directly — does not require SW to be ready
      // SW is only needed for push notifications (server-side), not local notifications
      if (!('Notification' in window)) {
        alert('Your browser does not support notifications.')
        return
      }
      let result
      if (swReady) {
        // Full flow: permission + push subscription
        result = await requestPermission()
      } else {
        // Fallback: permission only (local notifications will still work)
        result = await Notification.requestPermission()
        result = result === 'granted'
      }
      if (result) setJustEnabled(true)
    } finally {
      setRequesting(false)
    }
  }

  if (!loaded) return null

  const isGranted  = permission === 'granted'
  const isDenied   = permission === 'denied'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Install banner */}
      {!isInstalled && installPrompt && (
        <div style={{ background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)', borderRadius: 16, padding: '1.125rem 1.25rem', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <Smartphone size={20} color="#c9a84c" strokeWidth={1.75} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#e8d5a0', margin: '0 0 4px' }}>Install ChurchTrakr</p>
            <p style={{ fontSize: 13, color: 'rgba(232,213,160,0.65)', margin: '0 0 12px', lineHeight: 1.4 }}>
              Add to your home screen for a full app experience — works offline and loads instantly.
            </p>
            <button onClick={promptInstall} style={{ height: 36, padding: '0 1rem', borderRadius: 9, border: 'none', background: '#c9a84c', color: '#1a3a2a', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Add to Home Screen
            </button>
          </div>
        </div>
      )}

      {/* iOS install hint (no beforeinstallprompt on iOS) */}
      {!isInstalled && !installPrompt && /iPhone|iPad|iPod/.test(navigator?.userAgent ?? '') && (
        <div style={{ background: 'rgba(26,58,42,0.06)', border: '1px solid rgba(26,58,42,0.12)', borderRadius: 14, padding: '1rem 1.125rem' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Smartphone size={15} strokeWidth={2} />
            Install on iPhone
          </p>
          <p style={{ fontSize: 13, color: '#8a9e90', margin: 0, lineHeight: 1.5 }}>
            Tap the <strong>Share</strong> button in Safari, then <strong>"Add to Home Screen"</strong> to install ChurchTrakr as an app.
          </p>
        </div>
      )}

      {/* Notification permission card */}
      <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: isGranted ? 0 : '1rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: isGranted ? 'rgba(22,163,74,0.1)' : isDenied ? 'rgba(220,38,38,0.08)' : 'rgba(26,58,42,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isGranted
              ? <Bell size={18} color="#16a34a" strokeWidth={1.75} />
              : <BellOff size={18} color={isDenied ? '#dc2626' : '#8a9e90'} strokeWidth={1.75} />
            }
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 3px' }}>
              {isGranted ? 'Notifications enabled' : isDenied ? 'Notifications blocked' : 'Enable notifications'}
            </p>
            <p style={{ fontSize: 13, color: '#8a9e90', margin: 0, lineHeight: 1.4 }}>
              {isGranted
                ? 'You\'ll receive reminders on this device'
                : isDenied
                  ? 'Go to browser settings to allow notifications for this site'
                  : 'Get reminders to take attendance and follow up on Sunday absentees'
              }
            </p>
          </div>
          {isGranted && (
            <CheckCircle2 size={18} color="#16a34a" strokeWidth={2} style={{ flexShrink: 0 }} />
          )}
        </div>

        {!isGranted && !isDenied && (
          <button onClick={handleEnable} disabled={requesting}
            style={{
              width: '100%', height: 44, borderRadius: 11, border: 'none',
              background: requesting ? '#e0dbd0' : '#1a3a2a',
              color: requesting ? '#8a9e90' : '#e8d5a0',
              fontSize: 14, fontWeight: 700,
              cursor: requesting ? 'wait' : 'pointer',
            }}>
            {requesting ? 'Requesting permission…' : 'Enable notifications'}
          </button>
        )}

        {justEnabled && (
          <p style={{ fontSize: 13, color: '#16a34a', fontWeight: 600, marginTop: 10, textAlign: 'center' }}>
            ✓ Notifications enabled on this device
          </p>
        )}
      </div>

      {/* Per-type toggles — only show when granted */}
      {isGranted && (
        <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 16, fontWeight: 700, color: '#1a3a2a', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
            Notification types
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {NOTIFICATION_TYPES.map((n, i) => (
              <div key={n.key} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '0.75rem 0',
                borderBottom: i < NOTIFICATION_TYPES.length - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a', margin: '0 0 2px' }}>{n.label}</p>
                  <p style={{ fontSize: 12, color: '#8a9e90', margin: 0, lineHeight: 1.4 }}>{n.desc}</p>
                </div>
                {/* Toggle switch */}
                <button onClick={() => toggle(n.key)} style={{
                  width: 44, height: 26, borderRadius: 13, border: 'none',
                  background: prefs[n.key] ? '#1a3a2a' : '#d1d5db',
                  cursor: 'pointer', padding: 3, flexShrink: 0,
                  display: 'flex', alignItems: 'center',
                  justifyContent: prefs[n.key] ? 'flex-end' : 'flex-start',
                  transition: 'background 0.2s',
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
