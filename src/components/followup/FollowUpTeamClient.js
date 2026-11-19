'use client'

import { useState, useMemo } from 'react'
import { Users, UserPlus, Trash2, Search, Check, Phone, X, ArrowLeft } from 'lucide-react'
import { getAv } from '@/lib/utils'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import Field from '@/components/ui/Field'

export default function FollowUpTeamClient({ initialTeam = [], membersList = [] }) {
  const [team,    setTeam]    = useState(initialTeam)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  // "Add from members" sheet
  const [showPicker, setShowPicker] = useState(false)
  const [search,     setSearch]     = useState('')

  // "Add manually" sheet
  const [showManual, setShowManual] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')

  const teamIds = useMemo(() => new Set(team.map(t => t.id)), [team])

  // Members not already on the team
  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase()
    return membersList.filter(m =>
      !teamIds.has(m.id) &&
      (m.name.toLowerCase().includes(q) || (m.phone ?? '').includes(q))
    )
  }, [membersList, teamIds, search])

  function addFromMember(member) {
    setTeam(prev => [...prev, {
      id:      member.id,
      name:    member.name,
      phone:   member.phone ?? '',
      addedAt: new Date().toISOString(),
    }])
  }

  function addManual() {
    if (!manualName.trim()) return
    setTeam(prev => [...prev, {
      id:      `manual_${Date.now()}`,
      name:    manualName.trim(),
      phone:   manualPhone.trim(),
      addedAt: new Date().toISOString(),
    }])
    setManualName('')
    setManualPhone('')
    setShowManual(false)
  }

  function removeMember(id) {
    setTeam(prev => prev.filter(m => m.id !== id))
  }

  async function saveTeam() {
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch('/api/followup/team', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ team }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="mb-5">
        <Link href="/absentees" className="inline-flex items-center gap-1.5 text-sm text-mist hover:text-forest mb-3 transition-colors">
          <ArrowLeft size={15} /> Back to Absentees
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-forest">Follow-Up Team</h1>
            <p className="text-sm text-mist mt-0.5">
              {team.length === 0
                ? 'No team members yet — add people below'
                : `${team.length} member${team.length !== 1 ? 's' : ''} on your follow-up team`}
            </p>
          </div>
          <button
            onClick={saveTeam}
            disabled={saving}
            className="btn btn-primary btn-sm shrink-0"
            style={{ marginTop: 4 }}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save team'}
          </button>
        </div>
        {error && <p className="text-xs text-error mt-2">{error}</p>}
      </div>

      {/* Empty state */}
      {team.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-forest/15 p-8 text-center mb-6">
          <Users size={32} className="text-forest/25 mx-auto mb-3" />
          <p className="font-medium text-forest mb-1">No team members yet</p>
          <p className="text-sm text-mist mb-4">Add the people responsible for following up on absentees each week.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => setShowPicker(true)} className="btn btn-primary btn-sm gap-1.5">
              <UserPlus size={14} /> Add from members
            </button>
            <button onClick={() => setShowManual(true)} className="btn btn-outline btn-sm gap-1.5">
              <UserPlus size={14} /> Add manually
            </button>
          </div>
        </div>
      )}

      {/* Team list */}
      {team.length > 0 && (
        <div className="space-y-2 mb-4">
          {team.map(member => {
            const av = getAv(member.name)
            return (
              <div key={member.id} className="card flex items-center gap-3">
                <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>
                  {av.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-forest text-[15px] truncate">{member.name}</p>
                  {member.phone && (
                    <p className="text-xs text-mist flex items-center gap-1 mt-0.5">
                      <Phone size={11} /> {member.phone}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeMember(member.id)}
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-mist hover:text-error hover:bg-error/8 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add buttons (when team already has members) */}
      {team.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => { setShowPicker(true); setSearch('') }} className="btn btn-outline btn-sm gap-1.5">
            <UserPlus size={14} /> Add from members
          </button>
          <button onClick={() => setShowManual(true)} className="btn btn-outline btn-sm gap-1.5">
            <UserPlus size={14} /> Add manually
          </button>
        </div>
      )}

      {/* Info note */}
      <div className="rounded-xl p-4 mt-6" style={{ background: 'rgba(26,58,42,0.04)', border: '1px solid rgba(26,58,42,0.08)' }}>
        <p className="text-xs text-forest/70 leading-relaxed">
          <strong className="text-forest">How assignments work:</strong> When you assign follow-ups on the Absentees page, the app splits the list across your team. The auto-split makes sure no one is assigned the same person two weeks in a row.
        </p>
      </div>

      {/* ── Pick from members sheet ─────────────────────────────────────────── */}
      {showPicker && (
        <Modal title="Add from members" onClose={() => setShowPicker(false)} footer={
          <button onClick={() => setShowPicker(false)} className="btn btn-primary w-full">Done</button>
        }>
            {/* Search */}
            <div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
                <input
                  className="input pl-8 text-sm"
                  placeholder="Search members…"
                  aria-label="Search members"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            {/* List */}
            <div>
              {filteredMembers.length === 0 ? (
                <p className="text-sm text-mist text-center py-8">
                  {search ? 'No members match your search' : 'All members are already on the team'}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMembers.map(m => {
                    const av = getAv(m.name)
                    const already = teamIds.has(m.id)
                    return (
                      <button
                        key={m.id}
                        onClick={() => { if (!already) addFromMember(m) }}
                        disabled={already}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-forest/4 transition-colors text-left"
                      >
                        <div className="avatar shrink-0" style={{ background: av.bg, color: av.color, width: 36, height: 36, fontSize: 13 }}>
                          {av.initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-forest truncate">{m.name}</p>
                          {m.phone && <p className="text-xs text-mist">{m.phone}</p>}
                        </div>
                        {already && <Check size={14} className="text-success shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

        </Modal>
      )}

      {/* ── Add manually sheet ──────────────────────────────────────────────── */}
      {showManual && (
        <Modal title="Add manually" onClose={() => setShowManual(false)} footer={
          <div className="flex gap-3">
            <button onClick={() => setShowManual(false)} className="btn btn-outline flex-1">Cancel</button>
            <button onClick={addManual} disabled={!manualName.trim()} className="btn btn-primary flex-1">Add to team</button>
          </div>
        }>
          <Field label="Name" required>
            {p => <input {...p} className="input text-sm" placeholder="e.g. Tunde Adeyemi" value={manualName} onChange={e => setManualName(e.target.value)} autoFocus />}
          </Field>
          <Field label="Phone number">
            {p => <input {...p} className="input text-sm" placeholder="e.g. 08012345678" type="tel" value={manualPhone} onChange={e => setManualPhone(e.target.value)} />}
          </Field>
        </Modal>
      )}

      <div className="h-6" />
    </div>
  )
}
