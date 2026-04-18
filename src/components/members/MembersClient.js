'use client'

import { useState, useMemo } from 'react'
import BackButton from '@/components/ui/BackButton'
import { getAv, fmtBday, normBirthday, toWhatsAppNumber, fmtDate } from '@/lib/utils'

export default function MembersClient({ churchId, members: initMembers, groups }) {
  const [members, setMembers] = useState(initMembers)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sortBy, setSortBy] = useState('name') // name | newest
  const [selected, setSelected] = useState(null) // member profile
  const [showAdd, setShowAdd]    = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    let list = members.filter(m => {
      const matchSearch = !search ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.phone ?? '').includes(search)
      const matchStatus = statusFilter === 'all' || m.status === statusFilter
      return matchSearch && matchStatus
    })
    if (sortBy === 'newest') list = [...list].reverse()
    return list
  }, [members, search, statusFilter, sortBy])

  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]))

  function openProfile(member) {
    setSelected(member)
    setEditTarget(null)
  }

  function openEdit(member, e) {
    e?.stopPropagation()
    setEditTarget({ ...member, birthday: normBirthday(member.birthday) ?? '' })
    setSelected(null)
  }

  async function handleSaveMember(formData, isNew) {
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/members', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? formData : { id: editTarget.id, ...formData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      if (isNew) {
        setMembers(prev => [...prev, data.member].sort((a, b) => a.name.localeCompare(b.name)))
        setShowAdd(false)
      } else {
        setMembers(prev => prev.map(m => m.id === data.member.id ? data.member : m))
        setEditTarget(null)
        setSelected(data.member)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/members?id=${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setMembers(prev => prev.filter(m => m.id !== deleteTarget.id))
      setDeleteTarget(null)
      setSelected(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const activeCount = members.filter(m => m.status === 'active').length
  const inactiveCount = members.filter(m => m.status === 'inactive').length

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <BackButton />
        <h1 className="font-display text-2xl font-semibold text-forest">Members</h1>
          <p className="text-sm text-mist mt-0.5">
            {activeCount} active{inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="btn-outline btn-sm gap-1.5">
            <UploadIcon /> Import
          </button>
          <button onClick={() => { setShowAdd(true); setError('') }} className="btn-primary btn-sm gap-2">
            <PlusIcon /> Add
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-mist w-4 h-4 pointer-events-none" />
          <input
            type="search" placeholder="Search by name or phone…"
            className="input pl-9 text-sm" style={{ minHeight: 40 }}
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`btn-sm text-xs ${statusFilter === val ? 'btn-primary' : 'btn-outline'}`}
            >
              {label}
            </button>
          ))}
          <div className="ml-auto">
            <select
              className="text-xs border border-forest/20 rounded-lg px-2 py-1.5 text-forest bg-white"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="name">A–Z</option>
              <option value="newest">Newest first</option>
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="empty-state card">
          <p className="text-3xl">👤</p>
          <p className="font-semibold text-forest">
            {members.length === 0 ? 'No members yet' : 'No results'}
          </p>
          {members.length === 0 && (
            <p className="text-sm text-mist">Add your first member or import from Excel in a Group.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m, i) => {
            const av = getAv(m.name)
            const memberGroups = (m.groupIds ?? []).map(id => groupMap[id]).filter(Boolean)
            return (
              <button
                key={m.id}
                onClick={() => openProfile(m)}
                className="card w-full text-left flex items-center gap-3 hover:shadow-card-hover
                  transition-all active:scale-[0.99] animate-slide-up animate-fill-both"
                style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s` }}
              >
                <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>
                  {av.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-forest text-[14px] truncate">{m.name}</p>
                    {m.status === 'inactive' && (
                      <span className="badge-muted text-[10px] shrink-0">inactive</span>
                    )}
                  </div>
                  {m.phone && <p className="text-xs text-mist truncate">{m.phone}</p>}
                  {memberGroups.length > 0 && (
                    <p className="text-xs text-forest-muted truncate">{memberGroups.join(', ')}</p>
                  )}
                </div>
                {m.birthday && (
                  <span className="text-xs text-gold-dark shrink-0">
                    🎂 {fmtBday(normBirthday(m.birthday))}
                  </span>
                )}
                <ChevronRight className="text-mist shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* Member profile sheet */}
      {selected && !editTarget && (
        <MemberProfile
          member={selected}
          groups={groups}
          groupMap={groupMap}
          onEdit={() => openEdit(selected)}
          onDelete={() => { setDeleteTarget(selected); setSelected(null) }}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Add / Edit modal */}
      {showImport && (
        <MemberImportModal
          onClose={() => setShowImport(false)}
          onImported={imported => {
            setMembers(prev => {
              const ids = new Set(prev.map(m => m.id))
              return [...prev, ...imported.filter(m => !ids.has(m.id))]
                .sort((a, b) => a.name.localeCompare(b.name))
            })
            setShowImport(false)
          }}
        />
      )}

      {(showAdd || editTarget) && (
        <MemberFormModal
          initial={editTarget ?? { name: '', phone: '', address: '', birthday: '', groupIds: [], status: 'active' }}
          groups={groups}
          isNew={!!showAdd}
          saving={saving}
          error={error}
          onSave={handleSaveMember}
          onClose={() => { setShowAdd(false); setEditTarget(null); setError('') }}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Delete member?" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-forest-muted mb-4">
            <strong>{deleteTarget.name}</strong> will be permanently deleted. This cannot be undone.
          </p>
          {error && <p className="text-sm text-error mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-outline flex-1">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="btn-danger flex-1">
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}

      <div className="h-6" />
    </div>
  )
}

// ─── Member Profile Sheet ───────────────────────────────────────────────────────
function MemberProfile({ member, groupMap, onEdit, onDelete, onClose }) {
  const av = getAv(member.name)
  const waNum = toWhatsAppNumber(member.phone ?? '')
  const memberGroups = (member.groupIds ?? []).map(id => groupMap[id]).filter(Boolean)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-t-3xl p-6 shadow-modal animate-slide-up safe-bottom">
        {/* Handle */}
        <div className="w-10 h-1 bg-forest/20 rounded-full mx-auto mb-5" />

        {/* Avatar + name */}
        <div className="flex items-start gap-4 mb-5">
          <div
            className="avatar-lg shrink-0 font-semibold text-base"
            style={{ background: av.bg, color: av.color, width: 56, height: 56, fontSize: 18, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {av.initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-xl font-semibold text-forest">{member.name}</h2>
            {memberGroups.length > 0 && (
              <p className="text-sm text-mist truncate">{memberGroups.join(', ')}</p>
            )}
            <span className={`badge mt-1 ${member.status === 'active' ? 'badge-green' : 'badge-muted'}`}>
              {member.status}
            </span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-5">
          {member.phone && (
            <InfoRow icon="📞" label="Phone" value={member.phone} />
          )}
          {member.address && (
            <InfoRow icon="📍" label="Address" value={member.address} />
          )}
          {member.birthday && (
            <InfoRow icon="🎂" label="Birthday" value={fmtBday(normBirthday(member.birthday))} />
          )}
        </div>

        {/* Contact buttons */}
        {(member.phone || waNum) && (
          <div className="flex gap-2 mb-4">
            {member.phone && (
              <a href={`tel:${member.phone}`} className="btn-outline btn-sm flex-1 gap-1.5">
                <PhoneIcon /> Call
              </a>
            )}
            {waNum && (
              <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
                className="btn-sm flex-1 gap-1.5" style={{ background: '#25D366', color: '#fff' }}>
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
          </div>
        )}

        {/* Edit / Delete */}
        <div className="flex gap-3">
          <button onClick={onEdit} className="btn-outline flex-1">Edit member</button>
          <button onClick={onDelete} className="btn-danger btn-sm px-4">Delete</button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-base w-5 shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-mist text-xs">{label}</p>
        <p className="text-forest font-medium">{value}</p>
      </div>
    </div>
  )
}

// ─── Member Form Modal ──────────────────────────────────────────────────────────
function MemberFormModal({ initial, groups, isNew, saving, error, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial.name ?? '',
    phone: initial.phone ?? '',
    address: initial.address ?? '',
    birthday: initial.birthday ?? '',
    groupIds: initial.groupIds ?? [],
    status: initial.status ?? 'active',
  })

  function toggleGroup(gid) {
    setForm(p => ({
      ...p,
      groupIds: p.groupIds.includes(gid)
        ? p.groupIds.filter(id => id !== gid)
        : [...p.groupIds, gid],
    }))
  }

  return (
    <Modal title={isNew ? 'Add member' : 'Edit member'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="input-label">Name *</label>
          <input className="input" placeholder="Full name" autoFocus
            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <label className="input-label">Phone</label>
          <input className="input" type="tel" placeholder="+234…"
            value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <div>
          <label className="input-label">Address</label>
          <input className="input" placeholder="Optional"
            value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
        </div>
        <div>
          <label className="input-label">Birthday</label>
          <input className="input" type="date"
            value={form.birthday} onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))} />
        </div>
        {groups.length > 0 && (
          <div>
            <label className="input-label">Groups</label>
            <div className="flex flex-wrap gap-2">
              {groups.map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors
                    ${form.groupIds.includes(g.id)
                      ? 'bg-forest text-ivory border-forest'
                      : 'border-forest/20 text-mist hover:border-forest/40'
                    }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="input-label">Status</label>
          <select className="input" value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button
            onClick={() => onSave({
              name: form.name.trim(),
              phone: form.phone.trim() || null,
              address: form.address.trim() || null,
              birthday: form.birthday || null,
              groupIds: form.groupIds,
              status: form.status,
            }, isNew)}
            disabled={saving || !form.name.trim()}
            className="btn-primary flex-1"
          >
            {saving ? 'Saving…' : (isNew ? 'Add member' : 'Save changes')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-modal animate-slide-up safe-bottom max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-forest">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-mist hover:text-forest hover:bg-ivory">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Icons
function UploadIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg> }
function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function SearchIcon({ className = '' }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${className}`}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function ChevronRight({ className = '' }) { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6"/></svg> }
function PhoneIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> }
function WhatsAppIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> }
function CloseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }

