'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Check, Phone, FileText, MessageSquare, Send, X, AlertCircle, CheckCircle, ClipboardList, Users } from 'lucide-react'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { fmtDate, toWhatsAppNumber, getAv } from '@/lib/utils'

const CREDITS_PER_SMS    = 5
const DEFAULT_ABSENTEE_MSG = (churchName) =>
  `Hi {name}, we missed you at ${churchName || 'church'} this Sunday. We hope you're doing well — you're loved and we look forward to seeing you again soon. 🙏`

function getDisplayName() {
  if (typeof window === 'undefined') return 'Team member'
  return localStorage.getItem('ct_display_name') || 'Team member'
}

const ABSENTEE_WA = (name) =>
  `Hi ${name}, we missed you at church this Sunday. We hope you're well. Please join us next week! 🙏`

export default function AbsenteesClient({
  churchId, absentees, groups, initialFollowUpData,
  hasCredits, smsCredits = 0, churchName = '',
}) {
  const [followUp,   setFollowUp]   = useState(initialFollowUpData ?? {})
  const [syncing,    setSyncing]    = useState({})
  const [activeGroup,   setActiveGroup]   = useState('all')
  const [statusFilter,  setStatusFilter]  = useState('all')
  const [noteTarget,    setNoteTarget]    = useState(null)
  const [noteText,      setNoteText]      = useState('')

  // SMS state
  const [showSmsModal,  setShowSmsModal]  = useState(false)
  const [smsText,       setSmsText]       = useState('')
  const [sending,       setSending]       = useState(false)
  const [smsResult,     setSmsResult]     = useState(null)

  useEffect(() => {
    if (showSmsModal && !smsText) setSmsText(DEFAULT_ABSENTEE_MSG(churchName))
  }, [showSmsModal, churchName, smsText])

  // Sync follow-up on focus
  const syncFromServer = useCallback(async () => {
    try {
      const r = await fetch('/api/followup/load?field=follow_up_data')
      if (!r.ok) return
      const { data } = await r.json()
      if (data) setFollowUp(prev => ({ ...prev, ...data }))
    } catch {}
  }, [])

  useEffect(() => {
    syncFromServer()
    window.addEventListener('focus', syncFromServer)
    return () => window.removeEventListener('focus', syncFromServer)
  }, [syncFromServer])

  async function markReached(absentee, reached) {
    const key = absentee.sessionId + '_' + absentee.memberId
    setSyncing(p => ({ ...p, [key]: true }))
    const reachedBy = reached ? getDisplayName() : null
    const reachedAt = reached ? new Date().toISOString() : null
    const prev = followUp[key] ?? {}
    setFollowUp(p => ({ ...p, [key]: { ...prev, reached, reachedBy, reachedAt } }))
    try {
      const r = await fetch('/api/followup/mark', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, reached, note: prev.note ?? '', reachedBy: reached ? getDisplayName() : null }),
      })
      if (!r.ok) throw new Error()
      const { entry } = await r.json()
      setFollowUp(p => ({ ...p, [key]: entry }))
    } catch {
      setFollowUp(p => ({ ...p, [key]: prev }))
    } finally {
      setSyncing(p => ({ ...p, [key]: false }))
    }
  }

  async function saveNote() {
    if (!noteTarget) return
    const key = noteTarget.sessionId + '_' + noteTarget.memberId
    const prev = followUp[key] ?? {}
    setFollowUp(p => ({ ...p, [key]: { ...prev, note: noteText } }))
    setNoteTarget(null)
    await fetch('/api/followup/mark', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, reached: prev.reached ?? false, note: noteText, reachedBy: prev.reachedBy ?? null }),
    }).catch(() => {})
  }

  const filtered = useMemo(() => {
    return absentees.filter(a => {
      if (activeGroup !== 'all' && a.groupId !== activeGroup) return false
      const reached = followUp[`${a.sessionId}_${a.memberId}`]?.reached ?? false
      if (statusFilter === 'pending' && reached)  return false
      if (statusFilter === 'reached' && !reached) return false
      return true
    })
  }, [absentees, activeGroup, statusFilter, followUp])

  const totalPending = absentees.filter(a => !(followUp[`${a.sessionId}_${a.memberId}`]?.reached)).length

  // SMS targets — only absentees with phones
  const smsTargets = useMemo(() => {
    const base = activeGroup !== 'all' ? absentees.filter(a => a.groupId === activeGroup) : absentees
    return base.filter(a => a.phone && a.memberId)
  }, [absentees, activeGroup])

  const creditsNeeded   = smsTargets.length * CREDITS_PER_SMS
  const canAffordAll    = smsCredits >= creditsNeeded
  const canAffordSome   = smsCredits >= CREDITS_PER_SMS && smsTargets.length > 0
  const maxCanSend      = Math.floor(smsCredits / CREDITS_PER_SMS)
  const willBeSkipped   = Math.max(0, smsTargets.length - maxCanSend)

  async function handleBulkSms() {
    if (!canAffordSome || !smsText.trim() || sending) return
    setSending(true); setSmsResult(null)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: smsTargets.map(a => ({ name: a.name, phone: a.phone })),
          message: smsText,
          type: 'absentee_followup',
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSmsResult({ error: data.error ?? 'Send failed' }); return }
      setSmsResult({
        sent:              data.sent,
        failed:            data.failed,
        skipped:           data.skipped ?? 0,
        skippedNames:      data.skippedRecipients ?? [],
        creditsUsed:       data.credits_used,
        newBalance:        data.new_balance,
        sentNames:         (data.results ?? []).filter(r => r.status === 'sent').map(r => r.name),
        failedNames:       (data.results ?? []).filter(r => r.status === 'failed').map(r => r.name),
      })
    } catch { setSmsResult({ error: 'Network error. Please try again.' }) }
    finally   { setSending(false) }
  }

  return (
    <div className="page-content">
      <div className="mb-4">
        <BackButton />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-forest">Absentees</h1>
            <p className="text-sm text-mist mt-0.5">
              {totalPending > 0 ? `${totalPending} pending follow-up${totalPending !== 1 ? 's' : ''}` : '✓ All followed up!'}
            </p>
          </div>
          {absentees.length > 0 && (
            <div className="flex gap-2 shrink-0" style={{ marginTop:4 }}>
              <Link href="/absentees/assign" className="btn btn-primary btn-sm gap-1.5">
                <ClipboardList size={14} /> Assign Follow-Ups
              </Link>
              <button onClick={() => { setShowSmsModal(true); setSmsResult(null) }}
                className="btn btn-outline btn-sm gap-1.5">
                <MessageSquare size={14} /> Bulk SMS
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Group filter */}
      {groups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          <FilterChip active={activeGroup === 'all'} onClick={() => setActiveGroup('all')} label="All groups" />
          {groups.map(g => <FilterChip key={g.id} active={activeGroup === g.id} onClick={() => setActiveGroup(g.id)} label={g.name} />)}
        </div>
      )}

      {/* Status filter */}
      <div className="flex gap-2">
        {['all','pending','reached'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`btn-sm capitalize ${statusFilter === s ? 'btn-primary' : 'btn-outline'}`}>{s}</button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p className="text-3xl">🎉</p>
          <p className="font-medium text-forest">{absentees.length === 0 ? 'No absentees this week' : 'All followed up!'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(absentee => {
            const key      = absentee.sessionId + '_' + absentee.memberId
            const entry    = followUp[key] ?? {}
            const reached  = entry.reached  ?? false
            const note     = entry.note     ?? ''
            const av       = getAv(absentee.name)
            const waNumber = toWhatsAppNumber(absentee.phone ?? '')
            const waMsg    = encodeURIComponent(ABSENTEE_WA(absentee.name.split(' ')[0]))

            return (
              <div key={key} className={`card transition-all duration-200 ${reached ? 'opacity-70' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="avatar shrink-0" style={{ background:av.bg, color:av.color }}>{av.initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-forest text-[15px] truncate">{absentee.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-mist">{absentee.groupName}</span>
                      <span className="text-xs text-mist/40">·</span>
                      <span className="text-xs text-mist">{fmtDate(absentee.date)}</span>
                    </div>
                    {absentee.phone && <p className="text-xs text-mist mt-0.5">{absentee.phone}</p>}
                  </div>
                  <button onClick={() => markReached(absentee, !reached)} disabled={!!syncing[key]}
                    className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 border-2
                      ${reached ? 'bg-success border-success text-white' : 'bg-white border-forest/15 text-mist hover:border-success/60 hover:text-success'}
                      ${syncing[key] ? 'opacity-50 cursor-wait' : ''}`}>
                    <Check size={15} strokeWidth={2.5} />
                  </button>
                </div>

                {reached && entry.reachedBy && (
                  <p className="text-xs text-success mt-2 ml-1">✓ Reached by {entry.reachedBy}{entry.reachedAt ? ` · ${new Date(entry.reachedAt).toLocaleDateString()}` : ''}</p>
                )}
                {!reached && note && <p className="text-xs text-mist mt-2 ml-1 italic">"{note}"</p>}

                {/* Action row — Call, WhatsApp, Note only (no individual SMS) */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-forest/8">
                  {absentee.phone && (
                    <a href={`tel:${absentee.phone}`} className="btn btn-outline btn-sm flex-1 text-xs gap-1.5">
                      <Phone size={13} /> Call
                    </a>
                  )}
                  {waNumber && (
                    <a href={`https://wa.me/${waNumber}?text=${waMsg}`} target="_blank" rel="noreferrer"
                      className="btn btn-sm flex-1 text-xs gap-1.5" style={{ background:'#25D366', color:'#fff' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                  )}
                  <button onClick={() => { setNoteTarget(absentee); setNoteText(note) }}
                    className="btn btn-outline btn-sm flex-1 text-xs gap-1.5">
                    <FileText size={13} /> {note ? 'Edit note' : 'Note'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Note modal */}
      {noteTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && setNoteTarget(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-5 shadow-modal animate-slide-up safe-bottom">
            <h3 className="font-display text-lg font-semibold text-forest mb-3">Note for {noteTarget.name}</h3>
            <textarea className="input resize-none text-sm" style={{ minHeight:100 }}
              placeholder="e.g. Reached by phone, travelling this weekend…"
              value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setNoteTarget(null)} className="btn btn-outline flex-1">Cancel</button>
              <button onClick={saveNote} className="btn btn-primary flex-1">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk SMS Modal ────────────────────────────────────────────────────── */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={e => e.target === e.currentTarget && !sending && setShowSmsModal(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-slide-up safe-bottom overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-forest/8">
              <div>
                <h3 className="font-display text-lg font-semibold text-forest">Send Bulk SMS</h3>
                <p className="text-xs text-mist mt-0.5">
                  {smsTargets.length} of {absentees.length} absentees have phone numbers
                </p>
              </div>
              <button onClick={() => !sending && setShowSmsModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-mist hover:text-forest hover:bg-forest/8 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {smsResult ? (
                /* ── Result state ── */
                smsResult.error ? (
                  <div className="flex items-start gap-3 rounded-xl p-4" style={{ background:'rgba(220,38,38,.06)', border:'1px solid rgba(220,38,38,.2)' }}>
                    <AlertCircle size={18} className="text-error shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-error">Send failed</p>
                      <p className="text-xs text-error/80 mt-1">{smsResult.error}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary header */}
                    <div className="text-center py-2">
                      <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle size={28} className="text-success" />
                      </div>
                      <p className="font-display text-xl font-bold text-forest">SMS Send Summary</p>
                      <p className="text-xs text-mist mt-1">{new Date().toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })}</p>
                    </div>

                    {/* Stats */}
                    <div className="rounded-xl overflow-hidden" style={{ border:'1px solid rgba(26,58,42,.1)' }}>
                      {[
                        { icon:'✅', label:`Sent successfully`, value:`${smsResult.sent} members`, color:'#16a34a' },
                        ...(smsResult.skipped > 0 ? [{ icon:'⏭', label:'Skipped (no credits)', value:`${smsResult.skipped} members`, color:'#d97706' }] : []),
                        ...(smsResult.failed > 0  ? [{ icon:'❌', label:'Failed (delivery)',    value:`${smsResult.failed} members`,  color:'#dc2626' }] : []),
                        { icon:'⚡', label:'Credits used',   value:`${smsResult.creditsUsed}`, color:'#c9a84c' },
                        { icon:'💳', label:'Balance left',   value:`${smsResult.newBalance} credits`, color:'#1a3a2a' },
                      ].map(({ icon, label, value, color }) => (
                        <div key={label} className="flex justify-between items-center px-4 py-3 border-b border-forest/6 last:border-0">
                          <span className="text-sm text-mist">{icon} {label}</span>
                          <span className="text-sm font-bold" style={{ color }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Who received it */}
                    {smsResult.sentNames?.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-mist uppercase tracking-wide mb-2">Received SMS</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {smsResult.sentNames.map(n => (
                            <p key={n} className="text-xs text-forest bg-success/6 rounded-lg px-3 py-1.5">✓ {n}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Who was skipped */}
                    {(smsResult.skippedNames?.length > 0 || smsResult.failedNames?.length > 0) && (
                      <div>
                        <p className="text-xs font-bold text-mist uppercase tracking-wide mb-2">Did not receive</p>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {[...(smsResult.skippedNames ?? []), ...(smsResult.failedNames ?? [])].map(n => (
                            <p key={n} className="text-xs text-mist bg-error/5 rounded-lg px-3 py-1.5">✗ {n}</p>
                          ))}
                        </div>
                        {smsResult.newBalance < CREDITS_PER_SMS && (
                          <div className="mt-3 flex items-center gap-2 rounded-xl p-3" style={{ background:'rgba(217,119,6,.08)', border:'1px solid rgba(217,119,6,.2)' }}>
                            <AlertCircle size={14} style={{ color:'#d97706', flexShrink:0 }} />
                            <p className="text-xs" style={{ color:'#d97706' }}>
                              Top up to reach the remaining {(smsResult.skippedNames?.length ?? 0) + (smsResult.failedNames?.length ?? 0)} members.{' '}
                              <a href="/credits" className="font-bold underline">Buy credits →</a>
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* ── Compose state ── */
                <>
                  {/* No credits */}
                  {!hasCredits && (
                    <div className="flex items-start gap-3 rounded-xl p-3" style={{ background:'rgba(201,168,76,.1)', border:'1px solid rgba(201,168,76,.3)' }}>
                      <AlertCircle size={15} style={{ color:'#a8862e', flexShrink:0, marginTop:1 }} />
                      <p className="text-xs text-forest">No SMS credits. <a href="/credits" className="font-semibold underline">Buy credits →</a></p>
                    </div>
                  )}

                  {/* Partial send warning */}
                  {hasCredits && !canAffordAll && canAffordSome && (
                    <div className="flex items-start gap-3 rounded-xl p-3" style={{ background:'rgba(217,119,6,.08)', border:'1px solid rgba(217,119,6,.25)' }}>
                      <AlertCircle size={15} style={{ color:'#d97706', flexShrink:0, marginTop:1 }} />
                      <p className="text-xs" style={{ color:'#d97706' }}>
                        You have <strong>{smsCredits} credits</strong> — enough to reach <strong>{maxCanSend} of {smsTargets.length}</strong> members.
                        {willBeSkipped > 0 && ` ${willBeSkipped} will be skipped.`}{' '}
                        <a href="/credits" className="font-bold underline">Top up to reach all →</a>
                      </p>
                    </div>
                  )}

                  {/* Message editor */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-forest">Message</label>
                      <span className="text-xs text-mist">{smsText.length} chars</span>
                    </div>
                    <textarea className="input resize-none text-sm w-full" style={{ minHeight:120 }}
                      value={smsText} onChange={e => setSmsText(e.target.value)} placeholder="Type your message…" />
                    <p className="text-xs text-mist mt-1.5">💡 Use <code className="bg-ivory-dark px-1 rounded">{'{name}'}</code> to personalise</p>
                  </div>

                  {/* Cost summary */}
                  {smsTargets.length > 0 && (
                    <div className="flex justify-between items-center text-sm rounded-xl px-4 py-3" style={{ background:'rgba(26,58,42,.04)' }}>
                      <span className="text-mist">
                        Sending to {Math.min(smsTargets.length, maxCanSend)} · {Math.min(smsTargets.length, maxCanSend) * CREDITS_PER_SMS} credits
                      </span>
                      <span className="font-semibold text-forest">{smsCredits} available</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 pt-2 flex gap-3">
              {smsResult ? (
                <button onClick={() => { setSmsResult(null); if (!smsResult.error) setShowSmsModal(false) }} className="btn btn-primary w-full">
                  {smsResult.error ? 'Try again' : 'Done'}
                </button>
              ) : (
                <>
                  <button onClick={() => setShowSmsModal(false)} className="btn btn-outline flex-1" disabled={sending}>Cancel</button>
                  <button onClick={handleBulkSms} disabled={!canAffordSome || !smsText.trim() || sending}
                    className="btn btn-primary flex-1 gap-2"
                    style={{ opacity:(!canAffordSome || !smsText.trim() || sending) ? 0.5 : 1 }}>
                    {sending ? (
                      <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" opacity="0.75"/></svg> Sending…</>
                    ) : (
                      <><Send size={15} /> Send to {Math.min(smsTargets.length, maxCanSend)}</>
                    )}
                  </button>
                </>
              )}
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
    <button onClick={onClick}
      className={`shrink-0 text-[13px] font-medium px-3 py-1.5 rounded-full transition-colors
        ${active ? 'bg-forest text-ivory' : 'bg-white border border-forest/20 text-forest-muted hover:border-forest/40'}`}>
      {label}
    </button>
  )
}
