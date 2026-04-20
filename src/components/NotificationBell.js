'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle, UserX, Calendar, X } from 'lucide-react'
import Link from 'next/link'

const STORAGE_KEY = 'ct_inapp_notifications'
const MAX_NOTIFICATIONS = 30

function getStoredNotifications() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

function saveNotifications(notifications) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)))
  } catch {}
}

// ── Hook: useInAppNotifications ───────────────────────────────────────────────
export function useInAppNotifications() {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    setNotifications(getStoredNotifications())
    // Listen for new notifications from other tabs/components
    const handler = () => setNotifications(getStoredNotifications())
    window.addEventListener('ct_notification_added', handler)
    return () => window.removeEventListener('ct_notification_added', handler)
  }, [])

  const add = useCallback((type, message, href = '/dashboard') => {
    const notif = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2),
      type,    // 'followup' | 'attendance' | 'member'
      message,
      href,
      read: false,
      createdAt: new Date().toISOString(),
    }
    const updated = [notif, ...getStoredNotifications()].slice(0, MAX_NOTIFICATIONS)
    saveNotifications(updated)
    setNotifications(updated)
    window.dispatchEvent(new Event('ct_notification_added'))
    return notif.id
  }, [])

  const markRead = useCallback((id) => {
    const updated = getStoredNotifications().map(n => n.id === id ? { ...n, read: true } : n)
    saveNotifications(updated)
    setNotifications(updated)
  }, [])

  const markAllRead = useCallback(() => {
    const updated = getStoredNotifications().map(n => ({ ...n, read: true }))
    saveNotifications(updated)
    setNotifications(updated)
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, add, markRead, markAllRead }
}

// ── Notification Bell + Panel ─────────────────────────────────────────────────
export default function NotificationBell({ pendingFollowUps = 0 }) {
  const { notifications, unreadCount, add, markRead, markAllRead } = useInAppNotifications()
  const [open, setOpen] = useState(false)
  const [seeded, setSeeded] = useState(false)

  // Seed a follow-up notification if there are pending follow-ups
  useEffect(() => {
    if (seeded || pendingFollowUps === 0) return
    setSeeded(true)
    // Check if we already have a recent follow-up notification
    const existing = getStoredNotifications()
    const recent = existing.find(n =>
      n.type === 'followup' &&
      Date.now() - new Date(n.createdAt).getTime() < 24 * 60 * 60 * 1000
    )
    if (!recent) {
      add(
        'followup',
        `${pendingFollowUps} member${pendingFollowUps !== 1 ? 's' : ''} from last Sunday still need${pendingFollowUps === 1 ? 's' : ''} follow-up`,
        '/absentees'
      )
    }
  }, [pendingFollowUps, seeded, add])

  function fmtTime(iso) {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const min = Math.floor(diff / 60000)
    if (min < 60) return min <= 1 ? 'Just now' : `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    const days = Math.floor(hr / 24)
    return days === 1 ? 'Yesterday' : `${days}d ago`
  }

  const iconForType = {
    followup:   <UserX size={14} className="text-error" />,
    attendance: <Calendar size={14} className="text-forest" />,
    member:     <CheckCircle size={14} className="text-success" />,
  }

  return (
    <>
      {/* Bell button */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'rgba(255,255,255,0.1)', border: 'none',
            borderRadius: 8, width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff', position: 'relative',
          }}
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: -3, right: -3,
              background: '#dc2626', color: '#fff',
              fontSize: 9, fontWeight: 800, lineHeight: 1,
              minWidth: 16, height: 16, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px',
              border: '2px solid #0d1f15',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel overlay */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200 }}
          onClick={() => setOpen(false)}
        >
          <div
            style={{
              position: 'absolute', top: 58, right: 12,
              width: 320, maxWidth: 'calc(100vw - 24px)',
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              border: '1px solid rgba(26,58,42,0.1)',
              overflow: 'hidden',
              maxHeight: '70dvh',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 12px',
              borderBottom: '1px solid rgba(26,58,42,0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={15} style={{ color: '#1a3a2a' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 7px' }}>
                    {unreadCount}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{ fontSize: 11, color: '#4a8a65', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px' }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9e90', padding: 2, display: 'flex' }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                  <Bell size={32} style={{ color: '#e0dbd0', margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a', margin: '0 0 4px' }}>All caught up</p>
                  <p style={{ fontSize: 12, color: '#8a9e90', margin: 0 }}>No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <Link
                    key={n.id}
                    href={n.href}
                    onClick={() => { markRead(n.id); setOpen(false) }}
                    style={{ textDecoration: 'none', display: 'block' }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(26,58,42,0.05)',
                      background: n.read ? 'transparent' : 'rgba(26,58,42,0.03)',
                      transition: 'background 0.1s',
                    }}>
                      {/* Icon */}
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: n.type === 'followup' ? 'rgba(220,38,38,0.08)' :
                                    n.type === 'attendance' ? 'rgba(26,58,42,0.08)' : 'rgba(22,163,74,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {iconForType[n.type] || <Bell size={14} style={{ color: '#8a9e90' }} />}
                      </div>
                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: n.read ? 500 : 700,
                          color: '#1a3a2a', margin: '0 0 3px', lineHeight: 1.4,
                        }}>
                          {n.message}
                        </p>
                        <p style={{ fontSize: 11, color: '#8a9e90', margin: 0 }}>
                          {fmtTime(n.createdAt)}
                        </p>
                      </div>
                      {/* Unread dot */}
                      {!n.read && (
                        <div style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: '#dc2626', flexShrink: 0, marginTop: 4,
                        }} />
                      )}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
