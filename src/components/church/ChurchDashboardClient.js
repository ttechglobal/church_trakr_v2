'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Users, Check, X,
  Clock, Link2, Copy, RefreshCw, WifiOff
} from 'lucide-react'

const C = {
  forest:'#1a3a2a', mid:'#2d5a42', muted:'#8a9e90',
  gold:'#c9a84c', goldDk:'#a8862e', ivory:'#f7f5f0', ivoryDeep:'#e0dbd0',
  success:'#16a34a', error:'#dc2626', warning:'#d97706',
}

const FILTER_TABS = [
  { label:'This Sunday', value:'sunday' },
  { label:'This Month',  value:'this_month'  },
  { label:'Last Month',  value:'last_month'  },
  { label:'This Year',   value:'this_year'   },
]

function safeDate(raw, opts) {
  if (!raw) return '—'
  const d = typeof raw === 'string' ? new Date(raw.includes('T') ? raw : raw + 'T00:00:00') : new Date(raw)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', opts)
}

function fmt(d) {
  return safeDate(d, { weekday:'long', month:'long', day:'numeric', year:'numeric' })
}

function fmtShort(d) {
  return safeDate(d, { month:'short', day:'numeric' })
}

function fmtMonth(ym) {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  const d = new Date(Number(y), Number(m) - 1)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { month:'long', year:'numeric' })
}

function timeAgo(iso) {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { month:'short', day:'numeric' })
}

// ── Big stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      flex: 1, background: '#fff', borderRadius: 16,
      boxShadow: '0 2px 8px rgba(26,58,42,0.10), 0 0 0 1px rgba(26,58,42,0.07)',
      padding: '18px 10px 14px', textAlign: 'center',
    }}>
      <p style={{
        fontFamily: 'var(--font-playfair,Georgia,serif)',
        fontSize: 40, fontWeight: 800, lineHeight: 1,
        color: color || C.forest, margin: '0 0 6px',
        letterSpacing: '-0.04em',
      }}>
        {value ?? '—'}
      </p>
      <p style={{
        fontSize: 10, fontWeight: 700, color: C.muted, margin: 0,
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        {label}
      </p>
      {sub && (
        <p style={{ fontSize: 10, color: C.muted, margin: '3px 0 0', opacity: 0.65 }}>{sub}</p>
      )}
    </div>
  )
}

