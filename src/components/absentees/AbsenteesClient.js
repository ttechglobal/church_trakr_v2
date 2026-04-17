'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { toWhatsAppNumber, getAv, fmtDate } from '@/lib/utils'
import { Phone, CheckCircle2, Clock, ChevronDown, ChevronUp, PenLine } from 'lucide-react'
import BackButton from '@/components/ui/BackButton'
import { useDisplayName } from '@/hooks/useDisplayName'

export default function AbsenteesClient({
  churchId, absentees, groups,
  initialFollowUpData, hasCredits,
  currentUserName,
}) {
  const { displayName, showPrompt, loaded, setDisplayName, dismissPrompt } =
    useDisplayName(currentUserName)

  const [promptInput, setPromptInput] = useState('')
  const [followUp, setFollowUp]       = useState(initialFollowUpData)
  const [saving, setSaving]           = useState({})
  const [noteOpen, setNoteOpen]       = useState(null)
  const [noteText, setNoteText]       = useState('')
  const [filter, setFilter]           = useState('all')
  const [groupFilter, setGroupFilter] = useState('all')
  const [expandedKey, setExpanded]    = useState(null)

  const totalCount   = absentees.length
  const doneCount    = absentees.filter(a => followUp[`${a.sessionId}_${a.memberId}`]?.reached).length
  const pendingCount = totalCount - doneCount
  const progressPct  = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  const filtered = useMemo(() =>
    absentees.filter(a => {
      const key     = `${a.sessionId}_${a.memberId}`
      const reached = followUp[key]?.reached ?? false
      if (groupFilter !== 'all' && a.groupId !== groupFilter) return false
      if (filter === 'pending' && reached)  return false
      if (filter === 'done'    && !reached) return false
      return true
    }), [absentees, followUp, filter, groupFilter])

  const markFollowedUp = useCallback(async (a) => {
    const key             = `${a.sessionId}_${a.memberId}`
    const now             = new Date().toISOString()
    const alreadyReached  = followUp[key]?.reached ?? false
    const newReached      = !alreadyReached

    setFollowUp(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        reached:   newReached,
        name:      a.name,
        note:      prev[key]?.note ?? '',
        markedBy:  newReached ? displayName : '',
        markedAt:  newReached ? now : '',
        updatedAt: now,
      },
    }))
    setSaving(prev => ({ ...prev, [key]: true }))

    try {
      await fetch('/api/followup/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          reached:  newReached,
          note:     followUp[key]?.note ?? '',
          markedBy: newReached ? displayName : '',
          markedAt: newReached ? now : '',
        }),
      })
    } catch {
      setFollowUp(prev => ({ ...prev, [key]: initialFollowUpData[key] ?? {} }))
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }))
    }
  }, [followUp, displayName, initialFollowUpData])

  const saveNote = useCallback(async (a) => {
    const key = `${a.sessionId}_${a.memberId}`
    const now = new Date().toISOString()

    setFollowUp(prev => ({
      ...prev,
      [key]: { ...prev[key], name: a.name, note: noteText.trim(), updatedAt: now },
    }))
    setSaving(prev => ({ ...prev, [key]: true }))
    setNoteOpen(null)

    try {
      await fetch('/api/followup/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          reached:  followUp[key]?.reached ?? false,
          note:     noteText.trim(),
          markedBy: followUp[key]?.markedBy ?? '',
          markedAt: followUp[key]?.markedAt ?? '',
        }),
      })
    } catch {} finally {
      setSaving(prev => ({ ...prev, [key]: false }))
    }
  }, [noteText, followUp])

  if (!loaded) return null

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>

      {/* Display name first-use prompt */}
      {showPrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,26,19,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', maxWidth: 400, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(26,58,42,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a3a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#1a3a2a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
              What's your name?
            </h2>
            <p style={{ fontSize: 14, color: '#8a9e90', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
              This is stored on your device only. When you mark a follow-up, it shows your name so the team knows who did it.
            </p>
            <input
              autoFocus
              value={promptInput}
              onChange={e => setPromptInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && promptInput.trim() && setDisplayName(promptInput)}
              placeholder="e.g. Pastor Tunde, Sister Grace…"
              style={{ width: '100%', border: '1px solid rgba(26,58,42,0.2)', borderRadius: 11, padding: '0.75rem 0.875rem', fontSize: 15, color: '#1a2e22', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={dismissPrompt} style={{ flex: 1, height: 44, borderRadius: 12, border: '1px solid rgba(26,58,42,0.15)', background: '#fff', color: '#8a9e90', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Skip for now
              </button>
              <button
                onClick={() => promptInput.trim() && setDisplayName(promptInput)}
                disabled={!promptInput.trim()}
                style={{ flex: 1, height: 44, borderRadius: 12, border: 'none', background: promptInput.trim() ? '#1a3a2a' : '#e0dbd0', color: promptInput.trim() ? '#e8d5a0' : '#8a9e90', fontSize: 14, fontWeight: 700, cursor: promptInput.trim() ? 'pointer' : 'not-allowed' }}
              >
                Set my name
              </button>
            </div>
          </div>
        </div>
      )}

      <BackButton href="/dashboard" />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
            Follow-Up
          </h1>
          <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>
            Tracking as: <strong style={{ color: '#1a3a2a' }}>{displayName}</strong>
            <button onClick={() => { setPromptInput(displayName); dismissPrompt(); /* re-open */ setTimeout(() => { localStorage.removeItem('ct_display_name_prompted'); window.location.reload() }, 10) }}
              style={{ marginLeft: 6, fontSize: 12, color: '#4a8a65', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              change
            </button>
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 22, fontWeight: 800, color: progressPct === 100 ? '#16a34a' : '#1a3a2a', margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {progressPct}%
          </p>
          <p style={{ fontSize: 11, color: '#8a9e90', margin: '2px 0 0' }}>{doneCount}/{totalCount} done</p>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: 'rgba(26,58,42,0.07)', borderRadius: 3, marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, background: progressPct === 100 ? '#16a34a' : 'linear-gradient(90deg,#1a3a2a,#2d5a42)', width: `${progressPct}%`, transition: 'width 0.4s ease' }} />
      </div>

      {/* Per-group breakdown */}
      {groups.length > 1 && (
        <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, padding: '1rem', marginBottom: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#8a9e90', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>By Group</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groups.map(g => {
              const ga   = absentees.filter(a => a.groupId === g.id)
              const done = ga.filter(a => followUp[`${a.sessionId}_${a.memberId}`]?.reached).length
              const pct  = ga.length > 0 ? Math.round((done / ga.length) * 100) : 100
              return (
                <div key={g.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a' }}>{g.name}</span>
                    <span style={{ fontSize: 12, color: '#8a9e90' }}>{done}/{ga.length}</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(26,58,42,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: pct === 100 ? '#16a34a' : '#c9a84c', width: `${pct}%`, transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, background: '#fff', border: '1px solid rgba(26,58,42,0.1)', borderRadius: 10, padding: 3 }}>
          {[
            { val: 'all',     label: `All (${totalCount})` },
            { val: 'pending', label: `Pending (${pendingCount})` },
            { val: 'done',    label: `Done (${doneCount})` },
          ].map(f => (
            <button key={f.val} onClick={() => setFilter(f.val)} style={{
              padding: '5px 11px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 700,
              background: filter === f.val ? '#1a3a2a' : 'transparent',
              color: filter === f.val ? '#e8d5a0' : '#8a9e90',
              transition: 'all 0.14s',
            }}>
              {f.label}
            </button>
          ))}
        </div>
        {groups.length > 1 && (
          <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)}
            style={{ border: '1px solid rgba(26,58,42,0.1)', borderRadius: 10, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: '#1a3a2a', background: '#fff', cursor: 'pointer', outline: 'none' }}>
            <option value="all">All groups</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '3rem 2rem', textAlign: 'center' }}>
          <CheckCircle2 size={40} color="#16a34a" strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: '0 0 6px' }}>
            {filter === 'pending' && totalCount > 0 ? 'All caught up!' : 'No absentees this week'}
          </p>
          <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>
            {filter === 'pending' && totalCount > 0 ? 'Great work — everyone has been followed up!' : 'Take attendance first to see absentees here.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(a => {
            const key      = `${a.sessionId}_${a.memberId}`
            const entry    = followUp[key] ?? {}
            const reached  = entry.reached ?? false
            const isSaving = saving[key] ?? false
            const isExp    = expandedKey === key
            const av       = getAv(a.name)
            const waNum    = a.phone ? toWhatsAppNumber(a.phone) : ''
            const waMsg    = encodeURIComponent(`Hi ${a.name.split(' ')[0]}, we missed you at service this week. Hope you're well! 🙏`)

            return (
              <div key={key} style={{
                background: '#fff',
                border: `1.5px solid ${reached ? 'rgba(22,163,74,0.22)' : 'rgba(26,58,42,0.09)'}`,
                borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                opacity: reached ? 0.72 : 1,
                transition: 'opacity 0.2s, border-color 0.2s',
              }}>

                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '0.875rem 1rem 0.75rem' }}>
                  {/* Avatar with done indicator */}
                  <div style={{ position: 'relative', flexShrink: 0, marginTop: 2 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                      {av.initials}
                    </div>
                    {reached && (
                      <div style={{ position: 'absolute', bottom: -2, right: -2, width: 15, height: 15, borderRadius: '50%', background: '#16a34a', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </div>

                  {/* Name + status + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', letterSpacing: '-0.01em' }}>{a.name}</span>
                      {reached ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#15803d', background: 'rgba(22,163,74,0.1)', borderRadius: 20, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Followed up
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', background: 'rgba(217,119,6,0.1)', borderRadius: 20, padding: '2px 8px' }}>
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Group + phone */}
                    <p style={{ fontSize: 12, color: '#8a9e90', margin: '0 0 2px' }}>
                      {a.groupName}
                      {a.phone
                        ? <span style={{ color: '#4a8a65' }}> · {a.phone}</span>
                        : <span style={{ color: '#c9c9c9' }}> · No phone</span>
                      }
                    </p>

                    {/* Who marked + when */}
                    {reached && entry.markedBy && (
                      <p style={{ fontSize: 11, color: '#16a34a', margin: '2px 0 0', fontWeight: 500 }}>
                        ✓ {entry.markedBy}
                        {entry.markedAt && ` · ${new Date(entry.markedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date(entry.markedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    )}

                    {/* Note preview */}
                    {entry.note && noteOpen !== key && (
                      <p style={{ fontSize: 12, color: '#4a8a65', fontStyle: 'italic', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '95%' }}>
                        "{entry.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Action row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderTop: '1px solid rgba(26,58,42,0.06)' }}>

                  {/* Call */}
                  {a.phone ? (
                    <a href={`tel:${a.phone}`} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 3, padding: '0.625rem 0.25rem', textDecoration: 'none',
                      color: '#1a3a2a', borderRight: '1px solid rgba(26,58,42,0.06)',
                      transition: 'background 0.14s',
                    }}>
                      <Phone size={15} strokeWidth={2} />
                      <span style={{ fontSize: 11, fontWeight: 700 }}>Call</span>
                    </a>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0.625rem 0.25rem', color: '#d0d0d0', borderRight: '1px solid rgba(26,58,42,0.06)' }}>
                      <Phone size={15} strokeWidth={1.5} />
                      <span style={{ fontSize: 11 }}>No phone</span>
                    </div>
                  )}

                  {/* WhatsApp */}
                  {waNum ? (
                    <a href={`https://wa.me/${waNum}?text=${waMsg}`} target="_blank" rel="noreferrer" style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 3, padding: '0.625rem 0.25rem', textDecoration: 'none',
                      color: '#15803d', borderRight: '1px solid rgba(26,58,42,0.06)',
                      transition: 'background 0.14s',
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>WhatsApp</span>
                    </a>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, padding: '0.625rem 0.25rem', color: '#d0d0d0', borderRight: '1px solid rgba(26,58,42,0.06)' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" opacity="0.3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      <span style={{ fontSize: 11 }}>WhatsApp</span>
                    </div>
                  )}

                  {/* Add Note — always visible */}
                  <button
                    onClick={() => {
                      if (noteOpen === key) { setNoteOpen(null) }
                      else { setNoteOpen(key); setNoteText(entry.note ?? ''); setExpanded(key) }
                    }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 3, padding: '0.625rem 0.25rem',
                      background: entry.note ? 'rgba(74,138,101,0.07)' : 'transparent',
                      border: 'none', cursor: 'pointer',
                      color: entry.note ? '#4a8a65' : '#8a9e90',
                      borderRight: '1px solid rgba(26,58,42,0.06)',
                      transition: 'background 0.14s',
                    }}
                  >
                    <PenLine size={15} strokeWidth={1.75} />
                    <span style={{ fontSize: 11, fontWeight: entry.note ? 700 : 500 }}>
                      {entry.note ? 'Note ✓' : 'Add Note'}
                    </span>
                  </button>

                  {/* Mark done */}
                  <button
                    onClick={() => markFollowedUp(a)}
                    disabled={isSaving}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 3, padding: '0.625rem 0.25rem',
                      background: reached ? 'rgba(22,163,74,0.07)' : 'transparent',
                      border: 'none', cursor: isSaving ? 'wait' : 'pointer',
                      color: reached ? '#15803d' : '#1a3a2a',
                      transition: 'all 0.14s',
                    }}
                  >
                    {isSaving ? (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
                          <path d="M21 12a9 9 0 11-6.219-8.56"/>
                        </svg>
                        <span style={{ fontSize: 11 }}>Saving</span>
                      </>
                    ) : reached ? (
                      <>
                        <CheckCircle2 size={15} strokeWidth={2} />
                        <span style={{ fontSize: 11, fontWeight: 700 }}>Done</span>
                      </>
                    ) : (
                      <>
                        <Clock size={15} strokeWidth={1.75} />
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Mark Done</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Inline note editor — opens when Add Note is tapped */}
                {noteOpen === key && (
                  <div style={{ borderTop: '1px solid rgba(26,58,42,0.08)', padding: '0.875rem 1rem', background: 'rgba(26,58,42,0.02)' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#2d4a36', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Note — visible to all team members
                    </p>
                    <textarea
                      autoFocus
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="e.g. Called — no answer. Will try again Sunday."
                      rows={3}
                      style={{ width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: 14, color: '#1a2e22', outline: 'none', resize: 'vertical', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit', lineHeight: 1.5 }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button onClick={() => setNoteOpen(null)} style={{ flex: 1, height: 38, borderRadius: 10, border: '1px solid rgba(26,58,42,0.15)', background: '#fff', color: '#1a3a2a', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Cancel
                      </button>
                      <button onClick={() => saveNote(a)} style={{ flex: 1, height: 38, borderRadius: 10, border: 'none', background: '#1a3a2a', color: '#e8d5a0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                        Save note
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ height: 40 }} />
    </div>
  )
}