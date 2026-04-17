'use client'

import { useState, useMemo, useEffect } from 'react'
import { getAv, fmtDate, toWhatsAppNumber } from '@/lib/utils'
import {
  Search, Plus, Phone, ArrowLeft,
  UserX, UserCheck, Trash2, Pencil,
  ChevronRight, X,
} from 'lucide-react'

// ── helpers ───────────────────────────────────────────────────────────────────

function weeksAgo(dateStr) {
  if (!dateStr) return 0
  const ms = Date.now() - new Date(dateStr).getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 7))
}

function WaIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

export default function MembersClient({ churchId, members: init, groups }) {
  const [members, setMembers]       = useState(init)
  const [search,  setSearch]        = useState('')
  const [statusFilter, setStatus]   = useState('active')
  const [selected, setSelected]     = useState(null)
  const [showAdd,  setShowAdd]      = useState(false)
  const [editTarget, setEdit]       = useState(null)
  const [deleteTarget, setDelete]   = useState(null)
  const [awayTarget, setAwayTarget] = useState(null)   // member to mark away
  const [saving, setSaving]         = useState(false)
  const [error,  setError]          = useState('')

  const groupMap    = Object.fromEntries(groups.map(g => [g.id, g.name]))
  const activeCount = members.filter(m => m.status === 'active').length
  const awayCount   = members.filter(m => m.status === 'away').length
  const inactiveCount = members.filter(m => m.status === 'inactive').length

  const filtered = useMemo(() => members.filter(m => {
    const matchSearch = !search
      || m.name.toLowerCase().includes(search.toLowerCase())
      || (m.phone ?? '').includes(search)
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    return matchSearch && matchStatus
  }), [members, search, statusFilter])

  // ── API helpers ──────────────────────────────────────────────────────────────

  async function saveMember(form, isNew) {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/members', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? form : { id: editTarget.id, ...form }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (isNew) {
        setMembers(p => [...p, data.member].sort((a, b) => a.name.localeCompare(b.name)))
        setShowAdd(false)
      } else {
        setMembers(p => p.map(m => m.id === data.member.id ? data.member : m))
        setEdit(null)
        setSelected(data.member)
      }
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function deleteMember() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      await fetch(`/api/members?id=${deleteTarget.id}`, { method: 'DELETE' })
      setMembers(p => p.filter(m => m.id !== deleteTarget.id))
      setDelete(null); setSelected(null)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function setMemberStatus(member, status) {
    try {
      const payload = { id: member.id, status }
      if (status === 'away') payload.away_since = new Date().toISOString().split('T')[0]
      if (status === 'active') payload.away_since = null

      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMembers(p => p.map(m => m.id === data.member.id ? data.member : m))
      setSelected(null)
      setAwayTarget(null)
    } catch (e) { setError(e.message) }
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>

      {/* Back button */}
      <a href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#8a9e90', textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={14} strokeWidth={2.5} />
        Dashboard
      </a>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
            Members
          </h1>
          <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>
            {activeCount} active
            {awayCount > 0 && <span style={{ color: '#d97706' }}> · {awayCount} away</span>}
            {inactiveCount > 0 && ` · ${inactiveCount} inactive`}
          </p>
        </div>
        <button onClick={() => { setShowAdd(true); setError('') }}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 1rem', height: 40, background: '#1a3a2a', color: '#e8d5a0', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, flexShrink: 0, boxShadow: '0 2px 8px rgba(26,58,42,0.22)' }}>
          <Plus size={14} strokeWidth={3} />
          Add member
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <Search size={14} color="#b0bec0" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          style={{ width: '100%', border: '1px solid rgba(26,58,42,0.14)', borderRadius: 11, background: '#fff', padding: '0.65rem 0.875rem 0.65rem 2.25rem', fontSize: 15, color: '#1a2e22', outline: 'none', minHeight: 44, boxSizing: 'border-box', transition: 'border-color 0.15s' }}
          placeholder="Search by name or phone…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Status filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          ['active',   `Active (${activeCount})`],
          ['away',     `Away (${awayCount})`],
          ['inactive', `Inactive (${inactiveCount})`],
          ['all',      'All'],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setStatus(val)} style={{
            padding: '5px 13px', borderRadius: 20, cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
            border: statusFilter === val ? 'none' : '1px solid rgba(26,58,42,0.14)',
            background: statusFilter === val ? '#1a3a2a' : '#fff',
            color: statusFilter === val ? '#e8d5a0' : '#4a5568',
            transition: 'all 0.14s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Away banner — shown when viewing 'away' filter */}
      {statusFilter === 'away' && awayCount > 0 && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 12, marginBottom: '1rem', fontSize: 13, color: '#92400e', fontWeight: 500 }}>
          ✈️ These members are away and will not appear in attendance or follow-up lists until returned.
        </div>
      )}

      {/* Member list */}
      {filtered.length === 0 ? (
        <EmptyState
          hasMembers={members.length > 0}
          search={search}
          statusFilter={statusFilter}
          onAdd={() => setShowAdd(true)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              groupMap={groupMap}
              onView={() => setSelected(m)}
              onMarkAway={() => setAwayTarget(m)}
              onMarkActive={() => setMemberStatus(m, 'active')}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {selected && !editTarget && (
        <MemberProfile
          member={selected} groupMap={groupMap}
          onEdit={() => { setEdit({ ...selected }); setSelected(null) }}
          onDelete={() => { setDelete(selected); setSelected(null) }}
          onMarkAway={() => { setAwayTarget(selected); setSelected(null) }}
          onMarkActive={() => setMemberStatus(selected, 'active')}
          onClose={() => setSelected(null)}
        />
      )}

      {(showAdd || editTarget) && (
        <MemberForm
          initial={editTarget ?? { name: '', phone: '', address: '', birthday: '', groupIds: [], status: 'active' }}
          groups={groups} isNew={!!showAdd} saving={saving} error={error}
          onSave={saveMember}
          onClose={() => { setShowAdd(false); setEdit(null); setError('') }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete member?"
          message={<>Remove <strong>{deleteTarget.name}</strong> permanently? This cannot be undone.</>}
          confirmLabel="Delete"
          danger
          saving={saving}
          error={error}
          onConfirm={deleteMember}
          onClose={() => setDelete(null)}
        />
      )}

      {awayTarget && awayTarget.status !== 'away' && (
        <ConfirmModal
          title={`Mark ${awayTarget.name} as Away?`}
          message="They won't appear in attendance or follow-up until you mark them as returned."
          confirmLabel="Mark Away ✈️"
          saving={saving}
          error={error}
          onConfirm={() => setMemberStatus(awayTarget, 'away')}
          onClose={() => setAwayTarget(null)}
        />
      )}
    </div>
  )
}

// ── Member card (list item) ───────────────────────────────────────────────────

function MemberCard({ member: m, groupMap, onView, onMarkAway, onMarkActive }) {
  const av      = getAv(m.name)
  const mGroups = (m.groupIds ?? []).map(id => groupMap[id]).filter(Boolean)
  const waNum   = toWhatsAppNumber(m.phone ?? '')
  const isAway  = m.status === 'away'
  const weeks   = isAway ? weeksAgo(m.away_since) : 0
  const overdueContact = isAway && weeks >= 4

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${overdueContact ? 'rgba(217,119,6,0.3)' : isAway ? 'rgba(217,119,6,0.18)' : 'rgba(26,58,42,0.08)'}`,
      borderRadius: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
      overflow: 'hidden',
      transition: 'all 0.15s',
    }}>
      {/* Main row */}
      <button onClick={onView} style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0.875rem 1rem', width: '100%',
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: av.bg, color: av.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700,
            opacity: isAway ? 0.7 : 1,
          }}>
            {av.initials}
          </div>
          {isAway && (
            <div style={{
              position: 'absolute', bottom: -2, right: -2,
              fontSize: 10, background: '#fff', borderRadius: '50%',
              width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(217,119,6,0.3)',
            }}>
              ✈️
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.name}
            </span>
            {isAway && (
              <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: overdueContact ? 'rgba(217,119,6,0.15)' : 'rgba(217,119,6,0.08)', borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>
                ✈️ Away{weeks > 0 ? ` · ${weeks}w` : ''}
              </span>
            )}
            {m.status === 'inactive' && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#8a9e90', background: 'rgba(26,58,42,0.06)', borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>
                Inactive
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#8a9e90', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.phone || (mGroups.length > 0 ? mGroups.join(', ') : 'No phone or group')}
          </p>
        </div>

        <ChevronRight size={14} color="#c9c9c9" strokeWidth={2} style={{ flexShrink: 0 }} />
      </button>

      {/* Action strip */}
      <div style={{ display: 'flex', borderTop: '1px solid rgba(26,58,42,0.05)', background: 'rgba(26,58,42,0.01)' }}>
        {m.phone && (
          <a href={`tel:${m.phone}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0.5rem', textDecoration: 'none', color: '#4a8a65', fontSize: 12, fontWeight: 600, borderRight: '1px solid rgba(26,58,42,0.05)' }}>
            <Phone size={13} strokeWidth={2} />
            Call
          </a>
        )}
        {waNum && (
          <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0.5rem', textDecoration: 'none', color: '#15803d', fontSize: 12, fontWeight: 600, borderRight: '1px solid rgba(26,58,42,0.05)' }}>
            <WaIcon size={12} color="#15803d" />
            WhatsApp
          </a>
        )}
        {isAway ? (
          <button onClick={e => { e.stopPropagation(); onMarkActive() }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontSize: 12, fontWeight: 700 }}>
            <UserCheck size={13} strokeWidth={2} />
            Return
          </button>
        ) : (
          <button onClick={e => { e.stopPropagation(); onMarkAway() }}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#d97706', fontSize: 12, fontWeight: 600 }}>
            <UserX size={13} strokeWidth={2} />
            Mark Away
          </button>
        )}
      </div>
    </div>
  )
}

