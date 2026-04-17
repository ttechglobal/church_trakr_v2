'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fmtDate, fmtBday, getAv, attendanceRate, normBirthday, toWhatsAppNumber } from '@/lib/utils'

export default function GroupDetailClient({ church, group, members: initMembers, allMembers, sessions }) {
  const router = useRouter()
  const [members, setMembers] = useState(initMembers)
  const [tab, setTab] = useState('members') // members | birthdays | attendance
  const [showAddExisting, setShowAddExisting] = useState(false)
  const [showAddNew, setShowAddNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search, setSearch] = useState('')

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone ?? '').includes(search)
  )

  // Members not yet in this group
  const nonGroupMembers = allMembers.filter(m => !(m.groupIds ?? []).includes(group.id))

  // Birthdays this month / week
  const today = new Date()
  const thisMonth = today.getMonth() + 1
  const thisWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i)
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })

  function getBdayMMDD(m) {
    const b = normBirthday(m.birthday)
    if (!b) return null
    const parts = b.split('-')
    if (parts.length === 3) return `${parts[1]}-${parts[2]}`
    if (parts.length === 2) return b
    return null
  }

  const birthdayThisWeek = members.filter(m => {
    const mmdd = getBdayMMDD(m)
    return mmdd && thisWeek.includes(mmdd)
  })
  const birthdayThisMonth = members.filter(m => {
    const mmdd = getBdayMMDD(m)
    if (!mmdd) return false
    const month = parseInt(mmdd.split('-')[0], 10)
    return month === thisMonth
  })

  async function handleRemoveMember(memberId) {
    const member = members.find(m => m.id === memberId)
    if (!member) return
    const newGroupIds = (member.groupIds ?? []).filter(id => id !== group.id)
    try {
      await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId, groupIds: newGroupIds }),
      })
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (err) {
      alert('Failed to remove member')
    }
  }

  async function handleAddExisting(memberId) {
    const member = allMembers.find(m => m.id === memberId)
    if (!member) return
    const newGroupIds = [...new Set([...(member.groupIds ?? []), group.id])]
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: memberId, groupIds: newGroupIds }),
      })
      const data = await res.json()
      if (data.member) setMembers(prev => [...prev, data.member].sort((a, b) => a.name.localeCompare(b.name)))
      setShowAddExisting(false)
    } catch (err) {
      alert('Failed to add member')
    }
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/groups" className="btn-ghost btn-sm px-2">
          <ChevronLeft />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl font-semibold text-forest truncate">{group.name}</h1>
          {group.leader && <p className="text-sm text-mist">{group.leader}</p>}
        </div>
        <Link href={`/attendance?group=${group.id}`} className="btn-primary btn-sm gap-1.5">
          <CheckIcon /> Attendance
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <p className="font-display text-2xl font-bold text-forest">{members.length}</p>
          <p className="text-[11px] text-mist mt-0.5">Members</p>
        </div>
        <div className="card text-center py-3">
          <p className="font-display text-2xl font-bold text-forest">{sessions.length}</p>
          <p className="text-[11px] text-mist mt-0.5">Sessions</p>
        </div>
        <div className="card text-center py-3">
          <p className="font-display text-2xl font-bold text-gold">{birthdayThisMonth.length}</p>
          <p className="text-[11px] text-mist mt-0.5">Birthdays</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ivory-darker rounded-xl p-1" style={{ background: 'var(--ivory-dark)' }}>
        {[['members', 'Members'], ['birthdays', '🎂 Birthdays'], ['attendance', 'Attendance']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setTab(val)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all
              ${tab === val ? 'bg-white text-forest shadow-card' : 'text-mist hover:text-forest'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Members tab ── */}
      {tab === 'members' && (
        <>
          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowAddNew(true)} className="btn-primary btn-sm gap-1.5">
              <PlusIcon /> New member
            </button>
            {nonGroupMembers.length > 0 && (
              <button onClick={() => setShowAddExisting(true)} className="btn-outline btn-sm gap-1.5">
                <UserPlusIcon /> Add existing
              </button>
            )}
            <button onClick={() => setShowImport(true)} className="btn-outline btn-sm gap-1.5">
              <UploadIcon /> Import Excel
            </button>
          </div>

          {/* Search */}
          {members.length > 5 && (
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-mist w-4 h-4 pointer-events-none" />
              <input
                type="search"
                className="input pl-9 text-sm"
                placeholder="Search members…"
                style={{ minHeight: 40 }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}

          {filteredMembers.length === 0 ? (
            <div className="empty-state card">
              <p className="text-3xl">👤</p>
              <p className="font-medium text-forest">{search ? 'No results' : 'No members yet'}</p>
              {!search && <p className="text-sm text-mist">Add members to start tracking attendance.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map(m => {
                const av = getAv(m.name)
                const waNum = toWhatsAppNumber(m.phone ?? '')
                return (
                  <div key={m.id} className="card flex items-center gap-3">
                    <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>
                      {av.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-forest text-[14px] truncate">{m.name}</p>
                      {m.phone && <p className="text-xs text-mist truncate">{m.phone}</p>}
                      {m.birthday && (
                        <p className="text-xs text-gold-dark">🎂 {fmtBday(normBirthday(m.birthday))}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {m.phone && (
                        <a href={`tel:${m.phone}`} className="p-2 rounded-lg text-mist hover:text-forest hover:bg-ivory transition-colors">
                          <PhoneIcon />
                        </a>
                      )}
                      {waNum && (
                        <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
                          className="p-2 rounded-lg text-mist hover:bg-[#25D366]/10 transition-colors"
                          style={{ color: '#25D366' }}>
                          <WhatsAppIcon />
                        </a>
                      )}
                      <button
                        onClick={() => handleRemoveMember(m.id)}
                        className="p-2 rounded-lg text-mist hover:text-error hover:bg-error/8 transition-colors"
                        title="Remove from group"
                      >
                        <RemoveIcon />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Birthdays tab ── */}
      {tab === 'birthdays' && (
        <BirthdaysTab
          thisWeek={birthdayThisWeek}
          thisMonth={birthdayThisMonth}
          church={church}
        />
      )}

      {/* ── Attendance tab ── */}
      {tab === 'attendance' && (
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="empty-state card">
              <p className="text-3xl">📋</p>
              <p className="font-medium text-forest">No sessions yet</p>
              <Link href={`/attendance?group=${group.id}`} className="btn-primary btn-sm mt-2">
                Take first attendance
              </Link>
            </div>
          ) : sessions.map(s => {
            const total = s.attendance_records?.length ?? 0
            const present = s.attendance_records?.filter(r => r.present).length ?? 0
            const rate = attendanceRate(present, total)
            return (
              <div key={s.id} className="card flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-forest text-[14px]">{fmtDate(s.date)}</p>
                  <p className="text-xs text-mist mt-0.5">{present}/{total} present</p>
                </div>
                <p className={`font-display text-xl font-bold ${
                  rate >= 75 ? 'text-success' : rate >= 50 ? 'text-warning' : 'text-error'
                }`}>{rate}%</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Add existing member modal */}
      {showAddExisting && (
        <Modal title="Add existing member" onClose={() => setShowAddExisting(false)}>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {nonGroupMembers.length === 0 ? (
              <p className="text-sm text-mist text-center py-4">All members are already in this group</p>
            ) : nonGroupMembers.map(m => {
              const av = getAv(m.name)
              return (
                <button
                  key={m.id}
                  onClick={() => handleAddExisting(m.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-ivory transition-colors text-left"
                >
                  <div className="avatar text-xs shrink-0" style={{ background: av.bg, color: av.color, width: 30, height: 30 }}>
                    {av.initials}
                  </div>
                  <span className="text-[14px] text-forest font-medium">{m.name}</span>
                </button>
              )
            })}
          </div>
        </Modal>
      )}

      {/* Add new member modal */}
      {showAddNew && (
        <AddNewMemberModal
          churchId={church.id}
          groupId={group.id}
          onClose={() => setShowAddNew(false)}
          onAdded={member => {
            setMembers(prev => [...prev, member].sort((a, b) => a.name.localeCompare(b.name)))
            setShowAddNew(false)
          }}
        />
      )}

      {/* Excel import modal */}
      {showImport && (
        <ExcelImportModal
          churchId={church.id}
          groupId={group.id}
          onClose={() => setShowImport(false)}
          onImported={newMembers => {
            setMembers(prev => {
              const ids = new Set(prev.map(m => m.id))
              return [...prev, ...newMembers.filter(m => !ids.has(m.id))]
                .sort((a, b) => a.name.localeCompare(b.name))
            })
            setShowImport(false)
          }}
        />
      )}

      <div className="h-6" />
    </div>
  )
}

// ─── Birthdays Tab ──────────────────────────────────────────────────────────────
function BirthdaysTab({ thisWeek, thisMonth, church }) {
  return (
    <div className="space-y-4">
      {thisWeek.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-forest-muted uppercase tracking-wider mb-2">This week 🎉</h3>
          <div className="space-y-2">
            {thisWeek.map(m => {
              const av = getAv(m.name)
              const waNum = toWhatsAppNumber(m.phone ?? '')
              const waMsg = encodeURIComponent(`Happy birthday ${m.name.split(' ')[0]}! 🎂 Wishing you God's abundant blessings today and always. 🙏`)
              return (
                <div key={m.id} className="card flex items-center gap-3 border-gold/30">
                  <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>{av.initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-forest truncate">{m.name}</p>
                    <p className="text-xs text-gold-dark">🎂 {fmtBday(normBirthday(m.birthday))}</p>
                  </div>
                  {waNum && (
                    <a
                      href={`https://wa.me/${waNum}?text=${waMsg}`}
                      target="_blank" rel="noreferrer"
                      className="btn-sm gap-1.5 text-xs shrink-0"
                      style={{ background: '#25D366', color: '#fff' }}
                    >
                      <WhatsAppIcon /> Wish
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {thisMonth.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-forest-muted uppercase tracking-wider mb-2">This month</h3>
          <div className="space-y-2">
            {thisMonth.map(m => {
              const av = getAv(m.name)
              return (
                <div key={m.id} className="card flex items-center gap-3">
                  <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>{av.initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-forest truncate">{m.name}</p>
                    <p className="text-xs text-mist">🎂 {fmtBday(normBirthday(m.birthday))}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {thisWeek.length === 0 && thisMonth.length === 0 && (
        <div className="empty-state card">
          <p className="text-3xl">🎂</p>
          <p className="font-medium text-forest">No birthdays this month</p>
          <p className="text-sm text-mist">Add birthday dates to member profiles to see them here.</p>
        </div>
      )}
    </div>
  )
}

// ─── Add New Member Modal ───────────────────────────────────────────────────────
function AddNewMemberModal({ churchId, groupId, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', birthday: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          birthday: form.birthday || null,
          groupIds: [groupId],
          status: 'active',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      onAdded(data.member)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal title="Add new member" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="input-label">Name *</label>
          <input className="input" placeholder="Full name" value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
        </div>
        <div>
          <label className="input-label">Phone</label>
          <input className="input" type="tel" placeholder="+234..." value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <div>
          <label className="input-label">Address</label>
          <input className="input" placeholder="Optional" value={form.address}
            onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
        </div>
        <div>
          <label className="input-label">Birthday</label>
          <input className="input" type="date" value={form.birthday}
            onChange={e => setForm(p => ({ ...p, birthday: e.target.value }))} />
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-outline flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Adding…' : 'Add member'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Excel Import Modal ─────────────────────────────────────────────────────────
function ExcelImportModal({ churchId, groupId, onClose, onImported }) {
  const [stage, setStage] = useState('upload') // upload | map | preview | importing
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [colMap, setColMap] = useState({ name: '', phone: '', address: '', birthday: '' })
  const [preview, setPreview] = useState([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef()

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    try {
      const XLSX = (await import('xlsx')).default
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (data.length < 2) { setError('File appears to be empty'); return }
      const hdrs = data[0].map(String)
      const dataRows = data.slice(1).filter(r => r.some(c => c !== ''))
      setHeaders(hdrs)
      setRows(dataRows)
      // Auto-detect columns
      const autoMap = { name: '', phone: '', address: '', birthday: '' }
      hdrs.forEach((h, i) => {
        const lower = h.toLowerCase()
        if (!autoMap.name && (lower.includes('name') || lower.includes('full'))) autoMap.name = String(i)
        if (!autoMap.phone && (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel'))) autoMap.phone = String(i)
        if (!autoMap.address && (lower.includes('address') || lower.includes('location'))) autoMap.address = String(i)
        if (!autoMap.birthday && (lower.includes('birth') || lower.includes('dob') || lower.includes('bday'))) autoMap.birthday = String(i)
      })
      setColMap(autoMap)
      setStage('map')
    } catch (err) {
      setError('Could not read file. Try saving as .xlsx or .csv first.')
    }
  }

  function buildPreview() {
    if (!colMap.name) { setError('Please map the Name column'); return }
    const mapped = rows.map(row => ({
      name: String(row[parseInt(colMap.name)] ?? '').trim(),
      phone: colMap.phone ? String(row[parseInt(colMap.phone)] ?? '').trim() : '',
      address: colMap.address ? String(row[parseInt(colMap.address)] ?? '').trim() : '',
      birthday: colMap.birthday ? normBirthday(row[parseInt(colMap.birthday)]) : '',
    })).filter(r => r.name)
    if (mapped.length === 0) { setError('No valid rows found with the selected Name column'); return }
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
          const res = await fetch('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...member, groupIds: [groupId], status: 'active' }),
          })
          const data = await res.json()
          if (data.member) imported.push(data.member)
        } catch {}
      }))
      setProgress(Math.round(((i + BATCH) / preview.length) * 100))
    }
    onImported(imported)
  }

  return (
    <Modal title="Import from Excel / CSV" onClose={onClose}>
      {stage === 'upload' && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-forest/20 rounded-2xl p-8 text-center cursor-pointer
              hover:border-forest/40 hover:bg-forest/[0.02] transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <p className="text-3xl mb-2">📊</p>
            <p className="font-medium text-forest">Click to upload</p>
            <p className="text-sm text-mist mt-1">.xlsx or .csv files</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <button onClick={onClose} className="btn-outline w-full">Cancel</button>
        </div>
      )}

      {stage === 'map' && (
        <div className="space-y-4">
          <p className="text-sm text-mist">{rows.length} rows found. Map your columns:</p>
          {[['name', 'Name *'], ['phone', 'Phone'], ['address', 'Address'], ['birthday', 'Birthday']].map(([field, label]) => (
            <div key={field}>
              <label className="input-label">{label}</label>
              <select
                className="input"
                value={colMap[field]}
                onChange={e => setColMap(p => ({ ...p, [field]: e.target.value }))}
              >
                <option value="">— not mapped —</option>
                {headers.map((h, i) => <option key={i} value={String(i)}>{h} (col {i + 1})</option>)}
              </select>
            </div>
          ))}
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStage('upload')} className="btn-outline flex-1">Back</button>
            <button onClick={buildPreview} className="btn-primary flex-1">Preview import</button>
          </div>
        </div>
      )}

      {stage === 'preview' && (
        <div className="space-y-4">
          <p className="text-sm font-medium text-forest">{preview.length} members to import:</p>
          <div className="max-h-52 overflow-y-auto space-y-1.5 border border-forest/10 rounded-xl p-3">
            {preview.slice(0, 20).map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-forest truncate">{m.name}</span>
                {m.phone && <span className="text-mist text-xs">{m.phone}</span>}
                {m.birthday && <span className="text-gold-dark text-xs">🎂 {fmtBday(m.birthday)}</span>}
              </div>
            ))}
            {preview.length > 20 && (
              <p className="text-xs text-mist text-center pt-1">…and {preview.length - 20} more</p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStage('map')} className="btn-outline flex-1">Back</button>
            <button onClick={handleImport} className="btn-primary flex-1">
              Import {preview.length} members
            </button>
          </div>
        </div>
      )}

      {stage === 'importing' && (
        <div className="text-center py-6 space-y-4">
          <p className="font-medium text-forest">Importing members…</p>
          <div className="h-2 bg-ivory-deeper rounded-full overflow-hidden">
            <div
              className="h-full bg-forest rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-mist">{progress}%</p>
        </div>
      )}
    </Modal>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
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
function ChevronLeft() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg> }
function CheckIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function PlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function UserPlusIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/></svg> }
function UploadIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg> }
function SearchIcon({ className = '' }) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> }
function RemoveIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
function PhoneIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg> }
function WhatsAppIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> }
function CloseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