// ── Pending request card ───────────────────────────────────────────────────────
function PendingCard({ conn, onAction, loading }) {
  return (
    <div style={{
      background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)',
      borderRadius: 12, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: 'rgba(201,168,76,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Clock size={15} color={C.goldDk} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.forest, margin: '0 0 1px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {conn.subgroupName}
        </p>
        <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>
          Requested {timeAgo(conn.requested_at)}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onAction(conn.id, 'approve')} disabled={loading}
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none',
            background: C.success, color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={14} />
        </button>
        <button onClick={() => onAction(conn.id, 'reject')} disabled={loading}
          style={{ width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'rgba(220,38,38,0.1)', color: C.error, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Group row ─────────────────────────────────────────────────────────────────
function GroupRow({ group, isDisconnected }) {
  const noData = !group.hasData

  return (
    <Link href={`/church-dashboard/group/${group.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 1px 6px rgba(26,58,42,0.08), 0 0 0 1px rgba(26,58,42,0.07)',
        padding: '14px 16px',
        opacity: isDisconnected ? 0.5 : 1,
        transition: 'box-shadow 0.15s',
      }}>
        {/* Top row: name + arrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: noData ? 0 : 12 }}>
          <p style={{
            fontSize: 14, fontWeight: 700, color: C.forest, margin: 0,
            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {group.name}
          </p>
          {isDisconnected && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
              background: 'rgba(220,38,38,0.1)', color: C.error, flexShrink: 0,
            }}>
              Disconnected
            </span>
          )}
          <ChevronRight size={14} color={C.muted} style={{ flexShrink: 0 }} />
        </div>

        {/* No data */}
        {noData && (
          <p style={{ fontSize: 12, color: C.muted, margin: '6px 0 0', fontStyle: 'italic' }}>
            No data submitted for this Sunday
          </p>
        )}

        {/* Stats grid */}
        {!noData && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 8,
          }}>
            {[
              { label: 'Present', value: group.present, color: C.success },
              { label: 'Absent',  value: group.absent,  color: C.error   },
              { label: 'Reached', value: group.reached, color: C.goldDk  },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: C.ivory, borderRadius: 10, padding: '10px 8px', textAlign: 'center',
              }}>
                <p style={{
                  fontFamily: 'var(--font-playfair,Georgia,serif)',
                  fontSize: 22, fontWeight: 800, color, lineHeight: 1, margin: '0 0 3px',
                }}>
                  {value}
                </p>
                <p style={{
                  fontSize: 9, color: C.muted, margin: 0,
                  textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700,
                }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Connection code (bottom panel) ────────────────────────────────────────────
function BottomCodePanel({ code: initialCode }) {
  const [code, setCode]     = useState(initialCode ?? '')
  const [copied, setCopied] = useState(false)
  const [loading, setLoad]  = useState(!initialCode)

  useEffect(() => {
    if (!code) {
      fetch('/api/church/code').then(r => r.json()).then(d => {
        if (d.code) setCode(d.code)
        setLoad(false)
      })
    }
  }, [code])

  async function copy() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      border: '1.5px dashed rgba(26,58,42,0.2)', borderRadius: 14,
      padding: '14px 16px',
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: C.forest, margin: '0 0 4px' }}>
        Add a group
      </p>
      <p style={{ fontSize: 12, color: C.muted, margin: '0 0 10px', lineHeight: 1.5 }}>
        Share your connection code with group leaders to connect them to this dashboard.
      </p>
      {loading ? (
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Loading code…</p>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, background: C.ivory, borderRadius: 8, padding: '8px 12px' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800,
              color: C.forest, margin: 0, letterSpacing: '0.1em' }}>
              {code}
            </p>
          </div>
          <button onClick={copy}
            style={{ width: 38, height: 38, borderRadius: 8, border: '1px solid rgba(26,58,42,0.15)',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: C.forest, flexShrink: 0 }}>
            {copied ? <Check size={15} color={C.success} /> : <Copy size={15} />}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function Skeleton({ h = 60, radius = 12 }) {
  return (
    <div style={{
      height: h, borderRadius: radius,
      background: 'rgba(26,58,42,0.05)',
      animation: 'ct-pulse 1.4s ease-in-out infinite',
    }} />
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ChurchDashboardClient({ church }) {
  const [filter,      setFilter]      = useState('sunday')
  const [sundayIdx,   setSundayIdx]   = useState(0)  // 0 = most recent
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [statsReady,  setStatsReady]  = useState(false)
  const [error,       setError]       = useState('')
  const [requests,    setRequests]    = useState([])
  const [reqLoading,  setReqLoading]  = useState(false)

  const pastSundays = data?.pastSundays ?? []
  const selectedDate = pastSundays[sundayIdx] ?? null

  const getMonthParam = () => {
    const now = new Date()
    if (filter === 'last_month') {
      now.setMonth(now.getMonth() - 1)
    }
    return now.toISOString().slice(0, 7)
  }

  const fetchDashboard = useCallback(async () => {
    setStatsReady(false)
    setError('')

    // Fetch pending requests in parallel — don't block stats
    fetch('/api/church/requests')
      .then(r => r.json())
      .then(d => setRequests((d.connections ?? []).filter(c => c.status === 'pending')))
      .catch(() => {})

    const params = new URLSearchParams()
    if (filter === 'sunday') {
      params.set('view', 'sunday')
      if (selectedDate) params.set('date', selectedDate)
    } else {
      params.set('view', 'month')
      params.set('month', getMonthParam())
    }

    try {
      const res = await fetch(`/api/church/dashboard?${params}`)
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      setData(json)
      setStatsReady(true)
    } catch { setError('Failed to load dashboard') }
    finally { setLoading(false) }
  }, [filter, sundayIdx, selectedDate])

  useEffect(() => {
    if (loading || selectedDate || filter !== 'sunday') fetchDashboard()
  }, []) // initial load

  useEffect(() => {
    if (!loading) fetchDashboard()
  }, [filter, sundayIdx])

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) fetchDashboard() }, 60000)
    return () => clearInterval(id)
  }, [fetchDashboard])

  async function handleRequest(connectionId, action) {
    setReqLoading(true)
    await fetch('/api/church/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connectionId, action }),
    })
    setReqLoading(false)
    fetchDashboard()
  }

  const agg            = data?.aggregated ?? null
  const groups         = data?.groups ?? []
  const approvedGroups = groups.filter(g => g.status === 'approved')
  const disconnGroups  = groups.filter(g => g.status === 'disconnected')
  const noGroups       = !loading && approvedGroups.length === 0 && requests.length === 0

  return (
    <div className="page-content pb-16">
      <style>{`
        @keyframes ct-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 16 }}>
        <h1 className="font-display" style={{
          fontSize: 22, fontWeight: 800, color: C.forest,
          margin: 0, letterSpacing: '-0.02em',
        }}>
          Overview
        </h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '2px 0 0' }}>{church.name}</p>
      </div>

      {/* ── Pending connection requests ── */}
      {requests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.goldDk,
            textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px',
            display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, display: 'inline-block' }} />
            {requests.length} Pending Request{requests.length !== 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {requests.map(r => (
              <PendingCard key={r.id} conn={r} onAction={handleRequest} loading={reqLoading} />
            ))}
          </div>
        </div>
      )}

      {/* ── Filter tabs ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 14,
        background: C.ivoryDeep, borderRadius: 10, padding: 3,
      }}>
        {FILTER_TABS.map(t => (
          <button key={t.value} onClick={() => { setFilter(t.value); setSundayIdx(0) }}
            style={{
              flex: 1, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: filter === t.value ? 700 : 500,
              background: filter === t.value ? '#fff' : 'transparent',
              color: filter === t.value ? C.forest : C.muted,
              boxShadow: filter === t.value ? '0 1px 3px rgba(26,58,42,0.12)' : 'none',
              transition: 'all 0.15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Sunday selector (only in sunday view) ── */}
      {filter === 'sunday' && pastSundays.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 14,
        }}>
          <button
            onClick={() => setSundayIdx(i => Math.min(i + 1, pastSundays.length - 1))}
            disabled={sundayIdx >= pastSundays.length - 1}
            style={{
              width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(26,58,42,0.12)',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: C.forest, flexShrink: 0,
              opacity: sundayIdx >= pastSundays.length - 1 ? 0.3 : 1,
            }}>
            <ChevronLeft size={16} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.forest, margin: 0 }}>
              {selectedDate ? fmt(selectedDate) : '—'}
            </p>
            {sundayIdx === 0 && (
              <p style={{ fontSize: 11, color: C.success, margin: '1px 0 0', fontWeight: 600 }}>
                Most recent
              </p>
            )}
          </div>
          <button
            onClick={() => setSundayIdx(i => Math.max(i - 1, 0))}
            disabled={sundayIdx === 0}
            style={{
              width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(26,58,42,0.12)',
              background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: C.forest, flexShrink: 0,
              opacity: sundayIdx === 0 ? 0.3 : 1,
            }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Month label (non-sunday views) ── */}
      {filter !== 'sunday' && (
        <p style={{ fontSize: 13, fontWeight: 700, color: C.forest, margin: '0 0 14px' }}>
          {filter === 'this_month' ? fmtMonth(new Date().toISOString().slice(0,7))
           : filter === 'last_month' ? fmtMonth(getMonthParam())
           : new Date().getFullYear() + ' — Full Year'}
        </p>
      )}

      {/* ── Stat cards (load first) ── */}
      {loading && !statsReady ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <Skeleton h={88} />
          <Skeleton h={88} />
          <Skeleton h={88} />
        </div>
      ) : error ? (
        <div className="card" style={{ borderLeft: `3px solid ${C.error}`, padding: '0.875rem' }}>
          <p style={{ fontSize: 13, color: C.error, fontWeight: 600, margin: '0 0 4px' }}>{error}</p>
          <button onClick={fetchDashboard}
            style={{ fontSize: 12, color: C.mid, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Try again
          </button>
        </div>
      ) : agg && approvedGroups.length > 0 ? (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <StatCard label="Present" value={agg.totalPresent} color={C.success} />
            <StatCard label="Absent"  value={agg.totalAbsent}  color={C.error}   />
            <StatCard label="Reached" value={agg.totalReached} color={C.goldDk}  />
          </div>
          <p style={{ fontSize: 12, color: C.muted, margin: '0 0 14px', textAlign: 'center' }}>
            {agg.reportedCount} of {agg.approvedCount} group{agg.approvedCount !== 1 ? 's' : ''} reported
            {agg.trendText && (
              <span style={{ marginLeft: 8, color: agg.trendText.startsWith('↑') ? C.success : agg.trendText.startsWith('↓') ? C.error : C.muted }}>
                · {agg.trendText}
              </span>
            )}
          </p>
        </>
      ) : null}

      {/* ── Empty state ── */}
      {noGroups && !error && (
        <div style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 1px 4px rgba(26,58,42,0.08), 0 0 0 1px rgba(26,58,42,0.06)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(26,58,42,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Link2 size={22} color={C.muted} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-playfair,Georgia,serif)', fontSize: 17,
            fontWeight: 700, color: C.forest, margin: '0 0 6px' }}>
            No groups connected yet
          </h2>
          <p style={{ fontSize: 13, color: C.muted, margin: '0 0 18px', lineHeight: 1.6 }}>
            Share your connection code with group leaders to get started.
          </p>
          <BottomCodePanel code={data?.connectionCode ?? church.connection_code} />
        </div>
      )}

      {/* ── Group rows ── */}
      {!loading && approvedGroups.length > 0 && (
        <div>
          <p style={{
            fontSize: 11, fontWeight: 700, color: C.muted,
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px',
          }}>
            Connected Groups
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {approvedGroups.map(g => <GroupRow key={g.id} group={g} isDisconnected={false} />)}
          </div>
        </div>
      )}

      {/* ── Disconnected (historical) ── */}
      {!loading && disconnGroups.length > 0 && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.muted,
            textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px',
            display: 'flex', alignItems: 'center', gap: 5 }}>
            <WifiOff size={11} /> Historical
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {disconnGroups.map(g => <GroupRow key={g.id} group={g} isDisconnected={true} />)}
          </div>
        </div>
      )}

      {/* ── Connection code (bottom) ── */}
      {!noGroups && !loading && (
        <div style={{ marginTop: 8 }}>
          <BottomCodePanel code={data?.connectionCode ?? church.connection_code} />
        </div>
      )}
    </div>
  )
}
