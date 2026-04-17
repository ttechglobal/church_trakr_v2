'use client'

import { useState, useMemo, useEffect } from 'react'
import { getAv, toWhatsAppNumber } from '@/lib/utils'
import { Phone, Search, UserCheck, ArrowLeft, AlertTriangle, Pencil, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useDisplayName } from '@/hooks/useDisplayName'

// ── constants ─────────────────────────────────────────────────────────────────

const AWAY_REASONS = [
  'Travelling',
  'School / Education',
  'Relocated',
  'Lives Far Away',
  'Medical / Health',
  'Work',
  'Other',
]

// ── helpers ───────────────────────────────────────────────────────────────────

function weeksAgo(dateStr) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 7))
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function WaIcon({ size = 14, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

// ── main component ─────────────────────────────────────────────────────────────

export default function AwayClient({ churchId, awayMembers: initAway, activeMembers, currentUserName }) {
  const { displayName } = useDisplayName(currentUserName)

  const [away,      setAway]      = useState(initAway)
  const [search,    setSearch]    = useState('')
  const [addSearch, setAddSearch] = useState('')
  const [saving,    setSaving]    = useState({})
  const [showAdd,   setShowAdd]   = useState(false)

  // Add form state
  const [addTarget,  setAddTarget]  = useState(null)   // member selected to add
  const [addReason,  setAddReason]  = useState('')

  // Edit reason state
  const [editTarget,  setEditTarget]  = useState(null)  // member being edited
  const [editReason,  setEditReason]  = useState('')

  const overdueCount = away.filter(m => weeksAgo(m.away_since) >= 4 && !m.away_contact?.lastContact).length

  const filteredAway = useMemo(() =>
    away.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase())),
    [away, search])

  const addCandidates = useMemo(() =>
    activeMembers.filter(m => !addSearch || m.name.toLowerCase().includes(addSearch.toLowerCase())),
    [activeMembers, addSearch])

  // ── API calls ────────────────────────────────────────────────────────────────

  async function markAway(member, reason) {
    setSaving(p => ({ ...p, [member.id]: 'adding' }))
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:         member.id,
          status:     'away',
          away_since: new Date().toISOString().split('T')[0],
          away_contact: {
            ...(member.away_contact ?? {}),
            reason: reason || null,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add to away list')
      setAway(p => [...p, data.member].sort((a, b) => a.name.localeCompare(b.name)))
      setAddTarget(null)
      setAddReason('')
      setAddSearch('')
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(p => ({ ...p, [member.id]: false }))
    }
  }

  async function markReturned(member) {
    setSaving(p => ({ ...p, [member.id]: 'returning' }))
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:         member.id,
          status:     'active',
          away_since: null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed')
      }
      setAway(p => p.filter(m => m.id !== member.id))
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(p => ({ ...p, [member.id]: false }))
    }
  }

  async function saveEditReason(member) {
    setSaving(p => ({ ...p, [member.id]: 'editing' }))
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:           member.id,
          away_contact: {
            ...(member.away_contact ?? {}),
            reason: editReason || null,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setAway(p => p.map(m => m.id === data.member.id ? data.member : m))
      setEditTarget(null)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(p => ({ ...p, [member.id]: false }))
    }
  }

  async function logContact(member) {
    const now = new Date().toISOString()
    setSaving(p => ({ ...p, [member.id]: 'contacting' }))
    try {
      const res = await fetch('/api/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: member.id,
          away_contact: {
            ...(member.away_contact ?? {}),
            lastContact:   now,
            lastContactBy: displayName,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setAway(p => p.map(m => m.id === data.member.id ? data.member : m))
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(p => ({ ...p, [member.id]: false }))
    }
  }

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>

      {/* Back */}
      <a href="/attendance" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#8a9e90', textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={14} strokeWidth={2.5} />
        Back to Attendance
      </a>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
          Away Members
        </h1>
        <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>
          {away.length} member{away.length !== 1 ? 's' : ''} currently away
          {overdueCount > 0 && <span style={{ color: '#d97706', marginLeft: 8, fontWeight: 600 }}>· {overdueCount} need check-in</span>}
        </p>
      </div>

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0.875rem 1rem', background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: 12, marginBottom: '1.25rem' }}>
          <AlertTriangle size={16} color="#d97706" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 14, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
            <strong>{overdueCount} member{overdueCount !== 1 ? 's' : ''}</strong> {overdueCount !== 1 ? 'have' : 'has'} been away 4+ weeks with no check-in logged.
          </p>
        </div>
      )}

      {/* Search */}
      {away.length > 4 && (
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <Search size={13} color="#b0bec0" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            style={{ width: '100%', border: '1px solid rgba(26,58,42,0.14)', borderRadius: 11, background: '#fff', padding: '0.6rem 0.875rem 0.6rem 2.25rem', fontSize: 14, outline: 'none', minHeight: 42, boxSizing: 'border-box' }}
            placeholder="Search away members…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* ── Away member cards ── */}
      {filteredAway.length === 0 && away.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 40, marginBottom: 10 }}>✈️</p>
          <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: '0 0 8px' }}>No one away</p>
          <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>
            Use the section below to mark members as away. They'll be hidden from attendance and follow-up lists.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.5rem' }}>
          {filteredAway.map(m => {
            const av         = getAv(m.name)
            const waNum      = toWhatsAppNumber(m.phone ?? '')
            const weeks      = weeksAgo(m.away_since)
            const overdue    = weeks >= 4 && !m.away_contact?.lastContact
            const reason     = m.away_contact?.reason
            const lastC      = m.away_contact?.lastContact
            const lastCBy    = m.away_contact?.lastContactBy
            const isSaving   = saving[m.id]
            const isEditing  = editTarget?.id === m.id

            return (
              <div key={m.id} style={{
                background: '#fff',
                border: `1.5px solid ${overdue ? 'rgba(217,119,6,0.35)' : 'rgba(26,58,42,0.09)'}`,
                borderRadius: 14, overflow: 'hidden',
                boxShadow: overdue ? '0 2px 12px rgba(217,119,6,0.08)' : '0 1px 4px rgba(0,0,0,0.03)',
              }}>

                {/* Overdue banner */}
                {overdue && (
                  <div style={{ padding: '5px 1rem', background: 'rgba(217,119,6,0.09)', borderBottom: '1px solid rgba(217,119,6,0.15)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={11} color="#d97706" strokeWidth={2.5} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706' }}>
                      Away {weeks}+ weeks — consider reaching out
                    </span>
                  </div>
                )}

                {/* Main info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '0.875rem 1rem 0.75rem' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0, opacity: 0.75 }}>
                    {av.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', letterSpacing: '-0.01em' }}>{m.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.1)', borderRadius: 20, padding: '2px 8px' }}>
                        {weeks > 0 ? `Away · ${weeks}w` : 'Away · <1w'}
                      </span>
                    </div>

                    {m.phone && <p style={{ fontSize: 12, color: '#4a8a65', margin: '0 0 3px' }}>{m.phone}</p>}

                    {/* Reason row */}
                    {!isEditing ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <p style={{ fontSize: 12, color: reason ? '#1a3a2a' : '#b0bec0', margin: 0, fontStyle: reason ? 'normal' : 'italic' }}>
                          {reason ?? 'No reason given'}
                        </p>
                        <button onClick={() => { setEditTarget(m); setEditReason(reason ?? '') }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9e90', padding: '2px', display: 'flex', alignItems: 'center' }}>
                          <Pencil size={11} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginTop: 6 }}>
                        <select value={editReason} onChange={e => setEditReason(e.target.value)}
                          style={{ width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 8, padding: '5px 8px', fontSize: 13, outline: 'none', background: '#fff', color: '#1a2e22', marginBottom: 6, cursor: 'pointer' }}>
                          <option value="">No reason / Other</option>
                          {AWAY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <input value={editReason} onChange={e => setEditReason(e.target.value)}
                          placeholder="Or type a custom reason…"
                          style={{ width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 8, padding: '5px 8px', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 6 }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setEditTarget(null)}
                            style={{ flex: 1, height: 32, borderRadius: 8, border: '1px solid rgba(26,58,42,0.15)', background: '#fff', color: '#8a9e90', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            Cancel
                          </button>
                          <button onClick={() => saveEditReason(m)} disabled={isSaving === 'editing'}
                            style={{ flex: 1, height: 32, borderRadius: 8, border: 'none', background: '#1a3a2a', color: '#e8d5a0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                            {isSaving === 'editing' ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Away since */}
                    {m.away_since && (
                      <p style={{ fontSize: 11, color: '#b0bec0', margin: '4px 0 0' }}>
                        Away since {fmtDate(m.away_since)}
                      </p>
                    )}

                    {/* Last contact */}
                    {lastC ? (
                      <p style={{ fontSize: 11, color: '#16a34a', margin: '3px 0 0', fontWeight: 600 }}>
                        ✓ Last contact: {lastCBy} · {fmtDate(lastC)}
                      </p>
                    ) : (
                      <p style={{ fontSize: 11, color: '#b0bec0', margin: '3px 0 0' }}>
                        No contact logged
                      </p>
                    )}
                  </div>
                </div>

                {/* Action strip */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderTop: '1px solid rgba(26,58,42,0.06)' }}>

                  {/* Call */}
                  {m.phone ? (
                    <a href={`tel:${m.phone}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0.625rem 0.25rem', textDecoration: 'none', color: '#1a3a2a', borderRight: '1px solid rgba(26,58,42,0.06)', fontSize: 10, fontWeight: 700 }}>
                      <Phone size={14} strokeWidth={2} />
                      Call
                    </a>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0.625rem 0.25rem', color: '#d0d0d0', borderRight: '1px solid rgba(26,58,42,0.06)', fontSize: 10 }}>
                      <Phone size={14} strokeWidth={1.5} />
                      No phone
                    </div>
                  )}

                  {/* WhatsApp */}
                  {waNum ? (
                    <a href={`https://wa.me/${waNum}`} target="_blank" rel="noreferrer"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0.625rem 0.25rem', textDecoration: 'none', color: '#15803d', borderRight: '1px solid rgba(26,58,42,0.06)', fontSize: 10, fontWeight: 700 }}>
                      <WaIcon size={14} color="#15803d" />
                      WhatsApp
                    </a>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0.625rem 0.25rem', color: '#d0d0d0', borderRight: '1px solid rgba(26,58,42,0.06)', fontSize: 10 }}>
                      <WaIcon size={14} color="#d0d0d0" />
                      No phone
                    </div>
                  )}

                  {/* Log contact */}
                  <button onClick={() => logContact(m)} disabled={!!isSaving}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0.625rem 0.25rem', background: lastC ? 'rgba(22,163,74,0.05)' : 'transparent', border: 'none', cursor: isSaving ? 'wait' : 'pointer', color: lastC ? '#16a34a' : '#4a8a65', borderRight: '1px solid rgba(26,58,42,0.06)', fontSize: 10, fontWeight: 600 }}>
                    {isSaving === 'contacting' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    Contacted
                  </button>

                  {/* Mark returned */}
                  <button onClick={() => markReturned(m)} disabled={!!isSaving}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0.625rem 0.25rem', background: 'transparent', border: 'none', cursor: isSaving ? 'wait' : 'pointer', color: '#1a3a2a', fontSize: 10, fontWeight: 700 }}>
                    {isSaving === 'returning' ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                      </svg>
                    ) : (
                      <UserCheck size={14} strokeWidth={2} />
                    )}
                    Returned
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Add to Away List ── */}
      <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.09)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
        <button onClick={() => setShowAdd(p => !p)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px' }}>Add to Away List</p>
            <p style={{ fontSize: 13, color: '#8a9e90', margin: 0 }}>
              {activeMembers.length} active member{activeMembers.length !== 1 ? 's' : ''} · tap to mark as away
            </p>
          </div>
          {showAdd
            ? <ChevronUp size={16} color="#8a9e90" />
            : <ChevronDown size={16} color="#8a9e90" />
          }
        </button>

        {showAdd && (
          <div style={{ borderTop: '1px solid rgba(26,58,42,0.07)', padding: '0.875rem 1.25rem' }}>

            {/* Confirm panel for selected member */}
            {addTarget && (
              <div style={{ background: 'rgba(26,58,42,0.04)', border: '1px solid rgba(26,58,42,0.12)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>
                    ✈️ Mark <em>{addTarget.name}</em> as Away?
                  </p>
                  <button onClick={() => { setAddTarget(null); setAddReason('') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9e90', padding: 2 }}>
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#2d4a36', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Reason (optional)</p>
                  <select value={addReason} onChange={e => setAddReason(e.target.value)}
                    style={{ width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 9, padding: '0.6rem 0.75rem', fontSize: 14, outline: 'none', background: '#fff', color: '#1a2e22', cursor: 'pointer', marginBottom: 7 }}>
                    <option value="">No reason / Other</option>
                    {AWAY_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <input value={addReason} onChange={e => setAddReason(e.target.value)}
                    placeholder="Or type a custom reason…"
                    style={{ width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 9, padding: '0.6rem 0.75rem', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setAddTarget(null); setAddReason('') }}
                    style={{ flex: 1, height: 42, borderRadius: 11, border: '1px solid rgba(26,58,42,0.15)', background: '#fff', color: '#8a9e90', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={() => markAway(addTarget, addReason)}
                    disabled={saving[addTarget.id] === 'adding'}
                    style={{ flex: 1, height: 42, borderRadius: 11, border: 'none', background: '#1a3a2a', color: '#e8d5a0', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {saving[addTarget.id] === 'adding' ? 'Saving…' : '✈️ Confirm Away'}
                  </button>
                </div>
              </div>
            )}

            {/* Member search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={13} color="#b0bec0" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                style={{ width: '100%', border: '1px solid rgba(26,58,42,0.14)', borderRadius: 10, background: '#fafaf9', padding: '0.5rem 0.875rem 0.5rem 2rem', fontSize: 14, outline: 'none', minHeight: 40, boxSizing: 'border-box' }}
                placeholder="Search active members…"
                autoFocus
                value={addSearch} onChange={e => setAddSearch(e.target.value)}
              />
            </div>

            {addCandidates.length === 0 ? (
              <p style={{ fontSize: 14, color: '#8a9e90', textAlign: 'center', padding: '1rem 0' }}>
                {addSearch ? `No results for "${addSearch}"` : 'No active members found'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                {addCandidates.map(m => {
                  const av         = getAv(m.name)
                  const isSelected = addTarget?.id === m.id
                  return (
                    <button key={m.id} onClick={() => { setAddTarget(m); setAddReason('') }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '0.625rem 0.75rem', borderRadius: 10,
                        border: `1.5px solid ${isSelected ? '#1a3a2a' : 'rgba(26,58,42,0.08)'}`,
                        background: isSelected ? 'rgba(26,58,42,0.04)' : '#fff',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'all 0.14s',
                      }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                        {av.initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name}
                        </p>
                        {m.phone && <p style={{ fontSize: 12, color: '#8a9e90', margin: 0 }}>{m.phone}</p>}
                      </div>
                      {isSelected && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#1a3a2a', background: 'rgba(26,58,42,0.1)', borderRadius: 20, padding: '2px 8px', flexShrink: 0 }}>
                          Selected ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ height: 40 }} />
    </div>
  )
}