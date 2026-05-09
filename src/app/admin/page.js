'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Shield, RefreshCw, LogOut, Users, Building2, MessageSquare,
  TrendingUp, Zap, AlertCircle, CheckCircle, Clock,
  ChevronRight, ArrowLeft, Search, Plus, LayoutDashboard,
  CreditCard, BarChart2, Phone, Mail, Menu, X, Star,
} from 'lucide-react'

// ── Design system — matches main app exactly ─────────────────────────────────
const C = {
  forest:   '#1a3a2a',
  mid:      '#2d5a42',
  light:    '#4a8a65',
  muted:    '#8a9e90',
  gold:     '#c9a84c',
  goldDk:   '#a8862e',
  ivory:    '#f7f5f0',   // page background
  ivoryDk:  '#ede9e0',   // tab bg / lighter surfaces
  ivoryDeep:'#e0dbd0',
  success:  '#16a34a',
  error:    '#dc2626',
  warning:  '#d97706',
  ink:      '#0f1a13',
  sidebar:  '#0d1f15',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtNaira = (kobo) => `₦${((kobo ?? 0) / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`
const fmtNairaFlat = (n) => `₦${Number(n ?? 0).toLocaleString('en-NG')}`

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function daysAgo(d) {
  if (!d) return null
  const diff = Math.floor((Date.now() - new Date(d + 'T00:00:00')) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 30) return `${diff}d ago`
  return fmtDate(d)
}

// ── Shared UI atoms ───────────────────────────────────────────────────────────
function Spinner({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin .8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke={C.muted} strokeWidth="3" opacity=".2"/>
      <path fill={C.muted} d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" opacity=".75"/>
    </svg>
  )
}

function StatusPill({ status }) {
  const map = {
    pending:        { bg: 'rgba(217,119,6,.10)',  fg: C.warning, label: 'Pending'   },
    pending_manual: { bg: 'rgba(217,119,6,.10)',  fg: C.warning, label: 'Pending'   },
    credited:       { bg: 'rgba(22,163,74,.10)',  fg: C.success, label: 'Credited'  },
    completed:      { bg: 'rgba(22,163,74,.10)',  fg: C.success, label: 'Paid'      },
    rejected:       { bg: 'rgba(220,38,38,.10)',  fg: C.error,   label: 'Rejected'  },
    group:          { bg: 'rgba(26,58,42,.08)',   fg: C.mid,     label: 'Group'     },
    church:         { bg: 'rgba(201,168,76,.15)', fg: C.goldDk,  label: 'Church'    },
  }
  const s = map[status] ?? { bg: 'rgba(138,158,144,.15)', fg: C.muted, label: status ?? '—' }
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: s.bg, color: s.fg, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
      {s.label}
    </span>
  )
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      boxShadow: '0 1px 4px rgba(26,58,42,0.08), 0 0 0 1px rgba(26,58,42,0.06)',
      padding: '1rem', ...style,
    }}>
      {children}
    </div>
  )
}

function StatCard({ icon, label, value, sub, color = C.forest }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      </div>
      <p style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 26, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: C.muted, margin: '4px 0 0' }}>{sub}</p>}
    </Card>
  )
}

function SectionHeader({ title, count }) {
  return (
    <p style={{ fontSize: 13, fontWeight: 700, color: C.forest, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
      {title}
      {count > 0 && (
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: C.ivoryDk, borderRadius: 6, padding: '1px 7px' }}>{count}</span>
      )}
    </p>
  )
}

