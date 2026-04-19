'use client'

import { useState, useMemo } from 'react'
import BackButton from '@/components/ui/BackButton'
import { useFollowUpSync } from '@/hooks/useFollowUpSync'
import { fmtDate, toWhatsAppNumber, getAv } from '@/lib/utils'
import { Check, Phone, FileText, MessageSquare, ChevronRight, ChevronDown } from 'lucide-react'

const ABSENTEE_MESSAGE = (name) =>
  `Hi ${name}, we missed you at service this week. We hope you're well. Please join us next Sunday! 🙏`

export default function AbsenteesClient({
  churchId, absentees, groups, initialFollowUpData, hasCredits
}) {
  const { data: followUp, update } = useFollowUpSync(
    churchId, initialFollowUpData, 'absentee', 'follow_up_data'
  )

  const [activeGroup, setActiveGroup] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all') // all | pending | reached
  const [noteTarget, setNoteTarget] = useState(null) // { key, name, currentNote }
  const [noteText, setNoteText] = useState('')

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

  function toggleReached(absentee) {
    const key = `${absentee.sessionId}_${absentee.memberId}`
    const current = followUp[key]?.reached ?? false
    update(key, { reached: !current, note: followUp[key]?.note ?? '' })
  }

  function openNote(absentee) {
    const key = `${absentee.sessionId}_${absentee.memberId}`
    setNoteTarget({ key, name: absentee.name })
    setNoteText(followUp[key]?.note ?? '')
  }

  function saveNote() {
    if (!noteTarget) return
    update(noteTarget.key, {
      reached: followUp[noteTarget.key]?.reached ?? false,
      note: noteText.trim(),
    })
    setNoteTarget(null)
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
            const key = `${absentee.sessionId}_${absentee.memberId}`
            const entry = followUp[key]
            const reached = entry?.reached ?? false
            const note = entry?.note ?? ''
            const av = getAv(absentee.name)
            const waNumber = toWhatsAppNumber(absentee.phone ?? '')
            const waMessage = encodeURIComponent(ABSENTEE_MESSAGE(absentee.name.split(' ')[0]))

            return (
              <div
                key={key}
                className={`card transition-all duration-200
                  ${reached ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="avatar shrink-0"
                    style={{ background: av.bg, color: av.color }}
                  >
                    {av.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-forest text-[15px] truncate">{absentee.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-mist">{absentee.groupName}</span>
                      <span className="text-xs text-mist/50">·</span>
                      <span className="text-xs text-mist">{fmtDate(absentee.date)}</span>
                    </div>
                    {absentee.phone && (
                      <p className="text-xs text-mist mt-0.5">{absentee.phone}</p>
                    )}
                    {note && (
                      <p className="text-xs text-forest-muted mt-1 italic">"{note}"</p>
                    )}
                  </div>
                  {/* Reached toggle */}
                  <button
                    onClick={() => toggleReached(absentee)}
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      transition-all duration-200
                      ${reached
                        ? 'bg-success text-white'
                        : 'bg-ivory-deeper text-mist hover:bg-success/20 hover:text-success'
                      }`}
                    title={reached ? 'Mark as not reached' : 'Mark as reached'}
                  >
                    <CheckIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-forest/8">
                  {absentee.phone && (
                    <a
                      href={`tel:${absentee.phone}`}
                      className="btn btn-outline btn-sm flex-1 text-xs gap-1.5"
                    >
                      <PhoneIcon /> Call
                    </a>
                  )}
                  {waNumber && (
                    <a
                      href={`https://wa.me/${waNumber}?text=${waMessage}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm flex-1 text-xs gap-1.5"
                      style={{ background: '#25D366', color: '#fff' }}
                    >
                      <WhatsAppIcon /> WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => openNote(absentee)}
                    className="btn btn-outline btn-sm flex-1 text-xs gap-1.5"
                    title="Add note"
                  >
                    <NoteIcon /> {note ? 'Edit note' : 'Add note'}
                  </button>
                  {hasCredits && absentee.phone && (
                    <a
                      href={`/messaging/send?phone=${absentee.phone}&name=${encodeURIComponent(absentee.name)}&type=absentee`}
                      className="btn btn-outline btn-sm text-xs px-3"
                      title="Send SMS"
                    >
                      <SmsIcon />
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

function CheckIcon({ className = '' }) { return <Check className={className || 'w-4 h-4'} /> }
function PhoneIcon() { return <Phone size={13} /> }
function WhatsAppIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
function NoteIcon() { return <FileText size={13} /> }
function SmsIcon() { return <MessageSquare size={13} /> }
