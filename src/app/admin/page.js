'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Shield, RefreshCw, LogOut, Users, Building2, MessageSquare,
  TrendingUp, Zap, CheckCircle, Clock,
  ChevronRight, ArrowLeft, Search, Plus, LayoutDashboard,
  CreditCard, Radio, AlertCircle, X, Phone, Mail,
} from 'lucide-react'

const C = {
  forest:'#1a3a2a', mid:'#2d5a42', muted:'#8a9e90',
  gold:'#c9a84c', goldDk:'#a8862e', ivory:'#f7f5f0', ivoryDk:'#ede9e0',
  success:'#16a34a', error:'#dc2626', warning:'#d97706',
  sidebar:'#0d1f15',
}

const fmtNaira = (kobo) => `₦${((kobo ?? 0) / 100).toLocaleString('en-NG')}`
const fmtNairaFlat = (n) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-NG', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
}
function daysAgo(d) {
  if (!d) return '—'
  const diff = Math.floor((Date.now() - new Date(d + 'T00:00:00')) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 30)  return `${diff}d ago`
  return fmtDate(d)
}

function Spinner({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation:'spin .8s linear infinite' }}><circle cx="12" cy="12" r="10" stroke={C.muted} strokeWidth="3" opacity=".2"/><path fill={C.muted} d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" opacity=".75"/></svg>
}

function StatusPill({ status }) {
  const map = {
    pending:        { bg:'rgba(217,119,6,.10)',  fg:C.warning, label:'Pending'  },
    pending_manual: { bg:'rgba(217,119,6,.10)',  fg:C.warning, label:'Pending'  },
    credited:       { bg:'rgba(22,163,74,.10)',  fg:C.success, label:'Credited' },
    completed:      { bg:'rgba(22,163,74,.10)',  fg:C.success, label:'Paid'     },
    approved:       { bg:'rgba(22,163,74,.10)',  fg:C.success, label:'Approved' },
    rejected:       { bg:'rgba(220,38,38,.10)',  fg:C.error,   label:'Rejected' },
    group:          { bg:'rgba(26,58,42,.08)',   fg:C.mid,     label:'Group'    },
    church:         { bg:'rgba(201,168,76,.15)', fg:C.goldDk,  label:'Church'   },
  }
  const s = map[status] ?? { bg:'rgba(138,158,144,.15)', fg:C.muted, label: status ?? '—' }
  return <span style={{ display:'inline-block', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:6, background:s.bg, color:s.fg, textTransform:'uppercase', letterSpacing:'.04em' }}>{s.label}</span>
}

function Card({ children, style = {} }) {
  return <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 1px 4px rgba(26,58,42,.08), 0 0 0 1px rgba(26,58,42,.06)', padding:'1rem', ...style }}>{children}</div>
}

function StatCard({ icon, label, value, sub, color = C.forest }) {
  return (
    <Card>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <div style={{ width:32, height:32, borderRadius:9, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</div>
        <p style={{ fontSize:11, color:C.muted, fontWeight:700, margin:0, textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</p>
      </div>
      <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:26, fontWeight:800, color, margin:0, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:C.muted, margin:'4px 0 0' }}>{sub}</p>}
    </Card>
  )
}

function PageHeader({ title, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, gap:12, flexWrap:'wrap' }}>
      <h1 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:20, fontWeight:800, color:C.forest, margin:0 }}>{title}</h1>
      {action}
    </div>
  )
}

function Center({ children }) {
  return <div style={{ display:'flex', justifyContent:'center', padding:'4rem' }}>{children}</div>
}

// ── Login ─────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email, setEmail]       = useState('admin@churchtrakr.com')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const r = await fetch('/api/admin/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email, password }) })
      if (r.ok) { onLogin(); return }
      setError((await r.json()).error ?? 'Invalid credentials')
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100dvh', background:C.sidebar, display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:22, padding:'2.5rem 2rem', width:'100%', maxWidth:400, boxShadow:'0 24px 60px rgba(0,0,0,.35)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:C.forest, display:'flex', alignItems:'center', justifyContent:'center' }}><Shield size={18} color={C.gold} /></div>
          <div><p style={{ fontSize:15, fontWeight:800, color:C.forest, margin:0 }}>ChurchTrakr</p><p style={{ fontSize:12, color:C.muted, margin:0, fontWeight:600 }}>Super Admin</p></div>
        </div>
        <h1 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:22, fontWeight:700, color:C.forest, margin:'0 0 22px' }}>Sign in</h1>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <input type="email" placeholder="Admin email" required value={email} onChange={e => setEmail(e.target.value)} style={{ height:48, borderRadius:12, border:'1px solid rgba(26,58,42,.2)', padding:'0 14px', fontSize:15, outline:'none', width:'100%', boxSizing:'border-box', background:'#fff' }} />
          <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)} style={{ height:48, borderRadius:12, border:'1px solid rgba(26,58,42,.2)', padding:'0 14px', fontSize:15, outline:'none', width:'100%', boxSizing:'border-box', background:'#fff' }} />
          {error && <p style={{ color:C.error, fontSize:13, margin:0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ height:48, borderRadius:12, border:'none', background:C.forest, color:'#e8d5a0', fontWeight:700, fontSize:15, cursor:'pointer', opacity:loading?.6:1 }}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  )
}