// ── Login ─────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [email,    setEmail]    = useState('admin@churchtrakr.com')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const r = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      if (r.ok) { onLogin(); return }
      setError((await r.json()).error ?? 'Invalid credentials')
    } catch { setError('Network error') }
    finally   { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100dvh', background: C.sidebar, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#fff', borderRadius: 22, padding: '2.5rem 2rem', width: '100%', maxWidth: 400, boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.forest, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color={C.gold} />
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: C.forest, margin: 0 }}>ChurchTrakr</p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0, fontWeight: 600 }}>Super Admin Panel</p>
          </div>
        </div>
        <h1 style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 22, fontWeight: 700, color: C.forest, margin: '0 0 22px' }}>Sign in</h1>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="email" placeholder="Admin email" required value={email} onChange={e => setEmail(e.target.value)}
            style={{ height: 48, borderRadius: 12, border: '1px solid rgba(26,58,42,0.2)', padding: '0 14px', fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }} />
          <input type="password" placeholder="Password" required value={password} onChange={e => setPassword(e.target.value)}
            style={{ height: 48, borderRadius: 12, border: '1px solid rgba(26,58,42,0.2)', padding: '0 14px', fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }} />
          {error && <p style={{ color: C.error, fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ height: 48, borderRadius: 12, border: 'none', background: C.forest, color: '#e8d5a0', fontWeight: 700, fontSize: 15, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Overview ─────────────────────────────────────────────────────────────────
function Overview({ nav }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const r = await fetch('/api/admin/stats')
      if (!r.ok) throw new Error()
      setData(await r.json())
    } catch { setError('Failed to load') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return <Center><Spinner size={32}/></Center>
  if (error)   return <p style={{ color: C.error, padding: '2rem' }}>{error} <button onClick={load} style={{ textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', color: C.forest }}>retry</button></p>
  if (!data)   return null

  const t = data.totals

  return (
    <div>
      <PageHeader title="Platform Overview" action={<RefreshBtn onClick={load} />} />

      {t.pendingTransfers > 0 && (
        <button onClick={() => nav('transfers')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14, border: '1px solid rgba(217,119,6,.25)', background: 'rgba(217,119,6,.06)', cursor: 'pointer', marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(217,119,6,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={16} color={C.warning} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.warning, margin: 0 }}>{t.pendingTransfers} pending transfer {t.pendingTransfers === 1 ? 'request' : 'requests'}</p>
            <p style={{ fontSize: 12, color: C.warning, margin: '2px 0 0', opacity: .75 }}>Tap to review and credit accounts</p>
          </div>
          <ChevronRight size={16} color={C.warning} />
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard icon={<Building2 size={14} color={C.forest}/>} label="Accounts" value={t.churches}  color={C.forest} sub={`+${t.newThisWeek} this week`} />
        <StatCard icon={<Users size={14} color={C.mid}/>}         label="Members"  value={(t.members ?? 0).toLocaleString()}  color={C.mid} />
        <StatCard icon={<TrendingUp size={14} color={C.success}/>} label="Revenue" value={fmtNaira(t.totalRevenue)} color={C.success} sub="all time" />
        <StatCard icon={<Zap size={14} color={C.goldDk}/>}        label="Credits Sold" value={(t.totalCredSold ?? 0).toLocaleString()} color={C.goldDk} />
        <StatCard icon={<MessageSquare size={14} color={C.mid}/>} label="SMS Sent" value={(t.totalSmsSent ?? 0).toLocaleString()} color={C.mid} sub="all time" />
        <StatCard icon={<CheckCircle size={14} color={C.success}/>} label="Active 30d" value={t.activeIn30 ?? 0} color={C.success} sub="submitted attendance" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <SectionHeader title="Recent Accounts" count={0} />
        <button onClick={() => nav('accounts')} style={{ fontSize: 13, color: C.mid, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(data.churches ?? []).slice(0, 6).map(c => (
          <AccountRow key={c.id} c={c} onClick={() => nav('account', c.id)} />
        ))}
      </div>
    </div>
  )
}

// ── Account row (shared) ──────────────────────────────────────────────────────
function AccountRow({ c, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, border: 'none', cursor: 'pointer', background: '#fff', boxShadow: '0 1px 4px rgba(26,58,42,0.07)', textAlign: 'left', width: '100%' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(26,58,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {c.accountType === 'church' ? <Building2 size={15} color={C.forest}/> : <Users size={15} color={C.forest}/>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.forest, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
        <p style={{ fontSize: 12, color: C.muted, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.adminName} · {c.totalMembers} members · Last active {daysAgo(c.lastActive)}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: c.smsCredits > 0 ? C.success : C.muted, margin: 0 }}>{c.smsCredits} cr</p>
        <StatusPill status={c.accountType} />
      </div>
      <ChevronRight size={14} color={C.muted} style={{ flexShrink: 0 }} />
    </button>
  )
}

// ── Accounts list ─────────────────────────────────────────────────────────────
function AccountsList({ nav }) {
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filter,   setFilter]   = useState('all')

  useEffect(() => {
    fetch('/api/admin/accounts').then(r => r.json()).then(d => setAccounts(d.accounts ?? [])).finally(() => setLoading(false))
  }, [])

  const filtered = accounts.filter(a => {
    if (filter === 'group'  && a.accountType !== 'group')  return false
    if (filter === 'church' && a.accountType !== 'church') return false
    if (search) {
      const q = search.toLowerCase()
      return a.name.toLowerCase().includes(q) || (a.adminName ?? '').toLowerCase().includes(q) || (a.email ?? '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div>
      <PageHeader title={`All Accounts (${accounts.length})`} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…"
            style={{ width: '100%', height: 44, borderRadius: 12, border: '1px solid rgba(26,58,42,0.15)', padding: '0 12px 0 36px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','All'],['group','Groups'],['church','Churches']].map(([f,l]) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ height: 44, padding: '0 14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: filter === f ? C.forest : C.ivoryDk, color: filter === f ? '#e8d5a0' : C.forest, transition: 'all .15s' }}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? <Center><Spinner size={28}/></Center> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && <p style={{ textAlign: 'center', color: C.muted, padding: '2rem', fontSize: 14 }}>No accounts found</p>}
          {filtered.map(a => <AccountRow key={a.id} c={a} onClick={() => nav('account', a.id)} />)}
        </div>
      )}
    </div>
  )
}

// ── Account detail ────────────────────────────────────────────────────────────
function AccountDetail({ churchId, onBack }) {
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [creditAmt,   setCreditAmt]   = useState('')
  const [creditNote,  setCreditNote]  = useState('')
  const [crediting,   setCrediting]   = useState(false)
  const [addMsg,      setAddMsg]      = useState('')
  const [localBal,    setLocalBal]    = useState(null) // optimistic balance

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/accounts/${churchId}`)
    const d = await r.json()
    setData(d)
    setLocalBal(d.church?.sms_credits ?? 0)
    setLoading(false)
  }, [churchId])

  useEffect(() => { load() }, [load])

  async function handleAddCredits() {
    const n = parseInt(creditAmt)
    if (!n || n < 1) return
    setCrediting(true); setAddMsg('')
    // Optimistic UI update immediately
    setLocalBal(b => (b ?? 0) + n)
    const r = await fetch('/api/admin/add-credits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ churchId, credits: n, note: creditNote }),
    })
    const d = await r.json()
    setCrediting(false)
    if (r.ok) {
      setAddMsg(`✓ ${n} credits added. New balance: ${d.newBalance}`)
      setShowAdd(false); setCreditAmt(''); setCreditNote('')
      setLocalBal(d.newBalance)
    } else {
      setLocalBal(data?.church?.sms_credits ?? 0) // revert on error
      setAddMsg(`Error: ${d.error}`)
    }
  }

  if (loading) return <Center><Spinner size={28}/></Center>
  if (!data?.church) return <p style={{ color: C.error, padding: '2rem' }}>Not found</p>

  const { church, stats, creditTransactions, smsLogs, manualTransfers } = data
  const displayBalance = localBal ?? church.sms_credits ?? 0

  return (
    <div>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px', borderRadius: 10, border: '1.5px solid rgba(26,58,42,0.18)', background: 'none', cursor: 'pointer', fontSize: 13, color: C.forest, marginBottom: 20, fontWeight: 600 }}>
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 22, fontWeight: 800, color: C.forest, margin: 0 }}>{church.name}</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: '4px 0 0' }}>
            Joined {fmtDate(church.created_at)} · Last active {daysAgo(stats.lastActive)}
          </p>
        </div>
        <button onClick={() => setShowAdd(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 7, height: 44, padding: '0 16px', borderRadius: 12, border: 'none', cursor: 'pointer', background: C.forest, color: '#e8d5a0', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          <Plus size={14} /> Add Credits
        </button>
      </div>

      {/* Add Credits panel */}
      {showAdd && (
        <div style={{ background: 'rgba(26,58,42,0.04)', border: '1px solid rgba(26,58,42,0.12)', borderRadius: 14, padding: 16, marginBottom: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: C.forest, margin: '0 0 12px' }}>Add SMS Credits</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="number" min="1" placeholder="Credits to add (e.g. 200)"
              value={creditAmt} onChange={e => setCreditAmt(e.target.value)}
              style={{ height: 44, borderRadius: 11, border: '1px solid rgba(26,58,42,0.2)', padding: '0 14px', fontSize: 14, outline: 'none', background: '#fff' }} />
            <input type="text" placeholder="Admin note (e.g. manual transfer confirmed ₦1,100)"
              value={creditNote} onChange={e => setCreditNote(e.target.value)}
              style={{ height: 44, borderRadius: 11, border: '1px solid rgba(26,58,42,0.2)', padding: '0 14px', fontSize: 14, outline: 'none', background: '#fff' }} />
            <button onClick={handleAddCredits} disabled={!creditAmt || crediting}
              style={{ height: 44, borderRadius: 11, border: 'none', background: C.forest, color: '#e8d5a0', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: (!creditAmt || crediting) ? 0.5 : 1 }}>
              {crediting ? 'Adding…' : `Add ${creditAmt || '—'} credits`}
            </button>
          </div>
          {addMsg && <p style={{ fontSize: 13, color: addMsg.startsWith('✓') ? C.success : C.error, margin: '10px 0 0', fontWeight: 600 }}>{addMsg}</p>}
        </div>
      )}

      {/* Profile card */}
      <Card style={{ marginBottom: 12 }}>
        <SectionHeader title="Account Details" count={0} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Name',         value: church.admin_name },
            { label: 'Account Type', value: <StatusPill status={church.account_type} /> },
            { label: 'Credits',      value: <strong style={{ color: displayBalance > 0 ? C.success : C.error }}>{displayBalance}</strong> },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.forest }}>{value}</span>
            </div>
          ))}
          {/* Email — tappable */}
          {church.email && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.muted }}>Email</span>
              <a href={`mailto:${church.email}`} style={{ fontSize: 13, fontWeight: 600, color: C.mid, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Mail size={12} /> {church.email}
              </a>
            </div>
          )}
          {/* Phone — tappable, links to call or WhatsApp */}
          {church.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: C.muted }}>Phone</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`tel:${church.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', borderRadius: 8, background: 'rgba(26,58,42,0.06)', color: C.forest, textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                  <Phone size={12} /> Call
                </a>
                <a href={`https://wa.me/${church.phone.replace(/^\+/, '').replace(/^0/, '234').replace(/\s/g, '')}`} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px', borderRadius: 8, background: '#25D366', color: '#fff', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
        <StatCard icon={<Users size={13} color={C.forest}/>}         label="Members"  value={stats.totalMembers} color={C.forest} />
        <StatCard icon={<Star size={13} color={C.goldDk}/>}          label="Sundays"  value={stats.totalSundays} color={C.goldDk} />
        <StatCard icon={<MessageSquare size={13} color={C.mid}/>}    label="SMS Sent" value={stats.totalSmsSent ?? 0} color={C.mid} />
      </div>

      {/* Credit transactions */}
      <Card style={{ marginBottom: 12 }}>
        <SectionHeader title="Credit History" count={(creditTransactions ?? []).length} />
        {(creditTransactions ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>No transactions yet</p>
        ) : (
          (creditTransactions ?? []).slice(0, 15).map(tx => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(26,58,42,0.06)' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.forest, margin: 0 }}>+{tx.credits} credits</p>
                <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{fmtDateTime(tx.created_at)} · {tx.gateway}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.forest, margin: 0 }}>{fmtNaira(tx.amount_kobo ?? 0)}</p>
                <StatusPill status={tx.status} />
              </div>
            </div>
          ))
        )}
      </Card>

      {/* Transfer requests */}
      {(manualTransfers ?? []).length > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <SectionHeader title="Transfer Requests" count={(manualTransfers ?? []).length} />
          {(manualTransfers ?? []).map(mtr => (
            <div key={mtr.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(26,58,42,0.06)' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.forest, margin: 0 }}>{mtr.package_name} · {mtr.credits_requested} cr</p>
                <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{fmtDateTime(mtr.created_at)}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.forest, margin: 0 }}>{fmtNairaFlat(mtr.amount_paid)}</p>
                <StatusPill status={mtr.status} />
              </div>
            </div>
          ))}
        </Card>
      )}

      {/* SMS logs */}
      <Card>
        <SectionHeader title="SMS History" count={(smsLogs ?? []).length} />
        {(smsLogs ?? []).length === 0 ? (
          <p style={{ fontSize: 13, color: C.muted, padding: '8px 0' }}>No SMS sent yet</p>
        ) : (
          (smsLogs ?? []).slice(0, 15).map(l => (
            <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(26,58,42,0.06)' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.forest, margin: 0 }}>{l.recipient_count} recipients · {l.type}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0' }}>{fmtDateTime(l.sent_at)}</p>
              </div>
              <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{l.credits_used} cr</p>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}

// ── Pending Transfers ─────────────────────────────────────────────────────────
function PendingTransfers() {
  const [transfers, setTransfers]   = useState([])
  const [loading,   setLoading]     = useState(true)
  const [filter,    setFilter]      = useState('pending')
  const [confirm,   setConfirm]     = useState(null)
  const [creditNote,setCreditNote]  = useState('')
  const [working,   setWorking]     = useState(false)
  const [msg,       setMsg]         = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const f = filter !== 'all' ? `?status=${filter}` : ''
    const r = await fetch(`/api/admin/transfers${f}`)
    const d = await r.json()
    setTransfers(d.transfers ?? [])
    setLoading(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleCredit() {
    if (!confirm) return
    setWorking(true); setMsg('')
    const r = await fetch('/api/admin/add-credits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ churchId: confirm.churchId, credits: confirm.credits, note: creditNote || `Manual transfer confirmed — ${confirm.name}`, transferId: confirm.transferId }),
    })
    const d = await r.json()
    setWorking(false); setConfirm(null); setCreditNote('')
    r.ok ? (setMsg(`✓ ${confirm.credits} credits added to ${confirm.name}`), load()) : setMsg(`Error: ${d.error}`)
  }

  async function handleReject(id) {
    await fetch('/api/admin/transfers/reject', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transferId: id }) })
    load()
  }

  return (
    <div>
      <PageHeader title="Transfer Requests" />
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['pending','Pending'],['credited','Credited'],['rejected','Rejected'],['all','All']].map(([f,l]) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ height: 40, padding: '0 14px', borderRadius: 11, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: filter === f ? C.forest : C.ivoryDk, color: filter === f ? '#e8d5a0' : C.forest }}>
            {l}
          </button>
        ))}
      </div>

      {msg && <p style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith('✓') ? C.success : C.error, marginBottom: 12 }}>{msg}</p>}

      {loading ? <Center><Spinner size={28}/></Center> : transfers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
          <CheckCircle size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: .4 }} />
          <p style={{ fontSize: 14 }}>No {filter === 'all' ? '' : filter} requests</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {transfers.map(t => (
            <Card key={t.id} style={{ borderLeft: t.status === 'pending' ? `3px solid ${C.warning}` : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.forest, margin: 0 }}>{t.display_name}</p>
                    <StatusPill status={t.status} />
                  </div>
                  <p style={{ fontSize: 12, color: C.muted, margin: '0 0 3px' }}>{t.email} · {t.group_name}</p>
                  <p style={{ fontSize: 12, color: C.forest, margin: '0 0 2px' }}>
                    <strong>{t.package_name}</strong> · {t.credits_requested} credits · {fmtNairaFlat(t.amount_paid)}
                  </p>
                  <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{fmtDateTime(t.created_at)}</p>
                  {t.reference && <p style={{ fontSize: 11, color: C.muted, margin: '2px 0 0', fontFamily: 'monospace' }}>Ref: {t.reference}</p>}
                </div>
                {t.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start', flexShrink: 0 }}>
                    <button onClick={() => setConfirm({ transferId: t.id, churchId: t.church_id, credits: t.credits_requested, name: t.display_name })} disabled={working}
                      style={{ height: 40, padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: C.success, color: '#fff', fontSize: 13, fontWeight: 700 }}>
                      Credit
                    </button>
                    <button onClick={() => handleReject(t.id)} disabled={working}
                      style={{ height: 40, padding: '0 12px', borderRadius: 10, border: '1.5px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', color: C.error, fontSize: 13, fontWeight: 700 }}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {confirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '1.5rem', maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
            <h3 style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 18, fontWeight: 700, color: C.forest, margin: '0 0 10px' }}>
              Add {confirm.credits} credits to {confirm.name}?
            </h3>
            <p style={{ fontSize: 13, color: C.muted, margin: '0 0 14px' }}>Credits are added immediately and the transfer is marked as credited.</p>
            <input type="text" placeholder="Admin note (optional)" value={creditNote} onChange={e => setCreditNote(e.target.value)}
              style={{ width: '100%', height: 44, borderRadius: 11, border: '1px solid rgba(26,58,42,0.2)', padding: '0 14px', fontSize: 13, outline: 'none', marginBottom: 14, boxSizing: 'border-box', background: '#fff' }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setConfirm(null); setCreditNote('') }} style={{ flex: 1, height: 44, borderRadius: 11, border: '1.5px solid rgba(26,58,42,0.18)', background: 'none', cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={handleCredit} disabled={working} style={{ flex: 1, height: 44, borderRadius: 11, border: 'none', background: C.success, color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: working ? .6 : 1 }}>
                {working ? 'Adding…' : 'Credit Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Utility layout components ─────────────────────────────────────────────────
function Center({ children }) {
  return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>{children}</div>
}

function PageHeader({ title, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
      <h1 style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 20, fontWeight: 800, color: C.forest, margin: 0 }}>{title}</h1>
      {action}
    </div>
  )
}

function RefreshBtn({ onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px', borderRadius: 10, border: '1.5px solid rgba(26,58,42,0.18)', background: 'none', cursor: 'pointer', fontSize: 13, color: C.forest, fontWeight: 600 }}>
      <RefreshCw size={13} /> Refresh
    </button>
  )
}

// ── Admin Shell — sidebar nav + mobile hamburger ───────────────────────────────
const NAV = [
  { id: 'overview',  label: 'Overview',  Icon: LayoutDashboard },
  { id: 'accounts',  label: 'Accounts',  Icon: Users           },
  { id: 'transfers', label: 'Transfers', Icon: CreditCard      },
]

function AdminShell({ onLogout }) {
  const [page,      setPage]      = useState('overview')
  const [accountId, setAccountId] = useState(null)
  const [pending,   setPending]   = useState(0)
  const [drawerOpen,setDrawerOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/transfers?status=pending').then(r => r.json()).then(d => setPending(d.transfers?.length ?? 0)).catch(() => {})
  }, [page])

  function nav(p, id) { setPage(p); if (id) setAccountId(id); setDrawerOpen(false) }
  async function logout() { await fetch('/api/admin/auth', { method: 'DELETE' }); onLogout() }

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.sidebar, padding: '1.25rem 0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 0.5rem', marginBottom: '1.25rem' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(201,168,76,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Shield size={14} color={C.gold} />
        </div>
        <div>
          <p style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontWeight: 700, fontSize: 14, color: '#fff', margin: 0 }}>ChurchTrakr</p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,.38)', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Admin</p>
        </div>
      </div>

      <nav style={{ flex: 1 }}>
        {NAV.map(({ id, label, Icon }) => {
          const active = page === id || (id === 'accounts' && page === 'account')
          return (
            <button key={id} onClick={() => nav(id)}
              style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '10px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 2,
                background: active ? 'rgba(255,255,255,.1)' : 'transparent',
                color: active ? '#c9a84c' : 'rgba(255,255,255,.6)',
                borderLeft: active ? '2px solid #c9a84c' : '2px solid transparent',
                fontSize: 14, fontWeight: active ? 600 : 400,
              }}>
              <Icon size={14} strokeWidth={active ? 2.5 : 1.75} />
              <span style={{ flex: 1 }}>{label}</span>
              {id === 'transfers' && pending > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, background: C.error, color: '#fff', borderRadius: 8, padding: '1px 6px' }}>{pending}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,.07)' }}>
        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'none', color: 'rgba(255,255,255,.45)', fontSize: 13 }}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .admin-shell { display:flex; min-height:100dvh; background:${C.ivory}; font-family:system-ui,sans-serif; }
        .admin-sidebar { width:220px; flex-shrink:0; position:fixed; top:0; bottom:0; left:0; z-index:10; }
        .admin-main { flex:1; margin-left:220px; padding:2rem 1.5rem; min-height:100dvh; max-width:900px; }
        .admin-topbar { display:none; position:fixed; top:0; left:0; right:0; height:54px; background:${C.sidebar}; z-index:20; align-items:center; justify-content:space-between; padding:0 1rem; }
        .admin-backdrop { display:none; }
        .admin-drawer { display:none; position:fixed; top:0; left:0; bottom:0; width:240px; z-index:30; transform:translateX(-100%); transition:transform .25s cubic-bezier(.16,1,.3,1); box-shadow:4px 0 32px rgba(0,0,0,.3); }
        .admin-drawer.open { transform:translateX(0); }
        @media(max-width:768px){
          .admin-sidebar  { display:none !important; }
          .admin-topbar   { display:flex !important; }
          .admin-main     { margin-left:0; padding:1rem; padding-top:70px; max-width:100%; }
          .admin-backdrop { display:block !important; position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:25; }
          .admin-drawer   { display:block !important; }
        }
      `}</style>

      <div className="admin-shell">
        <aside className="admin-sidebar">{sidebarContent}</aside>

        {/* Mobile topbar */}
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(201,168,76,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={12} color={C.gold} />
            </div>
            <span style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontWeight: 700, fontSize: 15, color: '#fff' }}>Admin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {pending > 0 && (
              <button onClick={() => nav('transfers')} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 10px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'rgba(217,119,6,.2)', color: C.warning, fontSize: 12, fontWeight: 700 }}>
                <Clock size={12} /> {pending}
              </button>
            )}
            <button onClick={() => setDrawerOpen(v => !v)} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 8, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
              {drawerOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </header>

        {/* Mobile backdrop */}
        {drawerOpen && <div className="admin-backdrop" onClick={() => setDrawerOpen(false)} />}

        {/* Mobile drawer */}
        <div className={`admin-drawer ${drawerOpen ? 'open' : ''}`}>{sidebarContent}</div>

        {/* Page content */}
        <main className="admin-main">
          {page === 'overview'  && <Overview nav={nav} />}
          {page === 'accounts'  && <AccountsList nav={nav} />}
          {page === 'transfers' && <PendingTransfers />}
          {page === 'account' && accountId && <AccountDetail churchId={accountId} onBack={() => setPage('accounts')} />}
        </main>
      </div>
    </>
  )
}

// ── Entry point ───────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed,  setAuthed]  = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    fetch('/api/admin/stats').then(r => { if (r.ok) setAuthed(true) }).catch(() => {}).finally(() => setChecked(true))
  }, [])

  if (!checked) return (
    <div style={{ minHeight: '100dvh', background: C.sidebar, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Shield size={30} style={{ color: 'rgba(201,168,76,.35)' }} />
    </div>
  )

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />
  return <AdminShell onLogout={() => setAuthed(false)} />
}
