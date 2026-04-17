'use client'

import { useState } from 'react'
import Link from 'next/link'
import { fmtDate, attendanceRate, rateColor } from '@/lib/utils'

export default function GroupsClient({ churchId, groups: initial }) {
  const [groups, setGroups]   = useState(initial)
  const [showAdd, setShowAdd] = useState(false)
  const [editTarget, setEdit] = useState(null)
  const [delTarget, setDel]   = useState(null)
  const [form, setForm]       = useState({ name: '', leader: '' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  function openAdd()    { setForm({ name: '', leader: '' }); setError(''); setShowAdd(true) }
  function openEdit(g)  { setForm({ name: g.name, leader: g.leader ?? '' }); setError(''); setEdit(g) }
  function closeAll()   { setShowAdd(false); setEdit(null); setDel(null); setError('') }

  async function save() {
    if (!form.name.trim()) { setError('Group name is required'); return }
    setSaving(true); setError('')
    try {
      const url    = editTarget ? `/api/groups/${editTarget.id}` : '/api/groups'
      const method = editTarget ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), leader: form.leader.trim(), churchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (editTarget) {
        setGroups(p => p.map(g => g.id === editTarget.id ? { ...g, ...data.group } : g))
      } else {
        setGroups(p => [...p, { ...data.group, memberCount: 0, lastSession: null }])
      }
      closeAll()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function del() {
    setSaving(true)
    try {
      const res = await fetch(`/api/groups/${delTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      setGroups(p => p.filter(g => g.id !== delTarget.id))
      closeAll()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: 12 }}>
        <div>
          <BackLink href="/dashboard" />
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
            Groups
          </h1>
          <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openAdd} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '0 1rem', height: 40, background: '#1a3a2a', color: '#e8d5a0',
          border: 'none', borderRadius: 12, cursor: 'pointer',
          fontSize: 14, fontWeight: 700, flexShrink: 0,
          boxShadow: '0 2px 8px rgba(26,58,42,0.25)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New group
        </button>
      </div>

      {/* List */}
      {groups.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 20, padding: '3rem 2rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>👥</div>
          <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#1a3a2a', margin: '0 0 8px' }}>No groups yet</p>
          <p style={{ fontSize: 15, color: '#8a9e90', margin: '0 0 20px', maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
            Create groups like "Youth", "Women's Fellowship", or "Men's Unit" to organise your members.
          </p>
          <button onClick={openAdd} style={{
            padding: '0.625rem 1.5rem', background: '#1a3a2a', color: '#e8d5a0',
            border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700,
          }}>
            Create first group
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(g => {
            const rate = g.lastSession?.attendance_records?.length
              ? attendanceRate(
                  g.lastSession.attendance_records.filter(r => r.present).length,
                  g.lastSession.attendance_records.length
                )
              : null
            const rColor = rate !== null ? (rate >= 75 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626') : '#8a9e90'
            return (
              <div key={g.id} style={{
  background: '#fff', border: '1px solid rgba(26,58,42,0.08)',
  borderRadius: 16, overflow: 'hidden',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
}}>
  {/* Main row */}
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '1rem 1.25rem' }}>
    {/* Icon */}
    <div style={{
      width: 44, height: 44, borderRadius: 13, flexShrink: 0,
      background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-playfair),Georgia,serif',
      fontWeight: 800, fontSize: 18, color: '#c9a84c',
    }}>
      {g.name[0]}
    </div>

    {/* Info */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
        {g.name}
      </p>
      <p style={{ fontSize: 13, color: '#8a9e90', margin: '0 0 6px' }}>
        {g.leader || 'No leader'} · {g.memberCount ?? 0} members
        {g.lastSession ? ` · Last: ${fmtDate(g.lastSession.date)}` : ''}
      </p>
      {/* Rate badge */}
      {rate !== null && (
        <span style={{
          display: 'inline-block',
          fontSize: 12, fontWeight: 700, color: rColor,
          background: rColor + '12', borderRadius: 20,
          padding: '2px 8px',
        }}>
          {rate}% last session
        </span>
      )}
    </div>

    {/* Edit / Delete — stacked vertically so they never crowd */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
      <button onClick={() => openEdit(g)} style={{
        width: 30, height: 30, borderRadius: 8,
        background: 'rgba(26,58,42,0.06)',
        border: 'none', cursor: 'pointer', color: '#4a8a65',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button onClick={() => setDel(g)} style={{
        width: 30, height: 30, borderRadius: 8,
        background: 'rgba(220,38,38,0.07)',
        border: 'none', cursor: 'pointer', color: '#dc2626',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
        </svg>
      </button>
    </div>
  </div>

  {/* Action footer — wraps naturally on mobile */}
  <div style={{
    display: 'flex', flexWrap: 'wrap',
    borderTop: '1px solid rgba(26,58,42,0.06)',
  }}>
    <Link href={`/groups/${g.id}`} style={{
      flex: '1 1 120px', padding: '0.625rem 1rem', textAlign: 'center',
      fontSize: 13, fontWeight: 700, color: '#1a3a2a', textDecoration: 'none',
      borderRight: '1px solid rgba(26,58,42,0.06)',
      transition: 'background 0.14s',
    }}>
      View members →
    </Link>
    <a href={`/attendance?group=${g.id}`} style={{
      flex: '1 1 120px', padding: '0.625rem 1rem', textAlign: 'center',
      fontSize: 13, fontWeight: 700, color: '#2d5a42', textDecoration: 'none',
      transition: 'background 0.14s',
    }}>
      Take attendance ✓
    </a>
  </div>
</div>
            )
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {(showAdd || editTarget) && (
        <Modal title={editTarget ? `Edit "${editTarget.name}"` : 'New group'} onClose={closeAll}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Group name *">
              <input className="input" placeholder="e.g. Youth Fellowship" autoFocus
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </Field>
            <Field label="Leader name">
              <input className="input" placeholder="e.g. Pastor James"
                value={form.leader} onChange={e => setForm(p => ({ ...p, leader: e.target.value }))} />
            </Field>
            {error && <p style={{ fontSize: 14, color: '#dc2626' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={closeAll} style={{ flex: 1, ...outlineBtn }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ flex: 1, ...primaryBtn }}>
                {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Create group'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {delTarget && (
        <Modal title="Delete group?" onClose={closeAll}>
          <p style={{ fontSize: 15, color: '#4a5568', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            <strong>"{delTarget.name}"</strong> will be deleted. Members won't be deleted — just removed from this group.
          </p>
          {error && <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 10 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={closeAll} style={{ flex: 1, ...outlineBtn }}>Cancel</button>
            <button onClick={del} disabled={saving} style={{ flex: 1, ...dangerBtn }}>
              {saving ? 'Deleting…' : 'Delete group'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2d4a36', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: 'rgba(15,26,19,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 480, padding: '1.5rem',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
        animation: 'var(--animate-slide-up)',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9e90', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function BackLink({ href }) {
  return (
    <a href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#8a9e90', fontWeight: 600, textDecoration: 'none', marginBottom: 8 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      Dashboard
    </a>
  )
}

const primaryBtn = {
  height: 48, background: '#1a3a2a', color: '#e8d5a0', border: 'none',
  borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700,
  boxShadow: '0 2px 8px rgba(26,58,42,0.25)',
}
const outlineBtn = {
  height: 48, background: 'transparent', color: '#1a3a2a',
  border: '1.5px solid rgba(26,58,42,0.2)', borderRadius: 14, cursor: 'pointer',
  fontSize: 15, fontWeight: 700,
}
const dangerBtn = {
  height: 48, background: 'rgba(220,38,38,0.08)', color: '#dc2626',
  border: '1.5px solid rgba(220,38,38,0.2)', borderRadius: 14, cursor: 'pointer',
  fontSize: 15, fontWeight: 700,
}