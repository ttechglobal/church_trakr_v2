'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  fmtDate, attendanceRate, rateColor, getTrend,
  getLastSunday, getPrevSunday, toISODate, getAv
} from '@/lib/utils'
import { notifyAttendanceSubmitted } from '@/hooks/useNotifications'

const STEP = { GROUP: 1, DATE: 2, MARK: 3, SUMMARY: 4 }
const FIRST_TIMERS_ID = '__first_timers__'
const BOTTOM_NAV_H = 62
const SIDEBAR_W = 248

// ─── Inline icons ─────────────────────────────────────────────────────────────
function Ico({ d, size = 16, stroke = 'currentColor', sw = 2, fill = 'none' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}
function CheckSvg({ size = 14, color = '#fff' }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill={color}><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
}
function ChevL({ size = 18, color = '#1a3a2a' }) {
  return <svg width={size} height={size} viewBox="0 0 20 20" fill={color}><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
}
function ChevR() {
  return <svg width={16} height={16} viewBox="0 0 20 20" fill="#c5cec8"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
}
function SearchIco() {
  return <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
}
function Spin() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" style={{ animation: 'att-spin 0.7s linear infinite', display: 'inline-block', verticalAlign: 'middle' }}>
      <style>{`@keyframes att-spin{to{transform:rotate(360deg);}}`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
}
function DonutRing({ rate = 0, size = 110 }) {
  const r = 36, cx = 50, cy = 50, circ = 2 * Math.PI * r
  const dash = (Math.max(0, Math.min(100, rate)) / 100) * circ
  const color = rate >= 70 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f0ede7" strokeWidth="10"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round"/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: size * 0.22, fontWeight: 700, color, lineHeight: 1 }}>{rate}%</span>
      </div>
    </div>
  )
}

// Skeleton row used while members load
function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '1px solid rgba(26,58,42,0.06)' }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 14, width: '55%', marginBottom: 6, borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 11, width: '35%', borderRadius: 6 }} />
      </div>
      <div className="skeleton" style={{ width: 60, height: 26, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%' }} />
    </div>
  )
}