// ── Member profile modal ──────────────────────────────────────────────────────

function MemberProfile({ member: m, groupMap, onEdit, onDelete, onMarkAway, onMarkActive, onClose }) {
  const av      = getAv(m.name)
  const waNum   = toWhatsAppNumber(m.phone ?? '')
  const mGroups = (m.groupIds ?? []).map(id => groupMap[id]).filter(Boolean)
  const isAway  = m.status === 'away'
  const weeks   = isAway ? weeksAgo(m.away_since) : 0

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1.25rem' }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
          {av.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            {m.name}
          </h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: isAway ? 'rgba(217,119,6,0.1)' : m.status === 'active' ? 'rgba(22,163,74,0.1)' : 'rgba(26,58,42,0.07)', color: isAway ? '#d97706' : m.status === 'active' ? '#15803d' : '#8a9e90' }}>
              {isAway ? `✈️ Away${weeks > 0 ? ` · ${weeks}w` : ''}` : m.status}
            </span>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9e90', padding: 4, flexShrink: 0 }}>
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.25rem' }}>
        {m.phone    && <DetailRow icon="📞" label="Phone"   value={m.phone} />}
        {m.address  && <DetailRow icon="📍" label="Address" value={m.address} />}
        {m.birthday && <DetailRow icon="🎂" label="Birthday" value={fmtDate(m.birthday)} />}
        {mGroups.length > 0 && <DetailRow icon="👥" label="Groups" value={mGroups.join(', ')} />}
      </div>

      {/* Contact actions */}
      {(m.phone || waNum) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
          {m.phone && (
            <a href={`tel:${m.phone}`} style={{ flex: 1, height: 44, borderRadius: 11, border: '1.5px solid rgba(26,58,42,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none', color: '#1a3a2a', fontSize: 14, fontWeight: 700 }}>
              <Phone size={15} strokeWidth={2} /> Call
            </a>
          )}
          {waNum && (
            <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
              style={{ flex: 1, height: 44, borderRadius: 11, background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, textDecoration: 'none', color: '#fff', fontSize: 14, fontWeight: 700 }}>
              <WaIcon size={15} color="#fff" /> WhatsApp
            </a>
          )}
        </div>
      )}

      <div style={{ height: 1, background: 'rgba(26,58,42,0.07)', marginBottom: '1rem' }} />

      {/* Status actions */}
      {isAway ? (
        <button onClick={onMarkActive} style={{ width: '100%', height: 44, borderRadius: 11, border: 'none', background: '#1a3a2a', color: '#e8d5a0', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
          ✓ Mark as Returned
        </button>
      ) : (
        <button onClick={onMarkAway} style={{ width: '100%', height: 44, borderRadius: 11, border: '1px solid rgba(217,119,6,0.25)', background: 'rgba(217,119,6,0.06)', color: '#d97706', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
          ✈️ Mark as Away / On Leave
        </button>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onEdit} style={{ flex: 1, height: 42, borderRadius: 11, border: '1px solid rgba(26,58,42,0.15)', background: '#fff', color: '#1a3a2a', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Pencil size={13} strokeWidth={2.5} /> Edit
        </button>
        <button onClick={onDelete} style={{ height: 42, padding: '0 14px', borderRadius: 11, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.05)', color: '#dc2626', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Trash2 size={14} strokeWidth={2} />
        </button>
      </div>
    </Modal>
  )
}

// ── Add / Edit form ───────────────────────────────────────────────────────────

function MemberForm({ initial, groups, isNew, saving, error, onSave, onClose }) {
  const [form, setForm] = useState({
    name:     initial.name     ?? '',
    phone:    initial.phone    ?? '',
    address:  initial.address  ?? '',
    birthday: initial.birthday ?? '',
    groupIds: initial.groupIds ?? [],
    status:   initial.status   ?? 'active',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const toggleGroup = id => set('groupIds', form.groupIds.includes(id) ? form.groupIds.filter(x => x !== id) : [...form.groupIds, id])

  return (
    <Modal title={isNew ? 'Add member' : 'Edit member'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {[
          { key: 'name',     label: 'Name *',   placeholder: 'Full name',  autoFocus: true },
          { key: 'phone',    label: 'Phone',    placeholder: '+234…',      type: 'tel' },
          { key: 'address',  label: 'Address',  placeholder: 'Optional' },
          { key: 'birthday', label: 'Birthday', type: 'date' },
        ].map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2d4a36', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
            <input
              type={f.type ?? 'text'} autoFocus={f.autoFocus}
              placeholder={f.placeholder} value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              style={{ width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 11, padding: '0.65rem 0.875rem', fontSize: 15, outline: 'none', minHeight: 44, boxSizing: 'border-box', background: '#fff', color: '#1a2e22' }}
            />
          </div>
        ))}

        {groups.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2d4a36', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Groups</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {groups.map(g => (
                <button key={g.id} type="button" onClick={() => toggleGroup(g.id)} style={{
                  padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${form.groupIds.includes(g.id) ? '#1a3a2a' : 'rgba(26,58,42,0.15)'}`,
                  background: form.groupIds.includes(g.id) ? '#1a3a2a' : '#fff',
                  color: form.groupIds.includes(g.id) ? '#e8d5a0' : '#4a5568',
                  transition: 'all 0.14s',
                }}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isNew && (
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2d4a36', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              style={{ width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 11, padding: '0.65rem 0.875rem', fontSize: 15, outline: 'none', minHeight: 44, background: '#fff', color: '#1a2e22', cursor: 'pointer' }}>
              <option value="active">Active</option>
              <option value="away">Away</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}

        {error && <p style={{ fontSize: 14, color: '#dc2626', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 13, border: '1.5px solid rgba(26,58,42,0.2)', background: '#fff', color: '#1a3a2a', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => onSave({ name: form.name.trim(), phone: form.phone.trim() || null, address: form.address.trim() || null, birthday: form.birthday || null, groupIds: form.groupIds, status: form.status }, isNew)}
            disabled={saving || !form.name.trim()}
            style={{ flex: 1, height: 48, borderRadius: 13, border: 'none', background: form.name.trim() ? '#1a3a2a' : '#e0dbd0', color: form.name.trim() ? '#e8d5a0' : '#8a9e90', fontSize: 15, fontWeight: 700, cursor: form.name.trim() ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Saving…' : isNew ? 'Add member' : 'Save changes'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ hasMembers, search, statusFilter, onAdd }) {
  let icon = '👤', title = 'No members yet', sub = 'Add your first member to get started.'
  if (search) { icon = '🔍'; title = `No results for "${search}"`; sub = 'Try a different name or phone number.' }
  else if (statusFilter === 'away') { icon = '✈️'; title = 'No members away'; sub = 'Mark members as away from their profile card.' }
  else if (statusFilter === 'inactive') { icon = '💤'; title = 'No inactive members'; sub = '' }

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 18, padding: '3rem 2rem', textAlign: 'center' }}>
      <p style={{ fontSize: 44, marginBottom: 12 }}>{icon}</p>
      <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: '0 0 8px' }}>{title}</p>
      {sub && <p style={{ fontSize: 14, color: '#8a9e90', margin: '0 0 20px' }}>{sub}</p>}
      {!hasMembers && (
        <button onClick={onAdd} style={{ padding: '0.625rem 1.5rem', background: '#1a3a2a', color: '#e8d5a0', border: 'none', borderRadius: 11, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
          Add first member
        </button>
      )}
    </div>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function DetailRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
      <span style={{ fontSize: 15, width: 22, flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 11, color: '#8a9e90', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        <p style={{ fontSize: 14, color: '#1a3a2a', margin: 0, fontWeight: 500 }}>{value}</p>
      </div>
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,26,19,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '1.5rem', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', maxHeight: '90dvh', overflowY: 'auto' }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <h3 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9e90', padding: 4 }}>
              <X size={18} strokeWidth={2.5} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

function ConfirmModal({ title, message, confirmLabel, danger, saving, error, onConfirm, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ fontSize: 15, color: '#4a5568', marginBottom: '1.25rem', lineHeight: 1.6 }}>{message}</p>
      {error && <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 10 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, height: 48, borderRadius: 13, border: '1.5px solid rgba(26,58,42,0.2)', background: '#fff', color: '#1a3a2a', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={saving} style={{
          flex: 1, height: 48, borderRadius: 13, border: 'none', cursor: saving ? 'wait' : 'pointer', fontSize: 15, fontWeight: 700,
          background: danger ? 'rgba(220,38,38,0.09)' : '#1a3a2a',
          color: danger ? '#dc2626' : '#e8d5a0',
        }}>
          {saving ? 'Saving…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}