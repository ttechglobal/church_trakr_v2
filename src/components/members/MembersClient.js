'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/ui/BackButton'
import { getAv, fmtBday, normBirthday } from '@/lib/utils'
import { Search, Plus, Upload, ChevronRight, X, Pencil, Users, Check, AlertTriangle } from 'lucide-react'

export default function MembersClient({ churchId, members: initMembers, groups }) {
  const router = useRouter()
  const [members, setMembers]           = useState(initMembers)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [sortBy, setSortBy]             = useState('name')
  const [showAdd, setShowAdd]           = useState(false)
  const [showImport, setShowImport]     = useState(false)
  const [editTarget, setEditTarget]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [inactivePrompts, setInactivePrompts] = useState([])
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')

  const defaultGroup = groups.find(g => g.name !== 'First Timers') ?? groups[0]
  const [editingGroupName, setEditingGroupName] = useState(false)
  const [groupNameVal, setGroupNameVal]         = useState(defaultGroup?.name ?? '')
  const [savingGroupName, setSavingGroupName]   = useState(false)

  const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]))

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

  const counts = {
    active:   members.filter(m => m.status === 'active').length,
    inactive: members.filter(m => m.status === 'inactive').length,
    away:     members.filter(m => m.status === 'away').length,
  }

  async function saveGroupName() {
    if (!defaultGroup || !groupNameVal.trim()) return
    setSavingGroupName(true)
    try {
      await fetch('/api/groups/' + defaultGroup.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupNameVal.trim(), leader: defaultGroup.leader ?? '' }),
      })
      setEditingGroupName(false)
      router.refresh()
    } finally { setSavingGroupName(false) }
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
      }
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function confirmInactive(member) {
    setInactivePrompts(p => p.filter(x => x.member.id !== member.id))
    const res = await fetch('/api/members', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: member.id, status: 'inactive' }),
    })
    const data = await res.json()
    if (res.ok) setMembers(prev => prev.map(m => m.id === member.id ? data.member : m))
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    try {
      const res = await fetch('/api/members?id=' + deleteTarget.id, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setMembers(prev => prev.filter(m => m.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const STATUS_TABS = [
    { val: 'active',   label: 'Active',   count: counts.active   },
    { val: 'inactive', label: 'Inactive', count: counts.inactive  },
    { val: 'away',     label: 'Away',     count: counts.away      },
    { val: 'all',      label: 'All',      count: members.length   },
  ]

  return (
    <div className="page-content">
      <div>
        <BackButton />
        <div className="flex items-start justify-between mt-1">
          <div className="min-w-0">
            {defaultGroup && (
              <div className="flex items-center gap-1.5 mb-0.5">
                {editingGroupName ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="input text-sm" style={{ minHeight: 32, padding: '0 10px', width: 160 }}
                      value={groupNameVal} autoFocus
                      onChange={e => setGroupNameVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveGroupName(); if (e.key === 'Escape') setEditingGroupName(false) }}
                    />
                    <button onClick={saveGroupName} disabled={savingGroupName}
                      className="btn btn-primary btn-sm" style={{ minHeight: 32, padding: '0 10px' }}>
                      {savingGroupName ? '…' : <Check size={13} />}
                    </button>
                    <button onClick={() => setEditingGroupName(false)}
                      className="btn btn-ghost btn-sm" style={{ minHeight: 32, padding: '0 8px' }}>
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingGroupName(true)}
                    className="flex items-center gap-1 text-xs text-mist hover:text-forest transition-colors group">
                    <span>{defaultGroup.name}</span>
                    <Pencil size={10} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                  </button>
                )}
              </div>
            )}
            <h1 className="font-display text-2xl font-semibold text-forest">Members</h1>
            <p className="text-sm text-mist mt-0.5">
              {counts.active} active
              {counts.inactive > 0 ? ' · ' + counts.inactive + ' inactive' : ''}
              {counts.away > 0 ? ' · ' + counts.away + ' away' : ''}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowImport(true)} className="btn btn-outline btn-sm gap-1.5">
              <Upload size={13} strokeWidth={2} /> Import
            </button>
            <button onClick={() => { setShowAdd(true); setError('') }} className="btn btn-primary btn-sm gap-1.5">
              <Plus size={13} strokeWidth={2.5} /> Add
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist pointer-events-none" />
        <input type="search" placeholder="Search by name or phone…"
          className="input pl-9 text-sm" style={{ minHeight: 42 }}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_TABS.map(({ val, label, count }) => (
          <button key={val} onClick={() => setStatusFilter(val)}
            className={'btn btn-sm gap-1.5 ' + (statusFilter === val ? 'btn-primary' : 'btn-outline')}>
            {label}
            {count > 0 && (
              <span className={'text-[10px] font-bold rounded-full px-1.5 ' +
                (statusFilter === val ? 'bg-white/20 text-ivory' : 'bg-forest/8 text-mist')}>
                {count}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto">
          <select className="text-xs border border-forest/20 rounded-lg px-2 py-1.5 text-forest bg-white outline-none"
            value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="name">A–Z</option>
            <option value="newest">Newest first</option>
          </select>
        </div>
      </div>

      {inactivePrompts.map(({ member, missedCount }) => (
        <div key={member.id} className="card" style={{ borderColor: 'rgba(217,119,6,0.3)', background: 'rgba(217,119,6,0.04)' }}>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(217,119,6,0.15)' }}>
              <AlertTriangle size={14} style={{ color: '#d97706' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-forest">{member.name} missed {missedCount} Sundays</p>
              <p className="text-xs text-mist mt-0.5">Move to inactive?</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setInactivePrompts(p => p.filter(x => x.member.id !== member.id))}
                className="btn btn-ghost btn-sm text-xs text-mist">Dismiss</button>
              <button onClick={() => confirmInactive(member)}
                className="btn btn-sm text-xs" style={{ border: '1px solid rgba(217,119,6,0.4)', color: '#d97706', background: 'rgba(217,119,6,0.08)' }}>
                Move
              </button>
            </div>
          </div>
        </div>
      ))}

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Users size={36} className="text-mist" strokeWidth={1.5} />
          <p className="font-semibold text-forest">{members.length === 0 ? 'No members yet' : 'No results'}</p>
          {members.length === 0 && <p className="text-sm text-mist text-center">Add your first member or import from Excel / CSV.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m, i) => {
            const av = getAv(m.name)
            const memberGroups = (m.groupIds ?? []).map(id => groupMap[id]).filter(Boolean)
            return (
              <button key={m.id} onClick={() => router.push('/members/' + m.id)}
                className="card w-full text-left flex items-center gap-3 hover:shadow-card-hover transition-all active:scale-[0.99] animate-slide-up animate-fill-both"
                style={{ animationDelay: Math.min(i * 0.03, 0.3) + 's' }}>
                <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>{av.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-forest text-[14px] truncate">{m.name}</p>
                    {m.status === 'inactive' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-forest/8 text-mist shrink-0">inactive</span>}
                    {m.status === 'away' && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(217,119,6,0.1)', color: '#a8862e' }}>away</span>}
                  </div>
                  {m.phone && <p className="text-xs text-mist truncate">{m.phone}</p>}
                  {memberGroups.length > 0 && <p className="text-xs text-forest-muted truncate">{memberGroups.join(', ')}</p>}
                </div>
                {m.birthday && <span className="text-xs text-gold-dark shrink-0">🎂 {fmtBday(normBirthday(m.birthday))}</span>}
                <ChevronRight size={16} className="text-mist shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {showImport && (
        <MemberImportModal
          defaultGroupId={defaultGroup?.id ?? null}
          onClose={() => setShowImport(false)}
          onImported={imported => {
            setMembers(prev => {
              const ids = new Set(prev.map(m => m.id))
              return [...prev, ...imported.filter(m => !ids.has(m.id))].sort((a, b) => a.name.localeCompare(b.name))
            })
            setShowImport(false)
          }}
        />
      )}

      {showAdd && (
        <MemberFormModal
          initial={{ name: '', phone: '', address: '', birthday: '', groupIds: defaultGroup?.id ? [defaultGroup.id] : [], status: 'active' }}
          groups={groups.filter(g => g.name !== 'First Timers')}
          isNew={true} saving={saving} error={error}
          onSave={handleSaveMember}
          onClose={() => { setShowAdd(false); setError('') }}
        />
      )}

      {deleteTarget && (
        <ModalShell title="Delete member?" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-forest-muted mb-4"><strong>{deleteTarget.name}</strong> will be permanently deleted.</p>
          {error && <p className="text-sm text-error mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn btn-outline flex-1">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="btn btn-danger flex-1">{saving ? 'Deleting…' : 'Delete permanently'}</button>
          </div>
        </ModalShell>
      )}
      <div className="h-8" />
    </div>
  )
}

export function MemberFormModal({ initial, groups, isNew, saving, error, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial.name ?? '', phone: initial.phone ?? '', address: initial.address ?? '',
    birthday: initial.birthday ?? '', groupIds: initial.groupIds ?? [], status: initial.status ?? 'active',
  })
  function toggleGroup(gid) {
    setForm(p => ({ ...p, groupIds: p.groupIds.includes(gid) ? p.groupIds.filter(id => id !== gid) : [...p.groupIds, gid] }))
  }
  return (
    <ModalShell title={isNew ? 'Add member' : 'Edit member'} onClose={onClose}>
      <div className="space-y-3">
        <div><label className="input-label">Full name *</label>
          <input className="input" placeholder="Full name" autoFocus value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
        <div><label className="input-label">Phone</label>
          <input className="input" type="tel" placeholder="+234…" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
        <div><label className="input-label">Address</label>
          <input className="input" placeholder="Optional" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
        <div><label className="input-label">Birthday</label>
          <input className="input" type="date" value={form.birthday} onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))} /></div>
        {groups.length > 0 && (
          <div><label className="input-label">Groups</label>
            <div className="flex flex-wrap gap-2">
              {groups.map(g => (
                <button key={g.id} type="button" onClick={() => toggleGroup(g.id)}
                  className={'text-xs px-3 py-1.5 rounded-full border transition-colors ' +
                    (form.groupIds.includes(g.id) ? 'bg-forest text-ivory border-forest' : 'border-forest/20 text-mist hover:border-forest/40')}>
                  {g.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <div><label className="input-label">Status</label>
          <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="away">Away (travelling / on leave)</option>
          </select></div>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn btn-outline flex-1">Cancel</button>
          <button onClick={() => onSave({ name: form.name.trim(), phone: form.phone.trim() || null, address: form.address.trim() || null, birthday: form.birthday || null, groupIds: form.groupIds, status: form.status }, isNew)}
            disabled={saving || !form.name.trim()} className="btn btn-primary flex-1">
            {saving ? 'Saving…' : (isNew ? 'Add member' : 'Save changes')}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}

function MemberImportModal({ onClose, onImported, defaultGroupId }) {
  const [stage, setStage]     = useState('upload')
  const [headers, setHeaders] = useState([])
  const [rows, setRows]       = useState([])
  const [colMap, setColMap]   = useState({ firstName: '', lastName: '', name: '', phone: '', address: '', birthday: '' })
  const [preview, setPreview] = useState([])
  const [progress, setProgress] = useState(0)
  const [error, setError]     = useState('')
  const fileRef = useRef()

  function parseBirthday(raw) {
    if (!raw && raw !== 0) return ''
    if (typeof raw === 'number') {
      if (raw > 1000) { const d = new Date((raw - 25569) * 86400 * 1000); if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10) }
      return ''
    }
    const s = String(raw).trim()
    if (!s) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const slash4 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (slash4) { const [, a, b, y] = slash4; const d = parseInt(a) > 12 ? a : b; const m = parseInt(a) > 12 ? b : a; return y + '-' + m.padStart(2,'0') + '-' + d.padStart(2,'0') }
    const dash4 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (dash4) { const [, d, m, y] = dash4; return y + '-' + m.padStart(2,'0') + '-' + d.padStart(2,'0') }
    const slash2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
    if (slash2) { const [, d, m, y] = slash2; const yr = parseInt(y) > 30 ? '19' + y : '20' + y; return yr + '-' + m.padStart(2,'0') + '-' + d.padStart(2,'0') }
    const mon = s.match(/^(\d{1,2})[- ]([A-Za-z]{3,})[- ](\d{2,4})$/)
    if (mon) {
      const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12}
      const [, d, mo, y] = mon; const mv = months[mo.toLowerCase().slice(0,3)]
      if (mv) { const yr = y.length === 2 ? (parseInt(y) > 30 ? '19' + y : '20' + y) : y; return yr + '-' + String(mv).padStart(2,'0') + '-' + d.padStart(2,'0') }
    }
    return ''
  }

  function autoDetect(hdrs) {
    const m = { firstName: '', lastName: '', name: '', phone: '', address: '', birthday: '' }
    hdrs.forEach((h, i) => {
      const l = h.toLowerCase().trim(); const idx = String(i)
      if (!m.firstName && (l === 'first_name' || l === 'firstname' || l === 'first name')) m.firstName = idx
      if (!m.lastName && (l === 'last_name' || l === 'lastname' || l === 'last name')) m.lastName = idx
      if (!m.name && !m.firstName && (l === 'name' || l === 'full name' || l === 'full_name')) m.name = idx
      if (!m.phone && (l.includes('phone') || l.includes('mobile') || l.includes('tel'))) m.phone = idx
      if (!m.address && (l.includes('address') || l.includes('location'))) m.address = idx
      if (!m.birthday && (l.includes('birth') || l.includes('dob') || l === 'date_of_birth')) m.birthday = idx
    })
    return m
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const { read, utils } = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb  = read(new Uint8Array(buf), { type: 'array', cellDates: false, raw: true })
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const data = utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })
      if (!data || data.length < 2) { setError('File appears to be empty'); return }
      const hdrs = (data[0] ?? []).map(String)
      const dataRows = data.slice(1).filter(r => Array.isArray(r) && r.some(c => String(c ?? '').trim()))
      setHeaders(hdrs); setRows(dataRows); setColMap(autoDetect(hdrs)); setStage('map')
    } catch { setError('Could not read file. Ensure it is a valid .xlsx or .csv file.') }
  }

  function buildPreview() {
    if (!colMap.name && !colMap.firstName) { setError('Map at least a Name or First Name column'); return }
    const mapped = rows.map(row => {
      let name = ''
      if (colMap.firstName) { const first = String(row[parseInt(colMap.firstName)] ?? '').trim(); const last = colMap.lastName ? String(row[parseInt(colMap.lastName)] ?? '').trim() : ''; name = [first, last].filter(Boolean).join(' ') }
      else { name = String(row[parseInt(colMap.name)] ?? '').trim() }
      return {
        name,
        phone:    colMap.phone    ? String(row[parseInt(colMap.phone)]    ?? '').trim() || null : null,
        address:  colMap.address  ? String(row[parseInt(colMap.address)]  ?? '').trim() || null : null,
        birthday: colMap.birthday ? parseBirthday(row[parseInt(colMap.birthday)]) || null : null,
      }
    }).filter(r => r.name)
    if (!mapped.length) { setError('No valid rows found. Check your column mapping.'); return }
    setPreview(mapped); setStage('preview'); setError('')
  }

  async function handleImport() {
    setStage('importing'); setProgress(0)
    const imported = []; const BATCH = 10
    for (let i = 0; i < preview.length; i += BATCH) {
      await Promise.all(preview.slice(i, i + BATCH).map(async m => {
        try { const res = await fetch('/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...m, status: 'active', groupIds: defaultGroupId ? [defaultGroupId] : [] }) }); const data = await res.json(); if (data.member) imported.push(data.member) } catch {}
      }))
      setProgress(Math.min(100, Math.round(((i + BATCH) / preview.length) * 100)))
    }
    onImported(imported)
  }

  function downloadSample() {
    const csv = 'first_name,last_name,phone,address,birthday\nAda,Okafor,+2348012345678,Lagos,15/03/1990\nEmeka,Nwosu,,Abuja,22-Jul-1985'
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'members-template.csv'; a.click()
  }

  const fieldLabels = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName',  label: 'Last Name (optional)' },
    { key: 'name',      label: 'Full Name (alternative to first/last)' },
    { key: 'phone',     label: 'Phone' },
    { key: 'address',   label: 'Address' },
    { key: 'birthday',  label: 'Birthday / Date of Birth' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-md shadow-modal animate-slide-up max-h-[90dvh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-semibold text-forest">Import Members</h3>
            <button onClick={onClose} className="btn btn-ghost btn-sm p-1.5"><X size={18} /></button>
          </div>
          {stage === 'upload' && (
            <div className="space-y-4">
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-forest/20 rounded-2xl p-8 text-center cursor-pointer hover:border-forest/40 hover:bg-forest/[0.02] transition-all">
                <Upload size={28} className="text-forest/30 mx-auto mb-3" strokeWidth={1.5} />
                <p className="font-semibold text-forest mb-1">Click to upload</p>
                <p className="text-sm text-mist">.xlsx, .xls or .csv</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              </div>
              <div className="bg-forest/4 rounded-2xl p-4 space-y-1.5">
                <p className="text-xs font-bold text-forest uppercase tracking-wide">File format</p>
                <p className="text-sm text-mist">Include a <strong className="text-forest">name</strong> or <strong className="text-forest">first_name</strong> column. Optional: last_name, phone, address, birthday (any date format).</p>
              </div>
              <button onClick={downloadSample} className="btn btn-ghost btn-sm w-full gap-2 text-mist">Download sample template ↓</button>
              {error && <p className="text-sm text-error">{error}</p>}
              <button onClick={onClose} className="btn btn-outline w-full">Cancel</button>
            </div>
          )}
          {stage === 'map' && (
            <div className="space-y-4">
              <p className="text-sm text-mist">{rows.length} rows found — map your columns</p>
              {fieldLabels.map(({ key, label }) => (
                <div key={key}><label className="input-label">{label}</label>
                  <select className="input text-sm" value={colMap[key]} onChange={e => setColMap(p => ({ ...p, [key]: e.target.value }))}>
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                  </select>
                </div>
              ))}
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="flex gap-3">
                <button onClick={() => setStage('upload')} className="btn btn-outline flex-1">Back</button>
                <button onClick={buildPreview} className="btn btn-primary flex-1">Preview →</button>
              </div>
            </div>
          )}
          {stage === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-forest">{preview.length} members ready to import</p>
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {preview.slice(0, 50).map((m, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-ivory rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-forest truncate">{m.name}</p>
                      {(m.phone || m.birthday) && <p className="text-xs text-mist">{[m.phone, m.birthday].filter(Boolean).join(' · ')}</p>}
                    </div>
                    <Check size={12} className="text-success shrink-0" />
                  </div>
                ))}
                {preview.length > 50 && <p className="text-xs text-mist text-center py-2">…and {preview.length - 50} more</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStage('map')} className="btn btn-outline flex-1">Back</button>
                <button onClick={handleImport} className="btn btn-primary flex-1">Import {preview.length}</button>
              </div>
            </div>
          )}
          {stage === 'importing' && (
            <div className="text-center py-8 space-y-4">
              <p className="text-3xl">⏳</p>
              <p className="font-semibold text-forest">Importing members…</p>
              <div className="h-2 bg-ivory-deeper rounded-full overflow-hidden">
                <div className="h-full bg-forest rounded-full transition-all duration-300" style={{ width: progress + '%' }} />
              </div>
              <p className="text-sm text-mist">{progress}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-modal animate-slide-up safe-bottom max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-forest">{title}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-sm p-1.5"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
