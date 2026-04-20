'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Users, TrendingUp, Calendar, CheckCircle, AlertCircle,
  Copy, RefreshCw, Link2, Link2Off, ChevronRight, Clock,
  Building2, Check, X, Wifi, WifiOff, Plus
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'

const C = {
  forest:'#1a3a2a', mid:'#2d5a42', muted:'#8a9e90',
  gold:'#c9a84c', goldDk:'#a8862e', ivory:'#f7f5f0', ivoryDeep:'#e0dbd0',
  success:'#16a34a', error:'#dc2626', warning:'#d97706',
}

const PERIODS = [
  { label:'This Month',    value:'1m' },
  { label:'Last 3 Months', value:'3m' },
  { label:'Last 6 Months', value:'6m' },
  { label:'This Year',     value:'1y' },
]

function rateColor(r) {
  if (r == null) return C.muted
  return r >= 75 ? C.success : r >= 50 ? C.warning : C.error
}

function fmtDate(d) {
  if (!d) return 'Never'
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })
}

function timeAgo(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 8) return `${weeks}w ago`
  return fmtDate(iso.slice(0, 10))
}

function CTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid rgba(26,58,42,0.12)', borderRadius:10, padding:'8px 12px', fontSize:12 }}>
      <p style={{ color:C.muted, marginBottom:3, fontSize:11 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color:p.color||C.forest, fontWeight:700, margin:'2px 0' }}>{p.value}%</p>
      ))}
    </div>
  )
}

