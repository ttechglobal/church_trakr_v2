'use client'

import { useState, useRef, useMemo } from 'react'
import { fmtDate, fmtMonthYear, attendanceRate } from '@/lib/utils'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function ReportClient({ church, groups, sessions, members }) {
  const now  = new Date()
  const [type, setType]       = useState('sunday')
  const [sessionDate, setSD]  = useState('')
  const [repMonth, setRM]     = useState(now.getMonth())
  const [repYear, setRY]      = useState(now.getFullYear())
  const [generating, setGen]  = useState(false)
  const [generated, setDone]  = useState(false)
  const reportRef             = useRef(null)
  const canvasRef             = useRef(null)

  const sessionDates = useMemo(() => {
    const seen = new Set()
    return sessions
      .filter(s => { if (seen.has(s.date)) return false; seen.add(s.date); return true })
      .map(s => s.date).slice(0, 20)
  }, [sessions])

  const monthlySessions = useMemo(() =>
    sessions.filter(s => {
      const d = new Date(s.date)
      return d.getMonth() === repMonth && d.getFullYear() === repYear
    }), [sessions, repMonth, repYear])

  const sundayData = useMemo(() => {
    if (!sessionDate) return null
    const daySessions = sessions.filter(s => s.date === sessionDate)
    const allRecs = daySessions.flatMap(s => s.attendance_records ?? [])
    const present = allRecs.filter(r => r.present).length
    const absent  = allRecs.filter(r => !r.present).length
    const rate    = attendanceRate(present, allRecs.length)

    const fu   = church.follow_up_data ?? {}
    const atFu = church.attendee_followup_data ?? {}
    const absentKeys  = daySessions.flatMap(s => (s.attendance_records ?? []).filter(r => !r.present).map(r => `${s.id}_${r.member_id}`))
    const attendeeKeys = daySessions.flatMap(s => (s.attendance_records ?? []).filter(r => r.present).map(r => `att_${s.id}_${r.member_id}`))

    return {
      date: sessionDate, present, absent, total: allRecs.length, rate,
      absenteesReached: absentKeys.filter(k => fu[k]?.reached).length,
      totalAbsent: absent,
      attendeesThanked: attendeeKeys.filter(k => atFu[k]?.messaged).length,
      totalAttendees: present,
      groupBreakdown: daySessions.map(s => {
        const g    = groups.find(g => g.id === s.group_id)
        const recs = s.attendance_records ?? []
        const p    = recs.filter(r => r.present).length
        return { name: g?.name ?? 'Unknown', present: p, total: recs.length, rate: attendanceRate(p, recs.length) }
      }),
    }
  }, [sessionDate, sessions, groups, church])

  const monthlyData = useMemo(() => {
    if (!monthlySessions.length) return null
    const byDate = {}
    for (const s of monthlySessions) {
      if (!byDate[s.date]) byDate[s.date] = { date: s.date, present: 0, total: 0 }
      const recs = s.attendance_records ?? []
      byDate[s.date].present += recs.filter(r => r.present).length
      byDate[s.date].total   += recs.length
    }
    const sundays = Object.values(byDate).sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((w, i) => ({ ...w, rate: attendanceRate(w.present, w.total), ordinal: ['1st','2nd','3rd','4th','5th'][i] + ' Sunday' }))
    const avg = Math.round(sundays.reduce((s, w) => s + w.rate, 0) / sundays.length)

    const absentCount = {}
    for (const s of monthlySessions) for (const r of (s.attendance_records ?? [])) if (!r.present) absentCount[r.name] = (absentCount[r.name] ?? 0) + 1
    const freqAbsent = Object.entries(absentCount).filter(([,c]) => c >= 2).map(([name]) => name).slice(0, 12)

    const monthMemberIds = new Set(monthlySessions.flatMap(s => (s.attendance_records ?? []).map(r => r.member_id)))
    const noAttendance = members.filter(m => !monthMemberIds.has(m.id)).map(m => m.name).slice(0, 12)

    const prevSessions = sessions.filter(s => {
      const d = new Date(s.date)
      const pm = repMonth === 0 ? 11 : repMonth - 1
      const py = repMonth === 0 ? repYear - 1 : repYear
      return d.getMonth() === pm && d.getFullYear() === py
    })
    const prevRecs = prevSessions.flatMap(s => s.attendance_records ?? [])
    const prevRate = prevRecs.length ? attendanceRate(prevRecs.filter(r => r.present).length, prevRecs.length) : null
    const delta    = prevRate !== null ? avg - prevRate : null
    const trendLabel = delta === null ? 'Stable →' : delta > 2 ? 'Growing ↑' : delta < -2 ? 'Declining ↓' : 'Stable →'
    const trendColor = delta === null ? '#d97706' : delta > 2 ? '#16a34a' : delta < -2 ? '#dc2626' : '#d97706'

    return { month: MONTHS[repMonth], year: repYear, avgRate: avg, sundays, freqAbsent, noAttendance, trendLabel, trendColor }
  }, [monthlySessions, sessions, members, repMonth, repYear])

  const canGenerate = type === 'sunday' ? !!sundayData : !!monthlyData

  async function generate() {
    setGen(true); setDone(false)
    await new Promise(r => setTimeout(r, 80))
    try {
      const h2c = (await import('html2canvas')).default
      const el  = reportRef.current
      if (!el) return
      el.style.visibility = 'visible'
      const canvas = await h2c(el, { scale: 3, useCORS: true, backgroundColor: '#f7f5f0', width: 800, logging: false })
      el.style.visibility = 'hidden'
      const preview = canvasRef.current
      if (preview) {
        preview.width = canvas.width; preview.height = canvas.height
        preview.getContext('2d').drawImage(canvas, 0, 0)
      }
      setDone(true)
    } catch (e) { alert('Generation failed: ' + e.message) }
    finally { setGen(false) }
  }

  function downloadJPEG() {
    const canvas = canvasRef.current; if (!canvas) return
    const a = document.createElement('a')
    a.download = `churchtrakr-report-${Date.now()}.jpg`
    a.href = canvas.toDataURL('image/jpeg', 0.95); a.click()
  }

  async function downloadPDF() {
    try {
      const { jsPDF } = await import('jspdf')
      const canvas = canvasRef.current; if (!canvas) return
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width/3, canvas.height/3] })
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, canvas.width/3, canvas.height/3)
      pdf.save(`churchtrakr-report-${Date.now()}.pdf`)
    } catch { downloadJPEG() }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <BackLink href="/dashboard" />
        <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
          Reports
        </h1>
        <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>Generate and export attendance reports</p>
      </div>

      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem', background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, padding: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {[['sunday', '📋 Sunday Report'], ['monthly', '📅 Monthly Report']].map(([val, label]) => (
          <button key={val} onClick={() => { setType(val); setDone(false) }}
            style={{
              flex: 1, height: 44, borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 700,
              border: 'none',
              background: type === val ? '#1a3a2a' : 'transparent',
              color: type === val ? '#e8d5a0' : '#8a9e90',
              transition: 'all 0.15s',
              boxShadow: type === val ? '0 2px 8px rgba(26,58,42,0.2)' : 'none',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Options */}
      <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {type === 'sunday' ? (
          <>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2d4a36', marginBottom: 8 }}>Select service date</label>
            {sessionDates.length === 0 ? (
              <p style={{ fontSize: 14, color: '#8a9e90' }}>No attendance sessions recorded yet.</p>
            ) : (
              <select className="input" value={sessionDate} onChange={e => { setSD(e.target.value); setDone(false) }}>
                <option value="">— choose a date —</option>
                {sessionDates.map(d => <option key={d} value={d}>{fmtDate(d)}</option>)}
              </select>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2d4a36', marginBottom: 8 }}>Month</label>
              <select className="input" value={repMonth} onChange={e => { setRM(Number(e.target.value)); setDone(false) }}>
                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2d4a36', marginBottom: 8 }}>Year</label>
              <input className="input" type="number" min="2020" max={now.getFullYear()}
                value={repYear} onChange={e => { setRY(Number(e.target.value)); setDone(false) }} />
            </div>
          </div>
        )}
      </div>

      {/* Generate */}
      <button onClick={generate} disabled={!canGenerate || generating} style={{
        width: '100%', height: 52,
        background: canGenerate ? 'linear-gradient(135deg,#1a3a2a,#2d5a42)' : '#e0dbd0',
        color: canGenerate ? '#e8d5a0' : '#8a9e90',
        border: 'none', borderRadius: 16, cursor: canGenerate ? 'pointer' : 'not-allowed',
        fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em',
        boxShadow: canGenerate ? '0 4px 16px rgba(26,58,42,0.25)' : 'none',
        marginBottom: '1.25rem', transition: 'all 0.2s',
      }}>
        {generating ? '⚡ Generating report…' : '⚡ Generate Report'}
      </button>

      {/* Canvas preview */}
      <canvas ref={canvasRef} style={{ display: generated ? 'block' : 'none', width: '100%', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', marginBottom: '1rem' }} />

      {/* Download buttons */}
      {generated && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={downloadJPEG} style={{ flex: 1, ...dlBtn }}>
            📸 Save as Image
          </button>
          <button onClick={downloadPDF} style={{ flex: 1, ...dlBtn, background: '#fff', color: '#1a3a2a', border: '1.5px solid rgba(26,58,42,0.2)' }}>
            📄 Save as PDF
          </button>
        </div>
      )}

      {/* Off-screen report */}
      <div style={{ position: 'fixed', top: 0, left: '-9999px', width: 800, zIndex: -1 }}>
        <div ref={reportRef} style={{ visibility: 'hidden', width: 800 }}>
          {type === 'sunday' && sundayData && <SundayReport data={sundayData} churchName={church.name} />}
          {type === 'monthly' && monthlyData && <MonthlyReport data={monthlyData} churchName={church.name} />}
        </div>
      </div>
    </div>
  )
}

function SundayReport({ data, churchName }) {
  const rColor = data.rate >= 75 ? '#16a34a' : data.rate >= 50 ? '#d97706' : '#dc2626'
  const circ = 2 * Math.PI * 60
  const off  = circ - (data.rate / 100) * circ
  return (
    <div style={{ width: 800, background: '#f7f5f0', fontFamily: 'system-ui,sans-serif', padding: 48 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 28, fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px' }}>{churchName}</h1>
          <p style={{ color: '#8a9e90', fontSize: 13, margin: 0 }}>Sunday Attendance Report</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#c9a84c', fontSize: 16, fontWeight: 800 }}>✓</span>
          </div>
          <span style={{ fontWeight: 700, color: '#1a3a2a', fontSize: 14 }}>ChurchTrakr</span>
        </div>
      </div>
      <p style={{ fontFamily: 'Georgia,serif', fontSize: 22, fontWeight: 700, color: '#1a3a2a', marginBottom: 28 }}>{fmtDate(data.date)}</p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Present', value: data.present, sub: `${data.rate}%`, color: '#16a34a' },
          { label: 'Absent',  value: data.absent,  sub: `${100 - data.rate}%`, color: '#dc2626' },
          { label: 'Total',   value: data.total,   sub: 'members', color: '#1a3a2a' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: 20, textAlign: 'center', border: '1px solid rgba(26,58,42,0.08)' }}>
            <p style={{ fontFamily: 'Georgia,serif', fontSize: 38, fontWeight: 800, color: s.color, margin: '0 0 4px' }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#8a9e90', margin: '0 0 2px' }}>{s.sub}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
        <div style={{ position: 'relative', width: 160, height: 160 }}>
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="60" fill="none" stroke="#e0dbd0" strokeWidth="14"/>
            <circle cx="80" cy="80" r="60" fill="none" stroke={rColor} strokeWidth="14"
              strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
              transform="rotate(-90 80 80)"/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Georgia,serif', fontWeight: 800, fontSize: 32, color: rColor, lineHeight: 1 }}>{data.rate}%</span>
            <span style={{ fontSize: 11, color: '#8a9e90', marginTop: 2 }}>attendance</span>
          </div>
        </div>
      </div>

      {/* Follow-up */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Absentees Reached', done: data.absenteesReached, total: data.totalAbsent },
          { label: 'Attendees Thanked', done: data.attendeesThanked, total: data.totalAttendees },
        ].map(f => {
          const rate = f.total > 0 ? attendanceRate(f.done, f.total) : 100
          const c    = rate === 100 ? '#16a34a' : '#d97706'
          const ci   = 2 * Math.PI * 30
          const o    = ci - (rate / 100) * ci
          return (
            <div key={f.label} style={{ background: '#fff', borderRadius: 16, padding: 20, textAlign: 'center', border: '1px solid rgba(26,58,42,0.08)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', marginBottom: 12 }}>{f.label}</p>
              <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 8px' }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#e0dbd0" strokeWidth="8"/>
                  <circle cx="40" cy="40" r="30" fill="none" stroke={c} strokeWidth="8"
                    strokeDasharray={ci} strokeDashoffset={o} strokeLinecap="round" transform="rotate(-90 40 40)"/>
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontFamily: 'Georgia,serif', fontWeight: 800, fontSize: 16, color: c }}>{rate}%</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#8a9e90', margin: 0 }}>{f.done}/{f.total}</p>
            </div>
          )
        })}
      </div>

      {/* Group breakdown */}
      {data.groupBreakdown.length > 1 && (
        <div>
          <p style={{ fontWeight: 700, color: '#1a3a2a', fontSize: 15, marginBottom: 12 }}>Group Breakdown</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {data.groupBreakdown.map(g => {
              const gc = g.rate >= 75 ? '#16a34a' : g.rate >= 50 ? '#d97706' : '#dc2626'
              const gci = 2 * Math.PI * 24; const go = gci - (g.rate / 100) * gci
              return (
                <div key={g.name} style={{ background: '#fff', borderRadius: 12, padding: '1rem', textAlign: 'center', border: '1px solid rgba(26,58,42,0.08)' }}>
                  <div style={{ position: 'relative', width: 60, height: 60, margin: '0 auto 8px' }}>
                    <svg width="60" height="60" viewBox="0 0 60 60">
                      <circle cx="30" cy="30" r="24" fill="none" stroke="#e0dbd0" strokeWidth="6"/>
                      <circle cx="30" cy="30" r="24" fill="none" stroke={gc} strokeWidth="6"
                        strokeDasharray={gci} strokeDashoffset={go} strokeLinecap="round" transform="rotate(-90 30 30)"/>
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'Georgia,serif', fontWeight: 800, fontSize: 12, color: gc }}>{g.rate}%</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px' }}>{g.name}</p>
                  <p style={{ fontSize: 11, color: '#8a9e90', margin: 0 }}>{g.present}/{g.total}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', color: '#8a9e90', fontSize: 11, marginTop: 40 }}>
        Generated by ChurchTrakr · {new Date().toLocaleDateString()}
      </p>
    </div>
  )
}

function MonthlyReport({ data, churchName }) {
  const avgColor = data.avgRate >= 75 ? '#16a34a' : data.avgRate >= 50 ? '#d97706' : '#dc2626'
  const circ = 2 * Math.PI * 60; const off = circ - (data.avgRate / 100) * circ
  return (
    <div style={{ width: 800, background: '#f7f5f0', fontFamily: 'system-ui,sans-serif', padding: 48 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia,serif', fontSize: 28, fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px' }}>{churchName}</h1>
          <p style={{ color: '#8a9e90', fontSize: 13, margin: 0 }}>{data.month} {data.year} Monthly Report</p>
        </div>
        <span style={{ background: data.trendColor, color: '#fff', borderRadius: 20, padding: '6px 16px', fontWeight: 700, fontSize: 14 }}>
          {data.trendLabel}
        </span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 12px' }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="60" fill="none" stroke="#e0dbd0" strokeWidth="14"/>
              <circle cx="80" cy="80" r="60" fill="none" stroke={avgColor} strokeWidth="14"
                strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 80 80)"/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'Georgia,serif', fontWeight: 800, fontSize: 32, color: avgColor, lineHeight: 1 }}>{data.avgRate}%</span>
              <span style={{ fontSize: 11, color: '#8a9e90', marginTop: 2 }}>avg attendance</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <p style={{ fontWeight: 700, color: '#1a3a2a', fontSize: 15, marginBottom: 16 }}>Sunday Breakdown</p>
        {data.sundays.map(w => {
          const wc = w.rate >= 75 ? '#16a34a' : w.rate >= 50 ? '#d97706' : '#dc2626'
          return (
            <div key={w.date} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a' }}>{w.ordinal} · {fmtDate(w.date)}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: wc }}>{w.rate}% ({w.present}/{w.total})</span>
              </div>
              <div style={{ height: 8, background: '#e0dbd0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${w.rate}%`, background: wc, borderRadius: 4 }} />
              </div>
            </div>
          )
        })}
      </div>

      {data.freqAbsent.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 700, color: '#dc2626', fontSize: 14, marginBottom: 10 }}>Absent More Than Once</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.freqAbsent.map(name => (
              <span key={name} style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>{name}</span>
            ))}
          </div>
        </div>
      )}

      {data.noAttendance.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontWeight: 700, color: '#8a9e90', fontSize: 14, marginBottom: 10 }}>No Attendance This Month</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.noAttendance.map(name => (
              <span key={name} style={{ background: 'rgba(138,158,144,0.12)', color: '#4a6358', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>{name}</span>
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

function BackLink({ href }) {
  return (
    <a href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#8a9e90', fontWeight: 600, textDecoration: 'none', marginBottom: 8 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      Dashboard
    </a>
  )
}

const dlBtn = { height: 48, background: '#1a3a2a', color: '#e8d5a0', border: 'none', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, transition: 'all 0.15s', boxShadow: '0 2px 8px rgba(26,58,42,0.2)' }