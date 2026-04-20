'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Settings, LogOut, Menu, X, LinkIcon
} from 'lucide-react'

const NAV = [
  { href: '/church-dashboard',          label: 'Overview',    Icon: LayoutDashboard },
  { href: '/church-dashboard/settings', label: 'Settings',    Icon: Settings },
]

export default function ChurchShell({ church, user, children }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarInner = (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0d1f15', color:'#fff', padding:'1.25rem 0.75rem' }}>
      {/* Brand */}
      <div style={{ display:'flex', alignItems:'center', gap:9, padding:'0.375rem 0.625rem', marginBottom:'1.25rem' }}>
        <div style={{ width:34, height:34, borderRadius:9, background:'rgba(201,168,76,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Building2 size={16} color="#c9a84c" strokeWidth={1.75} />
        </div>
        <div style={{ minWidth:0 }}>
          <p style={{ fontFamily:'var(--font-playfair),Georgia,serif', fontWeight:700, fontSize:14, color:'#fff', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {church.name}
          </p>
          <p style={{ fontSize:10, color:'rgba(255,255,255,0.38)', margin:0, marginTop:1, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>
            Church Dashboard
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'0.5rem 0', overflowY:'auto' }}>
        {NAV.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              style={{
                display:'flex', alignItems:'center', gap:9,
                padding:'0.5rem 0.75rem', borderRadius:9, marginBottom:1,
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                textDecoration:'none', fontSize:14, fontWeight:isActive ? 600 : 400,
                transition:'all 0.15s',
              }}>
              <Icon size={15} strokeWidth={isActive ? 2 : 1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div style={{ padding:'0.75rem 0.625rem', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'0.625rem', borderRadius:10, background:'rgba(255,255,255,0.05)' }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:12, fontWeight:600, color:'#fff', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{church.admin_name || 'Admin'}</p>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.38)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.email}</p>
          </div>
          <button onClick={signOut} title="Sign out"
            style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.35)', padding:4, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  )

  const SIDEBAR_W = 220

  return (
    <>
      <style>{`
        .cs-root { display:flex; min-height:100dvh; }
        .cs-sidebar { width:${SIDEBAR_W}px; flex-shrink:0; position:fixed; top:0; bottom:0; left:0; overflow:hidden; z-index:50; }
        .cs-main { flex:1; min-width:0; margin-left:${SIDEBAR_W}px; }
        .cs-topbar { display:none; position:fixed; top:0; left:0; right:0; height:54px; background:#0d1f15; z-index:100; align-items:center; justify-content:space-between; padding:0 1rem; }
        .cs-backdrop { display:none; }
        .cs-drawer { position:fixed; top:0; bottom:0; left:0; width:${SIDEBAR_W}px; z-index:150; transform:translateX(-100%); transition:transform 0.25s; }
        @media(max-width:768px){
          .cs-sidebar { display:none; }
          .cs-main { margin-left:0; padding-top:54px; }
          .cs-topbar { display:flex !important; }
          .cs-backdrop.vis { display:block; position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:140; }
          .cs-drawer.open { transform:translateX(0); }
        }
      `}</style>

      <div className="cs-root">
        <aside className="cs-sidebar">{sidebarInner}</aside>

        <header className="cs-topbar">
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'rgba(201,168,76,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Building2 size={13} color="#c9a84c" />
            </div>
            <span style={{ fontFamily:'var(--font-playfair),Georgia,serif', fontWeight:700, fontSize:15, color:'#fff' }}>Church Dashboard</span>
          </div>
          <button onClick={() => setOpen(true)} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
            <Menu size={18} />
          </button>
        </header>

        <div className={`cs-backdrop${open?' vis':''}`} onClick={() => setOpen(false)} />
        <div className={`cs-drawer${open?' open':''}`}>
          <button onClick={() => setOpen(false)} style={{ position:'absolute', top:12, right:-44, zIndex:201, width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={15} />
          </button>
          {sidebarInner}
        </div>

        <main className="cs-main">{children}</main>
      </div>
    </>
  )
}
