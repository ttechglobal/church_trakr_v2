'use client'

import { useState, useMemo } from 'react'
import { useFollowUpSync } from '@/hooks/useFollowUpSync'
import { fmtDate, toWhatsAppNumber, getAv } from '@/lib/utils'

const THANK_YOU_MESSAGE = (name) =>
  `Hi ${name}, thank you for joining us at service today! It was great having you. God bless you! 🙏`

export default function AttendeesClient({
  churchId, attendees, groups, initialFollowUpData
}) {
  const { data: followUp, update } = useFollowUpSync(
    churchId, initialFollowUpData, 'attendee', 'attendee_followup_data'
  )

  const [activeGroup, setActiveGroup] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    return attendees.filter(a => {
      const key = `att_${a.sessionId}_${a.memberId}`
      const messaged = followUp[key]?.messaged ?? false
      if (activeGroup !== 'all' && a.groupId !== activeGroup) return false
      if (statusFilter === 'messaged' && !messaged) return false
      if (statusFilter === 'pending' && messaged) return false
      return true
    })
  }, [attendees, followUp, activeGroup, statusFilter])

  const progressByGroup = useMemo(() => {
    const map = {}
    for (const g of groups) {
      const groupAttendees = attendees.filter(a => a.groupId === g.id)
      const messaged = groupAttendees.filter(a => {
        const key = `att_${a.sessionId}_${a.memberId}`
        return followUp[key]?.messaged
      }).length
      map[g.id] = { total: groupAttendees.length, messaged }
    }
    return map
  }, [attendees, followUp, groups])

  function toggleMessaged(attendee) {
    const key = `att_${attendee.sessionId}_${attendee.memberId}`
    const current = followUp[key]?.messaged ?? false
    update(key, { messaged: !current })
  }

  const totalPending = attendees.filter(a => {
    const key = `att_${a.sessionId}_${a.memberId}`
    return !followUp[key]?.messaged
  }).length

  return (
    <div className="page-content">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold text-forest">Attendees</h1>
        <p className="text-sm text-mist mt-0.5">
          {totalPending > 0
            ? `${totalPending} thank-you message${totalPending !== 1 ? 's' : ''} pending`
            : '✓ All thanked!'}
        </p>
      </div>

      {/* Progress bars */}
      {groups.length > 0 && (
        <div className="card space-y-3 mb-2">
          {groups.map(g => {
            const p = progressByGroup[g.id] ?? { total: 0, messaged: 0 }
            const pct = p.total > 0 ? Math.round((p.messaged / p.total) * 100) : 100
            return (
              <div key={g.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-forest">{g.name}</span>
                  <span className="text-mist">{p.messaged}/{p.total} thanked</span>
                </div>
                <div className="h-1.5 bg-ivory-deeper rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#c9a84c' }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Group filter */}
      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <FilterChip active={activeGroup === 'all'} onClick={() => setActiveGroup('all')} label="All" />
          {groups.map(g => (
            <FilterChip key={g.id} active={activeGroup === g.id} onClick={() => setActiveGroup(g.id)} label={g.name} />
          ))}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2">
        {[['all', 'All'], ['pending', 'Not messaged'], ['messaged', 'Messaged']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`btn-sm ${statusFilter === val ? 'btn-primary' : 'btn-outline'} text-xs`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p className="text-3xl">🎉</p>
          <p className="font-medium text-forest">
            {attendees.length === 0 ? 'No attendees this week' : 'All thanked!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(attendee => {
            const key = `att_${attendee.sessionId}_${attendee.memberId}`
            const messaged = followUp[key]?.messaged ?? false
            const av = getAv(attendee.name)
            const waNumber = toWhatsAppNumber(attendee.phone ?? '')
            const waMessage = encodeURIComponent(THANK_YOU_MESSAGE(attendee.name.split(' ')[0]))

            return (
              <div
                key={key}
                className={`card transition-all duration-200 ${messaged ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>
                    {av.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-forest text-[15px] truncate">{attendee.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-mist">{attendee.groupName}</span>
                      <span className="text-xs text-mist/50">·</span>
                      <span className="text-xs text-mist">{fmtDate(attendee.date)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleMessaged(attendee)}
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all
                      ${messaged
                        ? 'bg-success text-white'
                        : 'bg-ivory-deeper text-mist hover:bg-success/20 hover:text-success'
                      }`}
                  >
                    <CheckIcon />
                  </button>
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t border-forest/8">
                  {attendee.phone && (
                    <a href={`tel:${attendee.phone}`} className="btn-outline btn-sm flex-1 text-xs gap-1.5">
                      <PhoneIcon /> Call
                    </a>
                  )}
                  {waNumber && (
                    <a
                      href={`https://wa.me/${waNumber}?text=${waMessage}`}
                      target="_blank" rel="noreferrer"
                      className="btn-sm flex-1 text-xs gap-1.5"
                      style={{ background: '#25D366', color: '#fff' }}
                    >
                      <WhatsAppIcon /> Thank via WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )
          })}
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
        ${active ? 'bg-forest text-ivory' : 'bg-white border border-forest/20 text-forest-muted hover:border-forest/40'}`}
    >
      {label}
    </button>
  )
}
function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}
function PhoneIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
}
function WhatsAppIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