// ── Pending request card ───────────────────────────────────────────────────────
function PendingCard({ conn, onAction, loading }) {
  return (
    <div style={{ background:'rgba(201,168,76,0.06)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:14, padding:'1rem', display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:'rgba(201,168,76,0.15)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Clock size={16} color={C.goldDk} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
          {conn.subgroupName}
        </p>
        <p style={{ fontSize:11, color:C.muted, margin:0 }}>
          {conn.subgroupAdmin} · Requested {timeAgo(conn.requested_at)}
        </p>
      </div>
      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
        <button
          onClick={() => onAction(conn.id, 'approve')}
          disabled={loading}
          style={{ width:32, height:32, borderRadius:8, border:'none', background:C.success, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
          title="Approve"
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => onAction(conn.id, 'reject')}
          disabled={loading}
          style={{ width:32, height:32, borderRadius:8, border:'none', background:'rgba(220,38,38,0.1)', color:C.error, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
          title="Reject"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Group card ─────────────────────────────────────────────────────────────────
function GroupCard({ group }) {
  const isDisconnected = group.status === 'disconnected'
  const rate = group.avgRate

  return (
    <Link href={`/church-dashboard/group/${group.id}`} style={{ textDecoration:'none' }}>
      <div className="card" style={{
        opacity: isDisconnected ? 0.6 : 1,
        transition: 'box-shadow 0.15s, transform 0.15s',
        cursor: 'pointer',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:'rgba(26,58,42,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Users size={16} color={C.mid} strokeWidth={1.75} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <p style={{ fontSize:14, fontWeight:700, color:C.forest, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {group.name}
              </p>
              {isDisconnected && (
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:6, background:'rgba(220,38,38,0.1)', color:C.error, flexShrink:0 }}>
                  Disconnected
                </span>
              )}
            </div>
            <p style={{ fontSize:11, color:C.muted, margin:'2px 0 0' }}>
              {group.memberCount} members · Last: {group.lastSession ? fmtDate(group.lastSession.date) : 'No sessions'}
            </p>
          </div>
          <ChevronRight size={15} color={C.muted} style={{ flexShrink:0, marginTop:3 }} />
        </div>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          {/* Avg rate */}
          <div style={{ background:C.ivory, borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
            <p style={{ fontSize:18, fontWeight:800, color:rateColor(rate), margin:'0 0 1px', lineHeight:1, fontFamily:'var(--font-playfair,Georgia,serif)' }}>
              {rate != null ? `${rate}%` : '—'}
            </p>
            <p style={{ fontSize:9, color:C.muted, margin:0, textTransform:'uppercase', letterSpacing:'0.04em', fontWeight:600 }}>Avg Rate</p>
          </div>
          {/* Last Sunday */}
          <div style={{ background:C.ivory, borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
            <p style={{ fontSize:18, fontWeight:800, color:group.lastSession ? rateColor(group.lastSession.rate) : C.muted, margin:'0 0 1px', lineHeight:1, fontFamily:'var(--font-playfair,Georgia,serif)' }}>
              {group.lastSession ? `${group.lastSession.rate}%` : '—'}
            </p>
            <p style={{ fontSize:9, color:C.muted, margin:0, textTransform:'uppercase', letterSpacing:'0.04em', fontWeight:600 }}>Last Sun</p>
          </div>
          {/* Sessions */}
          <div style={{ background:C.ivory, borderRadius:10, padding:'8px 10px', textAlign:'center' }}>
            <p style={{ fontSize:18, fontWeight:800, color:C.forest, margin:'0 0 1px', lineHeight:1, fontFamily:'var(--font-playfair,Georgia,serif)' }}>
              {group.totalSessions}
            </p>
            <p style={{ fontSize:9, color:C.muted, margin:0, textTransform:'uppercase', letterSpacing:'0.04em', fontWeight:600 }}>Sessions</p>
          </div>
        </div>

        {/* Trend sparkline */}
        {group.trend && group.trend.length >= 2 && !isDisconnected && (
          <div style={{ marginTop:10, height:40 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={group.trend} margin={{ top:2, right:2, bottom:2, left:2 }}>
                <Line type="monotone" dataKey="rate" stroke={rateColor(rate)} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Connection code panel ──────────────────────────────────────────────────────
function CodePanel({ church }) {
  const [code, setCode]       = useState(church.connection_code ?? null)
  const [loading, setLoading] = useState(!church.connection_code)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    if (!code) {
      fetch('/api/church/code')
        .then(r => r.json())
        .then(d => { if (d.code) setCode(d.code) })
        .finally(() => setLoading(false))
    }
  }, [code])

  async function regenerate() {
    if (!confirm('Regenerate code? Existing approved connections will NOT be affected. Only new requests use the new code.')) return
    setLoading(true)
    const res = await fetch('/api/church/code', { method:'POST' })
    const d = await res.json()
    if (d.code) setCode(d.code)
    setLoading(false)
  }

  async function copy() {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background:'linear-gradient(135deg,#1a3a2a,#2d5a42)', borderRadius:16, padding:'1.25rem', color:'#fff' }}>
      <p style={{ fontSize:11, color:'rgba(232,213,160,0.55)', margin:'0 0 6px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
        Your Connection Code
      </p>
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.55)', margin:'0 0 14px', lineHeight:1.5 }}>
        Share this code with your sub-group leaders so they can link to your dashboard.
      </p>

      {loading ? (
        <div style={{ height:48, display:'flex', alignItems:'center' }}>
          <RefreshCw size={16} color="rgba(255,255,255,0.4)" style={{ animation:'spin 1s linear infinite' }} />
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, background:'rgba(255,255,255,0.12)', borderRadius:10, padding:'10px 16px' }}>
            <p style={{ fontFamily:'monospace', fontSize:22, fontWeight:800, color:'#e8d5a0', margin:0, letterSpacing:'0.12em' }}>
              {code}
            </p>
          </div>
          <button
            onClick={copy}
            style={{ width:44, height:44, borderRadius:10, border:'none', background:'rgba(255,255,255,0.15)', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
            title="Copy code"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <button
            onClick={regenerate}
            disabled={loading}
            style={{ width:44, height:44, borderRadius:10, border:'none', background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
            title="Regenerate code"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ChurchDashboardClient({ church }) {
  const [period, setPeriod]   = useState('1m')
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [requests, setRequests] = useState([])
  const [reqLoading, setReqLoading] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [dashRes, reqRes] = await Promise.all([
        fetch(`/api/church/dashboard?period=${period}`),
        fetch('/api/church/requests'),
      ])
      const dash = await dashRes.json()
      const reqs = await reqRes.json()
      if (dash.error) { setError(dash.error); return }
      setData(dash)
      setRequests((reqs.connections ?? []).filter(c => c.status === 'pending'))
    } catch { setError('Failed to load dashboard') }
    finally { setLoading(false) }
  }, [period])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  // Realtime: poll every 30s when tab is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) fetchDashboard()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchDashboard])

  async function handleRequest(connectionId, action) {
    setReqLoading(true)
    await fetch('/api/church/requests', {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ connectionId, action }),
    })
    setReqLoading(false)
    fetchDashboard()
  }

  const approvedGroups     = (data?.groups ?? []).filter(g => g.status === 'approved')
  const disconnectedGroups = (data?.groups ?? []).filter(g => g.status === 'disconnected')
  const agg                = data?.aggregated ?? null

  // Combine trend data across all approved groups for the chart
  const combinedTrend = useMemo(() => {
    if (!approvedGroups.length) return []
    const byDate = {}
    for (const g of approvedGroups) {
      for (const t of (g.trend ?? [])) {
        if (!byDate[t.date]) byDate[t.date] = { present:0, total:0 }
        byDate[t.date].present += t.present
        byDate[t.date].total   += t.total
      }
    }
    return Object.entries(byDate)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([date, {present, total}]) => ({
        date,
        label: new Date(date+'T00:00:00').toLocaleDateString(undefined, {month:'short',day:'numeric'}),
        rate: total > 0 ? Math.round((present/total)*100) : 0,
        present,
      }))
  }, [approvedGroups])

  const isEmpty = !loading && approvedGroups.length === 0 && requests.length === 0

  return (
    <div className="page-content pb-16">

      {/* ── Header ── */}
      <div style={{ marginBottom:4 }}>
        <h1 className="font-display" style={{ fontSize:22, fontWeight:800, color:C.forest, margin:0, letterSpacing:'-0.02em' }}>
          Church Dashboard
        </h1>
        <p style={{ fontSize:13, color:C.muted, margin:'3px 0 0' }}>{church.name}</p>
      </div>

      {/* ── Connection code ── */}
      <CodePanel church={church} />

      {/* ── Pending requests ── */}
      {requests.length > 0 && (
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:C.gold, flexShrink:0 }} />
            <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:0 }}>
              Pending Requests ({requests.length})
            </p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {requests.map(r => (
              <PendingCard key={r.id} conn={r} onAction={handleRequest} loading={reqLoading} />
            ))}
          </div>
        </div>
      )}

      {/* ── Period filter ── */}
      {!isEmpty && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`btn btn-sm ${period===p.value?'btn-primary':'btn-outline'}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {[1,2,3].map(i => (
            <div key={i} className="card" style={{ height:80, background:'rgba(26,58,42,0.04)', animation:'pulse 1.5s ease-in-out infinite' }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="card" style={{ borderLeft:`3px solid ${C.error}`, padding:'0.875rem 1rem' }}>
          <p style={{ fontSize:13, color:C.error, fontWeight:600, margin:0 }}>{error}</p>
          <button onClick={fetchDashboard} style={{ fontSize:12, color:C.mid, background:'none', border:'none', cursor:'pointer', marginTop:4, padding:0 }}>
            Try again
          </button>
        </div>
      )}

      {/* ── Empty state ── */}
      {isEmpty && !loading && !error && (
        <div className="card" style={{ textAlign:'center', padding:'3rem 1.5rem' }}>
          <div style={{ width:52, height:52, borderRadius:14, background:'rgba(26,58,42,0.06)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Link2 size={22} color={C.muted} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:18, fontWeight:700, color:C.forest, margin:'0 0 8px' }}>
            No groups connected yet
          </h2>
          <p style={{ fontSize:13, color:C.muted, margin:'0 0 20px', lineHeight:1.6, maxWidth:280 }}>
            Share your connection code with your sub-group leaders. Once they request to connect, approve them here.
          </p>
          <div style={{ background:C.ivory, borderRadius:12, padding:'1rem', maxWidth:340, margin:'0 auto', textAlign:'left' }}>
            <p style={{ fontSize:12, fontWeight:700, color:C.forest, margin:'0 0 10px' }}>How it works:</p>
            {['Copy your connection code above','Share it with your group leaders via WhatsApp','They enter it in their Settings → Link to Church Dashboard','Approve their request here and start seeing their data'].map((step, i) => (
              <div key={i} style={{ display:'flex', gap:10, marginBottom:8 }}>
                <span style={{ width:20, height:20, borderRadius:'50%', background:C.mid, color:'#fff', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</span>
                <p style={{ fontSize:12, color:C.muted, margin:0, lineHeight:1.5 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Aggregated KPIs ── */}
      {!loading && !error && agg && approvedGroups.length > 0 && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="card">
              <p style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 6px' }}>Connected Groups</p>
              <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:28, fontWeight:800, color:C.forest, margin:'0 0 2px', lineHeight:1 }}>{agg.connectedCount}</p>
            </div>
            <div className="card">
              <p style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 6px' }}>Total Members</p>
              <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:28, fontWeight:800, color:C.forest, margin:'0 0 2px', lineHeight:1 }}>{agg.totalMembers}</p>
            </div>
            <div className="card">
              <p style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 6px' }}>Overall Avg Rate</p>
              <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:28, fontWeight:800, margin:'0 0 2px', lineHeight:1, color:rateColor(agg.overallAvgRate) }}>
                {agg.overallAvgRate != null ? `${agg.overallAvgRate}%` : '—'}
              </p>
            </div>
            <div className="card">
              <p style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 6px' }}>Last Sunday</p>
              {agg.lastSunday ? (
                <>
                  <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:28, fontWeight:800, margin:'0 0 2px', lineHeight:1, color:rateColor(agg.lastSunday.rate) }}>
                    {agg.lastSunday.rate}%
                  </p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>{fmtDate(agg.lastSunday.date)}</p>
                </>
              ) : (
                <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:28, fontWeight:800, color:C.muted, margin:'0 0 2px', lineHeight:1 }}>—</p>
              )}
            </div>
          </div>

          {/* Combined trend chart */}
          {combinedTrend.length >= 2 && (
            <div className="card">
              <h3 className="font-display" style={{ fontSize:15, fontWeight:700, color:C.forest, margin:'0 0 4px' }}>Church Attendance Trend</h3>
              <p style={{ fontSize:12, color:C.muted, margin:'0 0 14px' }}>Combined rate across all groups</p>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={combinedTrend} margin={{ top:4, right:4, bottom:0, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,42,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize:10, fill:C.muted }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:10, fill:C.muted }} tickLine={false} axisLine={false} domain={[0,100]} tickFormatter={v=>`${v}%`} />
                  <Tooltip content={<CTip />} />
                  <Line type="monotone" dataKey="rate" stroke={C.forest} strokeWidth={2.5}
                    dot={{ fill:C.gold, r:3, strokeWidth:0 }} activeDot={{ r:5, fill:C.gold }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* ── Group cards ── */}
      {!loading && approvedGroups.length > 0 && (
        <div>
          <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:16, fontWeight:700, color:C.forest, margin:'0 0 10px' }}>
            Groups ({approvedGroups.length})
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {approvedGroups.map(g => <GroupCard key={g.id} group={g} />)}
          </div>
        </div>
      )}

      {/* ── Disconnected groups (historical) ── */}
      {!loading && disconnectedGroups.length > 0 && (
        <div>
          <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:14, fontWeight:700, color:C.muted, margin:'0 0 8px', display:'flex', alignItems:'center', gap:6 }}>
            <WifiOff size={13} /> Historical ({disconnectedGroups.length})
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {disconnectedGroups.map(g => <GroupCard key={g.id} group={g} />)}
          </div>
        </div>
      )}
    </div>
  )
}
