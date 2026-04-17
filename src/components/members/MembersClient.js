'use client'

import { useState, useMemo } from 'react'
import { getAv, fmtBday, normBirthday, toWhatsAppNumber } from '@/lib/utils'

export default function MembersClient({ churchId, members: init, groups }) {
  const [members, setMembers]     = useState(init)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('active')
  const [selected, setSelected]   = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [editTarget, setEdit]     = useState(null)
  const [deleteTarget, setDelete] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]))

  const filtered = useMemo(() => {
    return members.filter(m => {
      const matchSearch = !search
        || m.name.toLowerCase().includes(search.toLowerCase())
        || (m.phone ?? '').includes(search)
      const matchStatus = statusFilter === 'all' || m.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [members, search, statusFilter])

  const activeCount   = members.filter(m => m.status === 'active').length
  const inactiveCount = members.filter(m => m.status === 'inactive').length

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
        setEdit(null); setSelected(data.member)
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

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
            Members
          </h1>
          <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>
            {activeCount} active{inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAdd(true); setError('') }}
          style={{ flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add member
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.25rem' }}>
        <div className="search-wrap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="input" placeholder="Search by name or phone…" style={{ minHeight: 42 }}
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']].map(([val, label]) => (
            <button key={val} onClick={() => setStatus(val)}
              className={`chip${statusFilter === val ? ' active' : ''}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">👤</div>
          <h3>{members.length === 0 ? 'No members yet' : 'No results'}</h3>
          <p>{members.length === 0 ? 'Add your first member to get started' : `No members match "${search}"`}</p>
          {members.length === 0 && (
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add first member</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(m => {
            const av = getAv(m.name)
            const mGroups = (m.groupIds ?? []).map(id => groupMap[id]).filter(Boolean)
            const bday = m.birthday ? fmtBday(normBirthday(m.birthday)) : null
            return (
              <button key={m.id} onClick={() => setSelected(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0.875rem 1rem',
                  background: '#fff', border: '1px solid var(--border)',
                  borderRadius: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'all 0.18s ease', boxShadow: 'var(--shadow-sm)',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = '' }}
              >
                <div className="avatar" style={{ background: av.bg, color: av.color }}>{av.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.name}
                    </span>
                    {m.status === 'inactive' && <span className="badge badge-muted" style={{ fontSize: 10 }}>inactive</span>}
                  </div>
                  <p style={{ fontSize: 13, color: '#8a9e90', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.phone || (mGroups.length > 0 ? mGroups.join(', ') : 'No phone or group')}
                  </p>
                </div>
                {bday && <span style={{ fontSize: 12, color: '#a8862e', flexShrink: 0 }}>🎂 {bday}</span>}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9c9c9" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            )
          })}
        </div>
      )}

      {/* Profile modal */}
      {selected && !editTarget && (
        <MemberProfile member={selected} groupMap={groupMap}
          onEdit={() => { setEdit({ ...selected, birthday: normBirthday(selected.birthday) ?? '' }); setSelected(null) }}
          onDelete={() => { setDelete(selected); setSelected(null) }}
          onClose={() => setSelected(null)} />
      )}

      {/* Add/edit modal */}
      {(showAdd || editTarget) && (
        <MemberForm
          initial={editTarget ?? { name: '', phone: '', address: '', birthday: '', groupIds: [], status: 'active' }}
          groups={groups} isNew={!!showAdd} saving={saving} error={error}
          onSave={saveMember}
          onClose={() => { setShowAdd(false); setEdit(null); setError('') }} />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete member?" onClose={() => setDelete(null)}>
          <p style={{ fontSize: 14, color: '#4a5568', marginBottom: '1.25rem' }}>
            <strong>{deleteTarget.name}</strong> will be permanently deleted. This cannot be undone.
          </p>
          {error && <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 10 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-lg" onClick={() => setDelete(null)} style={{ flex: 1 }}>Cancel</button>
            <button className="btn btn-danger btn-lg" onClick={deleteMember} disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MemberProfile({ member, groupMap, onEdit, onDelete, onClose }) {
  const av = getAv(member.name)
  const waNum = toWhatsAppNumber(member.phone ?? '')
  const mGroups = (member.groupIds ?? []).map(id => groupMap[id]).filter(Boolean)
  const bday = member.birthday ? fmtBday(normBirthday(member.birthday)) : null

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1.25rem' }}>
          <div className="avatar avatar-lg" style={{ background: av.bg, color: av.color, fontSize: 18, borderRadius: 14 }}>
            {av.initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
              {member.name}
            </h2>
            {mGroups.length > 0 && <p style={{ fontSize: 13, color: '#8a9e90', margin: 0 }}>{mGroups.join(', ')}</p>}
            <span className={`badge ${member.status === 'active' ? 'badge-green' : 'badge-muted'}`} style={{ marginTop: 6 }}>
              {member.status}
            </span>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0 8px', color: '#8a9e90' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.25rem' }}>
          {member.phone && (
            <Row icon="📞" label="Phone" value={member.phone} />
          )}
          {member.address && <Row icon="📍" label="Address" value={member.address} />}
          {bday && <Row icon="🎂" label="Birthday" value={bday} />}
        </div>

        {(member.phone || waNum) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
            {member.phone && (
              <a href={`tel:${member.phone}`} className="btn btn-outline btn-lg" style={{ flex: 1 }}>
                📞 Call
              </a>
            )}
            {waNum && (
              <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
                className="btn btn-lg" style={{ flex: 1, background: '#25D366', color: '#fff' }}>
                WhatsApp
              </a>
            )}
          </div>
        )}

        <hr className="divider" style={{ margin: '0 0 1rem' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-lg" onClick={onEdit} style={{ flex: 1 }}>Edit member</button>
          <button className="btn btn-danger" onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 16, width: 20, flexShrink: 0 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 11, color: '#8a9e90', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        <p style={{ fontSize: 14, color: '#1a3a2a', margin: 0, fontWeight: 500 }}>{value}</p>
      </div>
    </div>
  )
}

function MemberForm({ initial, groups, isNew, saving, error, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial.name ?? '',
    phone: initial.phone ?? '',
    address: initial.address ?? '',
    birthday: initial.birthday ?? '',
    groupIds: initial.groupIds ?? [],
    status: initial.status ?? 'active',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const toggleGroup = id => set('groupIds', form.groupIds.includes(id) ? form.groupIds.filter(x => x !== id) : [...form.groupIds, id])

  return (
    <Modal title={isNew ? 'Add member' : 'Edit member'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div className="field">
          <label className="label">Name *</label>
          <input className="input" placeholder="Full name" autoFocus
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Phone</label>
          <input className="input" type="tel" placeholder="+234…"
            value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Address</label>
          <input className="input" placeholder="Optional"
            value={form.address} onChange={e => set('address', e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Birthday</label>
          <input className="input" type="date"
            value={form.birthday} onChange={e => set('birthday', e.target.value)} />
        </div>
        {groups.length > 0 && (
          <div className="field">
            <label className="label">Groups</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {groups.map(g => (
                <button key={g.id} type="button" onClick={() => toggleGroup(g.id)}
                  className={`chip${form.groupIds.includes(g.id) ? ' active' : ''}`}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="field">
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {error && <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <button className="btn btn-outline btn-lg" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary btn-lg" onClick={() => onSave({
            name: form.name.trim(), phone: form.phone.trim() || null,
            address: form.address.trim() || null, birthday: form.birthday || null,
            groupIds: form.groupIds, status: form.status,
          }, isNew)} disabled={saving || !form.name.trim()} style={{ flex: 1 }}>
            {saving ? 'Saving…' : (isNew ? 'Add member' : 'Save changes')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: '0 8px', color: '#8a9e90' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}