// ─── Member Import Modal ────────────────────────────────────────────────────────
function MemberImportModal({ onClose, onImported }) {
  const [stage,    setStage]    = useState('upload')  // upload | map | preview | importing
  const [headers,  setHeaders]  = useState([])
  const [rows,     setRows]     = useState([])
  const [colMap,   setColMap]   = useState({ firstName: '', lastName: '', name: '', phone: '', address: '', birthday: '' })
  const [preview,  setPreview]  = useState([])
  const [progress, setProgress] = useState(0)
  const [error,    setError]    = useState('')
  const fileRef = useRef()

  // ── Robust birthday parser ─────────────────────────────────────────────────
  function parseBirthday(raw) {
    if (raw === null || raw === undefined || raw === '') return ''
    // Excel serial number
    if (typeof raw === 'number' || /^\d{5}$/.test(String(raw))) {
      const serial = Number(raw)
      if (serial > 1000) {
        const d = new Date((serial - 25569) * 86400 * 1000)
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
      }
    }
    const s = String(raw).trim()
    if (!s) return ''
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // DD/MM/YYYY  or  MM/DD/YYYY — try DD/MM first (more common outside US)
    const slash4 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (slash4) {
      const [, a, b, y] = slash4
      // If first part > 12 it must be the day
      const day   = parseInt(a) > 12 ? a : a
      const month = parseInt(a) > 12 ? b : b
      return `${y}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`
    }
    // DD-MM-YYYY
    const dash4 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (dash4) {
      const [, d, m, y] = dash4
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    }
    // DD/MM/YY  two-digit year
    const slash2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
    if (slash2) {
      const [, d, m, y] = slash2
      const year = parseInt(y) > 30 ? `19${y}` : `20${y}`
      return `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
    }
    // D-Mon-YYYY  e.g. "5-Jan-1990"
    const monFull = s.match(/^(\d{1,2})[- ]([A-Za-z]{3,})[- ](\d{2,4})$/)
    if (monFull) {
      const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 }
      const [, d, mon, y] = monFull
      const m = months[mon.toLowerCase().slice(0,3)]
      if (m) {
        const year = y.length === 2 ? (parseInt(y) > 30 ? `19${y}` : `20${y}`) : y
        return `${year}-${String(m).padStart(2,'0')}-${d.padStart(2,'0')}`
      }
    }
    return ''
  }

  // ── Auto-detect column mapping ─────────────────────────────────────────────
  function autoDetect(hdrs) {
    const m = { firstName: '', lastName: '', name: '', phone: '', address: '', birthday: '' }
    hdrs.forEach((h, i) => {
      const l = h.toLowerCase().trim()
      const idx = String(i)
      if (!m.firstName  && (l === 'first_name' || l === 'firstname' || l === 'first name'))  m.firstName  = idx
      if (!m.lastName   && (l === 'last_name'  || l === 'lastname'  || l === 'last name'))   m.lastName   = idx
      if (!m.name       && !m.firstName && (l === 'name' || l === 'full name' || l === 'full_name')) m.name = idx
      if (!m.phone      && (l.includes('phone') || l.includes('mobile') || l.includes('tel')))      m.phone    = idx
      if (!m.address    && (l.includes('address') || l.includes('location') || l.includes('city'))) m.address  = idx
      if (!m.birthday   && (l.includes('birth') || l.includes('dob') || l === 'date_of_birth'))     m.birthday = idx
    })
    return m
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const XLSX = (await import('xlsx')).default
      const buf  = await file.arrayBuffer()
      const wb   = XLSX.read(buf, { type: 'array', cellDates: false })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (data.length < 2) { setError('File appears to be empty'); return }
      const hdrs     = data[0].map(String)
      const dataRows = data.slice(1).filter(r => r.some(c => String(c).trim() !== ''))
      setHeaders(hdrs)
      setRows(dataRows)
      setColMap(autoDetect(hdrs))
      setStage('map')
    } catch {
      setError('Could not read file. Try saving as .xlsx or .csv first.')
    }
  }

  function buildPreview() {
    const hasName  = colMap.name !== ''
    const hasFName = colMap.firstName !== ''
    if (!hasName && !hasFName) { setError('Please map at least a Name or First Name column'); return }

    const mapped = rows.map(row => {
      let name = ''
      if (colMap.firstName !== '') {
        const first = String(row[parseInt(colMap.firstName)] ?? '').trim()
        const last  = colMap.lastName !== '' ? String(row[parseInt(colMap.lastName)] ?? '').trim() : ''
        name = last ? `${first} ${last}` : first
      } else if (colMap.name !== '') {
        name = String(row[parseInt(colMap.name)] ?? '').trim()
      }
      const phone    = colMap.phone    !== '' ? String(row[parseInt(colMap.phone)]    ?? '').trim() : ''
      const address  = colMap.address  !== '' ? String(row[parseInt(colMap.address)]  ?? '').trim() : ''
      const bdayRaw  = colMap.birthday !== '' ? row[parseInt(colMap.birthday)] : ''
      const birthday = parseBirthday(bdayRaw)
      return { name, phone: phone || null, address: address || null, birthday: birthday || null }
    }).filter(r => r.name)

    if (mapped.length === 0) { setError('No valid rows found with the selected columns'); return }
    setPreview(mapped)
    setStage('preview')
    setError('')
  }

  async function handleImport() {
    setStage('importing')
    setProgress(0)
    const imported = []
    const BATCH = 10
    for (let i = 0; i < preview.length; i += BATCH) {
      const batch = preview.slice(i, i + BATCH)
      await Promise.all(batch.map(async member => {
        try {
          const res  = await fetch('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...member, status: 'active', groupIds: [] }),
          })
          const data = await res.json()
          if (data.member) imported.push(data.member)
        } catch {}
      }))
      setProgress(Math.min(100, Math.round(((i + BATCH) / preview.length) * 100)))
    }
    onImported(imported)
  }

  const fieldLabels = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName',  label: 'Last Name' },
    { key: 'name',      label: 'Full Name (if no first/last)' },
    { key: 'phone',     label: 'Phone' },
    { key: 'address',   label: 'Address' },
    { key: 'birthday',  label: 'Birthday / Date of Birth' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,26,19,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '1.5rem', maxHeight: '90dvh', overflowY: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>
            Import Members
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9e90', padding: 4 }}>
            <CloseIcon />
          </button>
        </div>

        {/* STAGE: upload */}
        {stage === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed rgba(26,58,42,0.2)', borderRadius: 16, padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(26,58,42,0.4)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(26,58,42,0.2)'}
            >
              <p style={{ fontSize: 32, marginBottom: 10 }}>📊</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 6px' }}>Click to upload file</p>
              <p style={{ fontSize: 13, color: '#8a9e90', margin: 0 }}>.xlsx, .xls or .csv</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />
            </div>
            <div style={{ background: 'rgba(26,58,42,0.04)', borderRadius: 12, padding: '0.75rem 1rem', fontSize: 13, color: '#4a8a65', lineHeight: 1.5 }}>
              <strong>Supported columns:</strong> first_name / last_name / name, phone, address, birthday (any date format)
            </div>
            {error && <p style={{ fontSize: 14, color: '#dc2626', margin: 0 }}>{error}</p>}
            <button onClick={onClose} className="btn-outline w-full">Cancel</button>
          </div>
        )}

        {/* STAGE: map */}
        {stage === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>{rows.length} rows found · Map your columns below</p>
            {fieldLabels.map(({ key, label }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#2d4a36', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
                <select
                  style={{ width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 11, padding: '0.65rem 0.875rem', fontSize: 14, outline: 'none', background: '#fff', color: '#1a2e22', cursor: 'pointer', minHeight: 44 }}
                  value={colMap[key]}
                  onChange={e => setColMap(p => ({ ...p, [key]: e.target.value }))}
                >
                  <option value="">— not mapped —</option>
                  {headers.map((h, i) => <option key={i} value={String(i)}>{h} (col {i+1})</option>)}
                </select>
              </div>
            ))}
            {error && <p style={{ fontSize: 14, color: '#dc2626', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStage('upload')} className="btn-outline flex-1">Back</button>
              <button onClick={buildPreview} className="btn-primary flex-1">Preview →</button>
            </div>
          </div>
        )}

        {/* STAGE: preview */}
        {stage === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a', margin: 0 }}>{preview.length} members ready to import</p>
            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {preview.slice(0, 50).map((m, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '0.5rem 0.75rem', background: '#f7f5f0', borderRadius: 9 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</p>
                    <p style={{ fontSize: 12, color: '#8a9e90', margin: 0 }}>
                      {[m.phone, m.birthday].filter(Boolean).join(' · ') || 'No additional info'}
                    </p>
                  </div>
                </div>
              ))}
              {preview.length > 50 && (
                <p style={{ fontSize: 12, color: '#8a9e90', textAlign: 'center', padding: '0.5rem' }}>…and {preview.length - 50} more</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStage('map')} className="btn-outline flex-1">Back</button>
              <button onClick={handleImport} className="btn-primary flex-1">Import {preview.length} members</button>
            </div>
          </div>
        )}

        {/* STAGE: importing */}
        {stage === 'importing' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <p style={{ fontSize: 32, marginBottom: 16 }}>⏳</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 12px' }}>Importing…</p>
            <div style={{ height: 8, background: '#ede9e0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#1a3a2a', borderRadius: 4, width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
            <p style={{ fontSize: 13, color: '#8a9e90', marginTop: 8 }}>{progress}%</p>
          </div>
        )}
      </div>
    </div>
  )
}
