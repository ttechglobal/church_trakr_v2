'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NotificationBell from '@/components/NotificationBell'
import { createClient } from '@/lib/supabase/client'
import { getAv } from '@/lib/utils'
import {
  LayoutDashboard, CheckSquare, UserX, UserCheck, Star,
  User, MessageSquare, BarChart2, FileText,
  Settings, LogOut, Menu, X, Zap, Cake, Users,
  UserPlus, ClipboardList,
  Home, UserMinus, FileBarChart, MoreHorizontal,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: '/dashboard',        label: 'Dashboard',      Icon: LayoutDashboard },
      { href: '/attendance',       label: 'Attendance',     Icon: CheckSquare     },
      { href: '/absentees',        label: 'Absentees',      Icon: UserX           },
      { href: '/attendees',        label: 'Attendees',      Icon: UserCheck       },
      { href: '/members',          label: 'Members',        Icon: User            },
      { href: '/absentees/assign', label: 'Follow-ups',     Icon: ClipboardList   },
      { href: '/firsttimers',      label: 'First Timers',   Icon: Star            },
      { href: '/birthdays',        label: 'Birthdays',      Icon: Cake            },
      { href: '/followup-team',    label: 'Follow-up Team', Icon: Users           },
    ],
  },
  {
    label: 'INSIGHTS',
    items: [
      { href: '/analytics', label: 'Analytics', Icon: BarChart2 },
      { href: '/report',    label: 'Reports',   Icon: FileText  },
    ],
  },
  {
    label: 'OTHERS',
    items: [
      { href: '/messaging', label: 'Messages', Icon: MessageSquare },
      { href: '/profile',   label: 'Settings', Icon: Settings     },
    ],
  },
]

const BOTTOM_NAV = [
  { href: '/dashboard',  label: 'Home',      Icon: Home           },
  { href: '/absentees',  label: 'Absentees', Icon: UserMinus      },
  { href: '/messaging',  label: 'Messages',  Icon: MessageSquare  },
  { href: '/report',     label: 'Reports',   Icon: FileBarChart   },
  { href: '/more',       label: 'More',      Icon: MoreHorizontal },
]

const SIDEBAR_W = 260
const BOTTOM_H  = 60

