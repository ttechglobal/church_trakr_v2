'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import BackButton from '@/components/ui/BackButton'
import { fmtDate } from '@/lib/utils'
import {
  FileText, Download, Share2, Calendar, ChevronLeft, ChevronRight,
  Users, TrendingUp, Star, UserMinus, UserCheck, Plane
} from 'lucide-react'

// ── Brand colors ──────────────────────────────────────────────────────────────
const C = {
  forest:'#1a3a2a', mid:'#2d5a42', light:'#4a8a65', muted:'#8a9e90',
  gold:'#c9a84c', goldDk:'#a8862e', goldLt:'#e8d5a0',
  ivory:'#f7f5f0', ivoryDk:'#ede9e0', ivoryDeep:'#e0dbd0',
  success:'#16a34a', error:'#dc2626', warning:'#d97706',
}

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

function rateColor(r) {
  if (r >= 75) return C.success
  if (r >= 50) return C.warning
  return C.error
}

function ordinal(n) {
  const s = ['th','st','nd','rd'], v = n % 100
  return n + (s[(v-20)%10] || s[v] || s[0])
}

function formatSundayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return `Sunday ${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function formatMonthLabel(month, year) {
  return `${MONTHS[month]} ${year}`
}

// ── The premium report card ───────────────────────────────────────────────────
// This is what gets exported as PNG/PDF — self-contained, no Tailwind classes
function ReportCard({ church, data, type, reportRef }) {
  const rate = data.total > 0 ? Math.round((data.present / data.total) * 100) : 0
  const rc = rateColor(rate)

  return (
    <div
      ref={reportRef}
      id="report-card"
      style={{
        width: 500,
        background: '#ffffff',
        borderRadius: 20,
        overflow: 'hidden',
        fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        position: 'relative',
      }}
    >
      {/* ── Header band ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.forest} 0%, ${C.mid} 100%)`,
        padding: '28px 28px 24px',
      }}>
        {/* Torch icon + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(201,168,76,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
              <line x1="12" y1="7" x2="12" y2="17"/>
              <line x1="7.5" y1="11" x2="16.5" y2="11"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(232,213,160,0.5)', margin: 0, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ChurchTrakr
            </p>
            <p style={{ fontSize: 16, color: C.goldLt, margin: 0, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {church.name}
            </p>
          </div>
        </div>

        {/* Report period */}
        <div>
          <p style={{ fontSize: 11, color: 'rgba(232,213,160,0.5)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            {type === 'sunday' ? 'Sunday Report' : 'Monthly Report'}
          </p>
          <p style={{
            fontSize: 20, fontFamily: 'var(--font-playfair, Georgia, serif)',
            fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em',
          }}>
            {data.periodLabel}
          </p>
        </div>
      </div>

      {/* ── Main attendance stat ── */}
      <div style={{
        padding: '28px 28px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Big rate ring */}
        <div style={{ position: 'relative', width: 100, height: 100 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke={C.ivoryDeep} strokeWidth="9" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={rc} strokeWidth="9"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - rate / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: rc, lineHeight: 1, fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
              {rate}%
            </span>
            <span style={{ fontSize: 8, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
              rate
            </span>
          </div>
        </div>

        {/* Present / Absent / Total */}
        <div style={{ flex: 1, paddingLeft: 24, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {[
            { label: 'Present', value: data.present, color: C.success },
            { label: 'Absent',  value: data.absent,  color: C.error   },
            { label: 'Total',   value: data.total,   color: C.forest  },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: C.ivory, borderRadius: 10, padding: '10px 8px', textAlign: 'center',
            }}>
              <p style={{ fontSize: 26, fontWeight: 800, color, margin: '0 0 2px', lineHeight: 1, fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                {value}
              </p>
              <p style={{ fontSize: 9, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div style={{ padding: '20px 28px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.goldDk} strokeWidth="2.5" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, label: 'First Timers',  value: data.firstTimers,  accent: C.goldDk   },
          { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="2.5" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, label: 'Followed Up',   value: data.followedUp,   accent: C.success  },
          { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.warning} strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>, label: 'Pending Follow-Up', value: data.pendingFollowUp, accent: C.warning },
          { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5c-1.5-1.5-3.5-1.5-5 0L11 6 2.8 4.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 1 1h2l1 1v2l1 1 1-1V18l3-2 5.7 7.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>, label: 'Away Members',  value: data.awayCount,    accent: C.muted    },
        ].map(({ icon, label, value, accent }) => (
          <div key={label} style={{
            background: C.ivory, borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, background: `${accent}18`, flexShrink: 0 }}>{icon}</span>
            <div>
              <p style={{ fontSize: 22, fontWeight: 800, color: accent, margin: '0 0 1px', lineHeight: 1, fontFamily: 'var(--font-playfair, Georgia, serif)' }}>
                {value}
              </p>
              <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                {label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Monthly week-by-week breakdown ── */}
      {type === 'monthly' && data.weeks && data.weeks.length > 0 && (
        <div style={{ padding: '20px 28px 0' }}>
          <p style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>
            Week by Week
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.weeks.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontSize: 11, color: C.muted, width: 64, flexShrink: 0, margin: 0 }}>
                  {new Date(w.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <div style={{ flex: 1, height: 6, background: C.ivoryDeep, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${w.rate}%`,
                    background: rateColor(w.rate),
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, color: rateColor(w.rate), width: 36, textAlign: 'right', margin: 0 }}>
                  {w.rate}%
                </p>
                <p style={{ fontSize: 10, color: C.muted, width: 40, textAlign: 'right', margin: 0 }}>
                  {w.present}/{w.total}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{
        margin: '20px 28px 0',
        paddingTop: 14, paddingBottom: 20,
        borderTop: `1px solid ${C.ivoryDeep}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>
          Generated {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="4" strokeWidth="1.5" fill="none"/>
            <line x1="12" y1="7" x2="12" y2="17"/>
            <line x1="7.5" y1="11" x2="16.5" y2="11"/>
          </svg>
          <p style={{ fontSize: 10, color: C.muted, margin: 0, fontWeight: 600 }}>ChurchTrakr</p>
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportClient({
  church, sessions, members, firstTimers, awayMembers
}) {
  const [reportType, setReportType] = useState('sunday')  // 'sunday' | 'monthly'
  const [generated, setGenerated]   = useState(false)
  const [exporting, setExporting]   = useState(false)
  const reportRef = useRef(null)

  // ── Sunday report state ──────────────────────────────────────────────────
  const realSessions = sessions.filter(s =>
    s.groups?.name !== 'First Timers' &&
    (s.attendance_records ?? []).some(r => r.member_id !== null)
  )
  const sessionDates = [...new Set(realSessions.map(s => s.date))].sort((a, b) => b.localeCompare(a))
  const [sundayIdx, setSundayIdx] = useState(0)
  const selectedDate = sessionDates[sundayIdx] ?? null

  // ── Monthly report state ─────────────────────────────────────────────────
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear]   = useState(now.getFullYear())

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setGenerated(false)
  }
  function nextMonth() {
    const next = new Date(year, month + 1, 1)
    if (next <= now) {
      if (month === 11) { setMonth(0); setYear(y => y + 1) }
      else setMonth(m => m + 1)
      setGenerated(false)
    }
  }
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear()

  // ── Compute report data ──────────────────────────────────────────────────
  const reportData = useMemo(() => {
    if (reportType === 'sunday') {
      if (!selectedDate) return null
      const daySessions = realSessions.filter(s => s.date === selectedDate)
      let present = 0, total = 0
      for (const s of daySessions) {
        for (const r of (s.attendance_records ?? [])) {
          if (r.member_id === null) continue
          total++
          if (r.present) present++
        }
      }
      const absent = total - present
      const dayFTs = firstTimers.filter(ft => ft.date === selectedDate)
      const absentIds = new Set(
        daySessions.flatMap(s =>
          (s.attendance_records ?? []).filter(r => !r.present && r.member_id).map(r => r.member_id)
        )
      )
      const followData = church.follow_up_data ?? {}
      let followedUp = 0, pendingFollowUp = 0
      for (const id of absentIds) {
        const sessionId = daySessions[0]?.id
        const key = sessionId ? `${sessionId}_${id}` : null
        if (key && followData[key]?.reached) followedUp++
        else pendingFollowUp++
      }
      return {
        periodLabel: formatSundayLabel(selectedDate),
        present, absent, total,
        firstTimers: dayFTs.length,
        followedUp, pendingFollowUp,
        awayCount: awayMembers.length,
        weeks: null,
      }
    } else {
      // Monthly
      const monthSessions = realSessions.filter(s => {
        const d = new Date(s.date + 'T00:00:00')
        return d.getMonth() === month && d.getFullYear() === year
      })
      // Week by week
      const byDate = {}
      for (const s of monthSessions) {
        if (!byDate[s.date]) byDate[s.date] = { present: 0, total: 0 }
        for (const r of (s.attendance_records ?? [])) {
          if (r.member_id === null) continue
          byDate[s.date].total++
          if (r.present) byDate[s.date].present++
        }
      }
      const weeks = Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { present, total }]) => ({
          date, present, total,
          rate: total > 0 ? Math.round((present / total) * 100) : 0,
        }))
      const present = weeks.reduce((s, w) => s + w.present, 0)
      const total   = weeks.reduce((s, w) => s + w.total, 0)
      const absent  = total - present
      const monthFTs = firstTimers.filter(ft => {
        const d = new Date(ft.date + 'T00:00:00')
        return d.getMonth() === month && d.getFullYear() === year
      })
      const followData = church.follow_up_data ?? {}
      let followedUp = 0, pendingFollowUp = 0
      for (const s of monthSessions) {
        for (const r of (s.attendance_records ?? [])) {
          if (r.present || !r.member_id) continue
          const key = `${s.id}_${r.member_id}`
          if (followData[key]?.reached) followedUp++
          else pendingFollowUp++
        }
      }
      return {
        periodLabel: formatMonthLabel(month, year),
        present, absent, total: total > 0 ? total : members.filter(m => m.status === 'active').length,
        firstTimers: monthFTs.length,
        followedUp, pendingFollowUp,
        awayCount: awayMembers.length,
        weeks,
      }
    }
  }, [reportType, selectedDate, month, year, realSessions, firstTimers, awayMembers, members, church])

  // ── Export as PNG ────────────────────────────────────────────────────────
  async function exportPNG() {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      // Compress to JPEG for smaller file size (WhatsApp friendly)
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88))
      const url  = URL.createObjectURL(blob)
      const a    = Object.assign(document.createElement('a'), {
        href: url,
        download: `${church.name.replace(/\s+/g, '-')}-report-${reportData.periodLabel.replace(/\s+/g, '-')}.jpg`,
      })
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PNG export failed:', err)
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // ── Export as PDF ────────────────────────────────────────────────────────
  async function exportPDF() {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.92)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const imgWidth = pdfWidth - 30  // 15mm margins
      const imgHeight = (canvas.height / canvas.width) * imgWidth
      pdf.addImage(imgData, 'JPEG', 15, 15, imgWidth, imgHeight)
      pdf.save(`${church.name.replace(/\s+/g, '-')}-report.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  // ── Share via Web Share API (WhatsApp) ───────────────────────────────────
  async function shareWhatsApp() {
    if (!reportRef.current) return
    setExporting(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      })
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85))
      const fileName = `${church.name}-attendance-report.jpg`

      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'image/jpeg' })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${church.name} — ${reportData.periodLabel}`,
            text: `Attendance report for ${reportData.periodLabel}`,
          })
          return
        }
      }
      // Fallback: download + prompt user to share manually
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: fileName })
      a.click()
      URL.revokeObjectURL(url)
      setTimeout(() => alert('Image downloaded — open WhatsApp and share it from your gallery.'), 300)
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err)
      }
    } finally {
      setExporting(false)
    }
  }

  const canGenerate = reportType === 'sunday' ? !!selectedDate : true

  return (
    <div className="page-content pb-12">
      <BackButton />

      {/* ── Page header ── */}
      <div>
        <h1 className="font-display text-2xl font-bold text-forest">Reports</h1>
        <p className="text-sm text-mist mt-0.5">Generate and share attendance reports</p>
      </div>

      {/* ── Report type toggle ── */}
      <div className="card">
        <p className="text-xs font-bold text-forest uppercase tracking-wide mb-3">Report Type</p>
        <div className="flex gap-2">
          <button
            onClick={() => { setReportType('sunday'); setGenerated(false) }}
            className={`btn flex-1 gap-2 ${reportType === 'sunday' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Calendar size={15} />
            Single Sunday
          </button>
          <button
            onClick={() => { setReportType('monthly'); setGenerated(false) }}
            className={`btn flex-1 gap-2 ${reportType === 'monthly' ? 'btn-primary' : 'btn-outline'}`}
          >
            <FileText size={15} />
            Monthly
          </button>
        </div>

        {/* Sunday picker */}
        {reportType === 'sunday' && (
          <div className="mt-4">
            {sessionDates.length === 0 ? (
              <p className="text-sm text-mist text-center py-4">No attendance sessions yet</p>
            ) : (
              <div>
                <p className="text-xs text-mist mb-2">Select a Sunday</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSundayIdx(i => Math.min(i + 1, sessionDates.length - 1)); setGenerated(false) }}
                    disabled={sundayIdx >= sessionDates.length - 1}
                    className="btn btn-ghost btn-sm px-2"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex-1 text-center">
                    <p className="font-semibold text-forest text-[15px]">
                      {selectedDate ? fmtDate(selectedDate) : '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => { setSundayIdx(i => Math.max(i - 1, 0)); setGenerated(false) }}
                    disabled={sundayIdx <= 0}
                    className="btn btn-ghost btn-sm px-2"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Month picker */}
        {reportType === 'monthly' && (
          <div className="mt-4">
            <p className="text-xs text-mist mb-2">Select a month</p>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="btn btn-ghost btn-sm px-2">
                <ChevronLeft size={16} />
              </button>
              <div className="flex-1 text-center">
                <p className="font-semibold text-forest text-[15px]">
                  {MONTHS[month]} {year}
                </p>
              </div>
              <button onClick={nextMonth} disabled={isCurrentMonth} className="btn btn-ghost btn-sm px-2">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={() => setGenerated(true)}
          disabled={!canGenerate}
          className="btn btn-primary w-full mt-4 gap-2"
        >
          <FileText size={15} />
          Generate Report
        </button>
      </div>

      {/* ── Generated report card + export buttons ── */}
      {generated && reportData && (
        <>
          {/* Export actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={exportPNG}
              disabled={exporting}
              className="btn btn-primary flex-1 gap-2"
            >
              <Download size={15} />
              {exporting ? 'Saving…' : 'Save Image'}
            </button>
            <button
              onClick={exportPDF}
              disabled={exporting}
              className="btn btn-outline flex-1 gap-2"
            >
              <FileText size={15} />
              PDF
            </button>
            <button
              onClick={shareWhatsApp}
              disabled={exporting}
              className="btn btn-sm gap-2 px-4"
              style={{ background: '#25D366', color: '#fff', border: 'none', borderRadius: 12 }}
            >
              <Share2 size={14} />
              WhatsApp
            </button>
          </div>

          {/* The report card preview */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              overflowX: 'auto',
              paddingBottom: 8,
            }}
          >
            <ReportCard
              church={church}
              data={reportData}
              type={reportType}
              reportRef={reportRef}
            />
          </div>
        </>
      )}

      {/* No sessions empty state */}
      {reportType === 'sunday' && sessionDates.length === 0 && (
        <div className="card text-center py-12 space-y-3">
          <Calendar size={40} className="text-mist mx-auto" strokeWidth={1.5} />
          <p className="font-semibold text-forest">No sessions yet</p>
          <p className="text-sm text-mist">Take attendance first to generate a report.</p>
          <a href="/attendance" className="btn btn-primary inline-flex gap-2">Take Attendance</a>
        </div>
      )}
    </div>
  )
}
