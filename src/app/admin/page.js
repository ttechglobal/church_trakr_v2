'use client'

import { useState, useEffect } from 'react'
import { Users, Building2, Calendar, Star, TrendingUp, LogOut, Shield, RefreshCw, ChevronRight, Eye } from 'lucide-react'

const C = {
  forest:'#1a3a2a', mid:'#2d5a42', muted:'#8a9e90',
  gold:'#c9a84c', goldDk:'#a8862e', ivory:'#f7f5f0', ivoryDk:'#ede9e0',
  success:'#16a34a', error:'#dc2626',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })
}

// ── Login Screen ──────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) { setError('Invalid credentials'); return }
      onLogin()
    } catch { setError('Login failed') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100dvh', background:'#0d1f15', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-dm-sans,system-ui)', padding:'1rem' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'2.5rem', width:'100%', maxWidth:380, boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>
        {/* Logo */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:C.forest, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Shield size={18} color={C.gold} />
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:C.forest, margin:0, letterSpacing:'-0.01em' }}>ChurchTrakr</p>
            <p style={{ fontSize:11, color:C.muted, margin:0, fontWeight:600 }}>Super Admin</p>
          </div>
        </div>

        <h1 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:22, fontWeight:700, color:C.forest, margin:'0 0 20px', letterSpacing:'-0.02em' }}>
          Admin Login
        </h1>

        <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.forest, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.04em' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required autoFocus
              style={{ width:'100%', border:`1px solid rgba(26,58,42,0.2)`, borderRadius:11, padding:'0.75rem 1rem', fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
            />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.forest, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.04em' }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required
              style={{ width:'100%', border:`1px solid rgba(26,58,42,0.2)`, borderRadius:11, padding:'0.75rem 1rem', fontSize:15, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }}
            />
          </div>
          {error && <p style={{ color:C.error, fontSize:13, margin:0 }}>{error}</p>}
          <button
            type="submit" disabled={loading}
            style={{ background:C.forest, color:'#e8d5a0', border:'none', borderRadius:11, padding:'0.875rem', fontSize:15, fontWeight:700, cursor:'pointer', marginTop:4, opacity:loading?0.7:1 }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function AdminDashboard({ onLogout }) {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [selected, setSelected] = useState(null)  // selected church for detail view

  async function fetchStats() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 401) { onLogout(); return }
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      setData(json)
    } catch { setError('Failed to load stats') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStats() }, [])

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    onLogout()
  }

  if (loading) return (
    <div style={{ minHeight:'100dvh', background:'#f7f5f0', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <RefreshCw size={24} style={{ color:C.muted, animation:'spin 1s linear infinite' }} />
        <p style={{ color:C.muted, marginTop:12, fontSize:14 }}>Loading…</p>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )

  return (
    <div style={{ minHeight:'100dvh', background:'#f7f5f0', fontFamily:'var(--font-dm-sans,system-ui)' }}>
      {/* Header */}
      <div style={{ background:C.forest, padding:'1rem 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Shield size={18} color={C.gold} />
          <span style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:16, fontWeight:700, color:'#fff' }}>
            ChurchTrakr Admin
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={fetchStats} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={handleLogout} style={{ background:'rgba(255,255,255,0.1)', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:'0 auto', padding:'1.5rem 1.25rem' }}>

        {error && <div style={{ background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:12, padding:'0.875rem 1rem', marginBottom:16, color:C.error, fontSize:14 }}>{error}</div>}

        {/* Totals */}
        {data && (
          <>
            <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:20, fontWeight:700, color:C.forest, margin:'0 0 16px' }}>
              Platform Overview
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:24 }}>
              {[
                { icon:<Building2 size={20}/>, label:'Total Accounts', value:data.totals.churches, color:C.forest },
                { icon:<Users size={20}/>,    label:'Total Members',  value:data.totals.members,  color:C.mid    },
                { icon:<Calendar size={20}/>, label:'Total Sessions', value:data.totals.sessions,  color:C.goldDk },
                { icon:<Star size={20}/>,     label:'First Timers',   value:data.totals.firstTimers, color:C.success},
              ].map(({ icon, label, value, color }) => (
                <div key={label} style={{ background:'#fff', borderRadius:14, padding:'1.25rem', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', border:'1px solid rgba(26,58,42,0.08)' }}>
                  <div style={{ color, opacity:0.7, marginBottom:8 }}>{icon}</div>
                  <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:28, fontWeight:800, color, margin:'0 0 4px', lineHeight:1, letterSpacing:'-0.03em' }}>{value}</p>
                  <p style={{ fontSize:11, color:C.muted, fontWeight:600, margin:0, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</p>
                </div>
              ))}
            </div>

            {/* Accounts list */}
            <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:18, fontWeight:700, color:C.forest, margin:'0 0 12px' }}>
              Accounts ({data.churches.length})
            </h2>
            <div style={{ background:'#fff', borderRadius:16, border:'1px solid rgba(26,58,42,0.08)', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
              {data.churches.length === 0 ? (
                <div style={{ padding:'3rem', textAlign:'center', color:C.muted }}>No accounts yet</div>
              ) : (
                data.churches.map((c, i) => (
                  <div
                    key={c.id}
                    onClick={() => setSelected(selected?.id === c.id ? null : c)}
                    style={{
                      padding:'0.875rem 1.25rem',
                      borderBottom: i < data.churches.length - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none',
                      cursor:'pointer',
                      background: selected?.id === c.id ? 'rgba(26,58,42,0.03)' : 'transparent',
                      transition:'background 0.1s',
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background:`rgba(26,58,42,0.08)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Building2 size={16} style={{ color:C.mid }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:14, fontWeight:700, color:C.forest, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                        <p style={{ fontSize:12, color:C.muted, margin:0 }}>{c.adminName} · Joined {fmtDate(c.createdAt)}</p>
                      </div>
                      <div style={{ display:'flex', gap:16, alignItems:'center', flexShrink:0 }}>
                        <div style={{ textAlign:'center' }}>
                          <p style={{ fontSize:16, fontWeight:800, color:C.forest, margin:0, lineHeight:1 }}>{c.totalMembers}</p>
                          <p style={{ fontSize:10, color:C.muted, margin:'2px 0 0', fontWeight:600 }}>Members</p>
                        </div>
                        <div style={{ textAlign:'center' }}>
                          <p style={{ fontSize:16, fontWeight:800, color:C.goldDk, margin:0, lineHeight:1 }}>{c.totalSundays}</p>
                          <p style={{ fontSize:10, color:C.muted, margin:'2px 0 0', fontWeight:600 }}>Sessions</p>
                        </div>
                        <ChevronRight size={16} style={{ color:C.muted, transform: selected?.id === c.id ? 'rotate(90deg)' : 'none', transition:'transform 0.2s' }} />
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {selected?.id === c.id && (
                      <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid rgba(26,58,42,0.08)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }} onClick={e => e.stopPropagation()}>
                        {[
                          { label:'Account ID', value:c.id.slice(0,8)+'…' },
                          { label:'Last Active', value:fmtDate(c.lastActive) },
                          { label:'Active Members', value:c.totalMembers },
                          { label:'Total Sundays', value:c.totalSundays },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ background:C.ivory, borderRadius:8, padding:'8px 10px' }}>
                            <p style={{ fontSize:10, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 2px' }}>{label}</p>
                            <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:0 }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checked, setChecked] = useState(false)

  // Check if already authenticated (cookie exists and valid)
  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => { if (r.ok) setAuthed(true) })
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [])

  if (!checked) return (
    <div style={{ minHeight:'100dvh', background:'#0d1f15', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Shield size={32} style={{ color:'rgba(201,168,76,0.4)' }} />
    </div>
  )

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />
  return <AdminDashboard onLogout={() => setAuthed(false)} />
}
