'use client'

import { useState, useEffect } from 'react'
import { fmtDate, attendanceRate, getTrend, getLastSunday, getPrevSunday, toISODate, getAv } from '@/lib/utils'
import BackButton from '@/components/ui/BackButton'

const STEP = { GROUP: 1, DATE: 2, MARK: 3, SUMMARY: 4 }

export default function AttendanceFlow({ church, groups, sessionsByGroup, preselectedGroupId }) {
  const [step, setStep]               = useState(preselectedGroupId ? STEP.DATE : STEP.GROUP)
  const [group, setGroup]             = useState(preselectedGroupId ? groups.find(g => g.id === preselectedGroupId) ?? null : null)
  const [date, setDate]               = useState(null)
  const [members, setMembers]         = useState([])
  // attendance: { [memberId]: true | null }
  // true = present, null = absent (not marked)
  const [attendance, setAttendance]   = useState({})
  const [existingSessionId, setExisting] = useState(null)
  const [loadingMembers, setLoadingM] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [result, setResult]           = useState(null)

  async function selectDate(d, existId = null) {
    setDate(d)
    setExisting(existId)
    setLoadingM(true)
    try {
      const res  = await fetch(`/api/attendance/members?groupId=${group.id}&churchId=${church.id}&date=${d}`)
      const data = await res.json()
      const list = data.members ?? []
      setMembers(list)
      const init = {}
      if (existId && data.existingRecords?.length > 0) {
        // Load existing — only mark true for those previously present
        data.existingRecords.forEach(r => { init[r.member_id] = r.present ? true : null })
      } else {
        // New session — all null (untouched)
        list.forEach(m => { init[m.id] = null })
      }
      setAttendance(init)
    } catch (e) {
      console.error('Failed to load members:', e)
    } finally {
      setLoadingM(false)
      setStep(STEP.MARK)
    }
  }

  async function save() {
    setSaving(true)
    // present = true, absent = null — only true counts as present
    const records = members.map(m => ({
      memberId: m.id,
      name:     m.name,
      present:  attendance[m.id] === true,
    }))
    const payload = {
      groupId:           group.id,
      churchId:          church.id,
      date,
      records,
      existingSessionId: existingSessionId ?? undefined,
    }
    try {
      const res  = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? data.error ?? 'Save failed')
      setResult(data)
      setStep(STEP.SUMMARY)
    } catch (e) {
      alert('Save failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  function handleEdit() {
    setResult(null)
    setStep(STEP.MARK)
  }

  return (
    <div className="page">
      {step === STEP.GROUP && (
        <StepGroup
          groups={groups} sessionsByGroup={sessionsByGroup}
          onSelect={g => { setGroup(g); setStep(STEP.DATE) }}
        />
      )}
      {step === STEP.DATE && group && (
        <StepDate
          group={group} church={church}
          onBack={() => setStep(STEP.GROUP)}
          onSelect={selectDate}
        />
      )}
      {step === STEP.MARK && group && date && (
        <StepMark
          group={group} date={date}
          members={members} attendance={attendance}
          loading={loadingMembers} saving={saving}
          onToggle={id => setAttendance(p => ({ ...p, [id]: p[id] === true ? null : true }))}
          onSave={save}
          onBack={() => setStep(STEP.DATE)}
        />
      )}
      {step === STEP.SUMMARY && result && (
        <StepSummary
          group={group} date={date}
          members={members} attendance={attendance}
          result={result}
          onDone={() => window.location.href = '/dashboard'}
          onEdit={handleEdit}
        />
      )}
    </div>
  )
}

// ── Group selection ────────────────────────────────────────────────────────────

function StepGroup({ groups, sessionsByGroup, onSelect }) {
  return (
    <div>
      <div className="page-header">
        <BackButton href="/dashboard" />
        <h1>Take Attendance</h1>
        <p>Select a group to begin</p>
      </div>

      {groups.length === 0 ? (
        <div className="card empty">
          <div className="empty-icon">👥</div>
          <h3>No groups yet</h3>
          <p>Create a group before taking attendance</p>
          <a href="/groups" className="btn btn-primary">Create group</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(g => {
            const sessions   = sessionsByGroup[g.id] ?? []
            const [latest, prev] = sessions
            const latestRate = latest?.attendance_records?.length
              ? attendanceRate(latest.attendance_records.filter(r => r.present).length, latest.attendance_records.length)
              : null
            const prevRate = prev?.attendance_records?.length
              ? attendanceRate(prev.attendance_records.filter(r => r.present).length, prev.attendance_records.length)
              : null
            const trend  = latestRate !== null && prevRate !== null ? getTrend(latestRate, prevRate) : null
            const rColor = latestRate !== null ? (latestRate >= 75 ? '#16a34a' : latestRate >= 50 ? '#d97706' : '#dc2626') : '#8a9e90'

            return (
              <button key={g.id} onClick={() => onSelect(g)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '1rem 1.25rem',
                background: '#fff', border: '1px solid var(--border)', borderRadius: 16,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s ease',
                boxShadow: 'var(--shadow-sm)', width: '100%',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = '' }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#c9a84c', fontSize: 18, fontWeight: 700,
                  fontFamily: 'var(--font-playfair),Georgia,serif',
                }}>
                  {g.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
                    {g.name}
                  </p>
                  <p style={{ fontSize: 13, color: '#8a9e90', margin: 0 }}>
                    {g.leader || 'No leader assigned'}{latest && ` · Last: ${fmtDate(latest.date)}`}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {latestRate !== null && (
                    <p style={{ fontSize: 20, fontWeight: 800, color: rColor, margin: '0 0 1px', fontFamily: 'var(--font-playfair),Georgia,serif', letterSpacing: '-0.03em' }}>
                      {latestRate}%
                    </p>
                  )}
                  {trend && (
                    <p style={{ fontSize: 12, fontWeight: 600, color: trend.color, margin: 0 }}>
                      {trend.symbol} {Math.abs(trend.delta)}%
                    </p>
                  )}
                  {latestRate === null && <p style={{ fontSize: 12, color: '#b0bec0' }}>No data</p>}
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9c9c9" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Date selection ─────────────────────────────────────────────────────────────

function StepDate({ group, church, onBack, onSelect }) {
  const thisSun = toISODate(getLastSunday())
  const prevSun = toISODate(getPrevSunday())

  const [activeQuick, setActiveQuick] = useState(null)
  const [customDate,  setCustomDate]  = useState('')
  const [checking,    setChecking]    = useState(false)

  async function pickQuick(key, date) {
    setActiveQuick(key)
    setCustomDate(date)
    setChecking(true)
    try {
      const res  = await fetch(`/api/attendance/check?groupId=${group.id}&date=${date}`)
      const data = await res.json()
      onSelect(date, data.sessionId ?? null)
    } catch { onSelect(date, null) }
    finally   { setChecking(false) }
  }

  async function pickCustom() {
    if (!customDate) return
    setActiveQuick(null)
    setChecking(true)
    try {
      const res  = await fetch(`/api/attendance/check?groupId=${group.id}&date=${customDate}`)
      const data = await res.json()
      onSelect(customDate, data.sessionId ?? null)
    } catch { onSelect(customDate, null) }
    finally   { setChecking(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.75rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', color: '#8a9e90', display: 'flex', alignItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: '1.5rem', fontWeight: 700, color: '#1a3a2a', margin: 0, letterSpacing: '-0.02em' }}>
            {group.name}
          </h1>
          <p style={{ fontSize: 13, color: '#8a9e90', margin: '3px 0 0' }}>Select a service date</p>
        </div>
        {checking && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8a9e90' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
            Loading…
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[
          { key: 'this', label: 'This Sunday', date: thisSun },
          { key: 'last', label: 'Last Sunday', date: prevSun },
        ].map(({ key, label, date }) => {
          const isActive = activeQuick === key
          return (
            <button key={key} onClick={() => !checking && pickQuick(key, date)} disabled={checking}
              style={{
                padding: '1.125rem 1rem', borderRadius: 14, cursor: checking ? 'wait' : 'pointer', textAlign: 'left',
                border: `2px solid ${isActive ? '#1a3a2a' : 'rgba(26,58,42,0.12)'}`,
                background: isActive ? '#1a3a2a' : '#fff', transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 4px 16px rgba(26,58,42,0.2)' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: isActive ? '#e8d5a0' : '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
                {label}
              </p>
              <p style={{ fontSize: 13, color: isActive ? 'rgba(232,213,160,0.7)' : '#8a9e90', margin: '0 0 8px' }}>
                {fmtDate(date)}
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700,
                color: isActive ? '#c9a84c' : '#4a8a65',
                background: isActive ? 'rgba(201,168,76,0.15)' : 'rgba(26,58,42,0.07)',
                borderRadius: 20, padding: '3px 9px',
              }}>
                {isActive ? (
                  <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>Selected</>
                ) : 'Tap to select →'}
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.1)', borderRadius: 14, padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#2d4a36', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Custom date
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="date" value={customDate} max={toISODate(new Date())}
            onChange={e => { setCustomDate(e.target.value); setActiveQuick(null) }}
            style={{ flex: 1, border: '1px solid rgba(26,58,42,0.18)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: 15, color: customDate ? '#1a2e22' : '#b0bec0', outline: 'none', minHeight: 44, background: '#fff' }}
          />
          <button onClick={pickCustom} disabled={!customDate || checking}
            style={{ padding: '0 1.25rem', height: 44, borderRadius: 10, border: 'none', background: customDate && !checking ? '#1a3a2a' : '#e0dbd0', color: customDate && !checking ? '#e8d5a0' : '#8a9e90', fontSize: 14, fontWeight: 700, cursor: customDate && !checking ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
            Go →
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Mark attendance ────────────────────────────────────────────────────────────

function StepMark({ group, date, members, attendance, loading, saving, onToggle, onSave, onBack }) {
  const [search, setSearch] = useState('')

  // Only true counts as present; null = absent/unmarked
  const present  = Object.values(attendance).filter(v => v === true).length
  const absent   = members.length - present
  const progress = members.length ? (present / members.length) * 100 : 0
  const filtered = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg)' }}>

      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: '#fff', borderBottom: '1px solid var(--border)',
        padding: '0.875rem 1.25rem 0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ padding: '0 8px', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: 0, letterSpacing: '-0.01em' }}>{group.name}</p>
            <p style={{ fontSize: 12, color: '#8a9e90', margin: 0 }}>{fmtDate(date)}</p>
          </div>
          {/* Only show absent count if > 0 */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <span className="badge badge-green">{present} present</span>
            {absent > 0 && <span className="badge badge-red">{absent} absent</span>}
          </div>
        </div>

        <div className="progress-wrap" style={{ marginBottom: 10 }}>
          <div className="progress-bar" style={{ width: `${progress}%`, background: '#16a34a' }} />
        </div>

        <div className="search-wrap" style={{ marginBottom: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="input" style={{ minHeight: 38, fontSize: 14 }}
            placeholder="Search members…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Member list */}
      <div style={{ flex: 1, padding: '0.75rem 1.25rem', paddingBottom: 100, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 64 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty" style={{ paddingTop: '3rem' }}>
            <p>{search ? `No results for "${search}"` : 'No members in this group'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(member => {
              const isPresent = attendance[member.id] === true
              const av = getAv(member.name)

              return (
                <button key={member.id} onClick={() => onToggle(member.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem',
                    borderRadius: 14, border: '1.5px solid',
                    borderColor: isPresent ? 'rgba(22,163,74,0.35)' : 'rgba(26,58,42,0.09)',
                    background: isPresent ? 'rgba(22,163,74,0.05)' : '#fff',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                    transition: 'all 0.14s ease',
                  }}>
                  <div className="avatar" style={{ background: av.bg, color: av.color, flexShrink: 0 }}>
                    {av.initials}
                  </div>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#1a3a2a', letterSpacing: '-0.01em', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {member.name}
                  </span>
                  {/* Dot: gray when null, green check when present */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isPresent ? '#16a34a' : '#e2e8e4',
                    border: isPresent ? 'none' : '1.5px solid #c8d5cf',
                    transition: 'background 0.14s',
                  }}>
                    {isPresent && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Save bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid var(--border)',
        padding: '0.875rem 1.25rem',
        paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom))',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.07)',
      }}>
        <button className="btn btn-primary btn-lg btn-full" onClick={onSave}
          disabled={saving || loading || members.length === 0}
          style={{ background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)', boxShadow: '0 4px 14px rgba(26,58,42,0.3)' }}>
          {saving ? 'Saving…' : `Save · ${present} present${absent > 0 ? `, ${absent} absent` : ''}`}
        </button>
      </div>
    </div>
  )
}

// ── Summary / Results ──────────────────────────────────────────────────────────

function StepSummary({ group, date, members, attendance, result, onDone, onEdit }) {
  const [absentExpanded, setAbsentExpanded] = useState(false)
  const ABSENT_PREVIEW = 5

  const presentMembers = members.filter(m => attendance[m.id] === true)
  const absentMembers  = members.filter(m => attendance[m.id] !== true)
  const rate   = attendanceRate(presentMembers.length, members.length)
  const rColor = rate >= 75 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'
  const circ   = 2 * Math.PI * (130 * 0.38)
  const offset = circ - (rate / 100) * circ

  const visibleAbsent = absentExpanded ? absentMembers : absentMembers.slice(0, ABSENT_PREVIEW)
  const hiddenCount   = absentMembers.length - ABSENT_PREVIEW

  return (
    <div>
      <div className="page-header">
        <h1>Session Saved</h1>
        <p>{group.name} · {fmtDate(date)}</p>
      </div>

      {/* Rate ring card */}
      <div className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', marginBottom: 12 }}>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 130, height: 130 }}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r={130 * 0.38} fill="none" stroke="#ede9e0" strokeWidth={130 * 0.09}/>
            <circle cx="65" cy="65" r={130 * 0.38} fill="none" stroke={rColor}
              strokeWidth={130 * 0.09} strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 65 65)"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}/>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontWeight: 800, fontSize: 28, color: rColor, lineHeight: 1, letterSpacing: '-0.03em' }}>{rate}%</span>
            <span style={{ fontSize: 11, color: '#8a9e90', marginTop: 2 }}>attendance</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '1.5rem' }}>
          <Stat label="Present" value={presentMembers.length} color="#16a34a" />
          {absentMembers.length > 0 && <Stat label="Absent" value={absentMembers.length} color="#dc2626" />}
          <Stat label="Total"   value={members.length}        color="#1a3a2a" />
        </div>

        {result.offline && (
          <div style={{ marginTop: 16, padding: '0.625rem 1rem', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: '#d97706', margin: 0 }}>📡 Saved offline — will sync when back online</p>
          </div>
        )}
      </div>

      {/* Send message to attendees */}
      {presentMembers.length > 0 && (
        <a href="/attendees" style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
          padding: '0.875rem 1rem', background: '#fff',
          border: '1px solid rgba(26,58,42,0.1)', borderRadius: 16,
          textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          transition: 'all 0.15s',
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: 'rgba(37,211,102,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#15803d">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px', letterSpacing: '-0.01em' }}>
              Message attendees
            </p>
            <p style={{ fontSize: 13, color: '#8a9e90', margin: 0 }}>
              Send WhatsApp messages to {presentMembers.length} member{presentMembers.length !== 1 ? 's' : ''} who came →
            </p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9c9c9" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </a>
      )}

      {/* Present list */}
      {presentMembers.length > 0 && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>
              Present · {presentMembers.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {presentMembers.map((m, i) => {
              const av = getAv(m.name)
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.5rem 0',
                  borderBottom: i < presentMembers.length - 1 ? '1px solid rgba(26,58,42,0.05)' : 'none',
                }}>
                  <div className="avatar avatar-sm" style={{ background: av.bg, color: av.color, flexShrink: 0 }}>
                    {av.initials}
                  </div>
                  <span style={{ fontSize: 14, color: '#1a3a2a', fontWeight: 500, letterSpacing: '-0.01em' }}>
                    {m.name}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Absent list — collapsed by default, see more button */}
      {absentMembers.length > 0 && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#dc2626' }}>
              Absent · {absentMembers.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {visibleAbsent.map((m, i) => {
              const av = getAv(m.name)
              return (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '0.5rem 0',
                  borderBottom: i < visibleAbsent.length - 1 ? '1px solid rgba(26,58,42,0.05)' : 'none',
                }}>
                  <div className="avatar avatar-sm" style={{ background: av.bg, color: av.color, flexShrink: 0 }}>
                    {av.initials}
                  </div>
                  <span style={{ fontSize: 14, color: '#4a5568', fontWeight: 500, letterSpacing: '-0.01em' }}>
                    {m.name}
                  </span>
                </div>
              )
            })}
          </div>

          {/* See more / show less */}
          {absentMembers.length > ABSENT_PREVIEW && (
            <button onClick={() => setAbsentExpanded(p => !p)} style={{
              marginTop: 10, width: '100%', padding: '0.5rem',
              background: 'rgba(26,58,42,0.04)', border: '1px solid rgba(26,58,42,0.1)',
              borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
              color: '#4a8a65', transition: 'background 0.14s',
            }}>
              {absentExpanded
                ? 'Show less ↑'
                : `See ${hiddenCount} more absent member${hiddenCount !== 1 ? 's' : ''} ↓`}
            </button>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button className="btn btn-outline btn-lg" onClick={onEdit} style={{ flex: 1 }}>
          ✏️ Edit
        </button>
        <button className="btn btn-primary btn-lg" onClick={onDone} style={{ flex: 1 }}>
          Done ✓
        </button>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 28, fontWeight: 800, color, margin: '0 0 3px', fontFamily: 'var(--font-playfair),Georgia,serif', letterSpacing: '-0.03em' }}>
        {value}
      </p>
      <p style={{ fontSize: 12, color: '#8a9e90', margin: 0, fontWeight: 600 }}>{label}</p>
    </div>
  )
}