// ── Overview ─────────────────────────────────────────────────────────────────
function Overview({ nav }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch('/api/admin/stats'); setData(await r.json()) } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Center><Spinner size={32}/></Center>
  if (!data) return null
  const t = data.totals

  return (
    <div>
      <PageHeader title="Platform Overview" action={<button onClick={load} style={{ display:'flex', alignItems:'center', gap:6, height:38, padding:'0 14px', borderRadius:10, border:'1.5px solid rgba(26,58,42,.18)', background:'none', cursor:'pointer', fontSize:13, color:C.forest, fontWeight:600 }}><RefreshCw size={13}/> Refresh</button>} />

      {t.pendingTransfers > 0 && (
        <button onClick={() => nav('transfers')} style={{ display:'flex', alignItems:'center', gap:12, width:'100%', textAlign:'left', padding:'14px 16px', borderRadius:14, border:'1px solid rgba(217,119,6,.25)', background:'rgba(217,119,6,.06)', cursor:'pointer', marginBottom:20 }}>
          <Clock size={16} color={C.warning} />
          <div style={{ flex:1 }}><p style={{ fontSize:14, fontWeight:700, color:C.warning, margin:0 }}>{t.pendingTransfers} pending transfer request{t.pendingTransfers !== 1 ? 's' : ''}</p></div>
          <ChevronRight size={16} color={C.warning} />
        </button>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:20 }}>
        <StatCard icon={<Building2 size={14} color={C.forest}/>} label="Accounts"     value={t.churches}                          color={C.forest} sub={`+${t.newThisWeek} this week`} />
        <StatCard icon={<Users size={14} color={C.mid}/>}        label="Members"      value={(t.members??0).toLocaleString()}      color={C.mid} />
        <StatCard icon={<TrendingUp size={14} color={C.success}/>} label="Revenue"    value={fmtNaira(t.totalRevenue)}             color={C.success} sub="all time" />
        <StatCard icon={<Zap size={14} color={C.goldDk}/>}       label="Credits Sold" value={(t.totalCredSold??0).toLocaleString()} color={C.goldDk} />
        <StatCard icon={<MessageSquare size={14} color={C.mid}/>} label="SMS Sent"   value={(t.totalSmsSent??0).toLocaleString()}  color={C.mid} sub="all time" />
        <StatCard icon={<CheckCircle size={14} color={C.success}/>} label="Active 30d" value={t.activeIn30??0}                   color={C.success} />
      </div>

      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <p style={{ fontSize:14, fontWeight:700, color:C.forest, margin:0 }}>Recent Accounts</p>
        <button onClick={() => nav('accounts')} style={{ fontSize:13, color:C.mid, fontWeight:600, background:'none', border:'none', cursor:'pointer' }}>View all →</button>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {(data.churches ?? []).slice(0,6).map(c => <AccountRow key={c.id} c={c} onClick={() => nav('account', c.id)} />)}
      </div>
    </div>
  )
}

