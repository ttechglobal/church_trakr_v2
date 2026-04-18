'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getAv } from '@/lib/utils'
import {
  LayoutDashboard, CheckSquare, UserX, UserCheck, Star,
  Users, User, MessageSquare, BarChart2, FileText,
  Settings, LogOut, Menu, X,
} from 'lucide-react'

// Lazy-load non-critical UI — doesn't block first paint
const NAV = [
  { href: '/dashboard',   label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/attendance',  label: 'Attendance',   Icon: CheckSquare },
  { href: '/absentees',   label: 'Absentees',    Icon: UserX },
  { href: '/attendees',   label: 'Attendees',    Icon: UserCheck },
  { href: '/firsttimers', label: 'First Timers', Icon: Star },
  { href: '/members',     label: 'Members',      Icon: User },
  { href: '/messaging',   label: 'Messaging',    Icon: MessageSquare },
  { href: '/analytics',   label: 'Analytics',    Icon: BarChart2 },
  { href: '/report',      label: 'Reports',      Icon: FileText },
  { href: '/profile',     label: 'Settings',     Icon: Settings },
]

const SIDEBAR_W = 248

export default function AppShell({ church, user, children }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const drawerRef = useRef(null)
  const av = getAv(church.admin_name || church.name)

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function signOut() {
    await createClient().auth.signOut()
    window.location.replace('/login')
  }

  const sidebarInner = (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#0d1f15', overflowY: 'auto',
    }}>
      <div style={{
        padding: '1.375rem 1.25rem 1.125rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg,#c9a84c,#e8d5a0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
              <path d="M10 3v14M3 10h14" stroke="#1a3a2a" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 700, fontSize: 15, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>ChurchTrakr</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{church.name}</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '0.5rem 0.5rem', overflowY: 'auto' }}>
        {NAV.map(({ href, label, Icon }) => {
          const isActive = href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '0.5rem 0.75rem', borderRadius: 9, marginBottom: 1,
              textDecoration: 'none', fontSize: 14,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#c9a84c' : 'rgba(255,255,255,0.6)',
              background: isActive ? 'rgba(201,168,76,0.12)' : 'transparent',
              borderLeft: '2px solid ' + (isActive ? '#c9a84c' : 'transparent'),
              transition: 'all 0.14s ease', letterSpacing: '-0.01em',
            }}>
              <Icon size={15} strokeWidth={isActive ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div style={{ padding: '0.75rem 0.625rem', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0.625rem 0.625rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {av.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{church.admin_name || 'Admin'}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
          </div>
          <button onClick={signOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .shell-root { display: flex; min-height: 100dvh; background: #f7f5f0; }
        .shell-sidebar { width: ${SIDEBAR_W}px; flex-shrink: 0; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; }
        .shell-topbar { display: none; position: fixed; top: 0; left: 0; right: 0; height: 54px; background: #0d1f15; z-index: 100; align-items: center; justify-content: space-between; padding: 0 1rem; }
        .shell-main { flex: 1; min-width: 0; margin-left: ${SIDEBAR_W}px; }
        .shell-backdrop { display: none; position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,0.65); backdrop-filter: blur(3px); opacity: 0; transition: opacity 0.25s ease; pointer-events: none; }
        .shell-backdrop.vis { opacity: 1; pointer-events: auto; }
        .shell-drawer { display: none; position: fixed; top: 0; left: 0; bottom: 0; width: 268px; z-index: 200; transform: translateX(-100%); transition: transform 0.27s cubic-bezier(0.16,1,0.3,1); box-shadow: 4px 0 32px rgba(0,0,0,0.3); }
        .shell-drawer.open { transform: translateX(0); }
        @media (max-width: 1023px) {
          .shell-sidebar { display: none !important; }
          .shell-topbar { display: flex !important; }
          .shell-main { margin-left: 0 !important; padding-top: 54px; }
          .shell-backdrop { display: block !important; }
          .shell-drawer { display: block !important; }
        }
      `}</style>

      <div className="shell-root">
        <aside className="shell-sidebar">{sidebarInner}</aside>

        <header className="shell-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#c9a84c,#e8d5a0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="11" height="11" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="#1a3a2a" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </div>
            <span style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>ChurchTrakr</span>
          </div>
          <button onClick={() => setOpen(true)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }} aria-label="Open menu">
            <Menu size={18} />
          </button>
        </header>

        <div className={"shell-backdrop" + (open ? " vis" : "")} onClick={() => setOpen(false)} />

        <div className={"shell-drawer" + (open ? " open" : "")} ref={drawerRef}>
          <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 12, right: -44, zIndex: 201, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
          {sidebarInner}
        </div>

        <main className="shell-main">{children}</main>
      </div>
    </>
  )
}
