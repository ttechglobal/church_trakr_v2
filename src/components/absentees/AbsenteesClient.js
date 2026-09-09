'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Send, X, AlertCircle, CheckCircle, Phone, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { fmtDate, toWhatsAppNumber, getAv } from '@/lib/utils'

const CREDITS_PER_SMS = 5
const DEFAULT_ABSENTEE_MSG = (churchName) =>
  `Hi {name}, we missed you at ${churchName || 'church'} this Sunday. We hope you're doing well — you're loved and we look forward to seeing you again soon. 🙏`

function getDisplayName() {
  if (typeof window === 'undefined') return 'Team member'
  return localStorage.getItem('ct_display_name') || 'Team member'
}

const ABSENTEE_WA = (name) =>
  `Hi ${name}, we missed you at church this Sunday. We hope you're well. Please join us next week! 🙏`

// Days since a date string (more precise than weeks for recent absences)
function daysSince(dateStr) {
  if (!dateStr) return 0
  const d = new Date(dateStr + 'T00:00:00')
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

// Human-readable "last seen" label
function lastSeenLabel(dateStr) {
  if (!dateStr) return 'Unknown'
  const days = daysSince(dateStr)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days} days ago`
  const weeks = Math.floor(days / 7)
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`
}

// Urgency based on days since last seen:
// 0-7 days  = missed most recent service only = Low
// 8-21 days = missed 2-3 services = Medium
// 21+ days  = missing for a month or more = High
function getUrgency(dateStr) {
  const days = daysSince(dateStr)
  if (days > 21) return { label: 'High',   color: '#dc2626', bg: '#fef2f2' }
  if (days > 7)  return { label: 'Medium', color: '#d97706', bg: '#fffbeb' }
  return               { label: 'Low',    color: '#16a34a', bg: '#f0fdf4' }
}

// ─── Inline icons ─────────────────────────────────────────────────────────────
function WAIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}
function MsgIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
    </svg>
  )
}
function ChevR() {
  return <svg width={14} height={14} viewBox="0 0 20 20" fill="#c5cec8"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
}

