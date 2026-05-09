'use client'

import { useState, useMemo } from 'react'
import BackButton from '@/components/ui/BackButton'
import { MessageSquare, ChevronDown, ChevronUp, Filter } from 'lucide-react'

const TYPE_LABELS = {
  absentee_followup:  'Absentees',
  attendee_thankyou:  'Attendees',
  broadcast:          'Broadcast',
  sunday_reminder:    'Sunday Reminder',
  special_program:    'Special Program',
  custom:             'Custom',
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getMonthKey(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function isThisMonth(iso) {
  const d = new Date(iso)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

function isLastMonth(iso) {
  const d = new Date(iso)
  const now = new Date()
  const last = new Date(now.getFullYear(), now.getMonth() - 1)
  return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear()
}

export default function MessageHistoryClient({ logs }) {
  const [timeFilter, setTimeFilter] = useState('all')  // 'this_month' | 'last_month' | 'all'
  const [typeFilter, setTypeFilter] = useState('all')
  const [expanded,   setExpanded]   = useState({})

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (timeFilter === 'this_month' && !isThisMonth(l.sent_at)) return false
      if (timeFilter === 'last_month' && !isLastMonth(l.sent_at)) return false
      if (typeFilter !== 'all' && l.type !== typeFilter) return false
      return true
    })
  }, [logs, timeFilter, typeFilter])

  const totalSent    = filtered.reduce((a, l) => a + (l.success_count ?? l.recipient_count ?? 0), 0)
  const totalCredits = filtered.reduce((a, l) => a + (l.credits_used ?? 0), 0)

  const uniqueTypes = [...new Set(logs.map(l => l.type).filter(Boolean))]

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="page-content pb-10">
      <BackButton />
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-forest">Message History</h1>
        <p className="text-sm text-mist mt-0.5">{logs.length} sends on record</p>
      </div>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="flex gap-3 mb-4">
          <div className="card flex-1 py-3 text-center">
            <p className="font-display text-2xl font-bold text-forest">{totalSent.toLocaleString()}</p>
            <p className="text-xs text-mist mt-0.5">messages sent</p>
          </div>
          <div className="card flex-1 py-3 text-center">
            <p className="font-display text-2xl font-bold text-forest">{totalCredits.toLocaleString()}</p>
            <p className="text-xs text-mist mt-0.5">credits used</p>
          </div>
          <div className="card flex-1 py-3 text-center">
            <p className="font-display text-2xl font-bold text-forest">{filtered.length}</p>
            <p className="text-xs text-mist mt-0.5">sends</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2 mb-4">
        {/* Time filter */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
          {[['all','All Time'],['this_month','This Month'],['last_month','Last Month']].map(([val,label]) => (
            <button key={val} onClick={() => setTimeFilter(val)}
              className={`shrink-0 text-xs font-semibold h-8 px-3 rounded-full transition-colors
                ${timeFilter === val ? 'bg-forest text-ivory' : 'bg-white border border-forest/20 text-forest'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        {uniqueTypes.length > 1 && (
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
            <button onClick={() => setTypeFilter('all')}
              className={`shrink-0 text-xs font-semibold h-8 px-3 rounded-full transition-colors
                ${typeFilter === 'all' ? 'bg-forest text-ivory' : 'bg-white border border-forest/20 text-forest'}`}>
              All types
            </button>
            {uniqueTypes.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`shrink-0 text-xs font-semibold h-8 px-3 rounded-full transition-colors
                  ${typeFilter === t ? 'bg-forest text-ivory' : 'bg-white border border-forest/20 text-forest'}`}>
                {TYPE_LABELS[t] ?? t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Log entries */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <MessageSquare size={32} className="text-mist mx-auto mb-3" strokeWidth={1.25} />
          <p className="font-semibold text-forest">No messages found</p>
          <p className="text-sm text-mist mt-1">
            {logs.length === 0 ? 'Send your first bulk SMS to see history here' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(log => {
            const isOpen   = !!expanded[log.id]
            const typeLabel = TYPE_LABELS[log.type] ?? log.type ?? 'SMS'
            const sent      = log.success_count ?? log.recipient_count ?? 0
            const total     = log.recipient_count ?? sent
            const failed    = log.fail_count ?? (total - sent)
            const partial   = failed > 0 || sent < total

            return (
              <div key={log.id} className="card cursor-pointer" onClick={() => toggleExpand(log.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Type badge + date */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span style={{
                        display:'inline-block', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:6,
                        background:'rgba(26,58,42,.08)', color:'#2d5a42',
                      }}>
                        {typeLabel.toUpperCase()}
                      </span>
                      <span className="text-xs text-mist">{fmtDateTime(log.sent_at)}</span>
                    </div>

                    {/* Recipients reached */}
                    <p className="text-sm font-semibold text-forest">
                      {sent} of {total} members reached
                      {partial && failed > 0 && <span className="text-xs text-error ml-2 font-normal">· {failed} failed</span>}
                    </p>

                    {/* Credits */}
                    <p className="text-xs text-mist mt-0.5">{log.credits_used ?? 0} credits used</p>
                  </div>

                  <div className="shrink-0 text-mist">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded: message body */}
                {isOpen && log.message && (
                  <div className="mt-3 pt-3 border-t border-forest/8">
                    <p className="text-xs font-semibold text-mist uppercase tracking-wide mb-1.5">Message</p>
                    <p className="text-sm text-forest leading-relaxed whitespace-pre-wrap">{log.message}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