// ─── Root controller (logic only, no render) ──────────────────────────────────
export default function AttendanceFlow({ church, groups, sessionsByGroup, preselectedGroupId, firstTimers = [] }) {
  const router = useRouter()
  const [step, setStep] = useState(preselectedGroupId ? STEP.DATE : STEP.GROUP)
  const [selectedGroup, setSelectedGroup] = useState(
    preselectedGroupId ? groups.find(g => g.id === preselectedGroupId) ?? null : null
  )
  const [selectedDate,      setSelectedDate]      = useState('')
  const [existingSessionId, setExistingSessionId] = useState(null)
  const [members,           setMembers]           = useState([])
  const [attendance,        setAttendance]        = useState({})
  const [loadingMembers,    setLoadingMembers]    = useState(false)
  const [saving,            setSaving]            = useState(false)
  const [savingFT,          setSavingFT]          = useState(false)
  const [savedResult,       setSavedResult]       = useState(null)
  const [ftAttendance,      setFtAttendance]      = useState({})

  useEffect(() => {
    if (!preselectedGroupId && groups.length === 1) {
      setSelectedGroup(groups[0])
      setStep(STEP.DATE)
    }
  }, []) // eslint-disable-line

  function handleGroupSelect(group) { setSelectedGroup(group); setStep(STEP.DATE) }

  async function handleDateSelect(date, existingId) {
    setSelectedDate(date)
    setExistingSessionId(existingId)
    if (selectedGroup?.id === FIRST_TIMERS_ID) {
      const initFt = {}
      for (const ft of firstTimers) initFt[ft.id] = false
      if (existingId) {
        try {
          const res = await fetch(`/api/attendance/firsttimers?date=${date}`)
          for (const r of ((await res.json()).records ?? [])) initFt[r.member_id] = r.present
        } catch {}
      }
      setFtAttendance(initFt)
      setStep(STEP.MARK)
      return
    }
    setLoadingMembers(true)
    setStep(STEP.MARK)
    try {
      // NOTE: we pass includeAway=1 so away members come through for the "Away" tab
      const res = await fetch(`/api/attendance/members?groupId=${selectedGroup.id}&churchId=${church.id}&date=${date}&includeAway=1`)
      const data = await res.json()
      const memberList = data.members ?? []
      setMembers(memberList)
      const initial = {}
      if (data.existingRecords?.length > 0) {
        for (const m of memberList) initial[m.id] = false
        for (const r of data.existingRecords) initial[r.member_id] = r.present
      } else {
        for (const m of memberList) initial[m.id] = false
      }
      setAttendance(initial)
    } catch (err) { console.error('Failed to load members', err) }
    finally { setLoadingMembers(false) }
  }

  function toggleMember(memberId) { setAttendance(prev => ({ ...prev, [memberId]: !prev[memberId] })) }

  async function handleSave() {
    setSaving(true)
    // Only save non-away members in attendance records
    const records = members
      .filter(m => m.status !== 'away')
      .map(m => ({ memberId: m.id, name: m.name, present: attendance[m.id] ?? false }))
    const payload = { groupId: selectedGroup.id, date: selectedDate, records, existingSessionId: existingSessionId ?? undefined }
    if (!navigator.onLine) {
      const q = JSON.parse(localStorage.getItem('ct_offline_queue') ?? '[]')
      q.push({ ...payload, queuedAt: new Date().toISOString() })
      localStorage.setItem('ct_offline_queue', JSON.stringify(q))
      setSaving(false); setSavedResult({ ...payload, sessionId: 'offline', offline: true }); setStep(STEP.SUMMARY)
      return
    }
    try {
      const res = await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      if (firstTimers.length > 0 && Object.keys(ftAttendance).length > 0) {
        fetch('/api/attendance/firsttimers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: selectedDate, records: firstTimers.map(ft => ({ memberId: ft.id, name: ft.name, present: ftAttendance[ft.id] ?? false })) }) }).catch(() => {})
      }
      setSavedResult(data); setStep(STEP.SUMMARY)
      localStorage.setItem('ct_last_attendance_date', selectedDate)
      try { notifyAttendanceSubmitted(localStorage.getItem('ct_display_name') || 'A team member', records.filter(r => r.present).length, records.length - records.filter(r => r.present).length) } catch {}
    } catch (err) { alert('Failed to save: ' + err.message) }
    finally { setSaving(false) }
  }

  async function handleSaveFirstTimers() {
    setSavingFT(true)
    const records = firstTimers.map(ft => ({ memberId: ft.id, name: ft.name, present: ftAttendance[ft.id] ?? false }))
    try {
      const res = await fetch('/api/attendance/firsttimers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date: selectedDate, records }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSavedResult({ ...data, isFirstTimers: true, ftMembers: firstTimers, ftAttendance: { ...ftAttendance } })
      setStep(STEP.SUMMARY)
      localStorage.setItem('ct_last_attendance_date', selectedDate)
    } catch (err) { alert('Failed to save: ' + err.message) }
    finally { setSavingFT(false) }
  }

  // Flush offline queue
  useEffect(() => {
    async function flush() {
      const q = JSON.parse(localStorage.getItem('ct_offline_queue') ?? '[]')
      if (!q.length) return
      const rem = []
      for (const item of q) {
        try { if (!(await fetch('/api/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })).ok) rem.push(item) }
        catch { rem.push(item) }
      }
      localStorage.setItem('ct_offline_queue', JSON.stringify(rem))
    }
    window.addEventListener('online', flush); flush()
    return () => window.removeEventListener('online', flush)
  }, [])

  return (
    <div style={{ minHeight: '100dvh', background: '#f7f5f0' }}>
      {step === STEP.GROUP  && <StepGroup groups={groups} sessionsByGroup={sessionsByGroup} firstTimers={firstTimers} onSelect={handleGroupSelect} onBack={() => router.push('/dashboard')} />}
      {step === STEP.DATE   && selectedGroup && <StepDate group={selectedGroup} church={church} onSelect={handleDateSelect} onBack={() => setStep(STEP.GROUP)} isFirstTimers={selectedGroup?.id === FIRST_TIMERS_ID} />}
      {step === STEP.MARK   && selectedGroup && selectedDate && (
        selectedGroup.id === FIRST_TIMERS_ID
          ? <StepMarkFirstTimers firstTimers={firstTimers} attendance={ftAttendance} date={selectedDate} saving={savingFT} onToggle={id => setFtAttendance(p => ({ ...p, [id]: !p[id] }))} onSave={handleSaveFirstTimers} onBack={() => setStep(STEP.GROUP)} />
          : <StepMark group={selectedGroup} date={selectedDate} members={members} attendance={attendance} loading={loadingMembers} saving={saving} onToggle={toggleMember} onSave={handleSave} onBack={() => setStep(STEP.DATE)} firstTimers={firstTimers} ftAttendance={ftAttendance} onToggleFT={id => setFtAttendance(p => ({ ...p, [id]: !p[id] }))} />
      )}
      {step === STEP.SUMMARY && savedResult && <StepSummary group={selectedGroup} date={selectedDate} members={members} attendance={attendance} result={savedResult} onDone={() => router.push('/dashboard')} onEdit={() => setStep(STEP.MARK)} onViewAbsentees={() => router.push('/absentees')} />}
    </div>
  )
}

// ─── STEP 1 — Group Selection ─────────────────────────────────────────────────
function StepGroup({ groups, sessionsByGroup, onSelect, onBack, firstTimers = [] }) {
  const btn = { width: 38, height: 38, borderRadius: 11, background: '#fff', border: '1px solid rgba(26,58,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }
  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.625rem' }}>
        <button onClick={onBack} style={btn}><ChevL /></button>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 22, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Take Attendance</h1>
          <p style={{ fontSize: 13, color: '#5b7062', margin: '2px 0 0' }}>Select a group to begin</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 20, padding: '3rem 1.5rem', textAlign: 'center', border: '1px solid rgba(26,58,42,0.07)' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>👥</p>
          <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: '0 0 6px' }}>No groups yet</p>
          <p style={{ fontSize: 13, color: '#5b7062', marginBottom: 20, margin: '0 0 20px' }}>Create a group first to take attendance.</p>
          <a href="/groups" className="btn btn-primary">Go to Groups</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {groups.map(group => {
            const sessions = sessionsByGroup[group.id] ?? []
            const [latest, prev] = sessions
            const lR = latest ? attendanceRate(latest.attendance_records?.filter(r => r.present).length ?? 0, latest.attendance_records?.length ?? 0) : null
            const pR = prev   ? attendanceRate(prev.attendance_records?.filter(r => r.present).length   ?? 0, prev.attendance_records?.length   ?? 0) : null
            const trend = lR !== null && pR !== null ? getTrend(lR, pR) : null
            return (
              <button key={group.id} onClick={() => onSelect(group)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '1rem 1.125rem', background: '#fff', borderRadius: 18, border: '1px solid rgba(26,58,42,0.08)', cursor: 'pointer', boxShadow: '0 1px 4px rgba(26,58,42,0.06)', textAlign: 'left', transition: 'box-shadow 0.15s, transform 0.1s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,58,42,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(26,58,42,0.06)'; e.currentTarget.style.transform = '' }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(26,58,42,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a3a2a" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>{group.name}</p>
                  {group.leader && <p style={{ fontSize: 12, color: '#5b7062', margin: '2px 0 0' }}>{group.leader}</p>}
                </div>
                {lR !== null && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 22, fontWeight: 700, color: rateColor(lR), margin: 0, lineHeight: 1 }}>{lR}%</p>
                    {trend && <p style={{ fontSize: 11, color: trend.color, margin: '2px 0 0', fontWeight: 600 }}>{trend.symbol} {Math.abs(trend.delta)}%</p>}
                  </div>
                )}
                <ChevR />
              </button>
            )
          })}

          {firstTimers.length > 0 && (
            <button onClick={() => onSelect({ id: FIRST_TIMERS_ID, name: 'First Timers' })} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '1rem 1.125rem', background: '#fff', borderRadius: 18, border: '1.5px dashed rgba(201,168,76,0.5)', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.8)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.5)'}>
              <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(201,168,76,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.75"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#7a5c12', margin: 0 }}>First Timers</p>
                <p style={{ fontSize: 12, color: '#5b7062', margin: '2px 0 0' }}>{firstTimers.length} visitor{firstTimers.length !== 1 ? 's' : ''} registered</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7a5c12', background: 'rgba(201,168,76,0.15)', padding: '4px 10px', borderRadius: 8 }}>{firstTimers.length}</span>
              <ChevR />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── STEP 2 — Date Selection ──────────────────────────────────────────────────
function StepDate({ group, church, onSelect, onBack, isFirstTimers }) {
  const [selDate,     setSelDate]     = useState('')
  const [customDate,  setCustomDate]  = useState('')
  const [checking,    setChecking]    = useState(false)
  const [existingMap, setExistingMap] = useState({})

  const thisSunday = toISODate(getLastSunday())
  const lastSunday = toISODate(getPrevSunday())

  useEffect(() => { setSelDate(thisSunday); checkDate(thisSunday) }, []) // eslint-disable-line

  async function checkDate(date) {
    if (existingMap[date] !== undefined) return existingMap[date]
    try {
      const url = isFirstTimers
        ? `/api/attendance/firsttimers?date=${date}`
        : `/api/attendance/check?groupId=${group.id}&date=${date}`
      const sid = (await (await fetch(url)).json()).sessionId ?? false
      setExistingMap(prev => ({ ...prev, [date]: sid }))
      return sid
    } catch { return false }
  }

  const handleQuickTap = (date) => { setSelDate(date); setCustomDate(''); checkDate(date) }
  const handleGo = async () => {
    const date = selDate || customDate
    if (!date) return
    setChecking(true)
    try { onSelect(date, (await checkDate(date)) || null) } finally { setChecking(false) }
  }

  const activeDate = selDate || customDate
  const hasExisting = !!(existingMap[activeDate])

  const cardS = (active) => ({
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1rem 1.25rem', borderRadius: 18, border: 'none', cursor: 'pointer',
    textAlign: 'left', transition: 'all 0.18s', fontFamily: 'inherit',
    background: active ? '#1a3a2a' : '#fff',
    boxShadow: active ? '0 6px 24px rgba(26,58,42,0.28)' : '0 1px 4px rgba(26,58,42,0.07)',
    outline: active ? 'none' : '1px solid rgba(26,58,42,0.08)',
  })

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.625rem' }}>
        <button onClick={onBack} style={{ width: 38, height: 38, borderRadius: 11, background: '#fff', border: '1px solid rgba(26,58,42,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevL /></button>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>{group.name}</h1>
          <p style={{ fontSize: 13, color: '#5b7062', margin: '2px 0 0' }}>Choose a date</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.375rem' }}>
        {[{ date: thisSunday, label: 'This Sunday' }, { date: lastSunday, label: 'Last Sunday' }].map(({ date, label }) => {
          const active = selDate === date
          return (
            <button key={date} onClick={() => handleQuickTap(date)} style={cardS(active)}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: active ? '#e8d5a0' : '#1a3a2a', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 12, color: active ? 'rgba(232,213,160,0.55)' : '#5b7062', margin: '3px 0 0' }}>{fmtDate(date)}</p>
              </div>
              {existingMap[date]
                ? <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(201,168,76,0.2)', color: '#7a5c12', padding: '4px 10px', borderRadius: 7 }}>Edit existing</span>
                : active && <span style={{ fontSize: 12, color: '#c9a84c', fontWeight: 700 }}>Selected ✓</span>}
            </button>
          )
        })}
        <div style={{ background: '#fff', borderRadius: 18, padding: '1rem 1.25rem', border: '1px solid rgba(26,58,42,0.08)', boxShadow: '0 1px 4px rgba(26,58,42,0.06)' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', margin: '0 0 10px' }}>Custom date</p>
          <input type="date" className="input" value={customDate} onChange={e => { setCustomDate(e.target.value); setSelDate(''); if (e.target.value) checkDate(e.target.value) }} max={toISODate(new Date())} />
        </div>
      </div>

      {hasExisting && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 14, marginBottom: '1.125rem', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
          <span style={{ fontSize: 18 }}>✏️</span>
          <p style={{ fontSize: 13, color: '#1a3a2a', fontWeight: 500, margin: 0 }}>Attendance already recorded for this date. You can edit it.</p>
        </div>
      )}

      <button onClick={handleGo} disabled={!activeDate || checking} className="btn btn-primary btn-lg" style={{ width: '100%', height: 54, fontSize: 15, borderRadius: 16, background: hasExisting ? 'linear-gradient(135deg,#7a5c12,#c9a84c)' : 'linear-gradient(135deg,#1a3a2a,#2d5a42)', opacity: !activeDate ? 0.5 : 1 }}>
        {checking ? <Spin />
          : !activeDate ? 'Select a date first'
          : isFirstTimers ? (hasExisting ? `Edit First Timers — ${fmtDate(activeDate)}` : `Mark First Timers — ${fmtDate(activeDate)}`)
          : (hasExisting ? `Edit Attendance — ${fmtDate(activeDate)}` : `Take Attendance — ${fmtDate(activeDate)}`)
        }
      </button>
    </div>
  )
}

// ─── STEP 3 — Mark Attendance ─────────────────────────────────────────────────
function StepMark({ group, date, members, attendance, loading, saving, onToggle, onSave, onBack, firstTimers = [], ftAttendance = {}, onToggleFT }) {
  const [search,     setSearch]     = useState('')
  const [viewFilter, setViewFilter] = useState('all') // 'all' | 'absent' | 'away'

  // Split members: away vs regular
  const awayMembers   = useMemo(() => members.filter(m => m.status === 'away'), [members])
  const activeMembers = useMemo(() => members.filter(m => m.status !== 'away'), [members])

  const memberPresent = useMemo(() => activeMembers.filter(m => attendance[m.id]).length, [activeMembers, attendance])
  const absentCount   = activeMembers.length - memberPresent
  const rate          = activeMembers.length > 0 ? Math.round((memberPresent / activeMembers.length) * 100) : 0
  const progress      = activeMembers.length > 0 ? (memberPresent / activeMembers.length) * 100 : 0
  const rateCol       = rate >= 70 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'

  const q = search.toLowerCase()
  const filteredFT   = useMemo(() => firstTimers.filter(ft => ft.name.toLowerCase().includes(q)), [firstTimers, q])
  const filteredMain = useMemo(() => {
    let base
    if (viewFilter === 'away')   base = awayMembers
    else if (viewFilter === 'absent') base = activeMembers.filter(m => !(attendance[m.id]))
    else                          base = activeMembers
    return base.filter(m => m.name.toLowerCase().includes(q))
  }, [viewFilter, awayMembers, activeMembers, attendance, q])

  const showFT = viewFilter === 'all' // First Timers only shown in 'all' view

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f7f5f0' }}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff', borderBottom: '1px solid rgba(26,58,42,0.08)' }}>
        {/* Row 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 6px' }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(26,58,42,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><ChevL /></button>
          <p style={{ flex: 1, fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: 0, fontFamily: 'var(--font-playfair),Georgia,serif' }}>Attendance</p>
          <span style={{ fontSize: 12, color: '#5b7062', flexShrink: 0 }}>
            {new Date(date + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        {/* Group + service */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 10px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>{group.name}</p>
        </div>
        {/* Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 12px' }}>
          <div style={{ minWidth: 52 }}>
            <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 28, fontWeight: 700, color: '#1a3a2a', margin: 0, lineHeight: 1 }}>{memberPresent}</p>
            <p style={{ fontSize: 10, color: '#5b7062', margin: '3px 0 0', fontWeight: 600 }}>Present</p>
          </div>
          <div style={{ width: 1, height: 34, background: 'rgba(26,58,42,0.1)', flexShrink: 0 }} />
          <div style={{ minWidth: 52 }}>
            <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 28, fontWeight: 700, color: '#dc2626', margin: 0, lineHeight: 1 }}>{absentCount}</p>
            <p style={{ fontSize: 10, color: '#5b7062', margin: '3px 0 0', fontWeight: 600 }}>Absent</p>
          </div>
          <div style={{ width: 1, height: 34, background: 'rgba(26,58,42,0.1)', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="34" height="34" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="#f0ede7" strokeWidth="6"/>
              {activeMembers.length > 0 && <circle cx="18" cy="18" r="14" fill="none" stroke={rateCol} strokeWidth="6" strokeDasharray={`${(rate / 100) * 87.96} 87.96`} strokeDashoffset="21.99" strokeLinecap="round"/>}
            </svg>
            <div>
              <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: rateCol, margin: 0, lineHeight: 1 }}>{rate}%</p>
              <p style={{ fontSize: 10, color: '#5b7062', margin: '2px 0 0', fontWeight: 600 }}>Attendance rate</p>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div style={{ height: 4, background: '#f0ede7', margin: '0 16px', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', background: '#16a34a', borderRadius: 2, width: `${progress}%`, transition: 'width 0.25s ease' }} />
        </div>
        {/* Search */}
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#5b7062', display: 'flex', pointerEvents: 'none' }}><SearchIco /></span>
            <input type="search" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', height: 40, borderRadius: 12, border: '1px solid rgba(26,58,42,0.14)', background: '#f7f5f0', paddingLeft: 34, paddingRight: 12, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', color: '#1a3a2a', boxSizing: 'border-box' }} />
          </div>
        </div>
        {/* Tabs: All | Absent | Away */}
        <div style={{ display: 'flex', margin: '0 16px 12px', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(26,58,42,0.1)' }}>
          {[
            { key: 'all',    label: `All (${activeMembers.length})` },
            { key: 'absent', label: `Absent (${absentCount})` },
            { key: 'away',   label: `Away (${awayMembers.length})` },
          ].map(({ key, label }, i) => {
            const active = viewFilter === key
            return (
              <button key={key} onClick={() => setViewFilter(key)} style={{ flex: 1, height: 36, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, transition: 'all 0.15s', background: active ? '#1a3a2a' : 'transparent', color: active ? '#fff' : '#5b7062', borderRight: i < 2 ? '1px solid rgba(26,58,42,0.1)' : 'none' }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Member list ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {loading ? (
          <div>{[...Array(7)].map((_, i) => <SkeletonRow key={i} />)}</div>
        ) : filteredMain.length === 0 && (!showFT || filteredFT.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#5b7062' }}>
            {viewFilter === 'away' && awayMembers.length === 0
              ? 'No members are currently marked away'
              : search ? `No members matching "${search}"` : 'No members in this view'
            }
          </div>
        ) : (
          <div style={{ paddingBottom: `calc(80px + env(safe-area-inset-bottom,0px))` }}>

            {/* ── First Timers at TOP when in 'all' view ── */}
            {showFT && filteredFT.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px', background: 'rgba(201,168,76,0.05)' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.3)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7a5c12', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>⭐ FIRST TIMERS ({filteredFT.length})</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.3)' }} />
                </div>
                {filteredFT.map((ft, i) => {
                  const isPresent = ftAttendance[ft.id] ?? false
                  const av = getAv(ft.name)
                  return (
                    <button key={'ft_' + ft.id} onClick={() => onToggleFT?.(ft.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isPresent ? 'rgba(201,168,76,0.04)' : '#fff', borderBottom: '1px solid rgba(26,58,42,0.06)', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.1s' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{av.initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14.5, fontWeight: 600, color: '#7a5c12', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ft.name}</p>
                        {ft.phone && <p style={{ fontSize: 11.5, color: '#5b7062', margin: '2px 0 0' }}>{ft.phone}</p>}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: isPresent ? 'rgba(201,168,76,0.15)' : 'rgba(26,58,42,0.06)', color: isPresent ? '#7a5c12' : '#5b7062', flexShrink: 0 }}>{isPresent ? 'Present' : 'Absent'}</span>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPresent ? '#c9a84c' : 'rgba(26,58,42,0.07)', flexShrink: 0 }}>
                        {isPresent ? <CheckSvg size={13} color="#fff" /> : <span style={{ fontSize: 12, color: '#5b7062' }}>—</span>}
                      </div>
                    </button>
                  )
                })}
                {/* Separator before regular members */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px', background: '#fafaf9' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(26,58,42,0.08)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#5b7062', letterSpacing: '0.06em' }}>MEMBERS ({activeMembers.length})</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(26,58,42,0.08)' }} />
                </div>
              </>
            )}

            {/* ── Away members header (only in away tab) ── */}
            {viewFilter === 'away' && awayMembers.length > 0 && (
              <div style={{ padding: '10px 16px 8px', background: 'rgba(217,119,6,0.04)', borderBottom: '1px solid rgba(217,119,6,0.12)' }}>
                <p style={{ fontSize: 12, color: '#d97706', fontWeight: 600, margin: 0 }}>
                  These members are marked as Away and won't be included in attendance records.
                </p>
              </div>
            )}

            {/* ── Main member rows ── */}
            {filteredMain.map((member, i) => {
              const isPresent = attendance[member.id] ?? false
              const isAway    = member.status === 'away'
              const av = getAv(member.name)
              return (
                <button key={member.id} onClick={() => !isAway && onToggle(member.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: isPresent ? 'rgba(22,163,74,0.03)' : '#fff',
                  borderBottom: i < filteredMain.length - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none',
                  border: 'none', cursor: isAway ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.1s',
                }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: isAway ? '#f0ede7' : av.bg, color: isAway ? '#5b7062' : av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                    {av.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14.5, fontWeight: 600, color: isAway ? '#5b7062' : '#1a3a2a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</p>
                    <p style={{ fontSize: 11.5, color: '#5b7062', margin: '2px 0 0' }}>
                      {isAway ? 'Away' : group.name}
                    </p>
                  </div>
                  {isAway ? (
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#d97706', background: 'rgba(217,119,6,0.1)', padding: '4px 10px', borderRadius: 8, flexShrink: 0 }}>Away</span>
                  ) : (
                    <>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: isPresent ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.07)', color: isPresent ? '#16a34a' : '#dc2626', flexShrink: 0 }}>
                        {isPresent ? 'Present' : 'Absent'}
                      </span>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPresent ? '#16a34a' : 'rgba(220,38,38,0.12)', transition: 'background 0.15s', flexShrink: 0 }}>
                        {isPresent
                          ? <CheckSvg size={13} color="#fff" />
                          : <svg width="11" height="11" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#dc2626" strokeWidth="2" opacity="0.5"/></svg>
                        }
                      </div>
                    </>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Fixed save bar ─────────────────────────────────────────────────── */}
      {/* Hide the shell bottom nav while marking — reclaims ~62px of screen */}
      <style>{`
        @media(max-width:1023px){ .shell-bottom-nav{ display:none !important; } }
        @media(min-width:1024px){ .att-bar{ left:${SIDEBAR_W}px !important; } }
      `}</style>
      <div className="att-bar" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid rgba(26,58,42,0.1)', padding: `10px 16px calc(12px + env(safe-area-inset-bottom,0px))`, zIndex: 110 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#5b7062', fontWeight: 500, margin: 0, flexShrink: 0 }}>
            <span style={{ color: '#1a3a2a', fontWeight: 700 }}>{memberPresent} present</span> · {absentCount} absent
          </p>
          <button onClick={onSave} disabled={saving || loading || activeMembers.length === 0} className="btn btn-primary"
            style={{ height: 44, paddingLeft: 20, paddingRight: 20, fontSize: 14, borderRadius: 13, background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)', flexShrink: 0, gap: 6 }}>
            {saving ? <><Spin /> Saving…</> : 'Save Attendance →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── STEP 3b — Mark First Timers ─────────────────────────────────────────────
function StepMarkFirstTimers({ firstTimers, attendance, date, saving, onToggle, onSave, onBack }) {
  const [search, setSearch] = useState('')
  const filtered     = firstTimers.filter(ft => ft.name.toLowerCase().includes(search.toLowerCase()))
  const presentCount = Object.values(attendance).filter(Boolean).length

  if (firstTimers.length === 0) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(26,58,42,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevL /></button>
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>First Timers</h1>
        </div>
        <div style={{ background: '#fff', borderRadius: 20, padding: '3rem 1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>👋</p>
          <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: '0 0 6px' }}>No first timers yet</p>
          <p style={{ fontSize: 13, color: '#5b7062', margin: 0 }}>Add them on the First Timers page first.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f7f5f0' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#fff', borderBottom: '1px solid rgba(26,58,42,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px 8px' }}>
          <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(26,58,42,0.06)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ChevL /></button>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#7a5c12', margin: 0, fontFamily: 'var(--font-playfair),Georgia,serif' }}>First Timers</p>
            <p style={{ fontSize: 12, color: '#5b7062', margin: '2px 0 0' }}>{fmtDate(date)}</p>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(22,163,74,0.1)', color: '#16a34a', padding: '4px 10px', borderRadius: 8 }}>{presentCount} present</span>
        </div>
        <div style={{ height: 4, background: '#f0ede7', margin: '0 16px', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', background: '#c9a84c', borderRadius: 2, width: firstTimers.length > 0 ? `${(presentCount / firstTimers.length) * 100}%` : '0%', transition: 'width 0.25s ease' }} />
        </div>
        <div style={{ padding: '0 16px 12px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 27, top: '50%', transform: 'translateY(-50%)', color: '#5b7062', pointerEvents: 'none', display: 'flex', marginTop: -6 }}><SearchIco /></span>
          <input type="search" placeholder="Search first timers…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', height: 40, borderRadius: 12, border: '1px solid rgba(26,58,42,0.14)', background: '#f7f5f0', paddingLeft: 34, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', color: '#1a3a2a', boxSizing: 'border-box' }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        <div style={{ paddingBottom: `calc(80px + env(safe-area-inset-bottom,0px))` }}>
          {filtered.map((ft, i) => {
            const isPresent = attendance[ft.id] ?? false
            const av = getAv(ft.name)
            return (
              <button key={ft.id} onClick={() => onToggle(ft.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isPresent ? 'rgba(201,168,76,0.04)' : '#fff', borderBottom: i < filtered.length - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{av.initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14.5, fontWeight: 600, color: '#7a5c12', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ft.name}</p>
                  {ft.phone && <p style={{ fontSize: 11.5, color: '#5b7062', margin: '2px 0 0' }}>{ft.phone}</p>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 8, background: isPresent ? 'rgba(201,168,76,0.15)' : 'rgba(26,58,42,0.06)', color: isPresent ? '#7a5c12' : '#5b7062', flexShrink: 0 }}>{isPresent ? 'Present' : 'Absent'}</span>
                <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isPresent ? '#c9a84c' : 'rgba(26,58,42,0.07)', flexShrink: 0 }}>
                  {isPresent ? <CheckSvg size={13} color="#fff" /> : <span style={{ fontSize: 12, color: '#5b7062' }}>—</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <style>{`
        @media(max-width:1023px){ .shell-bottom-nav{ display:none !important; } }
        @media(min-width:1024px){ .att-bar-ft{ left:${SIDEBAR_W}px !important; } }
      `}</style>
      <div className="att-bar-ft" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid rgba(26,58,42,0.1)', padding: `10px 16px calc(12px + env(safe-area-inset-bottom,0px))`, zIndex: 110 }}>
        <button onClick={onSave} disabled={saving} className="btn btn-primary" style={{ width: '100%', height: 50, fontSize: 14, borderRadius: 14, background: 'linear-gradient(135deg,#7a5c12,#c9a84c)' }}>
          {saving ? <><Spin /> Saving…</> : `Save — ${presentCount} Present · ${firstTimers.length - presentCount} Absent`}
        </button>
      </div>
    </div>
  )
}

// ─── STEP 4 — Summary ─────────────────────────────────────────────────────────
function StepSummary({ group, date, members, attendance, result, onDone, onEdit, onViewAbsentees }) {
  const [showAllPresent, setShowAllP] = useState(false)
  const [showAllAbsent,  setShowAllA] = useState(false)
  const PREVIEW = 5

  const allMembers    = result.isFirstTimers ? (result.ftMembers    ?? []) : members.filter(m => m.status !== 'away')
  const allAttendance = result.isFirstTimers ? (result.ftAttendance ?? {}) : attendance

  const presentMembers = allMembers.filter(m =>  allAttendance[m.id])
  const absentMembers  = allMembers.filter(m => !allAttendance[m.id])
  const rate = attendanceRate(presentMembers.length, allMembers.length)
  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="page-content" style={{ paddingBottom: '3rem' }}>
      {/* Hero card */}
      <div style={{ background: '#fff', borderRadius: 24, padding: '2.5rem 1.5rem 2rem', textAlign: 'center', border: '1px solid rgba(26,58,42,0.07)', boxShadow: '0 2px 12px rgba(26,58,42,0.07)', marginBottom: '1.125rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden>
          {[...Array(12)].map((_, i) => <div key={i} style={{ position: 'absolute', top: '30%', left: '50%', width: 2, height: 36, borderRadius: 2, transformOrigin: '0 0', transform: `rotate(${i * 30}deg) translateY(-80px)`, background: i % 3 === 0 ? 'rgba(201,168,76,0.3)' : i % 3 === 1 ? 'rgba(22,163,74,0.2)' : 'rgba(26,58,42,0.1)' }} />)}
        </div>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', boxShadow: '0 8px 28px rgba(22,163,74,0.35)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 28, fontWeight: 700, color: '#1a3a2a', margin: '0 0 6px' }}>Attendance Saved!</h2>
        <p style={{ fontSize: 13.5, color: '#5b7062', margin: '0 0 1.5rem', fontWeight: 500 }}>{group?.name ?? 'First Timers'} · {dateStr}</p>
        {result.offline && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'rgba(217,119,6,0.1)', color: '#d97706', fontSize: 12.5, fontWeight: 600, marginBottom: '1rem' }}>Saved offline — syncing when back online</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.375rem' }}>
          {[
            { label: 'Present', value: presentMembers.length, color: '#1a3a2a', bg: 'rgba(26,58,42,0.07)' },
            { label: 'Absent',  value: absentMembers.length,  color: '#dc2626', bg: 'rgba(220,38,38,0.07)' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: '#f7f5f0', borderRadius: 16, padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 30, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 11, color: '#5b7062', margin: '3px 0 0', fontWeight: 600 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: absentMembers.length > 0 ? '1.25rem' : 0 }}>
          <DonutRing rate={rate} size={110} />
          <p style={{ fontSize: 13, fontWeight: 600, color: '#1a3a2a', margin: '4px 0 0' }}>Attendance Rate</p>
        </div>
        {absentMembers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fff8f0', borderRadius: 14, padding: '12px 14px', textAlign: 'left', border: '1px solid rgba(217,119,6,0.15)' }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🙏</span>
            <p style={{ fontSize: 13, color: '#1a3a2a', margin: 0, lineHeight: 1.5 }}><strong>{absentMembers.length} {absentMembers.length === 1 ? 'person' : 'people'}</strong> weren't in church today. Follow up with them to keep them connected.</p>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.25rem' }}>
        {absentMembers.length > 0 && <button onClick={onViewAbsentees} className="btn btn-primary" style={{ height: 52, fontSize: 15, borderRadius: 16 }}>View Absentees →</button>}
        <button onClick={onDone} className="btn btn-outline" style={{ height: 50, fontSize: 14, borderRadius: 16 }}>Back to Dashboard</button>
      </div>
      {/* Present list */}
      {presentMembers.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(26,58,42,0.07)', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid rgba(26,58,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} /><p style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', margin: 0 }}>Present</p></div>
            <span style={{ fontSize: 12, color: '#5b7062' }}>{presentMembers.length}</span>
          </div>
          {(showAllPresent ? presentMembers : presentMembers.slice(0, PREVIEW)).map((m, i, arr) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(26,58,42,0.05)' : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: '#1a3a2a' }}>{m.name}</span>
            </div>
          ))}
          {presentMembers.length > PREVIEW && <button onClick={() => setShowAllP(v => !v)} style={{ width: '100%', padding: '10px', background: '#f7f5f0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#16a34a', fontFamily: 'inherit' }}>{showAllPresent ? 'Show less' : `Show all ${presentMembers.length} →`}</button>}
        </div>
      )}
      {/* Absent list */}
      {absentMembers.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(26,58,42,0.07)', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: '1px solid rgba(26,58,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} /><p style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', margin: 0 }}>Absent</p></div>
            <span style={{ fontSize: 12, color: '#5b7062' }}>{absentMembers.length}</span>
          </div>
          {(showAllAbsent ? absentMembers : absentMembers.slice(0, PREVIEW)).map((m, i, arr) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(26,58,42,0.05)' : 'none' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: '#1a3a2a' }}>{m.name}</span>
            </div>
          ))}
          {absentMembers.length > PREVIEW && <button onClick={() => setShowAllA(v => !v)} style={{ width: '100%', padding: '10px', background: '#f7f5f0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#dc2626', fontFamily: 'inherit' }}>{showAllAbsent ? 'Show less' : `Show all ${absentMembers.length} →`}</button>}
        </div>
      )}
      <button onClick={onEdit} style={{ width: '100%', marginTop: 10, padding: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#5b7062', fontFamily: 'inherit' }}>Edit Attendance</button>
    </div>
  )
}