function AccountRow({ c, onClick }) {
  return (
    <div style={{ position:'relative', background:'#fff', borderRadius:14, boxShadow:'0 1px 4px rgba(26,58,42,.07)', overflow:'hidden' }}>
      {/* Main clickable area */}
      <button onClick={onClick} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px 10px', border:'none', cursor:'pointer', background:'none', textAlign:'left', width:'100%', fontFamily:'inherit' }}>
        <div style={{ width:40, height:40, borderRadius:10, background:'rgba(26,58,42,.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
          {c.accountType === 'church' ? <Building2 size={16} color={C.forest}/> : <Users size={16} color={C.forest}/>}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          {/* Name + badges */}
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2, flexWrap:'wrap' }}>
            <p style={{ fontSize:14, fontWeight:700, color:C.forest, margin:0 }}>{c.name}</p>
            <StatusPill status={c.accountType} />
            {c.isActive30 && (
              <span style={{ fontSize:10, fontWeight:700, color:C.success, background:'rgba(22,163,74,.1)', padding:'1px 7px', borderRadius:20 }}>
                Active
              </span>
            )}
          </div>
          {/* Admin name */}
          <p style={{ fontSize:12, fontWeight:600, color:C.forest, margin:'0 0 3px' }}>{c.adminName || '—'}</p>
          {/* Phone — highlighted for quick follow-up */}
          {c.phone ? (
            <p style={{ fontSize:12, color:C.mid, margin:'0 0 2px', display:'flex', alignItems:'center', gap:4 }}>
              <Phone size={10} color={C.mid} />
              <a
                href={`tel:${c.phone}`}
                onClick={e => e.stopPropagation()}
                style={{ color:C.mid, textDecoration:'none', fontWeight:600 }}
              >
                {c.phone}
              </a>
            </p>
          ) : (
            <p style={{ fontSize:12, color:'rgba(138,158,144,.45)', margin:'0 0 2px', fontStyle:'italic' }}>No phone on file</p>
          )}
          {/* Email */}
          {c.email && (
            <p style={{ fontSize:11, color:C.muted, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {c.email}
            </p>
          )}
          {/* Location */}
          {c.location && (
            <p style={{ fontSize:11, color:C.muted, margin:0 }}>📍 {c.location}</p>
          )}
        </div>
        {/* Right: stats */}
        <div style={{ textAlign:'right', flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
          <p style={{ fontSize:12, fontWeight:700, color: c.smsCredits > 0 ? C.success : C.muted, margin:0 }}>{c.smsCredits} cr</p>
          <p style={{ fontSize:11, color:C.muted, margin:0 }}>{c.totalMembers} members</p>
          <p style={{ fontSize:11, color:C.muted, margin:0 }}>{daysAgo(c.lastActive)}</p>
          <ChevronRight size={13} color={C.muted} />
        </div>
      </button>

      {/* Call + WhatsApp quick strip */}
      {c.phone && (
        <div style={{ borderTop:'1px solid rgba(26,58,42,.06)', display:'flex' }}>
          <a
            href={`tel:${c.phone}`}
            onClick={e => e.stopPropagation()}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 0', fontSize:12, fontWeight:700, color:C.mid, textDecoration:'none', background:'rgba(26,58,42,.025)' }}
          >
            <Phone size={11} color={C.mid} />
            Call {(c.adminName || '').split(' ')[0] || 'admin'}
          </a>
          <a
            href={`https://wa.me/${String(c.phone).replace(/\D/g,'').replace(/^0/,'234')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 0', fontSize:12, fontWeight:700, color:'#16a34a', textDecoration:'none', background:'rgba(22,163,74,.04)', borderLeft:'1px solid rgba(26,58,42,.06)' }}
          >
            💬 WhatsApp
          </a>
        </div>
      )}
    </div>
  )
}


function exportAccountsCSV(accounts) {
  const header = ['Name', 'Admin', 'Phone', 'Email', 'Location', 'Type', 'Members', 'Credits', 'Last Active', 'Joined']
  const rows = accounts.map(a => [
    a.name, a.adminName ?? '', a.phone ?? '', a.email ?? '', a.location ?? '',
    a.accountType, a.totalMembers, a.smsCredits,
    a.lastActive ?? '', a.createdAt ? a.createdAt.slice(0, 10) : '',
  ])
  const csv = [header, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `churchtrakr-accounts-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Accounts list ─────────────────────────────────────────────────────────────
function AccountsList({ nav }) {
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    fetch('/api/admin/accounts')
      .then(r => r.json())
      .then(d => setAccounts(d.accounts ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = accounts.filter(a => {
    if (filter === 'group'  && a.accountType !== 'group')  return false
    if (filter === 'church' && a.accountType !== 'church') return false
    if (search) {
      const q = search.toLowerCase()
      return (
        a.name.toLowerCase().includes(q) ||
        (a.adminName ?? '').toLowerCase().includes(q) ||
        (a.email     ?? '').toLowerCase().includes(q) ||
        (a.phone     ?? '').includes(q) ||
        (a.location  ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div>
      <PageHeader
        title={`All Accounts (${accounts.length})`}
        action={
          <button
            onClick={() => exportAccountsCSV(filtered)}
            style={{ display:'flex', alignItems:'center', gap:6, height:38, padding:'0 14px', borderRadius:10, border:'1.5px solid rgba(26,58,42,.18)', background:'none', cursor:'pointer', fontSize:13, color:C.forest, fontWeight:600, fontFamily:'inherit' }}
          >
            ↓ Export CSV
          </button>
        }
      />

      {/* Search + filter */}
      <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
        <div style={{ flex:1, minWidth:180, position:'relative' }}>
          <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:C.muted }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, email, location…"
            style={{ width:'100%', height:44, borderRadius:12, border:'1px solid rgba(26,58,42,.15)', padding:'0 12px 0 36px', fontSize:14, outline:'none', boxSizing:'border-box', background:'#fff' }}
          />
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['all','All'],['group','Groups'],['church','Churches']].map(([f,l]) => (
            <button key={f} onClick={() => setFilter(f)} style={{ height:44, padding:'0 14px', borderRadius:12, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: filter===f ? C.forest : C.ivoryDk, color: filter===f ? '#e8d5a0' : C.forest, fontFamily:'inherit' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display:'flex', gap:16, padding:'9px 14px', background:'rgba(26,58,42,.04)', borderRadius:10, marginBottom:14, flexWrap:'wrap' }}>
        <p style={{ fontSize:12, color:C.forest, margin:0 }}><strong>{filtered.length}</strong> shown</p>
        <p style={{ fontSize:12, color:C.forest, margin:0 }}><strong>{filtered.filter(a => a.phone).length}</strong> have phone</p>
        <p style={{ fontSize:12, color:C.forest, margin:0 }}><strong>{filtered.filter(a => a.isActive30).length}</strong> active 30d</p>
      </div>

      {loading ? (
        <Center><Spinner size={28}/></Center>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.length === 0 && (
            <p style={{ textAlign:'center', color:C.muted, padding:'2rem', fontSize:14 }}>No accounts found</p>
          )}
          {filtered.map(a => (
            <AccountRow key={a.id} c={a} onClick={() => nav('account', a.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Account Detail ────────────────────────────────────────────────────────────
function AccountDetail({ churchId, onBack }) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [showAdd,    setShowAdd]    = useState(false)
  const [creditAmt,  setCreditAmt]  = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [crediting,  setCrediting]  = useState(false)
  const [addMsg,     setAddMsg]     = useState('')
  const [localBal,   setLocalBal]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/accounts/${churchId}`)
    const d = await r.json()
    setData(d); setLocalBal(d.church?.sms_credits ?? 0); setLoading(false)
  }, [churchId])

  useEffect(() => { load() }, [load])

  async function handleAddCredits() {
    const n = parseInt(creditAmt)
    if (!n || n < 1) return
    setCrediting(true); setAddMsg('')
    setLocalBal(b => (b ?? 0) + n)
    const r = await fetch('/api/admin/add-credits', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ churchId, credits:n, note:creditNote }) })
    const d = await r.json()
    setCrediting(false)
    if (r.ok) { setAddMsg(`✓ ${n} credits added. Balance: ${d.newBalance}`); setShowAdd(false); setCreditAmt(''); setCreditNote(''); setLocalBal(d.newBalance) }
    else      { setLocalBal(data?.church?.sms_credits ?? 0); setAddMsg(`Error: ${d.error}`) }
  }

  if (loading) return <Center><Spinner size={28}/></Center>
  if (!data?.church) return <p style={{ color:C.error, padding:'2rem' }}>Not found</p>

  const { church, stats, creditTransactions, smsLogs, manualTransfers } = data
  const displayBalance = localBal ?? church.sms_credits ?? 0

  return (
    <div>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, height:40, padding:'0 14px', borderRadius:10, border:'1.5px solid rgba(26,58,42,.18)', background:'none', cursor:'pointer', fontSize:13, color:C.forest, marginBottom:20, fontWeight:600 }}>
        <ArrowLeft size={14} /> Back
      </button>

      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:20 }}>
        <div style={{ minWidth:0 }}>
          <h1 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:22, fontWeight:800, color:C.forest, margin:0 }}>{church.name}</h1>
          <p style={{ fontSize:13, color:C.muted, margin:'4px 0 0' }}>Joined {fmtDate(church.created_at)} · Last active {daysAgo(stats.lastActive)}</p>
        </div>
        <button onClick={() => setShowAdd(v => !v)} style={{ display:'flex', alignItems:'center', gap:7, height:44, padding:'0 16px', borderRadius:12, border:'none', cursor:'pointer', background:C.forest, color:'#e8d5a0', fontSize:13, fontWeight:700, flexShrink:0 }}>
          <Plus size={14} /> Add Credits
        </button>
      </div>

      {showAdd && (
        <div style={{ background:'rgba(26,58,42,.04)', border:'1px solid rgba(26,58,42,.12)', borderRadius:14, padding:16, marginBottom:16 }}>
          <p style={{ fontSize:14, fontWeight:700, color:C.forest, margin:'0 0 12px' }}>Add SMS Credits</p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <input type="number" min="1" placeholder="Credits to add" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} style={{ height:44, borderRadius:11, border:'1px solid rgba(26,58,42,.2)', padding:'0 14px', fontSize:14, outline:'none', background:'#fff' }} />
            <input type="text" placeholder="Admin note (e.g. manual transfer confirmed ₦1,100)" value={creditNote} onChange={e => setCreditNote(e.target.value)} style={{ height:44, borderRadius:11, border:'1px solid rgba(26,58,42,.2)', padding:'0 14px', fontSize:14, outline:'none', background:'#fff' }} />
            <button onClick={handleAddCredits} disabled={!creditAmt || crediting} style={{ height:44, borderRadius:11, border:'none', background:C.forest, color:'#e8d5a0', fontWeight:700, fontSize:14, cursor:'pointer', opacity:(!creditAmt||crediting)?.5:1 }}>{crediting ? 'Adding…' : `Add ${creditAmt || '—'} credits`}</button>
          </div>
          {addMsg && <p style={{ fontSize:13, color: addMsg.startsWith('✓') ? C.success : C.error, margin:'10px 0 0', fontWeight:600 }}>{addMsg}</p>}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
        <StatCard icon={<Users size={13} color={C.forest}/>}      label="Members"  value={stats.totalMembers} color={C.forest} />
        <StatCard icon={<Zap size={13} color={C.goldDk}/>}        label="Credits"  value={displayBalance}     color={C.goldDk} />
        <StatCard icon={<MessageSquare size={13} color={C.mid}/>} label="SMS Sent" value={stats.totalSmsSent??0} color={C.mid} />
      </div>

      <Card style={{ marginBottom:12 }}>
        <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:'0 0 10px' }}>Account Details</p>
        {church.email && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <span style={{ fontSize:13, color:C.muted }}>Email</span>
            <a href={`mailto:${church.email}`} style={{ fontSize:13, fontWeight:600, color:C.mid, textDecoration:'none', display:'flex', alignItems:'center', gap:5 }}><Mail size={12}/> {church.email}</a>
          </div>
        )}
        {church.phone && (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, color:C.muted }}>Phone</span>
            <div style={{ display:'flex', gap:8 }}>
              <a href={`tel:${church.phone}`} style={{ display:'flex', alignItems:'center', gap:4, height:32, padding:'0 10px', borderRadius:8, background:'rgba(26,58,42,.06)', color:C.forest, textDecoration:'none', fontSize:12, fontWeight:700 }}><Phone size={12}/> Call</a>
              <a href={`https://wa.me/${church.phone.replace(/\D/g,'').replace(/^0/,'234')}`} target="_blank" rel="noreferrer" style={{ display:'flex', alignItems:'center', gap:4, height:32, padding:'0 10px', borderRadius:8, background:'#25D366', color:'#fff', textDecoration:'none', fontSize:12, fontWeight:700 }}>WA</a>
            </div>
          </div>
        )}
      </Card>

      {/* Credit transactions */}
      <Card style={{ marginBottom:12 }}>
        <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:'0 0 10px' }}>Credit History</p>
        {(creditTransactions??[]).length === 0 ? <p style={{ fontSize:13, color:C.muted }}>No transactions yet</p> : (
          (creditTransactions??[]).slice(0,15).map(tx => (
            <div key={tx.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid rgba(26,58,42,.06)' }}>
              <div><p style={{ fontSize:13, fontWeight:600, color:C.forest, margin:0 }}>+{tx.credits} credits</p><p style={{ fontSize:11, color:C.muted, margin:'2px 0 0' }}>{fmtDateTime(tx.created_at)} · {tx.gateway}</p></div>
              <div style={{ textAlign:'right' }}><p style={{ fontSize:13, fontWeight:600, color:C.forest, margin:0 }}>{fmtNaira(tx.amount_kobo??0)}</p><StatusPill status={tx.status}/></div>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}

// ── Pending Transfers ─────────────────────────────────────────────────────────
function PendingTransfers() {
  const [transfers, setTransfers]  = useState([])
  const [loading,   setLoading]    = useState(true)
  const [filter,    setFilter]     = useState('pending')
  const [confirm,   setConfirm]    = useState(null)
  const [creditNote,setCreditNote] = useState('')
  const [working,   setWorking]    = useState(false)
  const [msg,       setMsg]        = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const f = filter !== 'all' ? `?status=${filter}` : ''
    const r = await fetch(`/api/admin/transfers${f}`)
    const d = await r.json()
    setTransfers(d.transfers ?? []); setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleCredit() {
    if (!confirm) return
    setWorking(true); setMsg('')
    const r = await fetch('/api/admin/add-credits', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ churchId:confirm.churchId, credits:confirm.credits, note:creditNote||`Manual transfer confirmed — ${confirm.name}`, transferId:confirm.transferId }) })
    const d = await r.json()
    setWorking(false); setConfirm(null); setCreditNote('')
    r.ok ? (setMsg(`✓ ${confirm.credits} credits added`), load()) : setMsg(`Error: ${d.error}`)
  }

  async function handleReject(id) {
    await fetch('/api/admin/transfers/reject', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ transferId:id }) })
    load()
  }

  return (
    <div>
      <PageHeader title="Transfer Requests" />
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {[['pending','Pending'],['credited','Credited'],['rejected','Rejected'],['all','All']].map(([f,l]) => (
          <button key={f} onClick={() => setFilter(f)} style={{ height:40, padding:'0 14px', borderRadius:11, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: filter===f ? C.forest : C.ivoryDk, color: filter===f ? '#e8d5a0' : C.forest }}>{l}</button>
        ))}
      </div>
      {msg && <p style={{ fontSize:13, fontWeight:600, color: msg.startsWith('✓') ? C.success : C.error, marginBottom:12 }}>{msg}</p>}
      {loading ? <Center><Spinner size={28}/></Center> : transfers.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}><CheckCircle size={32} style={{ margin:'0 auto 12px', display:'block', opacity:.4 }}/><p style={{ fontSize:14 }}>No {filter === 'all' ? '' : filter} requests</p></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {transfers.map(t => (
            <Card key={t.id} style={{ borderLeft: t.status==='pending' ? `3px solid ${C.warning}` : 'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <p style={{ fontSize:14, fontWeight:700, color:C.forest, margin:0 }}>{t.display_name}</p>
                    <StatusPill status={t.status} />
                  </div>
                  <p style={{ fontSize:12, color:C.muted, margin:'0 0 3px' }}>{t.email} · {t.group_name}</p>
                  <p style={{ fontSize:12, color:C.forest, margin:'0 0 2px' }}><strong>{t.package_name}</strong> · {t.credits_requested} credits · {fmtNairaFlat(t.amount_paid)}</p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>{fmtDateTime(t.created_at)}</p>
                  {t.reference && <p style={{ fontSize:11, color:C.muted, margin:'2px 0 0', fontFamily:'monospace' }}>Ref: {t.reference}</p>}
                </div>
                {t.status === 'pending' && (
                  <div style={{ display:'flex', gap:8, alignSelf:'flex-start', flexShrink:0 }}>
                    <button onClick={() => setConfirm({ transferId:t.id, churchId:t.church_id, credits:t.credits_requested, name:t.display_name })} disabled={working} style={{ height:40, padding:'0 14px', borderRadius:10, border:'none', cursor:'pointer', background:C.success, color:'#fff', fontSize:13, fontWeight:700 }}>Credit</button>
                    <button onClick={() => handleReject(t.id)} disabled={working} style={{ height:40, padding:'0 12px', borderRadius:10, border:'1.5px solid rgba(220,38,38,.3)', background:'rgba(220,38,38,.06)', cursor:'pointer', color:C.error, fontSize:13, fontWeight:700 }}>Reject</button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {confirm && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:'1.5rem', maxWidth:420, width:'100%' }}>
            <h3 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:18, fontWeight:700, color:C.forest, margin:'0 0 10px' }}>Add {confirm.credits} credits to {confirm.name}?</h3>
            <input type="text" placeholder="Admin note (optional)" value={creditNote} onChange={e => setCreditNote(e.target.value)} style={{ width:'100%', height:44, borderRadius:11, border:'1px solid rgba(26,58,42,.2)', padding:'0 14px', fontSize:13, outline:'none', marginBottom:14, boxSizing:'border-box', background:'#fff' }} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => { setConfirm(null); setCreditNote('') }} style={{ flex:1, height:44, borderRadius:11, border:'1.5px solid rgba(26,58,42,.18)', background:'none', cursor:'pointer', fontSize:14 }}>Cancel</button>
              <button onClick={handleCredit} disabled={working} style={{ flex:1, height:44, borderRadius:11, border:'none', background:C.success, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700, opacity:working?.6:1 }}>{working ? 'Adding…' : 'Credit Now'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sender IDs ────────────────────────────────────────────────────────────────
function SenderIds() {
  const [requests,   setRequests]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('pending')
  const [working,    setWorking]    = useState(null)  // requestId being actioned
  const [msg,        setMsg]        = useState('')
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testing,    setTesting]    = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const f = filter !== 'all' ? `?status=${filter}` : ''
    const r = await fetch(`/api/admin/sender-ids${f}`)
    const d = await r.json()
    setRequests(d.requests ?? []); setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleApprove(requestId) {
    setWorking(requestId); setMsg('')
    const r = await fetch('/api/admin/sender-ids/approve', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ requestId }) })
    const d = await r.json()
    setWorking(null)
    r.ok ? (setMsg('✓ Sender ID approved — church notified'), load()) : setMsg(`Error: ${d.error}`)
  }

  async function handleReject() {
    if (!rejectTarget) return
    setWorking(rejectTarget)
    const r = await fetch('/api/admin/sender-ids/reject', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ requestId:rejectTarget, reason:rejectReason }) })
    const d = await r.json()
    setWorking(null); setRejectTarget(null); setRejectReason('')
    r.ok ? (setMsg('Sender ID rejected — church notified'), load()) : setMsg(`Error: ${d.error}`)
  }

  async function testConnection() {
    setTesting(true); setTestResult(null)
    try {
      const r = await fetch('/api/sms/test-connection')
      setTestResult(await r.json())
    } catch { setTestResult({ error: 'Network error' }) }
    finally { setTesting(false) }
  }

  return (
    <div>
      <PageHeader title="Sender IDs" action={
        <button onClick={testConnection} disabled={testing} style={{ display:'flex', alignItems:'center', gap:6, height:38, padding:'0 14px', borderRadius:10, border:'1.5px solid rgba(26,58,42,.18)', background:'none', cursor:'pointer', fontSize:13, color:C.forest, fontWeight:600 }}>
          {testing ? <Spinner size={14}/> : <Radio size={13}/>} Test Connection
        </button>
      } />

      {/* Connection test result */}
      {testResult && (
        <Card style={{ marginBottom:20, borderLeft:`3px solid ${testResult.connected ? C.success : C.error}` }}>
          <p style={{ fontSize:13, fontWeight:700, color: testResult.connected ? C.success : C.error, margin:'0 0 8px' }}>
            {testResult.connected ? '✓ Termii connected' : '✗ Connection failed'}
          </p>
          {testResult.connected && <p style={{ fontSize:13, color:C.forest, margin:'0 0 4px' }}>Balance: <strong>{testResult.balance}</strong> {testResult.currency}</p>}
          {testResult.connected && <p style={{ fontSize:13, color:C.forest, margin:0 }}>Default Sender ID: <strong>{testResult.senderId}</strong></p>}
          {testResult.error && <p style={{ fontSize:13, color:C.error, margin:0 }}>{testResult.error}</p>}
          {!testResult.configured && <p style={{ fontSize:12, color:C.muted, margin:'6px 0 0' }}>Add TERMII_API_KEY to your environment variables.</p>}
        </Card>
      )}

      {/* Termii guidelines */}
      <Card style={{ marginBottom:20, background:'rgba(201,168,76,.06)', border:'1px solid rgba(201,168,76,.2)' }}>
        <p style={{ fontSize:13, fontWeight:700, color:C.goldDk, margin:'0 0 8px' }}>Termii Sender ID Guidelines</p>
        {['Max 11 characters, alphanumeric only', 'Must be a registered business or organisation name', 'No generic names (SMS, Alert, Info, etc.)', 'Submit via Termii dashboard first, then mark as approved here', 'Typically approved within 24–48 hours'].map(g => (
          <p key={g} style={{ fontSize:12, color:C.forest, margin:'0 0 4px' }}>· {g}</p>
        ))}
      </Card>

      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {[['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['all','All']].map(([f,l]) => (
          <button key={f} onClick={() => setFilter(f)} style={{ height:40, padding:'0 14px', borderRadius:11, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, background: filter===f ? C.forest : C.ivoryDk, color: filter===f ? '#e8d5a0' : C.forest }}>{l}</button>
        ))}
      </div>

      {msg && <p style={{ fontSize:13, fontWeight:600, color: msg.startsWith('✓') ? C.success : C.error, marginBottom:12 }}>{msg}</p>}

      {loading ? <Center><Spinner size={28}/></Center> : requests.length === 0 ? (
        <div style={{ textAlign:'center', padding:'3rem', color:C.muted }}>
          <Radio size={32} style={{ margin:'0 auto 12px', display:'block', opacity:.4 }}/>
          <p style={{ fontSize:14 }}>No {filter === 'all' ? '' : filter} sender ID requests</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {requests.map(req => (
            <Card key={req.id} style={{ borderLeft: req.status==='pending' ? `3px solid ${C.warning}` : 'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <p style={{ fontSize:15, fontWeight:800, color:C.forest, margin:0 }}>{req.requested_sender_id}</p>
                    <StatusPill status={req.status} />
                  </div>
                  <p style={{ fontSize:13, color:C.mid, fontWeight:600, margin:'0 0 3px' }}>{req.churches?.name ?? 'Unknown church'}</p>
                  <p style={{ fontSize:12, color:C.muted, margin:'0 0 4px' }}>{req.churches?.admin_name}</p>
                  <p style={{ fontSize:12, color:C.forest, margin:'0 0 2px' }}>Use case: {req.use_case}</p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>{fmtDateTime(req.requested_at)}</p>
                  {req.rejection_reason && <p style={{ fontSize:12, color:C.error, margin:'4px 0 0' }}>Reason: {req.rejection_reason}</p>}
                </div>
                {req.status === 'pending' && (
                  <div style={{ display:'flex', gap:8, alignSelf:'flex-start', flexShrink:0 }}>
                    <button onClick={() => handleApprove(req.id)} disabled={!!working} style={{ height:40, padding:'0 14px', borderRadius:10, border:'none', cursor:'pointer', background:C.success, color:'#fff', fontSize:13, fontWeight:700, opacity:working===req.id?.6:1 }}>
                      {working === req.id ? '…' : 'Approve'}
                    </button>
                    <button onClick={() => { setRejectTarget(req.id); setRejectReason('') }} disabled={!!working} style={{ height:40, padding:'0 12px', borderRadius:10, border:'1.5px solid rgba(220,38,38,.3)', background:'rgba(220,38,38,.06)', cursor:'pointer', color:C.error, fontSize:13, fontWeight:700 }}>Reject</button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject dialog */}
      {rejectTarget && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'1rem' }}>
          <div style={{ background:'#fff', borderRadius:20, padding:'1.5rem', maxWidth:420, width:'100%' }}>
            <h3 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:18, fontWeight:700, color:C.forest, margin:'0 0 12px' }}>Reject Sender ID</h3>
            <textarea placeholder="Rejection reason (optional — shown to the church)" value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              style={{ width:'100%', minHeight:80, borderRadius:11, border:'1px solid rgba(26,58,42,.2)', padding:'10px 14px', fontSize:13, outline:'none', resize:'vertical', marginBottom:14, boxSizing:'border-box', fontFamily:'inherit' }} />
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setRejectTarget(null)} style={{ flex:1, height:44, borderRadius:11, border:'1.5px solid rgba(26,58,42,.18)', background:'none', cursor:'pointer', fontSize:14 }}>Cancel</button>
              <button onClick={handleReject} style={{ flex:1, height:44, borderRadius:11, border:'none', background:C.error, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700 }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────
const NAV = [
  { id:'overview',   label:'Overview',   Icon:LayoutDashboard },
  { id:'accounts',   label:'Accounts',   Icon:Users           },
  { id:'transfers',  label:'Transfers',  Icon:CreditCard      },
  { id:'senderids',  label:'Sender IDs', Icon:Radio           },
]

function AdminShell({ onLogout }) {
  const [page,      setPage]       = useState('overview')
  const [accountId, setAccountId]  = useState(null)
  const [pending,   setPending]    = useState(0)
  const [drawerOpen,setDrawerOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/transfers?status=pending').then(r => r.json()).then(d => setPending(d.transfers?.length ?? 0)).catch(() => {})
  }, [page])

  function nav(p, id) { setPage(p); if (id) setAccountId(id); setDrawerOpen(false) }
  async function logout() { await fetch('/api/admin/auth', { method:'DELETE' }); onLogout() }

  const sidebarContent = (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#0d1f15', padding:'1.25rem 0.75rem' }}>
      <div style={{ display:'flex', alignItems:'center', gap:9, padding:'0 0.5rem', marginBottom:'1.25rem' }}>
        <div style={{ width:32, height:32, borderRadius:8, background:'rgba(201,168,76,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}><Shield size={14} color={C.gold}/></div>
        <div><p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontWeight:700, fontSize:14, color:'#fff', margin:0 }}>ChurchTrakr</p><p style={{ fontSize:10, color:'rgba(255,255,255,.38)', margin:0, fontWeight:700, textTransform:'uppercase', letterSpacing:'.04em' }}>Admin</p></div>
      </div>
      <nav style={{ flex:1 }}>
        {NAV.map(({ id, label, Icon }) => {
          const active = page === id || (id === 'accounts' && page === 'account')
          return (
            <button key={id} onClick={() => nav(id)} style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'10px 10px', borderRadius:10, border:'none', cursor:'pointer', textAlign:'left', marginBottom:2, background: active ? 'rgba(255,255,255,.1)' : 'transparent', color: active ? '#c9a84c' : 'rgba(255,255,255,.6)', borderLeft: active ? '2px solid #c9a84c' : '2px solid transparent', fontSize:14, fontWeight: active ? 600 : 400 }}>
              <Icon size={14} strokeWidth={active?2.5:1.75}/>
              <span style={{ flex:1 }}>{label}</span>
              {id === 'transfers' && pending > 0 && <span style={{ fontSize:10, fontWeight:800, background:C.error, color:'#fff', borderRadius:8, padding:'1px 6px' }}>{pending}</span>}
            </button>
          )
        })}
      </nav>
      <div style={{ paddingTop:'.75rem', borderTop:'1px solid rgba(255,255,255,.07)' }}>
        <button onClick={logout} style={{ display:'flex', alignItems:'center', gap:8, width:'100%', padding:'9px 10px', borderRadius:10, border:'none', cursor:'pointer', background:'none', color:'rgba(255,255,255,.45)', fontSize:13 }}><LogOut size={13}/> Sign out</button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .adm { display:flex; min-height:100dvh; background:#f7f5f0; font-family:system-ui,sans-serif; }
        .adm-sb { width:220px; flex-shrink:0; position:fixed; top:0; bottom:0; left:0; z-index:10; }
        .adm-main { flex:1; margin-left:220px; padding:2rem 1.5rem; min-height:100dvh; max-width:900px; }
        .adm-top { display:none; position:fixed; top:0; left:0; right:0; height:54px; background:#0d1f15; z-index:20; align-items:center; justify-content:space-between; padding:0 1rem; }
        .adm-back { display:none; }
        .adm-drawer { display:none; position:fixed; top:0; left:0; bottom:0; width:240px; z-index:30; transform:translateX(-100%); transition:transform .25s cubic-bezier(.16,1,.3,1); box-shadow:4px 0 32px rgba(0,0,0,.3); }
        .adm-drawer.open { transform:translateX(0); }
        @media(max-width:768px){
          .adm-sb   { display:none !important; }
          .adm-top  { display:flex !important; }
          .adm-main { margin-left:0; padding:1rem; padding-top:70px; max-width:100%; }
          .adm-back { display:block !important; }
          .adm-drawer { display:block !important; }
        }
      `}</style>
      <div className="adm">
        <aside className="adm-sb">{sidebarContent}</aside>
        <header className="adm-top">
          <div style={{ display:'flex', alignItems:'center', gap:9 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'rgba(201,168,76,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}><Shield size={12} color={C.gold}/></div>
            <span style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontWeight:700, fontSize:15, color:'#fff' }}>Admin</span>
          </div>
          <button onClick={() => setDrawerOpen(v => !v)} style={{ background:'rgba(255,255,255,.1)', border:'none', borderRadius:8, width:38, height:38, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}>
            {drawerOpen ? <X size={17}/> : <span style={{ fontSize:18 }}>☰</span>}
          </button>
        </header>
        {drawerOpen && <div className="adm-back" onClick={() => setDrawerOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:25 }}/>}
        <div className={`adm-drawer ${drawerOpen ? 'open' : ''}`}>{sidebarContent}</div>
        <main className="adm-main">
          {page === 'overview'  && <Overview nav={nav} />}
          {page === 'accounts'  && <AccountsList nav={nav} />}
          {page === 'transfers' && <PendingTransfers />}
          {page === 'senderids' && <SenderIds />}
          {page === 'account' && accountId && <AccountDetail churchId={accountId} onBack={() => setPage('accounts')} />}
        </main>
      </div>
    </>
  )
}

export default function AdminPage() {
  const [authed,  setAuthed]  = useState(false)
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    fetch('/api/admin/stats').then(r => { if (r.ok) setAuthed(true) }).catch(() => {}).finally(() => setChecked(true))
  }, [])
  if (!checked) return <div style={{ minHeight:'100dvh', background:'#0d1f15', display:'flex', alignItems:'center', justifyContent:'center' }}><Shield size={30} style={{ color:'rgba(201,168,76,.35)' }}/></div>
  if (!authed)  return <AdminLogin onLogin={() => setAuthed(true)} />
  return <AdminShell onLogout={() => setAuthed(false)} />
}
