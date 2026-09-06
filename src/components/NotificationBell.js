'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle, UserX, Calendar, Zap, X } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'ct_inapp_notifications'
const MAX_NOTIFICATIONS = 30

function getStoredNotifications() {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveNotifications(n) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(n.slice(0, MAX_NOTIFICATIONS))) } catch {}
}

export function useInAppNotifications() {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    setNotifications(getStoredNotifications())
    const handler = () => setNotifications(getStoredNotifications())
    window.addEventListener('ct_notification_added', handler)
    return () => window.removeEventListener('ct_notification_added', handler)
  }, [])

  const add = useCallback((type, message, href = '/dashboard') => {
    const notif = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2),
      type, message, href, read: false, createdAt: new Date().toISOString(),
    }
    const updated = [notif, ...getStoredNotifications()].slice(0, MAX_NOTIFICATIONS)
    saveNotifications(updated)
    setNotifications(updated)
    window.dispatchEvent(new Event('ct_notification_added'))
    return notif.id
  }, [])

  const markRead = useCallback((id) => {
    const updated = getStoredNotifications().map(n => n.id === id ? { ...n, read: true } : n)
    saveNotifications(updated); setNotifications(updated)
  }, [])

  const markAllRead = useCallback(() => {
    const updated = getStoredNotifications().map(n => ({ ...n, read: true }))
    saveNotifications(updated); setNotifications(updated)
  }, [])

  return { notifications, unreadCount: notifications.filter(n => !n.read).length, add, markRead, markAllRead }
}

export default function NotificationBell({ pendingFollowUps = 0 }) {
  const { notifications, unreadCount, add, markRead, markAllRead } = useInAppNotifications()
  const [open,    setOpen]    = useState(false)
  const [seeded,  setSeeded]  = useState(false)
  const [mounted, setMounted] = useState(false)

  // All hooks must be declared before any early return
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted || seeded || pendingFollowUps === 0) return
    setSeeded(true)
    const existing = getStoredNotifications()
    const recent = existing.find(n => n.type === 'followup' && Date.now() - new Date(n.createdAt).getTime() < 86400000)
    if (!recent) {
      add('followup', `${pendingFollowUps} member${pendingFollowUps !== 1 ? 's' : ''} from last Sunday still need${pendingFollowUps === 1 ? 's' : ''} follow-up`, '/absentees')
    }
  }, [pendingFollowUps, seeded, add, mounted])

  const checkAdminNotifications = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: church } = await supabase
        .from('churches')
        .select('notifications')
        .eq('admin_user_id', user.id)
        .single()
      if (!church?.notifications?.length) return

      const stored = getStoredNotifications()
      const storedIds = new Set(stored.map(n => n.id))
      const newOnes = church.notifications.filter(n => n.id && !storedIds.has(String(n.id)))
      if (newOnes.length === 0) return

      let current = stored
      for (const n of newOnes) {
        const notif = {
          id:        String(n.id),
          type:      n.type ?? 'credits_added',
          message:   n.message ?? `${n.credits} credits added to your account`,
          href:      '/credits',
          read:      false,
          createdAt: n.createdAt ?? new Date().toISOString(),
        }
        current = [notif, ...current].slice(0, MAX_NOTIFICATIONS)
      }
      saveNotifications(current)
      setNotifications(current)
      window.dispatchEvent(new Event('ct_notification_added'))

      if (typeof window !== 'undefined' && Notification.permission === 'granted' && newOnes.length > 0) {
        new Notification('✅ Credits Added', {
          body: newOnes[0].message,
          icon: '/icons/icon-192.png',
          tag:  'credits-added',
        })
      }
    } catch {}
  }, [])

  useEffect(() => {
    checkAdminNotifications()
    const interval = setInterval(checkAdminNotifications, 120000)
    window.addEventListener('focus', checkAdminNotifications)
    return () => { clearInterval(interval); window.removeEventListener('focus', checkAdminNotifications) }
  }, [checkAdminNotifications])

  // Early return AFTER all hooks
  if (!mounted) return null

  function fmtTime(iso) {
    const diff = Date.now() - new Date(iso).getTime()
    const min  = Math.floor(diff / 60000)
    if (min < 60) return min <= 1 ? 'Just now' : `${min}m ago`
    const hr = Math.floor(min / 60)
    if (hr < 24) return `${hr}h ago`
    return `${Math.floor(hr / 24)}d ago`
  }

  const iconForType = {
    followup:      <UserX     size={14} style={{ color: '#dc2626' }} />,
    attendance:    <Calendar  size={14} style={{ color: '#1a3a2a' }} />,
    member:        <CheckCircle size={14} style={{ color: '#16a34a' }} />,
    credits_added: <Zap       size={14} style={{ color: '#c9a84c' }} />,
  }

  return (
    <>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', position: 'relative' }}
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -3, right: -3, background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800, lineHeight: 1, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid #1a3a2a' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200 }} onClick={() => setOpen(false)}>
          <div
            style={{ position: 'absolute', top: 58, right: 12, width: 320, maxWidth: 'calc(100vw - 24px)', background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.18)', border: '1px solid rgba(26,58,42,0.1)', overflow: 'hidden', maxHeight: '70dvh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 12px', borderBottom: '1px solid rgba(26,58,42,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={15} style={{ color: '#1a3a2a' }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', fontFamily: 'var(--font-playfair,Georgia,serif)' }}>Notifications</span>
                {unreadCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: '#dc2626', color: '#fff', borderRadius: 10, padding: '1px 7px' }}>{unreadCount}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {unreadCount > 0 && <button onClick={markAllRead} style={{ fontSize: 11, color: '#4a8a65', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>Mark all read</button>}
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9e90', padding: 2, display: 'flex' }}><X size={14} /></button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#8a9e90' }}>
                  <Bell size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: .4 }} />
                  <p style={{ fontSize: 13, margin: 0 }}>No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <Link key={n.id} href={n.href ?? '/dashboard'} onClick={() => { markRead(n.id); setOpen(false) }}
                    style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(26,58,42,0.06)', background: n.read ? 'transparent' : 'rgba(26,58,42,0.03)', textDecoration: 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(26,58,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {iconForType[n.type] ?? <Bell size={14} style={{ color: '#8a9e90' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#1a3a2a', margin: 0, lineHeight: 1.4, fontWeight: n.read ? 400 : 600 }}>{n.message}</p>
                      <p style={{ fontSize: 11, color: '#8a9e90', margin: '3px 0 0' }}>{fmtTime(n.createdAt)}</p>
                    </div>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#1a3a2a', flexShrink: 0, marginTop: 5 }} />}
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