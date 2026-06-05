'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckSquare, UserPlus, Star, Cake, Users, BarChart2, FileText,
  ChevronRight, Phone, AlertTriangle, TrendingUp, TrendingDown,
  X, User, Hash, MapPin, Gift,
} from 'lucide-react'
import { getGreeting, getAv } from '@/lib/utils'

// ── Inline Add Member Modal ────────────────────────────────────────────────────
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, status: 'active' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add member')
      onAdded(data.member)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.25rem 2rem', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)' }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e0dbd0', margin: '0 auto 1.25rem' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Add Member</h2>
            <p style={{ fontSize: 12, color: '#8a9e90', margin: '3px 0 0' }}>Quick add a new member to your list</p>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(26,58,42,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={15} color="#1a3a2a" />
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Name */}
          <div style={{ position: 'relative' }}>
            <User size={14} color="#8a9e90" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Full name *"
              autoFocus
              style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px solid rgba(26,58,42,0.15)', paddingLeft: 36, paddingRight: 14, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1a3a2a', background: '#fafaf9' }}
            />
          </div>

          {/* Phone */}
          <div style={{ position: 'relative' }}>
            <Phone size={14} color="#8a9e90" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              placeholder="Phone number"
              type="tel"
              style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px solid rgba(26,58,42,0.15)', paddingLeft: 36, paddingRight: 14, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1a3a2a', background: '#fafaf9' }}
            />
          </div>

          {/* Address */}
          <div style={{ position: 'relative' }}>
            <MapPin size={14} color="#8a9e90" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={form.address}
              onChange={e => set('address', e.target.value)}
              placeholder="Address (optional)"
              style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px solid rgba(26,58,42,0.15)', paddingLeft: 36, paddingRight: 14, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1a3a2a', background: '#fafaf9' }}
            />
          </div>

          {/* Birthday */}
          <div style={{ position: 'relative' }}>
            <Gift size={14} color="#8a9e90" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              value={form.birthday}
              onChange={e => set('birthday', e.target.value)}
              placeholder="Birthday (DD/MM or DD/MM/YYYY)"
              style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px solid rgba(26,58,42,0.15)', paddingLeft: 36, paddingRight: 14, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1a3a2a', background: '#fafaf9' }}
            />
          </div>
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#dc2626', margin: '10px 0 0', fontWeight: 500 }}>{error}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, height: 50, borderRadius: 13, border: '1.5px solid rgba(26,58,42,0.15)', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#8a9e90', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className="btn btn-primary"
            style={{ flex: 2, height: 50, borderRadius: 13, fontSize: 15, opacity: (saving || !form.name.trim()) ? 0.6 : 1 }}
          >
            {saving ? 'Adding…' : 'Add Member'}
          </button>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#8a9e90', marginTop: 10 }}>
          You can add them to groups on the Members page
        </p>
      </div>
    </div>
  )
}

