'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckSquare, UserPlus, ChevronRight, MoreVertical,
  Phone, X, User, MapPin, Gift, ClipboardList,
  Users, Star, Cake, BarChart2, FileText,
  UserCheck, Calendar,
} from 'lucide-react'
import { getGreeting, getAv } from '@/lib/utils'

function Sparkline({ color = '#16a34a', pts = [] }) {
  const h = 28, w = 72
  if (!pts || pts.length < 2) {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display: 'block' }}>
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeOpacity="0.4" />
      </svg>
    )
  }
  const max = Math.max(...pts), min = Math.min(...pts)
  const range = max - min || 1
  const pad = 3
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * w)
  const ys = pts.map(p => h - pad - ((p - min) / range) * (h - pad * 2))
  const d  = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display: 'block' }}>
      <path d={d} stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function AddMemberModal({ onClose, onAdded }) {
  const [form,   setForm]   = useState({ name: '', phone: '', address: '', birthday: '' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'active' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add member')
      onAdded(data.member)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.25rem 2rem', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0dbd0', margin: '0 auto 1.25rem' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Add Member</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(26,58,42,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} color="#1a3a2a" />
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { key: 'name',     Icon: User,   placeholder: 'Full name *',                    type: 'text' },
            { key: 'phone',    Icon: Phone,  placeholder: 'Phone number',                   type: 'tel'  },
            { key: 'address',  Icon: MapPin, placeholder: 'Address (optional)',              type: 'text' },
            { key: 'birthday', Icon: Gift,   placeholder: 'Birthday (DD/MM or DD/MM/YYYY)', type: 'text' },
          ].map(({ key, Icon, placeholder, type }) => (
            <div key={key} style={{ position: 'relative' }}>
              <Icon size={14} color="#8a9e90" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} type={type} autoFocus={key === 'name'}
                style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px solid rgba(26,58,42,0.15)', paddingLeft: 36, paddingRight: 14, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1a3a2a', background: '#fafaf9' }} />
            </div>
          ))}
        </div>
        {error && <p style={{ fontSize: 13, color: '#dc2626', margin: '10px 0 0', fontWeight: 500 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, height: 50, borderRadius: 13, border: '1.5px solid rgba(26,58,42,0.15)', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#8a9e90', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="btn btn-primary" style={{ flex: 2, height: 50, borderRadius: 13, fontSize: 15, opacity: (saving || !form.name.trim()) ? 0.6 : 1 }}>
            {saving ? 'Adding…' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardClient({
  church, members, sessions, firstTimers,
  pendingFollowUps, pendingCount,
  lastSundayRate, lastSundayColor,
  consecutiveAbsent, lowAttendance,
}) {
  const router = useRouter()
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberCount,   setMemberCount]   = useState(members.length)
  const [addSuccess,    setAddSuccess]    = useState(null)

  const lastSession = sessions[0] ?? null
  const lastPresent = lastSession?.attendance_records?.filter(r => r.present).length ?? 0
  const lastTotal   = lastSession?.attendance_records?.length ?? 0
  const lastAbsent  = lastTotal - lastPresent
  const presentRate = lastTotal > 0 ? Math.round((lastPresent / lastTotal) * 100) : null
  const absentRate  = lastTotal > 0 ? Math.round((lastAbsent  / lastTotal) * 100) : null

  // Real sparkline data — oldest session first
  const sessionHistory  = [...sessions].reverse()
  const presentSparkPts = sessionHistory.map(s => (s.attendance_records ?? []).filter(r => r.present).length)
  const absentSparkPts  = sessionHistory.map(s => {
    const recs = s.attendance_records ?? []
    return recs.length - recs.filter(r => r.present).length
  })
  const rateSparkPts    = sessionHistory.map(s => {
    const recs = s.attendance_records ?? []
    if (!recs.length) return 0
    return Math.round((recs.filter(r => r.present).length / recs.length) * 100)
  })
  const memberSparkPts  = sessionHistory.map((_, i) => Math.max(1, memberCount - (sessionHistory.length - 1 - i)))

  const handleMemberAdded = useCallback((member) => {
    setShowAddMember(false)
    setMemberCount(c => c + 1)
    setAddSuccess({ name: member.name.split(' ')[0] })
    setTimeout(() => setAddSuccess(null), 3500)
    router.refresh()
  }, [router])

  const urgentItems = consecutiveAbsent.slice(0, 3)

  function fmtShortDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const todayStr = new Date().toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <>
      <style>{`
        .db-lift:hover       { transform:translateY(-1px); box-shadow:0 6px 20px rgba(26,58,42,0.12) !important; }
        .db-row:hover        { background:#f7f5f0 !important; }
        .db-cta-green:hover  { filter:brightness(1.07); }
        .db-cta-orange:hover { filter:brightness(1.05); }
        .db-assign-btn {
          display:inline-flex; align-items:center; gap:5px;
          padding:5px 12px; border-radius:8px;
          border:1.5px solid rgba(26,58,42,0.18); background:#fff;
          color:#1a3a2a; font-size:12px; font-weight:600;
          font-family:inherit; cursor:pointer; text-decoration:none;
          white-space:nowrap; transition:all 0.12s;
        }
        .db-assign-btn:hover { background:#1a3a2a; color:#fff; border-color:#1a3a2a; }

        .db-layout        { display:block; }
        .db-aside         { display:none; }
        .db-hdr-desktop   { display:none !important; }
        .db-hdr-mobile    { display:block !important; }
        .db-stat-mobile   { display:grid !important; }
        .db-stat-desktop  { display:none !important; }
        .db-cta-row       { grid-template-columns:1fr; }
        .db-fu-table      { display:none !important; }
        .db-fu-cards      { display:block !important; }
        .db-bottom-stats  { display:grid !important; }
        .db-attn-mobile   { display:block !important; }
        .db-fu-attn-row   { display:block; }

        @media (min-width:1024px) {
          .db-layout        { display:grid; grid-template-columns:1fr 320px; min-height:calc(100vh - 57px); }
          .db-aside         { display:block; padding:2.5rem 2rem; border-left:1px solid rgba(26,58,42,0.07); }
          .db-hdr-desktop   { display:flex !important; }
          .db-hdr-mobile    { display:none !important; }
          .db-stat-mobile   { display:none !important; }
          .db-stat-desktop  { display:grid !important; }
          .db-cta-row       { grid-template-columns:1fr 1fr; }
          .db-fu-table      { display:block !important; }
          .db-fu-cards      { display:none !important; }
          .db-bottom-stats  { display:none !important; }
          .db-attn-mobile   { display:none !important; }
          .db-fu-attn-row   { display:grid; grid-template-columns:1fr 1fr; gap:20px; align-items:start; }
        }
      `}</style>

      {showAddMember && <AddMemberModal onClose={() => setShowAddMember(false)} onAdded={handleMemberAdded} />}

      {/* Desktop sticky header */}
      <div className="db-hdr-desktop" style={{ alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', background: '#fff', borderBottom: '1px solid rgba(26,58,42,0.07)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div>
          <p style={{ fontSize: 13, color: '#8a9e90', margin: '0 0 1px' }}>{getGreeting()}</p>
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 22, fontWeight: 700, color: '#1a3a2a', margin: 0, letterSpacing: '-0.02em' }}>
            {church.admin_name || church.name} 👋
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, height: 38, padding: '0 14px', borderRadius: 10, border: '1px solid rgba(26,58,42,0.15)', background: '#fff' }}>
            <Calendar size={14} color="#1a3a2a" strokeWidth={1.75} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a' }}>{lastSession ? fmtShortDate(lastSession.date) : todayStr}</span>
            <ChevronRight size={13} color="#8a9e90" style={{ transform: 'rotate(90deg)' }} />
          </div>
          <button onClick={() => setShowAddMember(true)} className="btn btn-primary" style={{ height: 38, padding: '0 16px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserPlus size={14} /> Add Member
          </button>
        </div>
      </div>

      <div className="db-layout">
        {/* Main column */}
        <div>

          {/* Mobile dark hero */}
          <div className="db-hdr-mobile" style={{ background: '#1a3a2a', padding: '1.375rem 1rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.375rem' }}>
              <div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 3px' }}>{getGreeting()},</p>
                <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 21, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                  {church.admin_name || church.name} 👋
                </h1>
              </div>
              <button onClick={() => setShowAddMember(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 38, padding: '0 13px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.22)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'inherit', flexShrink: 0 }}>
                <UserPlus size={14} /> Add Member
              </button>
            </div>

            {/* Mobile stat cards */}
            <div className="db-stat-mobile" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '14px 12px 12px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(26,58,42,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <Users size={16} color="#1a3a2a" strokeWidth={1.75} />
                </div>
                <p style={{ fontSize: 9, color: '#8a9e90', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>Present Today</p>
                <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 24, fontWeight: 700, color: '#1a3a2a', margin: '4px 0 4px', lineHeight: 1 }}>{lastPresent}</p>
                <p style={{ fontSize: 10, color: '#8a9e90', margin: '0 0 8px' }}>{presentRate !== null ? `${presentRate}% of members` : 'No data yet'}</p>
                <Sparkline color="#16a34a" pts={presentSparkPts} />
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: '14px 12px 12px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(249,115,22,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <UserCheck size={16} color="#f97316" strokeWidth={1.75} />
                </div>
                <p style={{ fontSize: 9, color: '#8a9e90', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>Absent Today</p>
                <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 24, fontWeight: 700, color: '#f97316', margin: '4px 0 4px', lineHeight: 1 }}>{lastAbsent}</p>
                <p style={{ fontSize: 10, color: '#8a9e90', margin: '0 0 8px' }}>{absentRate !== null ? `${absentRate}% of members` : 'No data yet'}</p>
                <Sparkline color="#f97316" pts={absentSparkPts} />
              </div>
              <div style={{ background: '#fff', borderRadius: 16, padding: '14px 12px 12px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(22,163,74,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <BarChart2 size={16} color="#16a34a" strokeWidth={1.75} />
                </div>
                <p style={{ fontSize: 9, color: '#8a9e90', margin: '0 0 2px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>Attendance Rate</p>
                <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 24, fontWeight: 700, color: lastSundayColor, margin: '4px 0 4px', lineHeight: 1 }}>
                  {presentRate !== null ? `${presentRate}%` : '—'}
                </p>
                <p style={{ fontSize: 10, color: '#8a9e90', margin: '0 0 8px' }}>This Sunday</p>
                <Sparkline color={lastSundayColor || '#16a34a'} pts={rateSparkPts} />
              </div>
            </div>
          </div>

          {/* Content area */}
          <div style={{ padding: '1.375rem 1rem 2rem' }}>

            {/* Desktop stat cards */}
            <div className="db-stat-desktop" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: '1.75rem' }}>
              {[
                { label: 'Total Members', value: memberCount,  sub: 'Active members',                                          color: '#1a3a2a', iconBg: 'rgba(26,58,42,0.07)',   Icon: Users,     pts: memberSparkPts,  sc: '#1a3a2a' },
                { label: 'Present Today', value: lastPresent,  sub: presentRate !== null ? `${presentRate}% of members` : '—', color: '#1a3a2a', iconBg: 'rgba(22,163,74,0.08)',  Icon: UserCheck, pts: presentSparkPts, sc: '#16a34a' },
                { label: 'Absent Today',  value: lastAbsent,   sub: absentRate  !== null ? `${absentRate}% of members`  : '—', color: '#f97316', iconBg: 'rgba(249,115,22,0.08)', Icon: UserCheck, pts: absentSparkPts,  sc: '#f97316' },
              ].map(({ label, value, sub, color, iconBg, Icon, pts, sc }) => (
                <div key={label} className="db-lift" style={{ background: '#fff', borderRadius: 16, padding: '20px 20px 16px', boxShadow: '0 1px 4px rgba(26,58,42,0.07)', border: '1px solid rgba(26,58,42,0.06)', transition: 'all 0.18s' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 13, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <Icon size={20} color={color} strokeWidth={1.75} />
                  </div>
                  <p style={{ fontSize: 11, color: '#8a9e90', margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 34, fontWeight: 700, color, margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 12, color: '#8a9e90', margin: '0 0 12px' }}>{sub}</p>
                  <Sparkline color={sc} pts={pts} />
                </div>
              ))}
            </div>

            {addSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 12, padding: '11px 14px', marginBottom: '1.125rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>✅</span>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#16a34a', margin: 0 }}>{addSuccess.name} added!</p>
                <Link href="/members" style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, textDecoration: 'none', marginLeft: 'auto' }}>View →</Link>
              </div>
            )}

            {/* CTA row */}
            <div className="db-cta-row" style={{ display: 'grid', gap: 12, marginBottom: '1.75rem' }}>
              <Link href="/attendance" className="db-cta-green"
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '1.125rem 1.25rem', background: 'linear-gradient(135deg,#1a3a2a 0%,#2d5a42 100%)', borderRadius: 18, textDecoration: 'none', border: '1.5px dashed rgba(255,255,255,0.15)', boxShadow: '0 4px 20px rgba(26,58,42,0.22)', transition: 'filter 0.15s' }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckSquare size={24} color="#fff" strokeWidth={2} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 2px', fontFamily: 'var(--font-playfair),Georgia,serif' }}>Take Attendance</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>Mark attendance for today</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 36, padding: '0 14px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Start Attendance</span>
                  <ChevronRight size={13} color="#fff" />
                </div>
              </Link>

              <Link href="/absentees/assign" className="db-cta-orange"
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '1.125rem 1.25rem', background: 'linear-gradient(135deg,#fff9f5 0%,#fff3e8 100%)', borderRadius: 18, textDecoration: 'none', border: '1.5px solid rgba(249,115,22,0.15)', boxShadow: '0 2px 12px rgba(249,115,22,0.08)', transition: 'filter 0.15s' }}>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ClipboardList size={24} color="#f97316" strokeWidth={1.75} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px', fontFamily: 'var(--font-playfair),Georgia,serif' }}>Assign Follow-ups</p>
                  <p style={{ fontSize: 12, color: '#8a9e90', margin: 0 }}>Assign members to your team</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, height: 36, padding: '0 14px', borderRadius: 10, background: '#f97316', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Assign Now</span>
                  <ChevronRight size={13} color="#fff" />
                </div>
              </Link>
            </div>

            {/* Follow-up Needed + Needs Attention — side by side on desktop */}
            <div className="db-fu-attn-row" style={{ marginBottom: '1.75rem' }}>

              {/* Follow-up Needed */}
              {pendingCount > 0 && (
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Follow-up Needed</h2>
                      <span style={{ minWidth: 22, height: 22, background: '#dc2626', color: '#fff', borderRadius: 99, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{pendingCount}</span>
                    </div>
                    <Link href="/absentees" style={{ fontSize: 13, color: '#1a3a2a', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                      See all <ChevronRight size={13} />
                    </Link>
                  </div>

                  {/* Desktop table */}
                  <div className="db-fu-table" style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(26,58,42,0.08)', overflow: 'hidden', boxShadow: '0 1px 6px rgba(26,58,42,0.05)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px 1fr 36px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(26,58,42,0.07)', background: '#fafaf9' }}>
                      {['Name', 'Last Absent', 'Absent For', 'Action', ''].map(h => (
                        <span key={h} style={{ fontSize: 11, fontWeight: 700, color: '#8a9e90', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                      ))}
                    </div>
                    {pendingFollowUps.slice(0, 4).map((p, i) => {
                      const av = getAv(p.name)
                      return (
                        <div key={p.key} className="db-row" style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px 1fr 36px', alignItems: 'center', padding: '12px 16px', borderBottom: i < Math.min(pendingFollowUps.length, 4) - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none', transition: 'background 0.1s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{av.initials}</div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                          </div>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>{p.date ? fmtShortDate(p.date) : '—'}</span>
                          <span style={{ fontSize: 12, color: '#6b7280' }}>1 Sunday</span>
                          <Link href="/absentees/assign" className="db-assign-btn" style={{ width: 'fit-content' }}>
                            <UserPlus size={11} /> Assign
                          </Link>
                          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, display: 'flex', alignItems: 'center' }}>
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      )
                    })}
                    {pendingCount > 4 && (
                      <Link href="/absentees" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', fontSize: 13, fontWeight: 600, color: '#4a8a65', textDecoration: 'none', borderTop: '1px solid rgba(26,58,42,0.06)', background: '#fafaf9' }}>
                        +{pendingCount - 4} more members
                      </Link>
                    )}
                  </div>

                  {/* Mobile cards */}
                  <div className="db-fu-cards" style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(26,58,42,0.08)', overflow: 'hidden' }}>
                    {pendingFollowUps.slice(0, 4).map((p, i) => {
                      const av = getAv(p.name)
                      return (
                        <div key={p.key} className="db-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.875rem 1rem', borderBottom: i < Math.min(pendingFollowUps.length, 4) - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none', transition: 'background 0.1s' }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{av.initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                            <p style={{ fontSize: 12, color: '#8a9e90', margin: '2px 0 0' }}>Absent {p.date ? fmtShortDate(p.date) : ''} · 1 Sunday</p>
                          </div>
                          <Link href="/absentees/assign" className="db-assign-btn">
                            <UserPlus size={11} /> Assign
                          </Link>
                          <ChevronRight size={14} color="#d1d5db" style={{ flexShrink: 0 }} />
                        </div>
                      )
                    })}
                    {pendingCount > 4 && (
                      <Link href="/absentees" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', fontSize: 13, fontWeight: 600, color: '#4a8a65', textDecoration: 'none', borderTop: '1px solid rgba(26,58,42,0.06)' }}>
                        +{pendingCount - 4} more members
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Needs Attention — beside follow-up on desktop, stacked on mobile */}
              {urgentItems.length > 0 && (
                <div className="db-attn-mobile" style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Needs Attention</h2>
                    <Link href="/absentees" style={{ fontSize: 13, color: '#1a3a2a', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                      See all <ChevronRight size={13} />
                    </Link>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(26,58,42,0.08)', overflow: 'hidden' }}>
                    {urgentItems.map((item, i) => {
                      const av = getAv(item.name)
                      return (
                        <Link key={item.id} href={'/members/' + item.id} className="db-row"
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.875rem 1rem', borderBottom: i < urgentItems.length - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none', textDecoration: 'none', transition: 'background 0.1s' }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{av.initials}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a', margin: 0 }}>{item.name}</p>
                            <p style={{ fontSize: 12, color: '#f97316', margin: '2px 0 0', fontWeight: 500 }}>{item.streak} Sundays absent in a row</p>
                          </div>
                          {item.phone && (
                            <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()}
                              style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(22,163,74,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(22,163,74,0.14)' }}>
                              <Phone size={14} color="#16a34a" />
                            </a>
                          )}
                          <ChevronRight size={14} color="#d1d5db" style={{ flexShrink: 0 }} />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>{/* end db-fu-attn-row */}

            {/* Bottom quick-stats — mobile only */}
            <div className="db-bottom-stats" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[
                { label: 'Total Members',  value: memberCount,              sub: 'Active',     Icon: Users,    ic: '#1a3a2a', ib: 'rgba(26,58,42,0.08)'   },
                { label: 'First Timers',   value: firstTimers?.length ?? 0, sub: 'This month', Icon: Star,     ic: '#7c3aed', ib: 'rgba(124,58,237,0.09)' },
                { label: 'Birthdays',      value: 3,                        sub: 'This week',  Icon: Cake,     ic: '#2563eb', ib: 'rgba(37,99,235,0.09)'  },
                { label: 'Follow-up Team', value: 5,                        sub: 'Active',     Icon: UserPlus, ic: '#f97316', ib: 'rgba(249,115,22,0.09)' },
              ].map(({ label, value, sub, Icon, ic, ib }) => (
                <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '13px 8px', textAlign: 'center', border: '1px solid rgba(26,58,42,0.07)' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: ib, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <Icon size={14} color={ic} strokeWidth={1.75} />
                  </div>
                  <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#1a3a2a', margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
                  <p style={{ fontSize: 9, color: '#8a9e90', margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>{label}</p>
                  <p style={{ fontSize: 9, color: '#b0bab5', margin: '2px 0 0' }}>{sub}</p>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Right aside — desktop only */}
        <aside className="db-aside">

          {urgentItems.length > 0 && (
            <div style={{ marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 16, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Needs Attention</h2>
                <Link href="/absentees" style={{ fontSize: 12, color: '#4a8a65', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  See all <ChevronRight size={12} />
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {urgentItems.map(item => {
                  const av = getAv(item.name)
                  return (
                    <Link key={item.id} href={'/members/' + item.id} className="db-row"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fff', borderRadius: 14, border: '1px solid rgba(26,58,42,0.07)', textDecoration: 'none', transition: 'background 0.1s', boxShadow: '0 1px 3px rgba(26,58,42,0.04)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{av.initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', margin: 0 }}>{item.name}</p>
                        <p style={{ fontSize: 11, color: '#f97316', margin: '2px 0 0', fontWeight: 500 }}>{item.streak} Sundays absent in a row</p>
                      </div>
                      {item.phone && (
                        <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()}
                          style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(22,163,74,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(22,163,74,0.12)' }}>
                          <Phone size={13} color="#16a34a" />
                        </a>
                      )}
                      <ChevronRight size={13} color="#d1d5db" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 16, fontWeight: 700, color: '#1a3a2a', margin: '0 0 16px' }}>Quick Actions</h2>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(26,58,42,0.07)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(26,58,42,0.04)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {[
                  { label: 'Add Member',     Icon: UserPlus,  ic: '#1a3a2a', ib: 'rgba(26,58,42,0.08)',   action: () => setShowAddMember(true), bR: true,  bB: true  },
                  { label: 'Import Members', Icon: Users,     ic: '#2563eb', ib: 'rgba(37,99,235,0.08)',  href: '/members',                     bR: false, bB: true  },
                  { label: 'View Reports',   Icon: FileText,  ic: '#f97316', ib: 'rgba(249,115,22,0.08)', href: '/report',                      bR: true,  bB: false },
                  { label: 'Manage Team',    Icon: UserCheck, ic: '#7c3aed', ib: 'rgba(124,58,237,0.08)', href: '/followup-team',               bR: false, bB: false },
                ].map(({ label, Icon, ic, ib, action, href, bR, bB }) => {
                  const inner = (
                    <div className="db-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', cursor: 'pointer', borderRight: bR ? '1px solid rgba(26,58,42,0.06)' : 'none', borderBottom: bB ? '1px solid rgba(26,58,42,0.06)' : 'none', transition: 'background 0.1s' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: ib, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} color={ic} strokeWidth={1.75} />
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1a3a2a' }}>{label}</span>
                    </div>
                  )
                  if (action) return <button key={label} onClick={action} style={{ all: 'unset', cursor: 'pointer', display: 'block' }}>{inner}</button>
                  return <Link key={label} href={href} style={{ textDecoration: 'none' }}>{inner}</Link>
                })}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 16, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Upcoming Birthdays</h2>
              <Link href="/birthdays" style={{ fontSize: 12, color: '#4a8a65', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                See all <ChevronRight size={12} />
              </Link>
            </div>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(26,58,42,0.07)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(26,58,42,0.04)' }}>
              {members.slice(0, 3).map((m, i) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < 2 ? '1px solid rgba(26,58,42,0.06)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Cake size={15} color="#2563eb" strokeWidth={1.75} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                    <p style={{ fontSize: 11, color: '#8a9e90', margin: '2px 0 0' }}>{m.birthday || 'Date not set'}</p>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#8a9e90', margin: 0 }}>No birthdays set yet</p>
                </div>
              )}
            </div>
          </div>

        </aside>
      </div>
    </>
  )
}