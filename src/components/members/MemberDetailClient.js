'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/ui/BackButton'
import { MemberFormModal } from '@/components/members/MembersClient'
import { getAv, fmtBday, normBirthday, toWhatsAppNumber, fmtDate } from '@/lib/utils'
import { Phone, MapPin, Cake, Users, Pencil, Trash2, CheckCircle, XCircle, Calendar } from 'lucide-react'

export default function MemberDetailClient({ member: initialMember, groups, attendanceHistory, churchId }) {
  const router = useRouter()
  const [member, setMember]   = useState(initialMember)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const av          = getAv(member.name)
  const waNum       = toWhatsAppNumber(member.phone ?? '')
  const memberGroups = (member.groupIds ?? []).map(id => groups.find(g => g.id === id)?.name).filter(Boolean)

  const attendedCount  = attendanceHistory.filter(r => r.present).length
  const totalCount     = attendanceHistory.length
  const lastSeen       = attendanceHistory.find(r => r.present)?.attendance_sessions?.date

  const statusColor = {
    active:   { bg: 'rgba(22,163,74,0.1)',   text: '#16a34a' },
    inactive: { bg: 'rgba(26,58,42,0.08)',   text: '#4a8a65' },
    away:     { bg: 'rgba(217,119,6,0.1)',   text: '#d97706' },
  }[member.status] ?? { bg: 'rgba(26,58,42,0.08)', text: '#4a8a65' }

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

      {/* Avatar + name */}
      <div className="card text-center py-6">
        <div className="mx-auto mb-4 flex items-center justify-center font-bold text-xl"
          style={{ width: 72, height: 72, borderRadius: 20, background: av.bg, color: av.color, fontSize: 24 }}>
          {av.initials}
        </div>
        <h1 className="font-display text-2xl font-bold text-forest">{member.name}</h1>
        {memberGroups.length > 0 && (
          <p className="text-sm text-mist mt-1">{memberGroups.join(', ')}</p>
        )}
        <div className="flex justify-center mt-3">
          <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: statusColor.bg, color: statusColor.text }}>
            {member.status}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="card space-y-0 divide-y divide-forest/6">
        {member.phone && (
          <DetailRow icon={<Phone size={14} />} label="Phone" value={member.phone} />
        )}
        {member.address && (
          <DetailRow icon={<MapPin size={14} />} label="Address" value={member.address} />
        )}
        {member.birthday && (
          <DetailRow icon={<Cake size={14} />} label="Birthday" value={fmtBday(normBirthday(member.birthday))} />
        )}
        {memberGroups.length > 0 && (
          <DetailRow icon={<Users size={14} />} label="Groups" value={memberGroups.join(', ')} />
        )}
        {!member.phone && !member.address && !member.birthday && memberGroups.length === 0 && (
          <p className="text-sm text-mist py-3 text-center">No additional details</p>
        )}
      </div>

      {/* Attendance summary */}
      <div className="card">
        <h2 className="font-display text-base font-semibold text-forest mb-3 flex items-center gap-2">
          <Calendar size={15} /> Attendance History
        </h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-forest">{totalCount}</p>
            <p className="text-xs text-mist mt-0.5">Sessions</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-success">{attendedCount}</p>
            <p className="text-xs text-mist mt-0.5">Attended</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-forest">
              {totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) + '%' : '—'}
            </p>
            <p className="text-xs text-mist mt-0.5">Rate</p>
          </div>
        </div>
        {lastSeen && (
          <p className="text-xs text-mist">Last attended: <strong className="text-forest">{fmtDate(lastSeen)}</strong></p>
        )}
        {attendanceHistory.length > 0 && (
          <div className="mt-3 space-y-0 divide-y divide-forest/5 max-h-48 overflow-y-auto">
            {attendanceHistory.slice(0, 12).map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                {r.present
                  ? <CheckCircle size={14} className="text-success shrink-0" />
                  : <XCircle size={14} className="text-mist shrink-0" />
                }
                <span className="text-sm text-forest flex-1">{fmtDate(r.attendance_sessions?.date)}</span>
                {r.attendance_sessions?.groups?.name && (
                  <span className="text-xs text-mist">{r.attendance_sessions.groups.name}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {attendanceHistory.length === 0 && (
          <p className="text-sm text-mist text-center py-2">No attendance records yet</p>
        )}
      </div>

      {/* Contact buttons */}
      {(member.phone || waNum) && (
        <div className="flex gap-3">
          {member.phone && (
            <a href={'tel:' + member.phone} className="btn btn-outline flex-1 gap-2">
              <Phone size={14} /> Call
            </a>
          )}
          {waNum && (
            <a href={'https://wa.me/' + waNum} target="_blank" rel="noreferrer"
              className="btn flex-1 gap-2" style={{ background: '#25D366', color: '#fff', border: 'none' }}>
              WhatsApp
            </a>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <button onClick={() => setEditing(true)} className="btn btn-primary flex-1 gap-2">
          <Pencil size={14} /> Edit member
        </button>
        <button onClick={handleDelete} disabled={deleting}
          className="btn btn-danger btn-sm px-4 gap-2">
          <Trash2 size={14} /> {deleting ? '…' : 'Delete'}
        </button>
      </div>

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

function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-mist shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-mist">{label}</p>
        <p className="text-sm font-medium text-forest truncate">{value}</p>
      </div>
    </div>
  )
}
