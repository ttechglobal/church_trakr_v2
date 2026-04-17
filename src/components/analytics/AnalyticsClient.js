'use client'

import { useState, useMemo } from 'react'
import { fmtDate, fmtMonthYear, attendanceRate } from '@/lib/utils'

export default function AnalyticsClient({ church, groups, sessions, members }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year,  setYear]  = useState(now.getFullYear())

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const next = new Date(year, month + 1)
    if (next <= now) {
      if (month === 11) { setMonth(0); setYear(y => y + 1) }
      else setMonth(m => m + 1)
    }
  }
  const isNow = month === now.getMonth() && year === now.getFullYear()

  const monthSessions = useMemo(() => sessions.filter(s => {
    const d = new Date(s.date)
    return d.getMonth() === month && d.getFullYear() === year
  }), [sessions, month, year])

  const prevMonthSessions = useMemo(() => {
    const pm = month === 0 ? 11 : month - 1
    const py = month === 0 ? year - 1 : year
    return sessions.filter(s => {
      const d = new Date(s.date)
      return d.getMonth() === pm && d.getFullYear() === py
    })
  }, [sessions, month, year])

  const overallRate = useMemo(() => {
    const recs = monthSessions.flatMap(s => s.attendance_records ?? [])
    if (!recs.length) return null
    return attendanceRate(recs.filter(r => r.present).length, recs.length)
  }, [monthSessions])

  const prevRate = useMemo(() => {
    const recs = prevMonthSessions.flatMap(s => s.attendance_records ?? [])
    if (!recs.length) return null
    return attendanceRate(recs.filter(r => r.present).length, recs.length)
  }, [prevMonthSessions])

  const trend = overallRate !== null && prevRate !== null ? overallRate - prevRate : null

  const groupStats = useMemo(() => groups.map(g => {
    const gs   = monthSessions.filter(s => s.group_id === g.id)
    const recs = gs.flatMap(s => s.attendance_records ?? [])
    const rate = recs.length ? attendanceRate(recs.filter(r => r.present).length, recs.length) : null
    return { ...g, rate, sessions: gs.length, present: recs.filter(r => r.present).length, total: recs.length }
  }).filter(g => g.rate !== null).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0)), [groups, monthSessions])

  const weeklyBreakdown = useMemo(() => {
    const byDate = {}
    for (const s of monthSessions) {
      if (!byDate[s.date]) byDate[s.date] = { date: s.date, present: 0, total: 0 }
      const recs = s.attendance_records ?? []
      byDate[s.date].present += recs.filter(r => r.present).length
      byDate[s.date].total   += recs.length
    }
    return Object.values(byDate)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((w, i) => ({ ...w, rate: attendanceRate(w.present, w.total), ordinal: ['1st','2nd','3rd','4th','5th'][i] + ' Sunday' }))
  }, [monthSessions])

  const memberInsights = useMemo(() => {
    const absent = {}, present = {}
    for (const s of monthSessions) {
      for (const r of (s.attendance_records ?? [])) {
        if (!r.present) absent[r.name]  = (absent[r.name]  ?? 0) + 1
        else            present[r.name] = (present[r.name] ?? 0) + 1
      }
    }
    const sundays = new Set(monthSessions.map(s => s.date)).size
    return {
      frequentAbsent:   Object.entries(absent).filter(([,c]) => c >= 2).sort(([,a],[,b]) => b-a).slice(0,8).map(([name,count]) => ({ name, count })),
      perfectAttendance: Object.entries(present).filter(([name,c]) => c >= sundays && sundays > 0 && !absent[name]).map(([name]) => ({ name })).slice(0,8),
    }
  }, [monthSessions])

  const displayDate = new Date(year, month, 1)

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
            Analytics
          </h1>
          <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>Attendance insights and trends</p>
        </div>
        {/* Month selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '4px', boxShadow: 'var(--shadow-sm)' }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth} style={{ padding: '0 8px', minHeight: 34 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', minWidth: 120, textAlign: 'center', letterSpacing: '-0.01em' }}>
            {fmtMonthYear(displayDate)}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth} disabled={isNow} style={{ padding: '0 8px', minHeight: 34, opacity: isNow ? 0.3 : 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {monthSessions.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">📊</div>
          <h3>No data for {fmtMonthYear(displayDate)}</h3>
          <p>Take attendance to see analytics here</p>
          <a href="/attendance" className="btn btn-primary">Take attendance</a>
        </div>
      ) : (
        <>
          {/* Overview cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
            {[
              { label: 'Avg Rate', value: overallRate !== null ? `${overallRate}%` : '—', color: overallRate >= 75 ? '#16a34a' : overallRate >= 50 ? '#d97706' : '#dc2626', icon: '📊' },
              { label: 'Sessions',  value: monthSessions.length, color: '#1a3a2a', icon: '📅' },
              { label: 'vs Last Month', value: trend !== null ? `${trend > 0 ? '+' : ''}${trend}%` : '—', color: trend > 0 ? '#16a34a' : trend < 0 ? '#dc2626' : '#d97706', icon: trend > 0 ? '📈' : trend < 0 ? '📉' : '➡️' },
            ].map(s => (
              <div key={s.label} className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{s.icon}</div>
                <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 26, fontWeight: 800, color: s.color, margin: '0 0 4px', letterSpacing: '-0.03em' }}>
                  {s.value}
                </p>
                <p style={{ fontSize: 12, color: '#8a9e90', margin: 0, fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Ring + bar chart grid */}
          {groupStats.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
                By Group
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                {groupStats.map(g => {
                  const rColor = g.rate >= 75 ? '#16a34a' : g.rate >= 50 ? '#d97706' : '#dc2626'
                  return (
                    <div key={g.id} className="card" style={{ textAlign: 'center', padding: '1.25rem 0.875rem' }}>
                      <RateRing rate={g.rate ?? 0} size={72} color={rColor} />
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: '10px 0 2px', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {g.name}
                      </p>
                      <p style={{ fontSize: 12, color: '#8a9e90', margin: 0 }}>{g.present}/{g.total}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Horizontal bar comparison */}
          {groupStats.length > 1 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
                Comparison
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {groupStats.map(g => {
                  const rColor = g.rate >= 75 ? '#16a34a' : g.rate >= 50 ? '#d97706' : '#dc2626'
                  return (
                    <div key={g.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{g.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: rColor }}>{g.rate}%</span>
                      </div>
                      <div className="progress-wrap">
                        <div className="progress-bar" style={{ width: `${g.rate}%`, background: rColor }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Weekly table */}
          {weeklyBreakdown.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
                Weekly Breakdown
              </h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Present</th>
                      <th style={{ textAlign: 'right' }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyBreakdown.map(w => {
                      const rColor = w.rate >= 75 ? '#16a34a' : w.rate >= 50 ? '#d97706' : '#dc2626'
                      return (
                        <tr key={w.date}>
                          <td style={{ fontWeight: 600 }}>{w.ordinal} · <span style={{ fontWeight: 400, color: '#8a9e90' }}>{fmtDate(w.date)}</span></td>
                          <td style={{ textAlign: 'right', color: '#8a9e90' }}>{w.present}/{w.total}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800, color: rColor }}>{w.rate}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Member insights */}
          {(memberInsights.frequentAbsent.length > 0 || memberInsights.perfectAttendance.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {memberInsights.perfectAttendance.length > 0 && (
                <div className="card">
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#15803d', marginBottom: 10 }}>⭐ Perfect attendance</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {memberInsights.perfectAttendance.map(m => (
                      <span key={m.name} className="badge badge-green">{m.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {memberInsights.frequentAbsent.length > 0 && (
                <div className="card">
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>⚠️ Absent 2+ times</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {memberInsights.frequentAbsent.map(m => (
                      <span key={m.name} className="badge badge-red">{m.name} ×{m.count}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div style={{ height: 32 }} />
    </div>
  )
}

function RateRing({ rate, size = 80, color }) {
  const r      = size * 0.38
  const circ   = 2 * Math.PI * r
  const offset = circ - (rate / 100) * circ
  const c      = color || (rate >= 75 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626')
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ede9e0" strokeWidth={size*0.1}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c}
          strokeWidth={size*0.1} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}/>
      </svg>
      <span style={{ position: 'absolute', fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 800, fontSize: size*0.22, color: c, lineHeight: 1, letterSpacing: '-0.03em' }}>
        {rate}%
      </span>
    </div>
  )
}