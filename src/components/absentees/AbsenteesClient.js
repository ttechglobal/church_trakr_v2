'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import BackButton from '@/components/ui/BackButton'
import { fmtDate, toWhatsAppNumber, getAv } from '@/lib/utils'
import { Check, Phone, FileText, MessageSquare } from 'lucide-react'

const ABSENTEE_MESSAGE = (name) =>
  `Hi ${name}, we missed you at service this week. We hope you're well. Please join us next Sunday! 🙏`

function getDisplayName() {
  if (typeof window === 'undefined') return 'Team member'
  return localStorage.getItem('ct_display_name') || 'Team member'
}

export default function AbsenteesClient({
  churchId, absentees, groups, initialFollowUpData, hasCredits
}) {
  // Local state initialised from server data
  const [followUp, setFollowUp] = useState(initialFollowUpData ?? {})
  const [syncing,  setSyncing]  = useState({}) // key → true while saving

  const [activeGroup,  setActiveGroup]  = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [noteTarget,   setNoteTarget]   = useState(null)
  const [noteText,     setNoteText]     = useState('')

  // ── Pull fresh data from server on mount + on tab focus ──────────────────────
  const syncFromServer = useCallback(async () => {
    try {
      const res = await fetch('/api/followup/load?field=follow_up_data')
      if (!res.ok) return
      const { data } = await res.json()
      if (data) setFollowUp(prev => ({ ...prev, ...data }))
    } catch {}
  }, [])

  useEffect(() => {
    syncFromServer()
    const handler = () => syncFromServer()
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [syncFromServer])

  // ── Atomic mark — writes directly to DB, not a debounced blob replace ────────
  async function markReached(absentee, reached) {
    const key = absentee.sessionId + '_' + absentee.memberId
    setSyncing(p => ({ ...p, [key]: true }))

    // Optimistic update
    const reachedBy  = reached ? getDisplayName() : null
    const reachedAt  = reached ? new Date().toISOString() : null
    const prevEntry  = followUp[key] ?? {}
    setFollowUp(prev => ({
      ...prev,
      [key]: { ...prevEntry, reached, reachedBy, reachedAt, updatedAt: new Date().toISOString() },
    }))

    try {
      const res = await fetch('/api/followup/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          reached,
          note:       prevEntry.note ?? '',
          reachedBy:  reached ? getDisplayName() : null,
        }),
      })
      const data = await res.json()
      if (data.entry) {
        setFollowUp(prev => ({ ...prev, [key]: data.entry }))
      }
    } catch {
      // Revert optimistic update on failure
      setFollowUp(prev => ({ ...prev, [key]: prevEntry }))
    } finally {
      setSyncing(p => { const n = { ...p }; delete n[key]; return n })
    }
  }

  // ── Save note — also uses atomic endpoint ─────────────────────────────────────
  async function saveNote() {
    if (!noteTarget) return
    const { key } = noteTarget
    const prevEntry = followUp[key] ?? {}

    setFollowUp(prev => ({
      ...prev,
      [key]: { ...prevEntry, note: noteText.trim(), updatedAt: new Date().toISOString() },
    }))

    try {
      await fetch('/api/followup/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          reached:   prevEntry.reached ?? false,
          note:      noteText.trim(),
          reachedBy: prevEntry.reachedBy ?? null,
        }),
      })
    } catch {}

    setNoteTarget(null)
  }

  // Filter absentees
  const filtered = useMemo(() => {
    return absentees.filter(a => {
      const key = `${a.sessionId}_${a.memberId}`
      const entry = followUp[key]
      const reached = entry?.reached ?? false

      if (activeGroup !== 'all' && a.groupId !== activeGroup) return false
      if (statusFilter === 'pending' && reached) return false
      if (statusFilter === 'reached' && !reached) return false
      return true
    })
  }, [absentees, followUp, activeGroup, statusFilter])

  // Progress per group
  const progressByGroup = useMemo(() => {
    const map = {}
    for (const g of groups) {
      const groupAbsentees = absentees.filter(a => a.groupId === g.id)
      const reached = groupAbsentees.filter(a => {
        const key = `${a.sessionId}_${a.memberId}`
        return followUp[key]?.reached
      }).length
      map[g.id] = { total: groupAbsentees.length, reached }
    }
    return map
  }, [absentees, followUp, groups])

  function openNote(absentee) {
    const key = absentee.sessionId + '_' + absentee.memberId
    setNoteTarget({ key, name: absentee.name })
    setNoteText(followUp[key]?.note ?? '')
  }

  const totalPending = absentees.filter(a => {
    const key = `${a.sessionId}_${a.memberId}`
    return !followUp[key]?.reached
  }).length

  return (
    <div className="page-content">
      <div className="mb-4">
        <BackButton />
        <h1 className="font-display text-2xl font-semibold text-forest">Absentees</h1>
        <p className="text-sm text-mist mt-0.5">
          {totalPending > 0
            ? `${totalPending} pending follow-up${totalPending !== 1 ? 's' : ''}`
            : '✓ All followed up!'}
        </p>
      </div>

      {/* Group progress bars */}
      {groups.length > 0 && (
        <div className="card space-y-3 mb-2">
          {groups.map(g => {
            const p = progressByGroup[g.id] ?? { total: 0, reached: 0 }
            const pct = p.total > 0 ? Math.round((p.reached / p.total) * 100) : 100
            return (
              <div key={g.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-forest">{g.name}</span>
                  <span className="text-mist">{p.reached}/{p.total}</span>
                </div>
                <div className="h-1.5 bg-ivory-deeper rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: pct === 100 ? '#16a34a' : '#c9a84c'
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Group filter chips */}
      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <FilterChip
            active={activeGroup === 'all'}
            onClick={() => setActiveGroup('all')}
            label="All groups"
          />
          {groups.map(g => (
            <FilterChip
              key={g.id}
              active={activeGroup === g.id}
              onClick={() => setActiveGroup(g.id)}
              label={g.name}
            />
          ))}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'reached'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`btn-sm capitalize ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Absentee cards */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p className="text-3xl">🎉</p>
          <p className="font-medium text-forest">
            {absentees.length === 0 ? 'No absentees this week' : 'All followed up!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(absentee => {
            const key        = absentee.sessionId + '_' + absentee.memberId
            const entry      = followUp[key] ?? {}
            const reached    = entry.reached    ?? false
            const note       = entry.note       ?? ''
            const reachedBy  = entry.reachedBy  ?? null
            const reachedAt  = entry.reachedAt  ?? null
            const isSyncing  = !!syncing[key]
            const av         = getAv(absentee.name)
            const waNumber   = toWhatsAppNumber(absentee.phone ?? '')
            const waMessage  = encodeURIComponent(ABSENTEE_MESSAGE(absentee.name.split(' ')[0]))

            return (
              <div key={key} className={`card transition-all duration-200 ${reached ? 'opacity-70' : ''}`}>

                {/* ── Member row ── */}
                <div className="flex items-center gap-3">
                  <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>
                    {av.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-forest text-[15px] truncate">{absentee.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-mist">{absentee.groupName}</span>
                      <span className="text-xs text-mist/40">·</span>
                      <span className="text-xs text-mist">{fmtDate(absentee.date)}</span>
                    </div>
                    {absentee.phone && <p className="text-xs text-mist mt-0.5">{absentee.phone}</p>}
                  </div>

                  {/* ── Reached toggle ── */}
                  <button
                    onClick={() => markReached(absentee, !reached)}
                    disabled={isSyncing}
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                      transition-all duration-200 border-2
                      ${reached
                        ? 'bg-success border-success text-white shadow-sm'
                        : 'bg-white border-forest/15 text-mist hover:border-success/60 hover:text-success'
                      } ${isSyncing ? 'opacity-50 cursor-wait' : ''}`}
                    title={reached ? 'Mark as not reached' : 'Mark as reached'}
                  >
                    <Check size={15} strokeWidth={2.5} />
                  </button>
                </div>

                {/* ── Reached attribution (visible to all users) ── */}
                {reached && reachedBy && (
                  <div className="mt-2.5 px-2 py-2 bg-success/6 rounded-xl flex items-start gap-2">
                    <Check size={12} className="text-success shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-success">
                        Reached by {reachedBy}
                        {reachedAt && (
                          <span className="font-normal text-success/70">
                            {' · '}{new Date(reachedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </p>
                      {note && <p className="text-xs text-forest-muted mt-0.5 italic">"{note}"</p>}
                    </div>
                  </div>
                )}

                {/* ── Note (pending state) ── */}
                {!reached && note && (
                  <div className="mt-2 px-2 py-1.5 bg-ivory rounded-lg">
                    <p className="text-xs text-forest-muted italic">"{note}"</p>
                  </div>
                )}

                {/* ── Action buttons ── */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-forest/8">
                  {absentee.phone && (
                    <a href={'tel:' + absentee.phone} className="btn btn-outline btn-sm flex-1 text-xs gap-1.5">
                      <Phone size={13} /> Call
                    </a>
                  )}
                  {waNumber && (
                    <a href={'https://wa.me/' + waNumber + '?text=' + waMessage}
                      target="_blank" rel="noreferrer"
                      className="btn btn-sm flex-1 text-xs gap-1.5"
                      style={{ background: '#25D366', color: '#fff' }}>
                      WhatsApp
                    </a>
                  )}
                  <button onClick={() => openNote(absentee)}
                    className="btn btn-outline btn-sm flex-1 text-xs gap-1.5">
                    <FileText size={13} /> {note ? 'Edit note' : 'Add note'}
                  </button>
                  {hasCredits && absentee.phone && (
                    <a href={'/messaging/send?phone=' + absentee.phone + '&name=' + encodeURIComponent(absentee.name) + '&type=absentee'}
                      className="btn btn-outline btn-sm text-xs px-3">
                      <MessageSquare size={13} />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Note modal */}
      {noteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setNoteTarget(null)}
        >
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-modal animate-slide-up safe-bottom">
            <h3 className="font-display text-lg font-semibold text-forest mb-3">
              Note for {noteTarget.name}
            </h3>
            <textarea
              className="input resize-none text-sm"
              style={{ minHeight: 100 }}
              placeholder="e.g. Reached by phone, travelling this weekend…"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNoteTarget(null)} className="btn btn-outline flex-1">Cancel</button>
              <button onClick={saveNote} className="btn btn-primary flex-1">Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-[13px] font-medium px-3 py-1.5 rounded-full transition-colors
        ${active
          ? 'bg-forest text-ivory'
          : 'bg-white border border-forest/20 text-forest-muted hover:border-forest/40'
        }`}
    >
      {label}
    </button>
  )
}