// ── Pending follow-up item ─────────────────────────────────────────────────────
function FollowUpItem({ p, i, total }) {
  const av = getAv(p.name)
  return (
    <Link href="/absentees" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 1rem', borderBottom: i < total - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none', textDecoration: 'none' }} className="d-row">
      <div style={{ width: 32, height: 32, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        {av.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
        <p style={{ fontSize: 11, color: '#8a9e90', margin: '2px 0 0' }}>Absent {p.date ? new Date(p.date + 'T00:00:00').toLocaleDateString('en-NG', { month: 'short', day: 'numeric' }) : ''}</p>
      </div>
      {p.phone && (
        <a href={`tel:${p.phone}`} onClick={e => e.stopPropagation()} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Phone size={13} color="#16a34a" />
        </a>
      )}
      <ChevronRight size={13} color="#c9c9c9" style={{ flexShrink: 0 }} />
    </Link>
  )
}

// ── Show-more list ─────────────────────────────────────────────────────────────
function AttentionRow({ item }) {
  const av = getAv(item.name)
  return (
    <Link href={'/members/' + item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.65rem 1rem', borderBottom: '1px solid rgba(26,58,42,0.05)', textDecoration: 'none' }} className="d-row">
      <div style={{ width: 30, height: 30, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
        {av.initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', margin: 0 }}>{item.name}</p>
        {item.streak !== undefined && (
          <p style={{ fontSize: 11, color: '#d97706', margin: '2px 0 0' }}>{item.streak} Sundays absent in a row</p>
        )}
        {item.percentage !== undefined && (
          <p style={{ fontSize: 11, color: '#dc2626', margin: '2px 0 0' }}>{item.attended}/{item.total} Sundays this month ({item.percentage}%)</p>
        )}
      </div>
      {item.phone && (
        <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Phone size={13} color="#16a34a" />
        </a>
      )}
      <ChevronRight size={13} color="#c9c9c9" style={{ flexShrink: 0 }} />
    </Link>
  )
}

// ── Main dashboard client component ───────────────────────────────────────────
export default function DashboardClient({
  church, members, sessions, firstTimers,
  pendingFollowUps, pendingCount,
  lastSundayRate, lastSundayColor,
  consecutiveAbsent, lowAttendance,
}) {
  const router = useRouter()
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberCount,   setMemberCount]   = useState(members.length)
  const [showAllAbsent, setShowAllAbsent] = useState(false)
  const [showAllLow,    setShowAllLow]    = useState(false)
  const [addSuccess,    setAddSuccess]    = useState(null) // { name }

  const avgRate = sessions.length > 0
    ? Math.round(
        sessions.slice(0, 4).reduce((sum, s) => {
          const t = s.attendance_records?.length ?? 0
          const p = s.attendance_records?.filter(r => r.present).length ?? 0
          return sum + (t > 0 ? (p / t) * 100 : 0)
        }, 0) / Math.min(sessions.length, 4)
      )
    : null

  const handleMemberAdded = useCallback((member) => {
    setShowAddMember(false)
    setMemberCount(c => c + 1)
    setAddSuccess({ name: member.name.split(' ')[0] })
    setTimeout(() => setAddSuccess(null), 3500)
    router.refresh()
  }, [router])

  const firstName = (church.admin_name || '').split(' ')[0]

  return (
    <>
      <style>{`
        .d-cta:hover    { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(26,58,42,0.38) !important; }
        .d-action:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,58,42,0.14) !important; }
        .d-stat:hover   { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,58,42,0.1) !important; }
        .d-quick:hover  { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,58,42,0.12) !important; }
        .d-row:hover    { background: #fafaf9 !important; }
      `}</style>

      {showAddMember && (
        <AddMemberModal
          onClose={() => setShowAddMember(false)}
          onAdded={handleMemberAdded}
        />
      )}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem 5rem' }}>

        {/* ── Greeting ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, color: '#8a9e90', margin: '0 0 2px' }}>{getGreeting()}</p>
            <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 24, fontWeight: 700, color: '#1a3a2a', margin: 0, letterSpacing: '-0.02em' }}>
              {church.admin_name || church.name}
            </h1>
            <p style={{ fontSize: 13, color: '#8a9e90', margin: '3px 0 0' }}>{church.name}</p>
          </div>
          <Link href="/profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1px solid rgba(26,58,42,0.1)', color: '#4a8a65', textDecoration: 'none', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }} title="Settings">
            ⚙️
          </Link>
        </div>

        {/* ── Success toast ── */}
        {addSuccess && (
          <div style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.25)', borderRadius: 12, padding: '12px 16px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#16a34a', margin: 0 }}>{addSuccess.name} added successfully!</p>
            <Link href="/members" style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, textDecoration: 'none', marginLeft: 'auto' }}>View members →</Link>
          </div>
        )}

        {/* ── MAIN ACTION — Take Attendance ── */}
        <Link href="/attendance" className="d-cta" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '1.125rem 1.375rem', background: 'linear-gradient(135deg,#1a3a2a 0%,#2d5a42 100%)', borderRadius: 18, textDecoration: 'none', marginBottom: '1rem', boxShadow: '0 6px 24px rgba(26,58,42,0.28)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'rgba(201,168,76,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckSquare size={22} color="#c9a84c" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Take Attendance</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', margin: '2px 0 0' }}>
              {lastSundayRate !== null ? `Last Sunday: ${lastSundayRate}% attendance` : 'Mark who came today'}
            </p>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
        </Link>

        {/* ── QUICK ACTIONS GRID — 4 up ── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#8a9e90', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>Quick Actions</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

            {/* Add Member */}
            <button
              onClick={() => setShowAddMember(true)}
              className="d-action"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.875rem 1rem', background: '#fff', border: '1.5px solid rgba(26,58,42,0.12)', borderRadius: 15, cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.18s ease, box-shadow 0.18s ease', fontFamily: 'inherit' }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(26,58,42,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UserPlus size={17} color="#1a3a2a" strokeWidth={1.75} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Add Member</p>
                <p style={{ fontSize: 11, color: '#8a9e90', margin: '2px 0 0' }}>{memberCount} total</p>
              </div>
            </button>

            {/* First Timers */}
            <Link href="/firsttimers" className="d-action" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.875rem 1rem', background: '#fff', border: '1.5px solid rgba(26,58,42,0.12)', borderRadius: 15, textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Star size={17} color="#c9a84c" strokeWidth={1.75} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>First Timers</p>
                <p style={{ fontSize: 11, color: '#8a9e90', margin: '2px 0 0' }}>{firstTimers?.length ?? 0} recorded</p>
              </div>
            </Link>

            {/* Birthdays */}
            <Link href="/birthdays" className="d-action" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.875rem 1rem', background: '#fff', border: '1.5px solid rgba(26,58,42,0.12)', borderRadius: 15, textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(220,38,38,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Cake size={17} color="#dc2626" strokeWidth={1.75} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Birthdays</p>
                <p style={{ fontSize: 11, color: '#8a9e90', margin: '2px 0 0' }}>This month</p>
              </div>
            </Link>

            {/* Members */}
            <Link href="/members" className="d-action" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.875rem 1rem', background: '#fff', border: '1.5px solid rgba(26,58,42,0.12)', borderRadius: 15, textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(74,138,101,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Users size={17} color="#4a8a65" strokeWidth={1.75} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Members</p>
                <p style={{ fontSize: 11, color: '#8a9e90', margin: '2px 0 0' }}>Manage list</p>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: '1.25rem' }}>
          {[
            { label: 'Last Sunday', value: lastSundayRate !== null ? `${lastSundayRate}%` : '—', color: lastSundayColor, Icon: lastSundayRate !== null && lastSundayRate >= 70 ? TrendingUp : TrendingDown, sub: 'attendance' },
            { label: 'Avg (4wk)', value: avgRate !== null ? `${avgRate}%` : '—', color: '#1a3a2a', Icon: BarChart2, sub: 'rate' },
            { label: 'Members', value: memberCount, color: '#4a8a65', Icon: Users, sub: 'active' },
          ].map(({ label, value, color, Icon, sub }) => (
            <div key={label} className="d-stat" style={{ background: '#fff', borderRadius: 14, padding: '0.875rem 0.875rem', border: '1px solid rgba(26,58,42,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.18s ease, box-shadow 0.18s ease', textAlign: 'center' }}>
              <Icon size={15} color={color} strokeWidth={1.75} style={{ margin: '0 auto 5px', display: 'block' }} />
              <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color, margin: 0 }}>{value}</p>
              <p style={{ fontSize: 10, color: '#8a9e90', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Secondary quick links ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: '1.25rem' }}>
          {[
            { label: 'Reports',   Icon: FileText,  href: '/report',    desc: 'Generate & share' },
            { label: 'Analytics', Icon: BarChart2, href: '/analytics', desc: 'Trends & rates' },
            { label: 'Absentees', Icon: Users,     href: '/absentees', desc: pendingCount > 0 ? `${pendingCount} need follow-up` : 'Follow up' },
          ].map(({ label, Icon, href, desc }) => (
            <Link key={label} href={href} className="d-quick" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', padding: '0.875rem 0.5rem', background: '#fff', border: '1px solid rgba(26,58,42,0.09)', borderRadius: 13, textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(26,58,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 7 }}>
                <Icon size={15} color="#1a3a2a" strokeWidth={1.75} />
              </div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px' }}>{label}</p>
              <p style={{ fontSize: 10, color: '#8a9e90', margin: 0, lineHeight: 1.3 }}>{desc}</p>
              {label === 'Absentees' && pendingCount > 0 && (
                <span style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pendingCount > 9 ? '9+' : pendingCount}</span>
              )}
            </Link>
          ))}
        </div>

        {/* ── Follow-up needed ── */}
        {pendingCount > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Follow-up Needed</h2>
              <Link href="/absentees" style={{ fontSize: 13, color: '#4a8a65', fontWeight: 700, textDecoration: 'none' }}>View all {pendingCount} →</Link>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(220,38,38,0.14)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {pendingFollowUps.slice(0, 4).map((p, i) => (
                <FollowUpItem key={p.key} p={p} i={i} total={Math.min(pendingFollowUps.length, 4)} />
              ))}
              {pendingCount > 4 && (
                <Link href="/absentees" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.6rem', borderTop: '1px solid rgba(26,58,42,0.06)', fontSize: 13, fontWeight: 700, color: '#dc2626', textDecoration: 'none', background: 'rgba(220,38,38,0.03)' }}>
                  +{pendingCount - 4} more people need follow-up →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Needs Attention: consecutive absences ── */}
        {consecutiveAbsent.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Absent Multiple Sundays</h2>
              {consecutiveAbsent.length > 3 && (
                <button onClick={() => setShowAllAbsent(v => !v)} style={{ fontSize: 13, color: '#4a8a65', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  {showAllAbsent ? 'Show less' : `See all ${consecutiveAbsent.length} →`}
                </button>
              )}
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(217,119,6,0.14)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {(showAllAbsent ? consecutiveAbsent : consecutiveAbsent.slice(0, 3)).map(item => (
                <AttentionRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* ── Needs Attention: low attendance this month ── */}
        {lowAttendance.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Low Attendance This Month</h2>
              {lowAttendance.length > 3 && (
                <button onClick={() => setShowAllLow(v => !v)} style={{ fontSize: 13, color: '#4a8a65', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  {showAllLow ? 'Show less' : `See all ${lowAttendance.length} →`}
                </button>
              )}
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(220,38,38,0.14)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {(showAllLow ? lowAttendance : lowAttendance.slice(0, 3)).map(item => (
                <AttentionRow key={item.id} item={item} />
              ))}
            </div>
          </div>
        )}

        {/* ── Recent sessions ── */}
        {sessions.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Recent Sessions</h2>
              <Link href="/attendance" style={{ fontSize: 13, color: '#4a8a65', fontWeight: 700, textDecoration: 'none' }}>Take attendance →</Link>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {sessions.slice(0, 5).map((s, i) => {
                const total   = s.attendance_records?.length ?? 0
                const present = s.attendance_records?.filter(r => r.present).length ?? 0
                const rate    = total > 0 ? Math.round((present / total) * 100) : 0
                const rateColor = rate >= 70 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'
                return (
                  <div key={s.id} className="d-row" style={{ display: 'flex', alignItems: 'center', padding: '0.7rem 1rem', borderBottom: i < Math.min(sessions.length, 5) - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', margin: 0 }}>
                        {new Date(s.date + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {s.groups?.name && <span style={{ fontSize: 11, color: '#8a9e90', marginLeft: 6 }}>· {s.groups.name}</span>}
                      </p>
                      <p style={{ fontSize: 11, color: '#8a9e90', margin: '2px 0 0' }}>{present} of {total} present</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: rateColor }}>{rate}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
