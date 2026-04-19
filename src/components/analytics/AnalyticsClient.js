'use client'

import BackButton from '@/components/ui/BackButton'
import { useState, useMemo } from 'react'
import { fmtDate, attendanceRate, fmtMonthYear } from '@/lib/utils'

export default function AnalyticsClient({ church, groups, sessions, members }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())   // 0-based
  const [year, setYear] = useState(now.getFullYear())

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    const d = new Date(year, month + 1)
    if (d <= now) {
      if (month === 11) { setMonth(0); setYear(y => y + 1) }
      else setMonth(m => m + 1)
    }
  }
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear()

  // Filter sessions for selected month
  const monthSessions = useMemo(() =>
    sessions.filter(s => {
      const d = new Date(s.date)
      return d.getMonth() === month && d.getFullYear() === year
    }), [sessions, month, year])

  // Filter sessions for previous month
  const prevMonthSessions = useMemo(() => {
    const pm = month === 0 ? 11 : month - 1
    const py = month === 0 ? year - 1 : year
    return sessions.filter(s => {
      const d = new Date(s.date)
      return d.getMonth() === pm && d.getFullYear() === py
    })
  }, [sessions, month, year])

  // Overall rate this month
  const overallRate = useMemo(() => {
    const allRecords = monthSessions.flatMap(s => s.attendance_records ?? [])
    if (!allRecords.length) return null
    const present = allRecords.filter(r => r.present).length
    return attendanceRate(present, allRecords.length)
  }, [monthSessions])

  const prevOverallRate = useMemo(() => {
    const allRecords = prevMonthSessions.flatMap(s => s.attendance_records ?? [])
    if (!allRecords.length) return null
    const present = allRecords.filter(r => r.present).length
    return attendanceRate(present, allRecords.length)
  }, [prevMonthSessions])

  // Per-group stats
  const groupStats = useMemo(() => {
    return groups.map(g => {
      const gs = monthSessions.filter(s => s.group_id === g.id)
      const allRecords = gs.flatMap(s => s.attendance_records ?? [])
      const present = allRecords.filter(r => r.present).length
      const rate = allRecords.length ? attendanceRate(present, allRecords.length) : null

      const prevGs = prevMonthSessions.filter(s => s.group_id === g.id)
      const prevRecords = prevGs.flatMap(s => s.attendance_records ?? [])
      const prevPresent = prevRecords.filter(r => r.present).length
      const prevRate = prevRecords.length ? attendanceRate(prevPresent, prevRecords.length) : null

      return { ...g, rate, prevRate, sessions: gs.length, present, total: allRecords.length }
    }).filter(g => g.rate !== null).sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))
  }, [groups, monthSessions, prevMonthSessions])

  // Weekly breakdown (sessions in month, grouped by date)
  const weeklyBreakdown = useMemo(() => {
    const byDate = {}
    for (const s of monthSessions) {
      if (!byDate[s.date]) byDate[s.date] = { date: s.date, present: 0, total: 0 }
      const records = s.attendance_records ?? []
      byDate[s.date].present += records.filter(r => r.present).length
      byDate[s.date].total += records.length
    }
    return Object.values(byDate).sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((w, i) => ({ ...w, ordinal: ordinalWeek(i + 1), rate: attendanceRate(w.present, w.total) }))
  }, [monthSessions])

  // Member-level insights: absent members (appear in absent records 2+ times this month)
  const memberInsights = useMemo(() => {
    const absentCount = {}
    const presentCount = {}
    for (const s of monthSessions) {
      for (const r of (s.attendance_records ?? [])) {
        if (!r.present) absentCount[r.name] = (absentCount[r.name] ?? 0) + 1
        else presentCount[r.name] = (presentCount[r.name] ?? 0) + 1
      }
    }
    const sessionCount = new Set(monthSessions.map(s => s.date)).size

    const frequentAbsentees = Object.entries(absentCount)
      .filter(([, c]) => c >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }))

    const perfectAttendance = Object.entries(presentCount)
      .filter(([name, count]) => count >= sessionCount && sessionCount > 0 && !absentCount[name])
      .map(([name]) => ({ name }))
      .slice(0, 8)

    return { frequentAbsentees, perfectAttendance }
  }, [monthSessions])

  // Trend
  const trend = overallRate !== null && prevOverallRate !== null
    ? overallRate - prevOverallRate
    : null

  const displayDate = new Date(year, month, 1)

  return (
    <div className="page-content">
      {/* Header + month selector */}
      <div className="flex items-center justify-between mb-2">
        <BackButton />
        <h1 className="font-display text-2xl font-semibold text-forest">Analytics</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn btn-ghost btn-sm px-2"><ChevronLeft /></button>
          <span className="text-sm font-medium text-forest min-w-[110px] text-center">
            {fmtMonthYear(displayDate)}
          </span>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="btn btn-ghost btn-sm px-2 disabled:opacity-30">
            <ChevronRight />
          </button>
        </div>
      </div>

      {monthSessions.length === 0 ? (
        <div className="empty-state card mt-4">
          <p className="text-3xl">📊</p>
          <p className="font-semibold text-forest">No data for {fmtMonthYear(displayDate)}</p>
          <p className="text-sm text-mist">Take attendance to see analytics here.</p>
        </div>
      ) : (
        <>
          {/* Overall ring + trend */}
          <div className="card flex items-center gap-6 py-6 justify-center">
            <RateRing rate={overallRate ?? 0} size={110} label="Overall" />
            <div className="text-center">
              <p className="text-sm text-mist">vs last month</p>
              {trend !== null ? (
                <p className={`font-display text-2xl font-bold mt-1 ${trend > 0 ? 'text-success' : trend < 0 ? 'text-error' : 'text-warning'}`}>
                  {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
                </p>
              ) : <p className="text-mist text-sm mt-1">No prior data</p>}
              <p className="text-xs text-mist mt-1">{monthSessions.length} session{monthSessions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Per-group rings */}
          {groupStats.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-forest-muted uppercase tracking-wider mb-3">By group</h2>
              <div className="grid grid-cols-2 gap-3">
                {groupStats.map(g => (
                  <div key={g.id} className="card flex flex-col items-center py-4 gap-2">
                    <RateRing rate={g.rate ?? 0} size={72} />
                    <p className="text-[13px] font-semibold text-forest text-center truncate w-full text-center px-2">
                      {g.name}
                    </p>
                    <p className="text-xs text-mist">{g.present}/{g.total}</p>
                    {g.prevRate !== null && (
                      <p className={`text-xs font-medium ${g.rate > g.prevRate ? 'text-success' : g.rate < g.prevRate ? 'text-error' : 'text-warning'}`}>
                        {g.rate > g.prevRate ? '↑' : g.rate < g.prevRate ? '↓' : '→'} {Math.abs(g.rate - g.prevRate)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Horizontal bar chart */}
          {groupStats.length > 1 && (
            <div>
              <h2 className="text-sm font-semibold text-forest-muted uppercase tracking-wider mb-3">Comparison</h2>
              <div className="card space-y-3">
                {groupStats.map(g => (
                  <div key={g.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-forest truncate">{g.name}</span>
                      <span className="font-semibold text-forest ml-2 shrink-0">{g.rate}%</span>
                    </div>
                    <div className="h-2 bg-ivory-deeper rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${g.rate}%`,
                          background: g.rate >= 75 ? '#16a34a' : g.rate >= 50 ? '#d97706' : '#dc2626'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly breakdown table */}
          {weeklyBreakdown.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-forest-muted uppercase tracking-wider mb-3">Weekly breakdown</h2>
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-mist">Date</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-mist">Present</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-mist">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyBreakdown.map((w, i) => (
                      <tr key={w.date} style={{ borderBottom: i < weeklyBreakdown.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td className="px-4 py-2.5 text-forest font-medium">{w.ordinal} · {fmtDate(w.date)}</td>
                        <td className="px-4 py-2.5 text-right text-mist">{w.present}/{w.total}</td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${w.rate >= 75 ? 'text-success' : w.rate >= 50 ? 'text-warning' : 'text-error'}`}>
                          {w.rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Member insights */}
          {(memberInsights.frequentAbsentees.length > 0 || memberInsights.perfectAttendance.length > 0) && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-forest-muted uppercase tracking-wider">Member insights</h2>

              {memberInsights.perfectAttendance.length > 0 && (
                <div className="card">
                  <p className="text-sm font-semibold text-success mb-3">⭐ Perfect attendance</p>
                  <div className="flex flex-wrap gap-2">
                    {memberInsights.perfectAttendance.map(m => (
                      <span key={m.name} className="badge-green">{m.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {memberInsights.frequentAbsentees.length > 0 && (
                <div className="card">
                  <p className="text-sm font-semibold text-error mb-3">⚠️ Absent 2+ times</p>
                  <div className="flex flex-wrap gap-2">
                    {memberInsights.frequentAbsentees.map(m => (
                      <span key={m.name} className="badge-red">{m.name} ({m.count}×)</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <div className="h-6" />
    </div>
  )
}

// ─── Rate Ring ─────────────────────────────────────────────────────────────────
function RateRing({ rate, size = 80, label }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ - (rate / 100) * circ
  const color = rate >= 75 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'
  return (
    <div className="relative inline-flex items-center justify-center flex-col" style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e0dbd0" strokeWidth={size * 0.09} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
          strokeWidth={size * 0.09} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-bold" style={{ fontSize: size * 0.21, color, lineHeight: 1 }}>
          {rate}%
        </span>
      </div>
      {label && <p className="text-xs text-mist mt-1 text-center">{label}</p>}
    </div>
  )
}

function ordinalWeek(n) {
  const s = ['', '1st', '2nd', '3rd', '4th', '5th']
  return (s[n] ?? `${n}th`) + ' Sunday'
}

function ChevronLeft() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> }
function ChevronRight() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg> }
