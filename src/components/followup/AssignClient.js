'use client'

import { useState, useMemo, useCallback } from 'react'
import { ArrowLeft, Users, Shuffle, Share2, ChevronDown, Check, X, AlertCircle, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { getAv, toWhatsAppNumber } from '@/lib/utils'

// ── Rotation helper ─────────────────────────────────────────────────────────
// Given a memberId and assignment history, returns the set of assignee IDs
// who followed up on this member in the last N weeks.
function getRecentAssignees(memberId, history, weeks = 2) {
  return new Set(
    history
      .filter(h => h.memberId === memberId)
      .slice(-weeks)
      .map(h => h.assigneeId)
  )
}

// Auto-split: distribute absentees across team, rotating so no one
// is assigned the same person they followed up last time.
function autoSplit(absentees, team, history) {
  if (!team.length) return {}

  const result = {}
  // Track how many each member has been assigned this round (for even spread)
  const counts = Object.fromEntries(team.map(t => [t.id, 0]))

  for (const absentee of absentees) {
    if (!absentee.memberId) continue
    const recentAssignees = getRecentAssignees(absentee.memberId, history)

    // Prefer team members who haven't recently followed this person up
    // Sort by: not-recently-assigned first, then by lowest current count
    const sorted = [...team].sort((a, b) => {
      const aRecent = recentAssignees.has(a.id) ? 1 : 0
      const bRecent = recentAssignees.has(b.id) ? 1 : 0
      if (aRecent !== bRecent) return aRecent - bRecent // prefer not-recent
      return counts[a.id] - counts[b.id]               // then fewest assigned
    })

    const chosen = sorted[0]
    result[absentee.memberId] = chosen.id
    counts[chosen.id]++
  }

  return result
}

export default function AssignClient({
  absentees = [],
  team = [],
  weekKey,
  existingAssignments = [],
  assignmentHistory = [],
  churchName = '',
}) {
  // assignments: { [memberId]: assigneeId }
  const [manualNames, setManualNames] = useState({}) // used when no team: { fakeId: 'Name' }
  const [assignments, setAssignments] = useState(() => {
    const map = {}
    for (const a of existingAssignments) {
      if (a.memberId) map[a.memberId] = a.assigneeId
    }
    return map
  })

  const [activeSheet, setActiveSheet] = useState(null) // memberId or null
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState('')

  const teamMap = useMemo(() => Object.fromEntries(team.map(t => [t.id, t])), [team])

  const allAssigned = absentees.every(a => !a.memberId || assignments[a.memberId])
  const assignedCount = absentees.filter(a => a.memberId && assignments[a.memberId]).length

  // Auto-split
  function handleAutoSplit() {
    const result = autoSplit(absentees, team, assignmentHistory)
    setAssignments(result)
  }

  function assign(memberId, assigneeId) {
    setAssignments(prev => ({ ...prev, [memberId]: assigneeId }))
    setActiveSheet(null)
  }

  function unassign(memberId) {
    setAssignments(prev => {
      const next = { ...prev }
      delete next[memberId]
      return next
    })
  }

  // Save assignments to server
  async function saveAssignments() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const payload = absentees
        .filter(a => a.memberId && assignments[a.memberId])
        .map(a => {
          const assignee = teamMap[assignments[a.memberId]]
          return {
            memberId:      a.memberId,
            memberName:    a.name,
            assigneeId:    assignee?.id ?? assignments[a.memberId],
            assigneeName:  assignee?.name ?? 'Unknown',
            assigneePhone: assignee?.phone ?? '',
          }
        })

      const res = await fetch('/api/followup/assign', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ weekKey, assignments: payload }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Save failed')
      }
      setSaved(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  // Build WhatsApp share text — grouped by assignee
  const shareText = useMemo(() => {
    if (!allAssigned) return ''

    // Group absentees by assignee
    const grouped = {}
    for (const a of absentees) {
      if (!a.memberId) continue
      const assigneeId = assignments[a.memberId]
      if (!assigneeId) continue
      if (!grouped[assigneeId]) grouped[assigneeId] = []
      grouped[assigneeId].push(a)
    }

    const date = new Date(weekKey).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    const lines = [
      `📋 *Follow-Up List — ${date}*`,
      `${churchName} · ${absentees.length} ${absentees.length === 1 ? 'person' : 'people'} to reach`,
      '',
    ]

    for (const [assigneeId, people] of Object.entries(grouped)) {
      const assignee = teamMap[assigneeId]
      const assigneeName = assignee?.name ?? manualNames[assigneeId] ?? 'Unassigned'
      lines.push(`👤 *${assigneeName}*`)
      for (const p of people) {
        const wa = p.phone ? toWhatsAppNumber(p.phone) : null
        lines.push(`• ${p.name}${p.phone ? ` · ${p.phone}` : ''}`)
      }
      lines.push('')
    }

    lines.push(`Please reach your people by Wednesday. 🙏`)
    return lines.join('\n')
  }, [absentees, assignments, allAssigned, teamMap, weekKey, churchName])

  function handleShare() {
    if (!shareText) return
    const encoded = encodeURIComponent(shareText)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  function handleCopy() {
    if (!shareText) return
    navigator.clipboard.writeText(shareText).catch(() => {})
  }

  // No absentees
  if (absentees.length === 0) {
    return (
      <div className="page-content">
        <Link href="/absentees" className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-forest mb-6 transition-colors">
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="empty-state">
          <p className="text-3xl">🎉</p>
          <p className="font-medium text-forest">No absentees this week</p>
          <p className="text-sm text-mist mt-1">Everyone was present — nothing to assign.</p>
        </div>
      </div>
    )
  }

  // No team — show a nudge banner but still allow manual assignment
  const noTeam = team.length === 0

  return (
    <div className="page-content">
      {/* Header */}
      <div className="mb-5">
        <Link href="/absentees" className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-forest mb-3 transition-colors">
          <ArrowLeft size={15} /> Back to Absentees
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-forest">Assign Follow-Ups</h1>
            <p className="text-sm text-mist mt-0.5">
              {assignedCount} of {absentees.filter(a => a.memberId).length} assigned
            </p>
          </div>
          {/* Auto-split only available when team exists */}
          {!noTeam && (
            <button onClick={handleAutoSplit} className="btn btn-outline btn-sm gap-1.5 shrink-0" style={{ marginTop: 4 }}>
              <Shuffle size={14} /> Auto-split
            </button>
          )}
        </div>

        {/* Auto-split note */}
        <p className="text-xs text-mist mt-2 leading-relaxed">
          Auto-split divides the list equally and avoids assigning the same person to the same follower as last week.
        </p>
      </div>

      {/* No-team nudge — soft prompt, does not block */}
      {noTeam && (
        <div className="flex items-start gap-3 rounded-xl p-3 mb-4" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
          <Users size={15} className="shrink-0" style={{ color:'#a8862e', marginTop:1 }} />
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color:'#a8862e' }}>
              You haven't set up a follow-up team yet. You can still assign manually below.{' '}
              <Link href="/followup-team" className="underline font-semibold">Create a team →</Link>
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl p-3 mb-4" style={{ background: 'rgba(220,38,38,.06)', border: '1px solid rgba(220,38,38,.2)' }}>
          <AlertCircle size={14} className="text-error shrink-0" />
          <p className="text-xs text-error">{error}</p>
        </div>
      )}

      {/* Absentee list */}
      <div className="space-y-2 mb-5">
        {absentees.map(absentee => {
          if (!absentee.memberId) return null // skip unnamed FT records
          const assigneeId = assignments[absentee.memberId]
          const assignee   = assigneeId ? teamMap[assigneeId] : null
          const av         = getAv(absentee.name)

          return (
            <div key={absentee.memberId} className="card">
              <div className="flex items-center gap-3">
                <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>
                  {av.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-forest text-[15px] truncate">{absentee.name}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="text-xs text-mist">{absentee.groupName}</span>
                    {absentee.phone && (
                      <>
                        <span className="text-xs text-mist/40">·</span>
                        <span className="text-xs text-mist">{absentee.phone}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Assignment button */}
                <button
                  onClick={() => setActiveSheet(activeSheet === absentee.memberId ? null : absentee.memberId)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border
                    ${assignee
                      ? 'bg-success/10 border-success/25 text-success'
                      : 'bg-forest/5 border-forest/15 text-mist hover:border-forest/30'
                    }`}
                >
                  {assignee ? (
                    <><Check size={12} /> {assignee.name}</>
                  ) : (
                    <>Assign <ChevronDown size={12} /></>
                  )}
                </button>
              </div>

              {/* Inline assignee picker — expands below the row */}
              {activeSheet === absentee.memberId && (
                <div className="mt-3 pt-3 border-t border-forest/8">
                  <p className="text-xs font-medium text-mist mb-2">Assign to:</p>
                  <div className="space-y-1">
                    {team.map(member => {
                      const recentAssignees = getRecentAssignees(absentee.memberId, assignmentHistory)
                      const wasRecent = recentAssignees.has(member.id)
                      const isSelected = assignments[absentee.memberId] === member.id
                      const mav = getAv(member.name)

                      return (
                        <button
                          key={member.id}
                          onClick={() => assign(absentee.memberId, member.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-colors
                            ${isSelected ? 'bg-success/10 border border-success/25' : 'hover:bg-forest/4'}`}
                        >
                          <div className="avatar shrink-0" style={{ background: mav.bg, color: mav.color, width: 28, height: 28, fontSize: 11 }}>
                            {mav.initials}
                          </div>
                          <span className="text-sm flex-1 text-forest">{member.name}</span>
                          {wasRecent && !isSelected && (
                            <span className="text-[10px] text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">Did last week</span>
                          )}
                          {isSelected && <Check size={13} className="text-success shrink-0" />}
                        </button>
                      )
                    })}
                    {/* Unassign option */}
                    {assignee && (
                      <button
                        onClick={() => { unassign(absentee.memberId); setActiveSheet(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-error/5 text-left"
                      >
                        <X size={13} className="text-error" />
                        <span className="text-sm text-error">Remove assignment</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Bottom action bar ──────────────────────────────────────────────── */}
      <div className="sticky bottom-20 md:bottom-4 z-10">
        <div className="bg-white rounded-2xl shadow-modal border border-forest/10 p-4">
          {!allAssigned && (
            <p className="text-xs text-mist text-center mb-3">
              Assign everyone before you can share — <strong className="text-forest">{absentees.filter(a => a.memberId && !assignments[a.memberId]).length} remaining</strong>
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={saveAssignments}
              disabled={saving || !assignedCount}
              className="btn btn-outline flex-1 gap-1.5"
              style={{ opacity: assignedCount ? 1 : 0.45 }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
            </button>
            <button
              onClick={handleShare}
              disabled={!allAssigned}
              className="btn btn-primary flex-1 gap-1.5"
              style={{ opacity: allAssigned ? 1 : 0.45, background: allAssigned ? '#25D366' : undefined }}
            >
              <Share2 size={15} />
              {allAssigned ? 'Share via WhatsApp' : `Share (${assignedCount}/${absentees.filter(a => a.memberId).length})`}
            </button>
          </div>
          {allAssigned && (
            <button onClick={handleCopy} className="w-full text-xs text-mist hover:text-forest mt-2 py-1 transition-colors">
              Or copy to clipboard
            </button>
          )}
        </div>
      </div>

      <div className="h-32" />
    </div>
  )
}
