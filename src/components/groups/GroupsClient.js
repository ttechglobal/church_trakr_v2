'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { useRouter } from 'next/navigation'
import { fmtDate, attendanceRate, rateColor } from '@/lib/utils'

export default function GroupsClient({ churchId, groups: initialGroups }) {
  const router = useRouter()
  const [groups, setGroups] = useState(initialGroups)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', leader: '' })
  const [error, setError] = useState('')

  function openCreate() {
    setForm({ name: '', leader: '' })
    setError('')
    setShowCreate(true)
  }

  function openEdit(group) {
    setForm({ name: group.name, leader: group.leader ?? '' })
    setError('')
    setEditTarget(group)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Group name is required'); return }
    setSaving(true); setError('')
    try {
      const url = editTarget ? `/api/groups/${editTarget.id}` : '/api/groups'
      const method = editTarget ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), leader: form.leader.trim(), churchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')

      if (editTarget) {
        setGroups(prev => prev.map(g => g.id === editTarget.id
          ? { ...g, name: data.group.name, leader: data.group.leader }
          : g
        ))
        setEditTarget(null)
      } else {
        setGroups(prev => [...prev, { ...data.group, memberCount: 0, lastSession: null }])
        setShowCreate(false)
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
      const res = await fetch(`/api/groups/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setGroups(prev => prev.filter(g => g.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest">Groups</h1>
          <p className="text-sm text-mist mt-0.5">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary btn-sm gap-2">
          <PlusIcon /> New group
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state card mt-4">
          <p className="text-4xl">👥</p>
          <p className="font-semibold text-forest text-lg">No groups yet</p>
          <p className="text-sm text-mist max-w-xs">
            Create your first group to start tracking attendance. Each group (e.g. "Youth", "Women's Fellowship") is managed separately.
          </p>
          <button onClick={openCreate} className="btn btn-primary mt-2">Create first group</button>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group, i) => {
            const session = group.lastSession
            const rate = session
              ? attendanceRate(
                  session.attendance_records?.filter(r => r.present).length ?? 0,
                  session.attendance_records?.length ?? 0
                )
              : null

            return (
              <div
                key={group.id}
                className="card hover:shadow-card-hover transition-all animate-slide-up animate-fill-both"
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className="flex items-start gap-3">
                  {/* Color swatch */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-ivory font-display font-bold text-base shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)' }}
                  >
                    {group.name.slice(0, 1).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-forest text-[15px] truncate">{group.name}</p>
                    {group.leader && <p className="text-xs text-mist truncate">{group.leader}</p>}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="badge-muted">{group.memberCount} members</span>
                      {session && (
                        <span className="text-xs text-mist">Last: {fmtDate(session.date)}</span>
                      )}
                      {rate !== null && (
                        <span className={`text-xs font-semibold ${rateColor(rate)}`}>{rate}%</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(group)}
                      className="p-2 rounded-lg text-mist hover:text-forest hover:bg-ivory transition-colors"
                      title="Edit"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(group)}
                      className="p-2 rounded-lg text-mist hover:text-error hover:bg-error/8 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-forest/8">
                  <Link
                    href={`/attendance?group=${group.id}`}
                    className="btn btn-outline btn-sm flex-1 text-xs gap-1.5"
                  >
                    <CheckIcon /> Take attendance
                  </Link>
                  <Link
                    href={`/groups/${group.id}`}
                    className="btn btn-primary btn-sm flex-1 text-xs gap-1.5"
                  >
                    View group →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      {(showCreate || editTarget) && (
        <Modal
          title={editTarget ? `Edit "${editTarget.name}"` : 'New group'}
          onClose={() => { setShowCreate(false); setEditTarget(null) }}
        >
          <div className="space-y-4">
            <div>
              <label className="input-label">Group name *</label>
              <input
                className="input"
                placeholder="e.g. Youth Fellowship"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <label className="input-label">Leader name</label>
              <input
                className="input"
                placeholder="e.g. Pastor James"
                value={form.leader}
                onChange={e => setForm(p => ({ ...p, leader: e.target.value }))}
              />
            </div>
            {error && <p className="text-sm text-error">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setShowCreate(false); setEditTarget(null) }} className="btn btn-outline flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
                {saving ? 'Saving…' : (editTarget ? 'Save changes' : 'Create group')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <Modal title="Delete group?" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-forest-muted mb-4">
            <strong>"{deleteTarget.name}"</strong> will be deleted. Members in this group will NOT be deleted — they'll just be removed from this group.
          </p>
          {error && <p className="text-sm text-error mb-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn btn-outline flex-1">Cancel</button>
            <button onClick={handleDelete} disabled={saving} className="btn btn-danger flex-1">
              {saving ? 'Deleting…' : 'Delete group'}
            </button>
          </div>
        </Modal>
      )}

      <div className="h-6" />
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-modal animate-slide-up safe-bottom">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-forest">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-mist hover:text-forest hover:bg-ivory transition-colors">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function PlusIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function EditIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> }
function TrashIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg> }
function CheckIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function CloseIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