// ─── Reach-tick button (replaces week circle) ─────────────────────────────────
function ReachTick({ reached, syncing, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={syncing}
      title={reached ? 'Mark not reached' : 'Mark as reached'}
      style={{
        width: 36, height: 36, borderRadius: '50%', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: syncing ? 'wait' : 'pointer', flexShrink: 0,
        transition: 'all 0.18s',
        background: reached ? '#16a34a' : '#fff',
        boxShadow: reached ? '0 2px 8px rgba(22,163,74,0.35)' : '0 0 0 2px rgba(26,58,42,0.15)',
        opacity: syncing ? 0.6 : 1,
      }}
    >
      {syncing ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'abs-spin 0.7s linear infinite' }}>
          <style>{`@keyframes abs-spin{to{transform:rotate(360deg);}}`}</style>
          <circle cx="12" cy="12" r="10" stroke={reached ? '#fff' : '#1a3a2a'} strokeWidth="3" opacity="0.2"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke={reached ? '#fff' : '#1a3a2a'} strokeWidth="3" strokeLinecap="round"/>
        </svg>
      ) : reached ? (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="#fff"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" stroke="#8a9e90" strokeWidth="0.5" fill="rgba(26,58,42,0.12)"/></svg>
      )}
    </button>
  )
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function AbsSkeleton() {
  return (
    <div style={{ padding: '1rem' }}>
      <style>{`@keyframes sk2{0%{background-position:-400px 0}100%{background-position:400px 0}}.sk2{background:linear-gradient(90deg,#ede9e0 25%,#e0dbd0 50%,#ede9e0 75%);background-size:400px;animation:sk2 1.4s ease-in-out infinite;border-radius:8px;}`}</style>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < 4 ? '1px solid rgba(26,58,42,0.06)' : 'none' }}>
          <div className="sk2" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
          <div className="sk2" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="sk2" style={{ height: 14, width: '55%', marginBottom: 7 }} />
            <div className="sk2" style={{ height: 11, width: '40%' }} />
          </div>
          <div className="sk2" style={{ width: 80, height: 28, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AbsenteesClient({
  churchId, absentees, groups, initialFollowUpData,
  hasCredits, smsCredits = 0, churchName = '',
}) {
  const [followUp,     setFollowUp]     = useState(initialFollowUpData ?? {})
  const [syncing,      setSyncing]      = useState({})
  const [activeGroup,  setActiveGroup]  = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search,       setSearch]       = useState('')
  const [noteTarget,   setNoteTarget]   = useState(null)
  const [noteText,     setNoteText]     = useState('')
  const [mounted,      setMounted]      = useState(false)

  // SMS state
  const [showSms,  setShowSms]  = useState(false)
  const [smsText,  setSmsText]  = useState('')
  const [sending,  setSending]  = useState(false)
  const [smsResult,setSmsResult]= useState(null)

  // Show content immediately after hydration (avoids flash)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (showSms && !smsText) setSmsText(DEFAULT_ABSENTEE_MSG(churchName))
  }, [showSms, churchName, smsText])

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
    // Optimistic update — instant UI response
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
      setFollowUp(p => ({ ...p, [key]: prev })) // rollback on error
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
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false
      const reached = followUp[`${a.sessionId}_${a.memberId}`]?.reached ?? false
      if (statusFilter === 'pending'   && reached)  return false
      if (statusFilter === 'reached'   && !reached) return false
      if (statusFilter === 'attention') {
        return daysSince(a.date) > 14 && !reached
      }
      return true
    })
  }, [absentees, activeGroup, statusFilter, search, followUp])

  const totalPending   = useMemo(() => absentees.filter(a => !(followUp[`${a.sessionId}_${a.memberId}`]?.reached)).length, [absentees, followUp])
  const totalReached   = useMemo(() => absentees.filter(a =>   followUp[`${a.sessionId}_${a.memberId}`]?.reached).length,  [absentees, followUp])
  const totalAttention = useMemo(() => absentees.filter(a => daysSince(a.date) > 14 && !(followUp[`${a.sessionId}_${a.memberId}`]?.reached)).length, [absentees, followUp])

  const smsTargets   = useMemo(() => (activeGroup !== 'all' ? absentees.filter(a => a.groupId === activeGroup) : absentees).filter(a => a.phone && a.memberId), [absentees, activeGroup])
  const canAffordSome = smsCredits >= CREDITS_PER_SMS && smsTargets.length > 0
  const maxCanSend    = Math.floor(smsCredits / CREDITS_PER_SMS)

  async function handleBulkSms() {
    if (!canAffordSome || !smsText.trim() || sending) return
    setSending(true); setSmsResult(null)
    try {
      const res = await fetch('/api/sms/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipients: smsTargets.map(a => ({ name: a.name, phone: a.phone })), message: smsText, type: 'absentee_followup' }) })
      const data = await res.json()
      if (!res.ok) { setSmsResult({ error: data.error ?? 'Send failed' }); return }
      setSmsResult({ sent: data.sent, failed: data.failed, skipped: data.skipped ?? 0, skippedNames: data.skippedRecipients ?? [], creditsUsed: data.credits_used, newBalance: data.new_balance, sentNames: (data.results ?? []).filter(r => r.status === 'sent').map(r => r.name), failedNames: (data.results ?? []).filter(r => r.status === 'failed').map(r => r.name) })
    } catch { setSmsResult({ error: 'Network error. Please try again.' }) }
    finally   { setSending(false) }
  }

  if (!mounted) return <AbsSkeleton />

  return (
    <div className="page-content">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1rem' }}>
        <BackButton />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 24, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Absentees</h1>
            <p style={{ fontSize: 13, color: '#8a9e90', margin: '3px 0 0' }}>
              {totalPending > 0 ? `${totalPending} people need follow-up` : '✓ All followed up!'}
            </p>
          </div>
          {absentees.length > 0 && (
            <button onClick={() => { setShowSms(true); setSmsResult(null) }} style={{ display: 'flex', alignItems: 'center', gap: 5, height: 34, padding: '0 13px', borderRadius: 10, border: '1px solid rgba(26,58,42,0.18)', background: '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: '#1a3a2a', fontFamily: 'inherit', flexShrink: 0, marginTop: 4 }}>
              <Send size={12} /> SMS
            </button>
          )}
        </div>
      </div>

      {/* ── Status tabs ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }} className="scrollbar-hide">
        {[
          { key: 'all',       label: `All (${absentees.length})` },
          { key: 'pending',   label: `Not contacted (${totalPending})` },
          { key: 'reached',   label: `Contacted (${totalReached})` },
          { key: 'attention', label: `Needs attention (${totalAttention})` },
        ].map(({ key, label }) => {
          const active = statusFilter === key
          return (
            <button key={key} onClick={() => setStatusFilter(key)} style={{ flexShrink: 0, height: 34, padding: '0 14px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, transition: 'all 0.14s', whiteSpace: 'nowrap', background: active ? '#1a3a2a' : '#fff', color: active ? '#fff' : '#4a8a65', boxShadow: active ? 'none' : '0 1px 3px rgba(26,58,42,0.08)', outline: active ? 'none' : '1px solid rgba(26,58,42,0.1)' }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Search + group + assign ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#8a9e90', display: 'flex', pointerEvents: 'none' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </span>
          <input type="search" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 40, borderRadius: 12, border: '1px solid rgba(26,58,42,0.14)', background: '#fff', paddingLeft: 32, paddingRight: 12, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', color: '#1a3a2a', boxSizing: 'border-box' }} />
        </div>
        {groups.length > 1 && (
          <select value={activeGroup} onChange={e => setActiveGroup(e.target.value)}
            style={{ height: 40, borderRadius: 12, border: '1px solid rgba(26,58,42,0.14)', background: '#fff', padding: '0 10px', fontSize: 13, fontFamily: 'inherit', color: '#1a3a2a', cursor: 'pointer', outline: 'none', flexShrink: 0 }}>
            <option value="all">All groups</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <Link href="/absentees/assign" style={{ display: 'flex', alignItems: 'center', gap: 5, height: 40, padding: '0 14px', borderRadius: 12, background: '#1a3a2a', color: '#fff', textDecoration: 'none', fontSize: 12.5, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
          <ClipboardList size={13} /> Assign
        </Link>
      </div>

      {/* ── List ─────────────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 1.5rem', gap: 10 }}>
          <span style={{ fontSize: 40 }}>{absentees.length === 0 ? '🎉' : '🔍'}</span>
          <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>
            {absentees.length === 0 ? 'No absentees this week' : 'No matches'}
          </p>
          <p style={{ fontSize: 13, color: '#8a9e90', margin: 0 }}>
            {absentees.length === 0 ? 'Great attendance this Sunday! 🙌' : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid rgba(26,58,42,0.08)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(26,58,42,0.05)' }}>
          {filtered.map((absentee, idx) => {
            const key      = absentee.sessionId + '_' + absentee.memberId
            const entry    = followUp[key] ?? {}
            const reached  = entry.reached ?? false
            const note     = entry.note    ?? ''
            const av       = getAv(absentee.name)
            const urgency  = getUrgency(absentee.date)
            const waNumber = toWhatsAppNumber(absentee.phone ?? '')
            const waMsg    = encodeURIComponent(ABSENTEE_WA(absentee.name.split(' ')[0]))
            const isLast   = idx === filtered.length - 1
            const hasMemberPage = !!(absentee.memberId)

            return (
              <div key={key} style={{ borderBottom: isLast ? 'none' : '1px solid rgba(26,58,42,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 14px 12px', opacity: reached ? 0.7 : 1 }}>

                  {/* ── Reach tick — replaces the week circle ── */}
                  <ReachTick
                    reached={reached}
                    syncing={!!syncing[key]}
                    onClick={() => markReached(absentee, !reached)}
                  />

                  {/* ── Avatar — tapping opens member profile ── */}
                  {hasMemberPage ? (
                    <Link href={`/members/${absentee.memberId}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                        {av.initials}
                      </div>
                    </Link>
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {av.initials}
                    </div>
                  )}

                  {/* ── Name + meta + action strip ── */}
                  <div style={{ flex: 1, minWidth: 0 }}>

                    {/* Name row with optional member-page chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      {hasMemberPage ? (
                        <Link href={`/members/${absentee.memberId}`} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14.5, fontWeight: 600, color: '#1a3a2a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{absentee.name}</p>
                        </Link>
                      ) : (
                        <p style={{ fontSize: 14.5, fontWeight: 600, color: '#1a3a2a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{absentee.name}</p>
                      )}
                      {hasMemberPage && (
                        <Link href={`/members/${absentee.memberId}`} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          <ChevR />
                        </Link>
                      )}
                    </div>

                    {/* Group · last seen */}
                    <p style={{ fontSize: 11.5, color: '#8a9e90', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {absentee.groupName}{absentee.date ? ` · Last seen ${fmtDate(absentee.date)}` : ''}
                    </p>

                    {/* Status line */}
                    {reached && entry.reachedBy
                      ? <p style={{ fontSize: 11, color: '#16a34a', margin: '2px 0 0', fontWeight: 500 }}>
                          ✓ Reached by {entry.reachedBy}{entry.reachedAt ? ` · ${new Date(entry.reachedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}` : ''}
                        </p>
                      : note
                        ? <p style={{ fontSize: 11, color: '#8a9e90', margin: '2px 0 0', fontStyle: 'italic' }}>"{note}"</p>
                        : <p style={{ fontSize: 11, margin: '2px 0 0', fontWeight: 500 }}>
                            <span style={{ color: urgency.color, background: urgency.bg, padding: '1px 7px', borderRadius: 5, fontSize: 10 }}>{urgency.label}</span>
                            <span style={{ color: '#b0bab5', marginLeft: 6 }}>{lastSeenLabel(absentee.date)}</span>
                          </p>
                    }

                    {/* ── Labelled action strip ── */}
                    <div style={{
                      display: 'flex', gap: 6, marginTop: 9,
                      opacity: reached ? 0.5 : 1,
                      transition: 'opacity 0.18s',
                    }}>
                      {/* Call */}
                      {absentee.phone ? (
                        <a
                          href={`tel:${absentee.phone}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            height: 30, padding: '0 11px',
                            borderRadius: 8,
                            background: 'rgba(26,58,42,0.05)',
                            border: '1px solid rgba(26,58,42,0.14)',
                            color: '#1a3a2a',
                            textDecoration: 'none',
                            fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}
                        >
                          <Phone size={12} strokeWidth={2} />
                          Call
                        </a>
                      ) : (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          height: 30, padding: '0 11px',
                          borderRadius: 8,
                          background: 'rgba(26,58,42,0.03)',
                          border: '1px solid rgba(26,58,42,0.07)',
                          color: '#c5cec8',
                          fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                          whiteSpace: 'nowrap', flexShrink: 0,
                          cursor: 'not-allowed',
                        }}>
                          <Phone size={12} strokeWidth={2} />
                          Call
                        </span>
                      )}

                      {/* WhatsApp */}
                      {waNumber ? (
                        <a
                          href={`https://wa.me/${waNumber}?text=${waMsg}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            height: 30, padding: '0 11px',
                            borderRadius: 8,
                            background: 'rgba(37,211,102,0.07)',
                            border: '1px solid rgba(37,211,102,0.22)',
                            color: '#128c5e',
                            textDecoration: 'none',
                            fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                            whiteSpace: 'nowrap', flexShrink: 0,
                          }}
                        >
                          <WAIcon size={12} />
                          WhatsApp
                        </a>
                      ) : (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          height: 30, padding: '0 11px',
                          borderRadius: 8,
                          background: 'rgba(37,211,102,0.03)',
                          border: '1px solid rgba(37,211,102,0.10)',
                          color: '#c5cec8',
                          fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                          whiteSpace: 'nowrap', flexShrink: 0,
                          cursor: 'not-allowed',
                        }}>
                          <WAIcon size={12} />
                          WhatsApp
                        </span>
                      )}

                      {/* Note */}
                      <button
                        onClick={() => { setNoteTarget(absentee); setNoteText(note) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          height: 30, padding: '0 11px',
                          borderRadius: 8,
                          background: note ? 'rgba(201,168,76,0.10)' : 'rgba(26,58,42,0.05)',
                          border: note ? '1px solid rgba(201,168,76,0.28)' : '1px solid rgba(26,58,42,0.14)',
                          color: note ? '#a8862e' : '#8a9e90',
                          cursor: 'pointer',
                          fontSize: 11.5, fontWeight: 600, fontFamily: 'inherit',
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                      >
                        <MsgIcon size={12} />
                        {note ? 'Edit note' : 'Note'}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Note modal ───────────────────────────────────────────────────────── */}
      {noteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(15,26,19,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setNoteTarget(null)}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: '0 1.25rem 2rem', boxShadow: '0 -12px 48px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e0dbd0', margin: '14px auto 1.5rem' }} />
            <h3 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: '0 0 1rem' }}>Note for {noteTarget.name}</h3>
            <textarea className="input" style={{ resize: 'none', minHeight: 100, fontSize: 14 }}
              placeholder="e.g. Reached by phone, travelling this weekend…"
              value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus />
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setNoteTarget(null)} className="btn btn-outline" style={{ flex: 1, height: 48 }}>Cancel</button>
              <button onClick={saveNote} className="btn btn-primary" style={{ flex: 1, height: 48 }}>Save Note</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk SMS Modal ───────────────────────────────────────────────────── */}
      {showSms && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 16 }}
          onClick={e => e.target === e.currentTarget && !sending && setShowSms(false)}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 480, boxShadow: '0 -12px 48px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.125rem 1.25rem 0.875rem', borderBottom: '1px solid rgba(26,58,42,0.08)' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Send Bulk SMS</p>
                <p style={{ fontSize: 12, color: '#8a9e90', margin: '2px 0 0' }}>{smsTargets.length} of {absentees.length} absentees have phone numbers</p>
              </div>
              <button onClick={() => !sending && setShowSms(false)} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(26,58,42,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a3a2a' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {smsResult ? (
                smsResult.error ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 12, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <AlertCircle size={17} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div><p style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', margin: 0 }}>Send failed</p><p style={{ fontSize: 12, color: '#dc2626', margin: '3px 0 0', opacity: 0.8 }}>{smsResult.error}</p></div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ textAlign: 'center', paddingTop: 8 }}>
                      <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}><CheckCircle size={26} color="#16a34a" /></div>
                      <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 19, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>SMS Send Summary</p>
                    </div>
                    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(26,58,42,0.1)' }}>
                      {[
                        { label: '✅ Sent', value: `${smsResult.sent} members`, color: '#16a34a' },
                        ...(smsResult.skipped > 0 ? [{ label: '⏭ Skipped', value: `${smsResult.skipped}`, color: '#d97706' }] : []),
                        ...(smsResult.failed  > 0 ? [{ label: '❌ Failed',  value: `${smsResult.failed}`,  color: '#dc2626' }] : []),
                        { label: '⚡ Credits used', value: `${smsResult.creditsUsed}`, color: '#c9a84c' },
                        { label: '💳 Balance', value: `${smsResult.newBalance} credits`, color: '#1a3a2a' },
                      ].map(({ label, value, color }, i, arr) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: i < arr.length - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none' }}>
                          <span style={{ fontSize: 13, color: '#8a9e90' }}>{label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <>
                  {!hasCredits && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', borderRadius: 12, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
                      <AlertCircle size={14} color="#a8862e" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 12.5, color: '#1a3a2a', margin: 0 }}>No SMS credits. <a href="/credits" style={{ fontWeight: 700, color: '#a8862e' }}>Buy credits →</a></p>
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a' }}>Message</label>
                      <span style={{ fontSize: 11, color: '#8a9e90' }}>{smsText.length} chars</span>
                    </div>
                    <textarea className="input" style={{ resize: 'none', minHeight: 110, fontSize: 13.5 }}
                      value={smsText} onChange={e => setSmsText(e.target.value)} placeholder="Type your message…" />
                    <p style={{ fontSize: 12, color: '#8a9e90', margin: '5px 0 0' }}>
                      💡 Use <code style={{ background: '#f0ede7', padding: '1px 5px', borderRadius: 4, fontSize: 11 }}>{'{name}'}</code> to personalise
                    </p>
                  </div>
                  {smsTargets.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 13px', borderRadius: 12, background: 'rgba(26,58,42,0.04)' }}>
                      <span style={{ fontSize: 12.5, color: '#8a9e90' }}>To {Math.min(smsTargets.length, maxCanSend)} · {Math.min(smsTargets.length, maxCanSend) * CREDITS_PER_SMS} credits</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1a3a2a' }}>{smsCredits} available</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <div style={{ padding: '0 1.25rem 1.5rem', display: 'flex', gap: 10 }}>
              {smsResult ? (
                <button onClick={() => { setSmsResult(null); if (!smsResult.error) setShowSms(false) }} className="btn btn-primary" style={{ width: '100%', height: 48 }}>
                  {smsResult.error ? 'Try again' : 'Done'}
                </button>
              ) : (
                <>
                  <button onClick={() => setShowSms(false)} className="btn btn-outline" style={{ flex: 1, height: 48 }} disabled={sending}>Cancel</button>
                  <button onClick={handleBulkSms} disabled={!canAffordSome || !smsText.trim() || sending} className="btn btn-primary" style={{ flex: 1, height: 48, opacity: (!canAffordSome || !smsText.trim() || sending) ? 0.5 : 1, gap: 6 }}>
                    {sending
                      ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ animation: 'abs-spin 0.7s linear infinite', display: 'inline-block' }}><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> Sending…</>
                      : <><Send size={13} /> Send to {Math.min(smsTargets.length, maxCanSend)}</>
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ height: 24 }} />
    </div>
  )
}