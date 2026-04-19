'use client'

import BackButton from '@/components/ui/BackButton'
import { useState, useRef, useCallback, useMemo } from 'react'
import { fmtDate, fmtMonthYear, attendanceRate } from '@/lib/utils'

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

export default function ReportClient({ church, groups, sessions, members }) {
  const [reportType, setReportType] = useState('sunday') // 'sunday' | 'monthly'

  // Sunday report state
  const [selectedSession, setSelectedSession] = useState(null)

  // Monthly report state
  const now = new Date()
  const [reportMonth, setReportMonth] = useState(now.getMonth())
  const [reportYear, setReportYear] = useState(now.getFullYear())

  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const reportRef = useRef(null)
  const canvasRef = useRef(null)

  // Unique dates with data
  const sessionDates = useMemo(() => {
    const seen = new Set()
    return sessions.filter(s => { if (seen.has(s.date)) return false; seen.add(s.date); return true })
      .map(s => s.date).slice(0, 20)
  }, [sessions])

  // Monthly sessions
  const monthlySessions = useMemo(() =>
    sessions.filter(s => {
      const d = new Date(s.date)
      return d.getMonth() === reportMonth && d.getFullYear() === reportYear
    }), [sessions, reportMonth, reportYear])

  async function handleGenerate() {
    setGenerating(true)
    setGenerated(false)
    // Small delay to let DOM render the off-screen report
    await new Promise(r => setTimeout(r, 100))
    try {
      const html2canvas = (await import('html2canvas')).default
      const el = reportRef.current
      if (!el) return
      el.style.visibility = 'visible'
      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#f7f5f0',
        width: 800,
        logging: false,
      })
      el.style.visibility = 'hidden'
      // Draw onto preview canvas
      const preview = canvasRef.current
      if (preview) {
        preview.width = canvas.width
        preview.height = canvas.height
        const ctx = preview.getContext('2d')
        ctx.drawImage(canvas, 0, 0)
      }
      setGenerated(true)
    } catch (err) {
      console.error('Report generation failed', err)
      alert('Report generation failed: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  function handleDownloadJPEG() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `churchtrakr-report-${Date.now()}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.95)
    link.click()
  }

  async function handleDownloadPDF() {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const { jsPDF } = await import('jspdf')
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 3, canvas.height / 3] })
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width / 3, canvas.height / 3)
      pdf.save(`churchtrakr-report-${Date.now()}.pdf`)
    } catch {
      // jsPDF not installed — download as JPEG instead
      handleDownloadJPEG()
    }
  }

  // Compute report data
  const sundayData = useMemo(() => {
    if (!selectedSession) return null
    const daysSessions = sessions.filter(s => s.date === selectedSession)
    const allRecords = daysSessions.flatMap(s => s.attendance_records ?? [])
    const present = allRecords.filter(r => r.present).length
    const absent = allRecords.filter(r => !r.present).length
    const total = allRecords.length
    const rate = attendanceRate(present, total)

    // Follow-up stats
    const followUp = church.follow_up_data ?? {}
    const attendeeFu = church.attendee_followup_data ?? {}
    const absentKeys = daysSessions.flatMap(s =>
      (s.attendance_records ?? []).filter(r => !r.present).map(r => `${s.id}_${r.member_id}`)
    )
    const attendeeKeys = daysSessions.flatMap(s =>
      (s.attendance_records ?? []).filter(r => r.present).map(r => `att_${s.id}_${r.member_id}`)
    )
    const absenteesReached = absentKeys.filter(k => followUp[k]?.reached).length
    const attendeesThanked = attendeeKeys.filter(k => attendeeFu[k]?.messaged).length

    // Per-group breakdown
    const groupBreakdown = daysSessions.map(s => {
      const g = groups.find(g => g.id === s.group_id)
      const recs = s.attendance_records ?? []
      const gPresent = recs.filter(r => r.present).length
      return { name: g?.name ?? 'Unknown', present: gPresent, total: recs.length, rate: attendanceRate(gPresent, recs.length) }
    })

    return {
      date: selectedSession,
      present, absent, total, rate,
      absenteesReached, totalAbsent: absent,
      attendeesThanked, totalAttendees: present,
      groupBreakdown,
    }
  }, [selectedSession, sessions, groups, church])

  const monthlyData = useMemo(() => {
    if (!monthlySessions.length) return null
    const byDate = {}
    for (const s of monthlySessions) {
      if (!byDate[s.date]) byDate[s.date] = { date: s.date, present: 0, total: 0 }
      const recs = s.attendance_records ?? []
      byDate[s.date].present += recs.filter(r => r.present).length
      byDate[s.date].total += recs.length
    }
    const sundays = Object.values(byDate).sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((w, i) => ({ ...w, rate: attendanceRate(w.present, w.total), ordinal: ['1st','2nd','3rd','4th','5th'][i] ?? `${i+1}th` }))

    const avgRate = Math.round(sundays.reduce((s, w) => s + w.rate, 0) / sundays.length)

    // Members absent 2+ times
    const absentCount = {}
    for (const s of monthlySessions) {
      for (const r of (s.attendance_records ?? [])) {
        if (!r.present) absentCount[r.name] = (absentCount[r.name] ?? 0) + 1
      }
    }
    const frequentAbsent = Object.entries(absentCount).filter(([, c]) => c >= 2).map(([name]) => name).slice(0, 12)

    // Members with no attendance this month
    const monthMemberIds = new Set(monthlySessions.flatMap(s => (s.attendance_records ?? []).map(r => r.member_id)))
    const noAttendance = members.filter(m => !monthMemberIds.has(m.id)).map(m => m.name).slice(0, 12)

    // Trend
    const prevMonth = reportMonth === 0 ? 11 : reportMonth - 1
    const prevYear = reportMonth === 0 ? reportYear - 1 : reportYear
    const prevSessions = sessions.filter(s => {
      const d = new Date(s.date)
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear
    })
    const prevRecords = prevSessions.flatMap(s => s.attendance_records ?? [])
    const prevRate = prevRecords.length ? attendanceRate(prevRecords.filter(r => r.present).length, prevRecords.length) : null
    const trendDelta = prevRate !== null ? avgRate - prevRate : null
    const trendLabel = trendDelta === null ? 'Stable →' : trendDelta > 2 ? 'Growing ↑' : trendDelta < -2 ? 'Declining ↓' : 'Stable →'
    const trendColor = trendDelta === null ? '#d97706' : trendDelta > 2 ? '#16a34a' : trendDelta < -2 ? '#dc2626' : '#d97706'

    return {
      month: MONTHS[reportMonth], year: reportYear,
      avgRate, sundays, frequentAbsent, noAttendance,
      trendLabel, trendColor,
    }
  }, [monthlySessions, sessions, members, reportMonth, reportYear])

  const canGenerate = reportType === 'sunday' ? !!sundayData : !!monthlyData

  return (
    <div className="page-content">
      <h1 className="font-display text-2xl font-semibold text-forest mb-2">Reports</h1>

      {/* Report type toggle */}
      <div className="flex gap-2">
        {[['sunday', '📋 Sunday Report'], ['monthly', '📅 Monthly Report']].map(([val, label]) => (
          <button key={val} onClick={() => { setReportType(val); setGenerated(false) }}
            className={`btn-sm flex-1 text-sm ${reportType === val ? 'btn-primary' : 'btn-outline'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Sunday: select a session date */}
      {reportType === 'sunday' && (
        <div className="card">
          <label className="input-label">Select service date</label>
          {sessionDates.length === 0 ? (
            <p className="text-sm text-mist">No attendance sessions recorded yet.</p>
          ) : (
            <select className="input" value={selectedSession ?? ''}
              onChange={e => { setSelectedSession(e.target.value || null); setGenerated(false) }}>
              <option value="">— choose a date —</option>
              {sessionDates.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Monthly: select month/year */}
      {reportType === 'monthly' && (
        <div className="card flex gap-3">
          <div className="flex-1">
            <label className="input-label">Month</label>
            <select className="input" value={reportMonth}
              onChange={e => { setReportMonth(Number(e.target.value)); setGenerated(false) }}>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="w-24">
            <label className="input-label">Year</label>
            <input type="number" className="input" min="2020" max={now.getFullYear()}
              value={reportYear} onChange={e => { setReportYear(Number(e.target.value)); setGenerated(false) }} />
          </div>
        </div>
      )}

      {/* Generate button */}
      <button onClick={handleGenerate} disabled={!canGenerate || generating} className="btn btn-primary w-full btn-lg">
        {generating ? (
          <span className="flex items-center gap-2"><Spinner /> Generating…</span>
        ) : '⚡ Generate Report'}
      </button>

      {/* Preview canvas — always mounted, visibility toggled */}
      <canvas ref={canvasRef} className={`w-full rounded-2xl shadow-card ${generated ? 'block' : 'hidden'}`} />

      {/* Download buttons */}
      {generated && (
        <div className="flex gap-3">
          <button onClick={handleDownloadJPEG} className="btn btn-primary flex-1 gap-2">
            <DownloadIcon /> Save as image
          </button>
          <button onClick={handleDownloadPDF} className="btn btn-outline flex-1 gap-2">
            <DownloadIcon /> Save as PDF
          </button>
        </div>
      )}

      {/* ── Off-screen report DOM (always mounted, visibility:hidden until capture) ── */}
      <div style={{ position: 'fixed', top: 0, left: '-9999px', width: 800, zIndex: -1 }}>
        {/* Canvas ref fix: always mounted, visibility controlled */}
        <div ref={reportRef} style={{ visibility: 'hidden', width: 800 }}>
          {reportType === 'sunday' && sundayData && (
            <SundayReportTemplate data={sundayData} churchName={church.name} />
          )}
          {reportType === 'monthly' && monthlyData && (
            <MonthlyReportTemplate data={monthlyData} churchName={church.name} />
          )}
        </div>
      </div>

      <div className="h-6" />
    </div>
  )
}

// ─── Sunday Report Template (rendered off-screen at 800px) ─────────────────────
function SundayReportTemplate({ data, churchName }) {
  const rateColor = data.rate >= 75 ? '#16a34a' : data.rate >= 50 ? '#d97706' : '#dc2626'
  return (
    <div style={{ width: 800, background: '#f7f5f0', fontFamily: 'sans-serif', padding: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'serif', fontSize: 28, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>{churchName}</h1>
          <p style={{ color: '#8a9e90', fontSize: 13, marginTop: 4 }}>Attendance Report</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#c9a84c', fontSize: 18, fontWeight: 700 }}>✓</span>
          </div>
          <span style={{ color: '#1a3a2a', fontWeight: 700, fontSize: 15 }}>ChurchTrakr</span>
        </div>
      </div>

      {/* Date */}
      <p style={{ fontFamily: 'serif', fontSize: 22, fontWeight: 700, color: '#1a3a2a', marginBottom: 24 }}>
        {fmtDate(data.date)}
      </p>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Present', value: data.present, sub: `${data.rate}%`, color: '#16a34a' },
          { label: 'Absent', value: data.absent, sub: `${100 - data.rate}%`, color: '#dc2626' },
          { label: 'Total', value: data.total, sub: 'members', color: '#1a3a2a' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ background: 'white', borderRadius: 16, padding: 20, textAlign: 'center', border: '1px solid rgba(26,58,42,0.08)' }}>
            <p style={{ fontSize: 36, fontWeight: 800, color, fontFamily: 'serif', margin: 0 }}>{value}</p>
            <p style={{ fontSize: 11, color: '#8a9e90', marginTop: 4 }}>{sub}</p>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', marginTop: 2 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Rate ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <InlineRateRing rate={data.rate} size={160} />
      </div>

      {/* Follow-up section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        <div style={{ background: 'white', borderRadius: 16, padding: 20, textAlign: 'center', border: '1px solid rgba(26,58,42,0.08)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', marginBottom: 12 }}>Absentees Reached</p>
          <InlineRateRing rate={data.totalAbsent > 0 ? attendanceRate(data.absenteesReached, data.totalAbsent) : 100} size={80} />
          <p style={{ fontSize: 11, color: '#8a9e90', marginTop: 8 }}>{data.absenteesReached}/{data.totalAbsent}</p>
        </div>
        <div style={{ background: 'white', borderRadius: 16, padding: 20, textAlign: 'center', border: '1px solid rgba(26,58,42,0.08)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', marginBottom: 12 }}>Attendees Thanked</p>
          <InlineRateRing rate={data.totalAttendees > 0 ? attendanceRate(data.attendeesThanked, data.totalAttendees) : 100} size={80} />
          <p style={{ fontSize: 11, color: '#8a9e90', marginTop: 8 }}>{data.attendeesThanked}/{data.totalAttendees}</p>
        </div>
      </div>

      {/* Group breakdown */}
      {data.groupBreakdown.length > 1 && (
        <div>
          <p style={{ fontWeight: 700, color: '#1a3a2a', fontSize: 15, marginBottom: 12 }}>Group Breakdown</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {data.groupBreakdown.map(g => (
              <div key={g.name} style={{ background: 'white', borderRadius: 12, padding: 16, textAlign: 'center', border: '1px solid rgba(26,58,42,0.08)' }}>
                <InlineRateRing rate={g.rate} size={60} />
                <p style={{ fontSize: 12, fontWeight: 600, color: '#1a3a2a', marginTop: 8, marginBottom: 2 }}>{g.name}</p>
                <p style={{ fontSize: 11, color: '#8a9e90' }}>{g.present}/{g.total}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <p style={{ textAlign: 'center', color: '#8a9e90', fontSize: 11, marginTop: 40 }}>
        Generated by ChurchTrakr · {new Date().toLocaleDateString()}
      </p>
    </div>
  )
}

// ─── Monthly Report Template ────────────────────────────────────────────────────
function MonthlyReportTemplate({ data, churchName }) {
  return (
    <div style={{ width: 800, background: '#f7f5f0', fontFamily: 'sans-serif', padding: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'serif', fontSize: 28, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>{churchName}</h1>
          <p style={{ color: '#8a9e90', fontSize: 13, marginTop: 4 }}>{data.month} {data.year} Report</p>
        </div>
        <span style={{ background: data.trendColor, color: '#fff', borderRadius: 20, padding: '6px 16px', fontWeight: 700, fontSize: 14 }}>
          {data.trendLabel}
        </span>
      </div>

      {/* Average ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
        <InlineRateRing rate={data.avgRate} size={160} label="Average Attendance" />
      </div>

      {/* Sunday-by-Sunday */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontWeight: 700, color: '#1a3a2a', fontSize: 15, marginBottom: 16 }}>Sunday Breakdown</p>
        {data.sundays.map(w => {
          const barColor = w.rate >= 75 ? '#16a34a' : w.rate >= 50 ? '#d97706' : '#dc2626'
          return (
            <div key={w.date} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: '#1a3a2a', fontWeight: 600 }}>{w.ordinal} Sunday · {fmtDate(w.date)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: barColor }}>{w.rate}% ({w.present}/{w.total})</span>
              </div>
              <div style={{ height: 8, background: '#e0dbd0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${w.rate}%`, background: barColor, borderRadius: 4 }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Chips */}
      {data.frequentAbsent.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 700, color: '#dc2626', fontSize: 14, marginBottom: 10 }}>Absent More Than Once</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.frequentAbsent.map(name => (
              <span key={name} style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 500 }}>{name}</span>
            ))}
          </div>
        </div>
      )}
      {data.noAttendance.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontWeight: 700, color: '#8a9e90', fontSize: 14, marginBottom: 10 }}>No Attendance This Month</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.noAttendance.map(name => (
              <span key={name} style={{ background: 'rgba(138,158,144,0.15)', color: '#4a6358', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 500 }}>{name}</span>
            ))}
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', color: '#8a9e90', fontSize: 11 }}>
        Generated by ChurchTrakr · {new Date().toLocaleDateString()}
      </p>
    </div>
  )
}

// Inline SVG ring (no CSS classes — for off-screen render)
function InlineRateRing({ rate, size, label }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ - (rate / 100) * circ
  const color = rate >= 75 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e0dbd0" strokeWidth={size * 0.09} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
            strokeWidth={size * 0.09} strokeDasharray={circ} strokeDashoffset={offset}
            strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'serif', fontWeight: 800, fontSize: size * 0.22, color, lineHeight: 1 }}>
            {rate}%
          </span>
        </div>
      </div>
      {label && <p style={{ fontSize: 12, color: '#8a9e90', marginTop: 6 }}>{label}</p>}
    </div>
  )
}

function Spinner() { return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/></svg> }
function DownloadIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> }
