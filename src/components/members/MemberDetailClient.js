'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/ui/BackButton'
import { MemberFormModal } from '@/components/members/MembersClient'
import { getAv, fmtBday, normBirthday, toWhatsAppNumber, fmtDate } from '@/lib/utils'
import {
  Phone, MapPin, Cake, Users, Pencil, Trash2,
  CheckCircle, XCircle, Calendar, MessageSquare,
  ChevronLeft, MoreVertical, Share2,
} from 'lucide-react'

// WhatsApp icon (Lucide doesn't have one)
function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function StickyNoteIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/>
      <path d="M15 3v4a1 1 0 0 0 1 1h4"/>
    </svg>
  )
}

export default function MemberDetailClient({ member: initialMember, groups, attendanceHistory, churchId }) {
  const router = useRouter()
  const [member, setMember] = useState(initialMember)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const av = getAv(member.name)
  const waNum = toWhatsAppNumber(member.phone ?? '')
  const memberGroups = (member.groupIds ?? []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean)

  const attendedCount = attendanceHistory.filter(r => r.present).length
  const totalCount = attendanceHistory.length
  const absentCount = totalCount - attendedCount
  const attendRate = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : null
  const lastSeen = attendanceHistory.find(r => r.present)?.attendance_sessions?.date
  const lastAbsent = attendanceHistory.find(r => !r.present)?.attendance_sessions?.date

  // Calculate weeks since last seen
  function weeksSince(dateStr) {
    if (!dateStr) return null
    const d = new Date(dateStr + 'T00:00:00')
    const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 7))
    return diff
  }
  const weeksSinceSeen = weeksSince(lastSeen)

  const statusColors = {
    active:   { bg: 'rgba(22,163,74,0.1)',  text: '#16a34a', label: 'Active'   },
    inactive: { bg: 'rgba(26,58,42,0.08)',  text: '#4a8a65', label: 'Inactive' },
    away:     { bg: 'rgba(217,119,6,0.1)', text: '#d97706', label: 'Away'     },
  }
  const sc = statusColors[member.status] ?? statusColors.inactive

  async function handleSave(formData) {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: member.id, ...formData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setMember(data.member)
      setEditing(false)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch('/api/members?id=' + member.id, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      router.push('/members')
    } catch { setDeleting(false) }
  }

  return (
    <div className="page-content">
      <BackButton />

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        borderRadius: 20,
        border: '1px solid rgba(26,58,42,0.07)',
        boxShadow: '0 2px 8px rgba(26,58,42,0.07)',
        overflow: 'hidden',
      }}>
        {/* Green top band */}
        <div style={{ height: 6, background: 'linear-gradient(90deg, #1a3a2a, #4a8a65)' }} />

        <div style={{ padding: '1.5rem 1.25rem 0' }}>
          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: '1.25rem' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20,
              background: av.bg, color: av.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 700, flexShrink: 0,
              boxShadow: '0 2px 12px rgba(26,58,42,0.12)',
            }}>
              {av.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 22, fontWeight: 700, color: '#1a3a2a', margin: 0, lineHeight: 1.2 }}>{member.name}</h1>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: sc.bg, color: sc.text, whiteSpace: 'nowrap' }}>
                  {sc.label}
                </span>
              </div>
              {memberGroups.length > 0 && (
                <p style={{ fontSize: 13, color: '#8a9e90', margin: '0 0 4px' }}>{memberGroups.join(', ')}</p>
              )}
              {member.phone && (
                <p style={{ fontSize: 12.5, color: '#4a8a65', margin: 0, fontWeight: 500 }}>{member.phone}</p>
              )}
            </div>
            <button onClick={() => setEditing(true)}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid rgba(26,58,42,0.14)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Pencil size={14} color="#1a3a2a" />
            </button>
          </div>

          {/* ── Action bar ─────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderTop: '1px solid rgba(26,58,42,0.07)', margin: '0 -1.25rem' }}>
            {[
              { label: 'Call', Icon: Phone, href: member.phone ? `tel:${member.phone}` : null, color: '#1a3a2a' },
              { label: 'WhatsApp', Icon: WhatsAppIcon, href: waNum ? `https://wa.me/${waNum}` : null, color: '#25D366' },
              { label: 'Message', Icon: MessageSquare, href: member.phone ? `sms:${member.phone}` : null, color: '#2563eb' },
              { label: 'Note', Icon: StickyNoteIcon, action: () => setEditing(true), color: '#d97706' },
            ].map(({ label, Icon, href, action, color }, i) => {
              const disabled = !href && !action
              const el = (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 5, padding: '1rem 0.5rem',
                  borderRight: i < 3 ? '1px solid rgba(26,58,42,0.07)' : 'none',
                  opacity: disabled ? 0.35 : 1,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: disabled ? 'rgba(26,58,42,0.05)' : `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={disabled ? '#8a9e90' : color} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: disabled ? '#b0bab5' : '#1a3a2a' }}>{label}</span>
                </div>
              )
              if (href) return <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" style={{ textDecoration: 'none' }}>{el}</a>
              if (action) return <button key={label} onClick={action} style={{ background: 'none', border: 'none', padding: 0 }}>{el}</button>
              return <div key={label}>{el}</div>
            })}
          </div>
        </div>
      </div>

      {/* ── Attendance Summary ──────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(26,58,42,0.07)', padding: '1.25rem', boxShadow: '0 1px 4px rgba(26,58,42,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
          <Calendar size={15} color="#4a8a65" strokeWidth={1.75} />
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 16, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Attendance Summary</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.125rem' }}>
          {[
            { label: 'Present', value: attendedCount, color: '#16a34a', sub: totalCount > 0 ? `${attendRate}%` : '' },
            { label: 'Absent', value: absentCount, color: '#dc2626', sub: totalCount > 0 ? `${100 - (attendRate ?? 0)}%` : '' },
            { label: 'Last seen', value: weeksSinceSeen !== null ? `${weeksSinceSeen}w` : '—', color: '#1a3a2a', sub: lastSeen ? fmtDate(lastSeen) : 'Never' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} style={{ textAlign: 'center', padding: '12px 8px', background: '#fafaf9', borderRadius: 14 }}>
              <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 26, fontWeight: 700, color, margin: '0 0 2px', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: '#8a9e90', margin: 0, fontWeight: 600 }}>{label}</p>
              {sub && <p style={{ fontSize: 10, color: '#b0bab5', margin: '2px 0 0' }}>{sub}</p>}
            </div>
          ))}
        </div>

        {/* Attendance streak visualization */}
        {attendanceHistory.length > 0 && (
          <div>
            <p style={{ fontSize: 11, color: '#8a9e90', fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.04em' }}>RECENT SESSIONS</p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {attendanceHistory.slice(0, 12).reverse().map((r, i) => (
                <div key={i} title={fmtDate(r.attendance_sessions?.date) + (r.present ? ' — Present' : ' — Absent')}
                  style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: r.present ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.08)', border: `1.5px solid ${r.present ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.15)'}` }}>
                  {r.present
                    ? <CheckCircle size={13} color="#16a34a" />
                    : <XCircle size={13} color="#dc2626" />
                  }
                </div>
              ))}
              {attendanceHistory.length > 12 && (
                <div style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(26,58,42,0.06)', fontSize: 10, fontWeight: 700, color: '#8a9e90' }}>
                  +{attendanceHistory.length - 12}
                </div>
              )}
            </div>
          </div>
        )}
        {attendanceHistory.length === 0 && (
          <p style={{ fontSize: 13, color: '#8a9e90', textAlign: 'center', margin: 0 }}>No attendance records yet</p>
        )}
      </div>

      {/* ── Member details ──────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(26,58,42,0.07)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(26,58,42,0.06)' }}>
        {[
          member.phone    && { Icon: Phone,   label: 'Phone',    value: member.phone,                    href: `tel:${member.phone}` },
          member.address  && { Icon: MapPin,  label: 'Address',  value: member.address,                  href: null },
          member.birthday && { Icon: Cake,    label: 'Birthday', value: fmtBday(normBirthday(member.birthday)), href: null },
          memberGroups.length > 0 && { Icon: Users, label: 'Groups', value: memberGroups.join(', '), href: null },
        ].filter(Boolean).map(({ Icon, label, value, href }, i, arr) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < arr.length - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(26,58,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={14} color="#4a8a65" strokeWidth={1.75} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, color: '#8a9e90', margin: '0 0 1px', fontWeight: 600 }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 500, color: '#1a3a2a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
            </div>
            {href && (
              <a href={href} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(22,163,74,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(22,163,74,0.12)' }}>
                <Phone size={13} color="#16a34a" />
              </a>
            )}
          </div>
        ))}
        {!member.phone && !member.address && !member.birthday && memberGroups.length === 0 && (
          <p style={{ fontSize: 13, color: '#8a9e90', textAlign: 'center', padding: '1.5rem' }}>No additional details</p>
        )}
      </div>

      {/* ── Recent attendance log ─────────────────────────────────────────── */}
      {attendanceHistory.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(26,58,42,0.07)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(26,58,42,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(26,58,42,0.07)', background: '#fafaf9' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Follow-up History</p>
            <span style={{ fontSize: 11, color: '#8a9e90' }}>Last {Math.min(attendanceHistory.length, 8)} sessions</span>
          </div>
          <div>
            {attendanceHistory.slice(0, 8).map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: i < Math.min(attendanceHistory.length, 8) - 1 ? '1px solid rgba(26,58,42,0.05)' : 'none' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.present ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#1a3a2a', flex: 1 }}>{fmtDate(r.attendance_sessions?.date)}</span>
                {r.attendance_sessions?.groups?.name && (
                  <span style={{ fontSize: 11, color: '#8a9e90', background: 'rgba(26,58,42,0.06)', padding: '2px 8px', borderRadius: 6 }}>{r.attendance_sessions.groups.name}</span>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: r.present ? '#16a34a' : '#dc2626' }}>{r.present ? 'Present' : 'Absent'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      {showDeleteConfirm ? (
        <div style={{ background: '#fef2f2', borderRadius: 16, border: '1.5px solid rgba(220,38,38,0.2)', padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#dc2626', margin: '0 0 12px' }}>Remove this member?</p>
          <p style={{ fontSize: 12.5, color: '#8a9e90', margin: '0 0 16px' }}>Their attendance history will be preserved but they will no longer appear in active lists.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowDeleteConfirm(false)} className="btn btn-outline" style={{ flex: 1, height: 44 }}>Cancel</button>
            <button onClick={handleDelete} disabled={deleting} className="btn btn-danger" style={{ flex: 1, height: 44 }}>
              {deleting ? 'Removing…' : 'Yes, remove'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, paddingBottom: 8 }}>
          <button onClick={() => setEditing(true)} className="btn btn-primary" style={{ flex: 1, gap: 6, height: 50 }}>
            <Pencil size={14} /> Edit Member
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="btn btn-danger btn-sm" style={{ height: 50, padding: '0 18px', gap: 6 }}>
            <Trash2 size={14} /> Remove
          </button>
        </div>
      )}

      {editing && (
        <MemberFormModal
          initial={{ ...member, birthday: normBirthday(member.birthday) ?? '' }}
          groups={groups}
          isNew={false}
          saving={saving}
          error={error}
          onSave={handleSave}
          onClose={() => { setEditing(false); setError('') }}
        />
      )}
    </div>
  )
}