export default function AppShell({ church, user, children, pendingFollowUps = 0 }) {
  const [open,    setOpen]    = useState(false)
  const [credits, setCredits] = useState(church.sms_credits ?? 0)
  const pathname  = usePathname()
  const drawerRef = useRef(null)
  const av        = getAv(church.admin_name || church.name)

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    async function refresh() {
      try {
        const supabase = createClient()
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) return
        const { data } = await supabase
          .from('churches').select('sms_credits')
          .eq('admin_user_id', u.id).single()
        if (data?.sms_credits !== undefined) setCredits(data.sms_credits)
      } catch {}
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [])

  async function signOut() {
    await createClient().auth.signOut()
    window.location.replace('/login')
  }

  function isActive(href) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const sidebarInner = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#1a3a2a', overflowY: 'auto' }}>
      {/* Brand */}
      <div style={{ padding: '1.375rem 1.25rem 1.125rem', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          {/* PNG logo — SVG div shown as fallback if PNG 404s */}
          <img
            src="/logo.png"
            alt="ChurchTrakr"
            width={40}
            height={40}
            style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(201,168,76,0.35)' }}
            onError={e => {
              e.currentTarget.style.display = 'none'
              if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex'
            }}
          />
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#2d6a40,#1a4a2a)', border: '2px solid rgba(201,168,76,0.35)', display: 'none', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" fill="#c9a84c" opacity="0.9"/>
              <path d="M6 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#e8d5a0" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M4 18c0-2.2 1.8-4 4-4" stroke="#a8d4b0" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              <path d="M20 18c0-2.2-1.8-4-4-4" stroke="#a8d4b0" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 700, fontSize: 17, color: '#fff', margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em' }}>ChurchTrakr</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{church.name}</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, padding: '0.375rem 0.625rem', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', padding: '0.875rem 0.625rem 0.375rem', margin: 0 }}>
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, Icon }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.5rem 0.75rem', borderRadius: 8, marginBottom: 1,
                  textDecoration: 'none', fontSize: 13.5,
                  fontWeight: active ? 600 : 400,
                  color: active ? '#c9a84c' : 'rgba(255,255,255,0.65)',
                  background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
                  transition: 'all 0.12s ease',
                }}>
                  <Icon size={15} strokeWidth={active ? 2.5 : 1.75} style={{ flexShrink: 0 }} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: '0.75rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.625rem 0.75rem', borderRadius: 10, background: 'rgba(255,255,255,0.05)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
            {av.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{church.admin_name || 'Admin'}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Admin</p>
          </div>
          <button onClick={signOut} title="Sign out" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .shell-root    { display:flex; min-height:100dvh; background:#f7f5f0; }
        .shell-sidebar { width:${SIDEBAR_W}px; flex-shrink:0; position:fixed; top:0; left:0; bottom:0; z-index:100; }
        .shell-topbar  { display:none; position:fixed; top:0; left:0; right:0; height:56px; background:#1a3a2a; z-index:100; align-items:center; justify-content:space-between; padding:0 1rem; }
        .shell-main    { flex:1; min-width:0; margin-left:${SIDEBAR_W}px; }

        .shell-bottom-nav {
          display:none; position:fixed; bottom:0; left:0; right:0; z-index:100;
          background:#fff; border-top:1px solid rgba(26,58,42,0.1);
          box-shadow:0 -2px 12px rgba(0,0,0,0.06);
          padding-bottom:env(safe-area-inset-bottom,0px);
        }
        .shell-bottom-nav-inner { display:flex; align-items:stretch; height:${BOTTOM_H}px; }
        .shell-bottom-tab {
          flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:2px; text-decoration:none; border:none; background:none; cursor:pointer;
          padding:0; -webkit-tap-highlight-color:transparent; min-width:0; position:relative;
        }
        .shell-bottom-tab span { font-size:10px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60px; }

        .shell-backdrop { display:none; position:fixed; inset:0; z-index:150; background:rgba(0,0,0,0.6); backdrop-filter:blur(3px); opacity:0; transition:opacity 0.25s ease; pointer-events:none; }
        .shell-backdrop.vis { opacity:1; pointer-events:auto; }
        .shell-drawer { display:none; position:fixed; top:0; left:0; bottom:0; width:${SIDEBAR_W}px; z-index:200; transform:translateX(-100%); transition:transform 0.27s cubic-bezier(0.16,1,0.3,1); box-shadow:4px 0 32px rgba(0,0,0,0.3); }
        .shell-drawer.open { transform:translateX(0); }

        @media (max-width:1023px) {
          .shell-sidebar    { display:none !important; }
          .shell-topbar     { display:flex !important; }
          .shell-main       { margin-left:0 !important; padding-top:56px; padding-bottom:calc(${BOTTOM_H}px + env(safe-area-inset-bottom,0px)); }
          .shell-bottom-nav { display:block !important; }
          .shell-backdrop   { display:block !important; }
          .shell-drawer     { display:block !important; }
        }
      `}</style>

      <div className="shell-root">
        <aside className="shell-sidebar">{sidebarInner}</aside>

        {/* Mobile topbar */}
        <header className="shell-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src="/logo.png"
              alt="ChurchTrakr"
              width={32}
              height={32}
              style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(201,168,76,0.35)' }}
              onError={e => {
                e.currentTarget.style.display = 'none'
                if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex'
              }}
            />
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#2d6a40,#1a4a2a)', border: '2px solid rgba(201,168,76,0.35)', display: 'none', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="#c9a84c" opacity="0.9"/>
                <path d="M6 16c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#e8d5a0" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 700, fontSize: 17, color: '#fff' }}>ChurchTrakr</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <NotificationBell pendingFollowUps={pendingFollowUps} />
            <div
              style={{ width: 34, height: 34, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              onClick={() => setOpen(true)}
            >
              {av.initials}
            </div>
          </div>
        </header>

        <div className={'shell-backdrop' + (open ? ' vis' : '')} onClick={() => setOpen(false)} />

        <div className={'shell-drawer' + (open ? ' open' : '')} ref={drawerRef}>
          <button onClick={() => setOpen(false)} style={{ position: 'absolute', top: 12, right: -44, zIndex: 201, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} />
          </button>
          {sidebarInner}
        </div>

        <main className="shell-main">{children}</main>

        <nav className="shell-bottom-nav" aria-label="Main navigation">
          <div className="shell-bottom-nav-inner">
            {BOTTOM_NAV.map(({ href, label, Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href === '/more' ? '#' : href}
                  className="shell-bottom-tab"
                  onClick={href === '/more' ? (e) => { e.preventDefault(); setOpen(true) } : undefined}
                >
                  {label === 'Messages' && pendingFollowUps > 0 && (
                    <span style={{ position: 'absolute', top: 8, right: 'calc(50% - 16px)', minWidth: 16, height: 16, background: '#dc2626', borderRadius: 99, fontSize: 9, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', lineHeight: 1 }}>
                      {pendingFollowUps > 9 ? '9+' : pendingFollowUps}
                    </span>
                  )}
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.75} color={active ? '#1a3a2a' : '#8a9e90'} />
                  <span style={{ color: active ? '#1a3a2a' : '#8a9e90' }}>{label}</span>
                  {active && (
                    <span style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, background: '#1a3a2a', borderRadius: '2px 2px 0 0' }} />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </>
  )
}