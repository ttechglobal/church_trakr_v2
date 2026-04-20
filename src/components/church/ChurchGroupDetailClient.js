'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, Users, Calendar, TrendingUp, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
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
  { label:'All Time',      value:'all' },
]

function rateColor(r) {
  if (r == null) return C.muted
  return r >= 75 ? C.success : r >= 50 ? C.warning : C.error
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d+'T00:00:00').toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })
}

function CTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#fff', border:'1px solid rgba(26,58,42,0.12)', borderRadius:10, padding:'8px 12px', fontSize:12 }}>
      <p style={{ color:C.muted, marginBottom:3, fontSize:11 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color:p.color||C.forest, fontWeight:700, margin:'2px 0' }}>{p.value}{p.name==='rate'?'%':''}</p>
      ))}
    </div>
  )
}

function periodStart(p) {
  const now = new Date()
  if (p === '1m') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)
  if (p === '3m') return new Date(now.getFullYear(), now.getMonth()-2, 1).toISOString().slice(0,10)
  if (p === '6m') return new Date(now.getFullYear(), now.getMonth()-5, 1).toISOString().slice(0,10)
  return null
}

export default function ChurchGroupDetailClient({ church, subgroup, connection, sessions, memberCount }) {
  const [period, setPeriod] = useState('1m')
  const [expanded, setExpanded] = useState(null)
  const isDisconnected = connection.status === 'disconnected'

  // Filter sessions to period
  const filteredSessions = useMemo(() => {
    const start = periodStart(period)
    if (!start) return sessions
    return sessions.filter(s => s.date >= start)
  }, [sessions, period])

  // Attendance trend
  const trend = useMemo(() => {
    const byDate = {}
    for (const s of filteredSessions) {
      if (!byDate[s.date]) byDate[s.date] = { present:0, total:0 }
      for (const r of (s.attendance_records ?? [])) {
        if (!r.member_id) continue
        byDate[s.date].total++
        if (r.present) byDate[s.date].present++
      }
    }
    return Object.entries(byDate)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([date, { present, total }]) => ({
        date,
        label: new Date(date+'T00:00:00').toLocaleDateString(undefined, {month:'short',day:'numeric'}),
        present, total,
        rate: total > 0 ? Math.round((present/total)*100) : 0,
        absent: total - present,
      }))
  }, [filteredSessions])

  const avgRate = trend.length > 0
    ? Math.round(trend.reduce((s,d) => s+d.rate, 0) / trend.length)
    : null
  const bestSession  = trend.reduce((b,d) => (!b||d.rate>b.rate)?d:b, null)
  const worstSession = trend.reduce((w,d) => (!w||d.rate<w.rate)?d:w, null)
  const lastSession  = trend[trend.length - 1] ?? null

  // Build session list for the attendance history table
  const sessionHistory = useMemo(() => {
    return filteredSessions.map(s => {
      const recs = (s.attendance_records ?? []).filter(r => r.member_id)
      const present = recs.filter(r => r.present)
      const absent  = recs.filter(r => !r.present)
      const total   = recs.length
      return {
        id:      s.id,
        date:    s.date,
        present: present.length,
        absent:  absent.length,
        total,
        rate:    total > 0 ? Math.round((present.length/total)*100) : 0,
        presentNames: present.map(r => r.name).filter(Boolean),
        absentNames:  absent.map(r => r.name).filter(Boolean),
      }
    }).sort((a,b) => b.date.localeCompare(a.date))
  }, [filteredSessions])

  return (
    <div className="page-content pb-16">

      {/* Back */}
      <Link href="/church-dashboard"
        style={{ display:'inline-flex', alignItems:'center', gap:4, color:C.muted, textDecoration:'none', fontSize:13, marginBottom:12 }}>
        <ChevronLeft size={14} /> All Groups
      </Link>

      {/* Header */}
      <div style={{ marginBottom:4 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <h1 className="font-display" style={{ fontSize:20, fontWeight:800, color:C.forest, margin:0 }}>
            {subgroup.name}
          </h1>
          {isDisconnected && (
            <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6, background:'rgba(220,38,38,0.1)', color:C.error }}>
              Disconnected
            </span>
          )}
        </div>
        <p style={{ fontSize:12, color:C.muted, margin:'3px 0 0' }}>
          {subgroup.admin_name} · {memberCount} active members
          {connection.connected_at && ` · Connected ${fmtDate(connection.connected_at)}`}
        </p>
      </div>

      {/* Period filter */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {PERIODS.map(p => (
          <button key={p.value} onClick={() => setPeriod(p.value)}
            className={`btn btn-sm ${period===p.value?'btn-primary':'btn-outline'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* No data state */}
      {trend.length === 0 && (
        <div className="card" style={{ textAlign:'center', padding:'3rem 1rem' }}>
          <Calendar size={36} color={C.muted} style={{ margin:'0 auto 12px', display:'block' }} strokeWidth={1.25} />
          <p style={{ fontSize:15, fontWeight:700, color:C.forest, margin:'0 0 6px' }}>No sessions in this period</p>
          <p style={{ fontSize:13, color:C.muted, margin:0 }}>Try selecting a wider date range.</p>
        </div>
      )}

      {/* KPI row */}
      {trend.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
          {[
            { label:'Avg Rate',   value:avgRate!=null?`${avgRate}%`:'—', color:rateColor(avgRate) },
            { label:'Last Sun',   value:lastSession?`${lastSession.rate}%`:'—', color:rateColor(lastSession?.rate??null) },
            { label:'Sessions',   value:trend.length, color:C.forest },
          ].map(({ label, value, color }) => (
            <div key={label} className="card" style={{ textAlign:'center', padding:'0.875rem 0.5rem' }}>
              <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:22, fontWeight:800, color, margin:'0 0 3px', lineHeight:1 }}>{value}</p>
              <p style={{ fontSize:10, color:C.muted, margin:0, textTransform:'uppercase', letterSpacing:'0.04em', fontWeight:600 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Best/Worst */}
      {bestSession && worstSession && bestSession.date !== worstSession.date && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div className="card" style={{ borderLeft:`3px solid ${C.success}` }}>
            <p style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 4px' }}>Best</p>
            <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:20, fontWeight:800, color:C.success, margin:'0 0 2px', lineHeight:1 }}>{bestSession.rate}%</p>
            <p style={{ fontSize:11, color:C.muted, margin:0 }}>{fmtDate(bestSession.date)}</p>
          </div>
          <div className="card" style={{ borderLeft:`3px solid ${C.error}` }}>
            <p style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 4px' }}>Lowest</p>
            <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:20, fontWeight:800, color:C.error, margin:'0 0 2px', lineHeight:1 }}>{worstSession.rate}%</p>
            <p style={{ fontSize:11, color:C.muted, margin:0 }}>{fmtDate(worstSession.date)}</p>
          </div>
        </div>
      )}

      {/* Trend chart */}
      {trend.length >= 2 && (
        <div className="card">
          <h3 className="font-display" style={{ fontSize:14, fontWeight:700, color:C.forest, margin:'0 0 4px' }}>Attendance Rate</h3>
          <p style={{ fontSize:11, color:C.muted, margin:'0 0 12px' }}>% of members present each Sunday</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trend} margin={{ top:4, right:4, bottom:0, left:-20 }}>
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

      {/* Headcount bar chart */}
      {trend.length >= 2 && (
        <div className="card">
          <h3 className="font-display" style={{ fontSize:14, fontWeight:700, color:C.forest, margin:'0 0 4px' }}>Weekly Headcount</h3>
          <p style={{ fontSize:11, color:C.muted, margin:'0 0 12px' }}>Members present each Sunday</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trend} margin={{ top:4, right:4, bottom:0, left:-20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,58,42,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize:10, fill:C.muted }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize:10, fill:C.muted }} tickLine={false} axisLine={false} />
              <Tooltip content={<CTip />} />
              <Bar dataKey="present" name="present" radius={[4,4,0,0]}>
                {trend.map((e,i) => <Cell key={i} fill={e.rate>=70?C.forest:e.rate>=50?C.gold:C.error} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Attendance history */}
      {sessionHistory.length > 0 && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'1rem 1rem 0.75rem', borderBottom:'1px solid rgba(26,58,42,0.06)' }}>
            <h3 className="font-display" style={{ fontSize:14, fontWeight:700, color:C.forest, margin:0 }}>
              Attendance History ({sessionHistory.length})
            </h3>
          </div>
          <div>
            {sessionHistory.map((s, i) => (
              <div key={s.id}>
                <button
                  onClick={() => setExpanded(expanded === s.id ? null : s.id)}
                  style={{
                    width:'100%', display:'flex', alignItems:'center', gap:12,
                    padding:'0.875rem 1rem',
                    borderBottom: i < sessionHistory.length - 1 || expanded === s.id ? '1px solid rgba(26,58,42,0.06)' : 'none',
                    background: expanded === s.id ? 'rgba(26,58,42,0.02)' : 'transparent',
                    border:'none', cursor:'pointer', textAlign:'left',
                  }}
                >
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:'0 0 2px' }}>{fmtDate(s.date)}</p>
                    <p style={{ fontSize:11, color:C.muted, margin:0 }}>
                      {s.present} present · {s.absent} absent · {s.total} total
                    </p>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:15, fontWeight:800, color:rateColor(s.rate), fontFamily:'var(--font-playfair,Georgia,serif)' }}>
                      {s.rate}%
                    </span>
                    {expanded === s.id
                      ? <ChevronUp size={14} color={C.muted} />
                      : <ChevronDown size={14} color={C.muted} />
                    }
                  </div>
                </button>

                {/* Expanded member list */}
                {expanded === s.id && (
                  <div style={{ padding:'0.75rem 1rem', background:'rgba(26,58,42,0.015)', borderBottom: i < sessionHistory.length-1 ? '1px solid rgba(26,58,42,0.06)' : 'none' }}>
                    {s.presentNames.length > 0 && (
                      <div style={{ marginBottom: s.absentNames.length > 0 ? 10 : 0 }}>
                        <p style={{ fontSize:10, color:C.success, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 6px', display:'flex', alignItems:'center', gap:4 }}>
                          <CheckCircle size={11} /> Present ({s.presentNames.length})
                        </p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {s.presentNames.map(n => (
                            <span key={n} style={{ fontSize:12, padding:'3px 9px', borderRadius:99, background:'rgba(22,163,74,0.08)', color:C.success, fontWeight:500 }}>{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {s.absentNames.length > 0 && (
                      <div>
                        <p style={{ fontSize:10, color:C.error, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', margin:'0 0 6px', display:'flex', alignItems:'center', gap:4 }}>
                          <AlertTriangle size={11} /> Absent ({s.absentNames.length})
                        </p>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {s.absentNames.map(n => (
                            <span key={n} style={{ fontSize:12, padding:'3px 9px', borderRadius:99, background:'rgba(220,38,38,0.07)', color:C.error, fontWeight:500 }}>{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
