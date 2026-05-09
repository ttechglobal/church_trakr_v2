'use client'

import { useState, useMemo } from 'react'
import BackButton from '@/components/ui/BackButton'
import { MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

const TYPE_LABELS = {
  absentee_followup: 'Absentees',
  attendee_thankyou: 'Attendees',
  absentees:         'Absentees',
  attendees:         'Attendees',
  broadcast:         'Broadcast',
  sunday_reminder:   'Sunday Reminder',
  special_program:   'Special Program',
  custom:            'Custom',
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function isThisMonth(iso) {
  const d = new Date(iso), n = new Date()
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear()
}
function isLastMonth(iso) {
  const d = new Date(iso), n = new Date()
  const last = new Date(n.getFullYear(), n.getMonth() - 1)
  return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear()
}

export default function MessageHistoryClient({ logs }) {
  const [timeFilter, setTimeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expanded,   setExpanded]   = useState({})

  const filtered = useMemo(() => logs.filter(l => {
    if (timeFilter === 'this_month' && !isThisMonth(l.sent_at)) return false
    if (timeFilter === 'last_month' && !isLastMonth(l.sent_at)) return false
    if (typeFilter !== 'all' && l.type !== typeFilter)           return false
    return true
  }), [logs, timeFilter, typeFilter])

  const totalSent    = filtered.reduce((a, l) => a + (l.success_count ?? l.recipient_count ?? 0), 0)
  const totalCredits = filtered.reduce((a, l) => a + (l.credits_used ?? 0), 0)
  const uniqueTypes  = [...new Set(logs.map(l => l.type).filter(Boolean))]

  return (
    <div className="page-content pb-10">
      <BackButton />
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-forest">Message History</h1>
        <p className="text-sm text-mist mt-0.5">{logs.length} total sends</p>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex gap-3 mb-4">
          {[
            { label: 'messages sent', value: totalSent.toLocaleString() },
            { label: 'credits used',  value: totalCredits.toLocaleString() },
            { label: 'sends',         value: filtered.length },
          ].map(({ label, value }) => (
            <div key={label} className="card flex-1 py-3 text-center">
              <p className="font-display text-2xl font-bold text-forest">{value}</p>
              <p className="text-xs text-mist mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2 mb-4">
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[['all','All Time'],['this_month','This Month'],['last_month','Last Month']].map(([v,l]) => (
            <button key={v} onClick={() => setTimeFilter(v)}
              className={`shrink-0 text-xs font-semibold h-8 px-3 rounded-full transition-colors
                ${timeFilter === v ? 'bg-forest text-ivory' : 'bg-white border border-forest/20 text-forest'}`}>
              {l}
            </button>
          ))}
        </div>
        {uniqueTypes.length > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            <button onClick={() => setTypeFilter('all')}
              className={`shrink-0 text-xs font-semibold h-8 px-3 rounded-full
                ${typeFilter === 'all' ? 'bg-forest text-ivory' : 'bg-white border border-forest/20 text-forest'}`}>
              All types
            </button>
            {uniqueTypes.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`shrink-0 text-xs font-semibold h-8 px-3 rounded-full
                  ${typeFilter === t ? 'bg-forest text-ivory' : 'bg-white border border-forest/20 text-forest'}`}>
                {TYPE_LABELS[t] ?? t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="card text-center py-12">
          <MessageSquare size={32} className="text-mist mx-auto mb-3" strokeWidth={1.25} />
          <p className="font-semibold text-forest">
            {logs.length === 0 ? 'No messages sent yet' : 'No messages match this filter'}
          </p>
          <p className="text-sm text-mist mt-1 mb-4">
            {logs.length === 0 ? 'Send your first bulk SMS to see history here' : 'Try adjusting your filters'}
          </p>
          {logs.length === 0 && (
            <Link href="/messaging/send" className="btn btn-primary btn-sm">
              Send a message
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const isOpen    = !!expanded[log.id]
            const typeLabel = TYPE_LABELS[log.type] ?? log.type ?? 'SMS'
            const sent      = log.success_count ?? log.recipient_count ?? 0
            const total     = log.recipient_count ?? sent
            const failed    = log.fail_count ?? Math.max(0, total - sent)

            return (
              <div
                key={log.id}
                className="card cursor-pointer select-none"
                onClick={() => setExpanded(p => ({ ...p, [log.id]: !p[log.id] }))}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Type + date */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span style={{
                        display: 'inline-block', fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 6,
                        background: 'rgba(26,58,42,0.07)', color: '#2d5a42',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                      }}>
                        {typeLabel}
                      </span>
                      <span className="text-xs text-mist">{fmtDate(log.sent_at)}</span>
                    </div>

                    {/* Stats */}
                    <p className="text-sm font-semibold text-forest">
                      {sent} of {total} members reached
                      {failed > 0 && (
                        <span className="text-xs text-error ml-2 font-normal">· {failed} failed</span>
                      )}
                    </p>
                    <p className="text-xs text-mist mt-0.5">{log.credits_used ?? 0} credits used</p>
                  </div>
                  <div className="shrink-0 text-mist mt-0.5">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded message */}
                {isOpen && log.message && (
                  <div className="mt-3 pt-3 border-t border-forest/8">
                    <p className="text-xs font-semibold text-mist uppercase tracking-wide mb-2">Message sent</p>
                    <p className="text-sm text-forest leading-relaxed whitespace-pre-wrap bg-ivory rounded-xl px-3 py-2">
                      {log.message}
                    </p>
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
