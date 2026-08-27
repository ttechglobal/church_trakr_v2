'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  fmtDate, attendanceRate, rateColor, getTrend,
  getLastSunday, getPrevSunday, toISODate, getAv
} from '@/lib/utils'
import { notifyAttendanceSubmitted, showLocalNotification } from '@/hooks/useNotifications'

// ─── Step constants ────────────────────────────────────────────────────────────
const STEP = { GROUP: 1, DATE: 2, MARK: 3, SUMMARY: 4 }

// Sentinel ID used to identify the first-timers pseudo-group
const FIRST_TIMERS_ID = '__first_timers__'

// ─── Bottom nav height — must match AppShell.js BOTTOM_H ─────────────────────
// The save bar is lifted above the bottom nav by this amount on mobile.
const BOTTOM_NAV_H = 62 // px

// ─── Icons ────────────────────────────────────────────────────────────────────
function CheckIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}
function XIcon({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  )
}
function ChevronLeft({ className }) {
  return (
    <svg className={className ?? 'w-5 h-5'} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  )
}
function SearchIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}
function BarChart2({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function AttendanceFlow({
  church, groups, sessionsByGroup, preselectedGroupId, firstTimers = []
}) {
  const router = useRouter()
  const [step, setStep] = useState(preselectedGroupId ? STEP.DATE : STEP.GROUP)
  const [selectedGroup, setSelectedGroup] = useState(
    preselectedGroupId ? groups.find(g => g.id === preselectedGroupId) ?? null : null
  )
  const [selectedDate,    setSelectedDate]    = useState('')
  const [existingSessionId, setExistingSessionId] = useState(null)
  const [members,         setMembers]         = useState([])
  const [attendance,      setAttendance]      = useState({})
  const [loadingMembers,  setLoadingMembers]  = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [savingFT,        setSavingFT]        = useState(false)
  const [savedResult,     setSavedResult]     = useState(null)
  const [markMode,        setMarkMode]        = useState('all') // 'all' | 'absent'
  const [ftAttendance,    setFtAttendance]    = useState({})

  // Pre-select first group if only one and no preselectedGroupId
  useEffect(() => {
    if (!preselectedGroupId && groups.length === 1) {
      setSelectedGroup(groups[0])
      setStep(STEP.DATE)
    }
  }, []) // eslint-disable-line

  // ── Step 1 → 2: Group selected ──
  function handleGroupSelect(group) {
    setSelectedGroup(group)
    setStep(STEP.DATE)
  }

  // ── Step 2 → 3: Date selected ──
  async function handleDateSelect(date, existingId) {
    setSelectedDate(date)
    setExistingSessionId(existingId)

    if (selectedGroup?.id === FIRST_TIMERS_ID) {
      // For first timers, pre-load their existing attendance if any
      const initFt = {}
      for (const ft of firstTimers) initFt[ft.id] = false
      if (existingId) {
        try {
          const res = await fetch(`/api/attendance/firsttimers?date=${date}`)
          const data = await res.json()
          for (const r of (data.records ?? [])) {
            initFt[r.member_id] = r.present
          }
        } catch {}
      }
      setFtAttendance(initFt)
      setStep(STEP.MARK)
      return
    }

    setLoadingMembers(true)
    setStep(STEP.MARK)
    try {
      const res = await fetch(
        `/api/attendance/members?groupId=${selectedGroup.id}&churchId=${church.id}&date=${date}`
      )
      const data = await res.json()
      const memberList = data.members ?? []
      setMembers(memberList)

      let initial = {}
      if (data.existingRecords && data.existingRecords.length > 0) {
        for (const m of memberList) initial[m.id] = false
        for (const r of data.existingRecords) initial[r.member_id] = r.present
      } else {
        for (const m of memberList) initial[m.id] = false
      }
      setAttendance(initial)
    } catch (err) {
      console.error('Failed to load members', err)
    } finally {
      setLoadingMembers(false)
    }
  }

  // ── Step 3: Toggle member ──
  function toggleMember(memberId) {
    setAttendance(prev => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  // ── Step 3: Save attendance ──
  async function handleSave() {
    setSaving(true)

    const records = members.map(m => ({
      memberId: m.id,
      name: m.name,
      present: attendance[m.id] ?? false,
    }))

    const payload = {
      groupId: selectedGroup.id,
      date: selectedDate,
      records,
      existingSessionId: existingSessionId ?? undefined,
    }

    // Offline support: queue if no network
    if (!navigator.onLine) {
      const queue = JSON.parse(localStorage.getItem('ct_offline_queue') ?? '[]')
      queue.push({ ...payload, queuedAt: new Date().toISOString() })
      localStorage.setItem('ct_offline_queue', JSON.stringify(queue))
      setSaving(false)
      setSavedResult({ ...payload, sessionId: 'offline', offline: true })
      setStep(STEP.SUMMARY)
      return
    }

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')

      // Also save first-timer attendance if any FT exist
      const ftEntries = Object.keys(ftAttendance)
      if (firstTimers.length > 0 && ftEntries.length > 0) {
        const ftRecords = firstTimers.map(ft => ({
          memberId: ft.id,
          name:     ft.name,
          present:  ftAttendance[ft.id] ?? false,
        }))
        // Fire-and-forget — don't block main save on this
        fetch('/api/attendance/firsttimers', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ date: selectedDate, records: ftRecords }),
        }).catch(() => {})
      }

      setSavedResult(data)
      setStep(STEP.SUMMARY)

      localStorage.setItem('ct_last_attendance_date', selectedDate)

      try {
        const displayName = localStorage.getItem('ct_display_name') || 'A team member'
        const presentCount = records.filter(r => r.present).length
        const absentCount  = records.length - presentCount
        notifyAttendanceSubmitted(displayName, presentCount, absentCount)
      } catch {}
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── First-timers save ──
  async function handleSaveFirstTimers() {
    setSavingFT(true)
    const records = firstTimers.map(ft => ({
      memberId: ft.id,
      name:     ft.name,
      present:  ftAttendance[ft.id] ?? false,
    }))

    try {
      const res = await fetch('/api/attendance/firsttimers', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: selectedDate, records }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setSavedResult({
        ...data,
        isFirstTimers: true,
        ftMembers:    firstTimers,
        ftAttendance: { ...ftAttendance },
      })
      setStep(STEP.SUMMARY)
      localStorage.setItem('ct_last_attendance_date', selectedDate)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSavingFT(false)
    }
  }

  // ── Flush offline queue when back online ──
  useEffect(() => {
    async function flushQueue() {
      const queue = JSON.parse(localStorage.getItem('ct_offline_queue') ?? '[]')
      if (!queue.length) return
      const remaining = []
      for (const item of queue) {
        try {
          const res = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          })
          if (!res.ok) remaining.push(item)
        } catch {
          remaining.push(item)
        }
      }
      localStorage.setItem('ct_offline_queue', JSON.stringify(remaining))
    }
    window.addEventListener('online', flushQueue)
    flushQueue()
    return () => window.removeEventListener('online', flushQueue)
  }, [])

  return (
    <div className="min-h-dvh bg-ivory">
      {step === STEP.GROUP && (
        <StepGroup
          groups={groups}
          sessionsByGroup={sessionsByGroup}
          firstTimers={firstTimers}
          onSelect={handleGroupSelect}
          onBack={() => router.push('/dashboard')}
        />
      )}
      {step === STEP.DATE && selectedGroup && (
        <StepDate
          group={selectedGroup}
          church={church}
          onSelect={handleDateSelect}
          onBack={() => setStep(STEP.GROUP)}
          isFirstTimers={selectedGroup?.id === FIRST_TIMERS_ID}
        />
      )}
      {step === STEP.MARK && selectedGroup && selectedDate && (
        selectedGroup.id === FIRST_TIMERS_ID ? (
          <StepMarkFirstTimers
            firstTimers={firstTimers}
            attendance={ftAttendance}
            date={selectedDate}
            saving={savingFT}
            onToggle={id => setFtAttendance(p => ({ ...p, [id]: !p[id] }))}
            onSave={handleSaveFirstTimers}
            onBack={() => setStep(STEP.GROUP)}
          />
        ) : (
          <StepMark
            group={selectedGroup}
            date={selectedDate}
            members={members}
            attendance={attendance}
            markMode={markMode}
            loading={loadingMembers}
            saving={saving}
            onToggle={toggleMember}
            onSave={handleSave}
            onBack={() => setStep(STEP.DATE)}
            firstTimers={firstTimers}
            ftAttendance={ftAttendance}
            onToggleFT={id => setFtAttendance(p => ({ ...p, [id]: !p[id] }))}
          />
        )
      )}
      {step === STEP.SUMMARY && savedResult && (
        <StepSummary
          group={selectedGroup}
          date={selectedDate}
          members={members}
          attendance={attendance}
          result={savedResult}
          onDone={() => router.push('/dashboard')}
          onEdit={() => setStep(STEP.MARK)}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Group Selection
// ─────────────────────────────────────────────────────────────────────────────

function StepGroup({ groups, sessionsByGroup, onSelect, onBack, firstTimers = [] }) {
  return (
    <div className="page-content">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn-ghost btn-sm px-2">
          <ChevronLeft />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest">Take Attendance</h1>
          <p className="text-sm text-mist mt-0.5">Select a group</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">👥</p>
          <p className="font-medium text-forest">No groups yet</p>
          <p className="text-sm text-mist mt-1">Create a group first to take attendance.</p>
          <a href="/groups" className="btn-primary btn-sm mt-4 inline-flex">Go to Groups</a>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const sessions   = sessionsByGroup[group.id] ?? []
            const [latest, prev] = sessions
            const latestRate = latest
              ? attendanceRate(
                  latest.attendance_records?.filter(r => r.present).length ?? 0,
                  latest.attendance_records?.length ?? 0
                )
              : null
            const prevRate = prev
              ? attendanceRate(
                  prev.attendance_records?.filter(r => r.present).length ?? 0,
                  prev.attendance_records?.length ?? 0
                )
              : null
            const trend = latestRate !== null && prevRate !== null
              ? getTrend(latestRate, prevRate)
              : null

            return (
              <button
                key={group.id}
                onClick={() => onSelect(group)}
                className="card w-full text-left flex items-center gap-3 hover:shadow-md transition-shadow active:scale-[0.99]"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-forest text-[15px]">{group.name}</p>
                  {group.leader && (
                    <p className="text-xs text-mist mt-0.5">{group.leader}</p>
                  )}
                </div>
                {latestRate !== null && (
                  <div className="text-right shrink-0">
                    <p
                      className="font-display text-xl font-bold"
                      style={{ color: rateColor(latestRate) }}
                    >
                      {latestRate}%
                    </p>
                    {trend && (
                      <p className="text-xs" style={{ color: trend.color }}>
                        {trend.symbol} {Math.abs(trend.delta)}%
                      </p>
                    )}
                  </div>
                )}
                <ChevronLeft className="w-4 h-4 text-mist rotate-180 shrink-0" />
              </button>
            )
          })}

          {/* First Timers pseudo-group */}
          {firstTimers.length > 0 && (
            <button
              onClick={() => onSelect({ id: FIRST_TIMERS_ID, name: 'First Timers' })}
              className="card w-full text-left flex items-center gap-3 hover:shadow-md transition-shadow active:scale-[0.99]"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-forest text-[15px]">First Timers</p>
                <p className="text-xs text-mist mt-0.5">{firstTimers.length} visitors registered</p>
              </div>
              <span className="badge-gold text-[11px] shrink-0">{firstTimers.length}</span>
              <ChevronLeft className="w-4 h-4 text-mist rotate-180 shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Date Selection
// ─────────────────────────────────────────────────────────────────────────────

function StepDate({ group, church, onSelect, onBack, isFirstTimers }) {
  const [selectedDate, setSelectedDate] = useState('')
  const [customDate,   setCustomDate]   = useState('')
  const [checking,     setChecking]     = useState(false)
  const [existingMap,  setExistingMap]  = useState({})

  const thisSunday = toISODate(getLastSunday())
  const lastSunday = toISODate(getPrevSunday())

  // Auto-select this Sunday on mount
  useEffect(() => {
    setSelectedDate(thisSunday)
    checkDate(thisSunday)
  }, []) // eslint-disable-line

  async function checkDate(date) {
    if (existingMap[date] !== undefined) return existingMap[date]
    try {
      let sessionId = false
      if (isFirstTimers) {
        const res  = await fetch(`/api/attendance/firsttimers?date=${date}`)
        const data = await res.json()
        sessionId = data.sessionId ?? false
      } else {
        const res  = await fetch(`/api/attendance/check?groupId=${group.id}&date=${date}`)
        const data = await res.json()
        sessionId = data.sessionId ?? false
      }
      setExistingMap(prev => ({ ...prev, [date]: sessionId }))
      return sessionId
    } catch { return false }
  }

  async function handleQuickTap(date) {
    setSelectedDate(date)
    setCustomDate('')
    checkDate(date)
  }

  async function handleGo() {
    const date = selectedDate || customDate
    if (!date) return
    setChecking(true)
    try {
      const sessionId = await checkDate(date)
      onSelect(date, sessionId || null)
    } finally {
      setChecking(false)
    }
  }

  async function handleCustomChange(date) {
    setCustomDate(date)
    setSelectedDate('')
    if (date) checkDate(date)
  }

  const activeDate  = selectedDate || customDate
  const existingId  = existingMap[activeDate]
  const hasExisting = !!(existingId)

  return (
    <div className="page-content">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn-ghost btn-sm px-2">
          <ChevronLeft />
        </button>
        <div>
          <h1 className="font-display text-xl font-semibold text-forest">{group.name}</h1>
          <p className="text-sm text-mist mt-0.5">Select a date</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        {/* This Sunday */}
        <button
          onClick={() => handleQuickTap(thisSunday)}
          className="card w-full text-left flex items-center justify-between transition-all"
          style={selectedDate === thisSunday ? {
            background: '#1a3a2a', borderColor: '#1a3a2a',
            boxShadow: '0 4px 20px rgba(26,58,42,0.35)',
          } : {}}
        >
          <div>
            <p className="font-semibold" style={{ color: selectedDate === thisSunday ? '#e8d5a0' : undefined }}>
              This Sunday
            </p>
            <p className="text-xs mt-0.5" style={{ color: selectedDate === thisSunday ? 'rgba(232,213,160,0.6)' : undefined }}>
              {fmtDate(thisSunday)}
            </p>
          </div>
          {existingMap[thisSunday]
            ? <span className="badge-gold text-[11px]">Edit existing</span>
            : selectedDate === thisSunday && <span style={{ fontSize: 11, color: '#c9a84c', fontWeight: 700 }}>Selected ✓</span>
          }
        </button>

        {/* Last Sunday */}
        <button
          onClick={() => handleQuickTap(lastSunday)}
          className="card w-full text-left flex items-center justify-between transition-all"
          style={selectedDate === lastSunday ? {
            background: '#1a3a2a', borderColor: '#1a3a2a',
            boxShadow: '0 4px 20px rgba(26,58,42,0.35)',
          } : {}}
        >
          <div>
            <p className="font-semibold" style={{ color: selectedDate === lastSunday ? '#e8d5a0' : undefined }}>
              Last Sunday
            </p>
            <p className="text-xs mt-0.5" style={{ color: selectedDate === lastSunday ? 'rgba(232,213,160,0.6)' : undefined }}>
              {fmtDate(lastSunday)}
            </p>
          </div>
          {existingMap[lastSunday]
            ? <span className="badge-gold text-[11px]">Edit existing</span>
            : selectedDate === lastSunday && <span style={{ fontSize: 11, color: '#c9a84c', fontWeight: 700 }}>Selected ✓</span>
          }
        </button>

        {/* Custom date */}
        <div className="card">
          <p className="text-sm font-medium text-forest mb-2">Custom date</p>
          <input
            type="date"
            className="input"
            value={customDate}
            onChange={e => handleCustomChange(e.target.value)}
            max={toISODate(new Date())}
          />
        </div>
      </div>

      {hasExisting && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl mb-4"
          style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)' }}>
          <span className="text-lg">✏️</span>
          <p className="text-sm text-forest font-medium">
            Attendance already recorded for this date. Tap below to edit it.
          </p>
        </div>
      )}

      <button
        onClick={handleGo}
        disabled={!activeDate || checking}
        className="btn btn-primary btn-lg w-full"
        style={{
          background: hasExisting
            ? 'linear-gradient(135deg,#a8862e,#c9a84c)'
            : 'linear-gradient(135deg,#1a3a2a,#2d5a42)',
          opacity: !activeDate ? 0.5 : 1,
        }}
      >
        {checking
          ? '…'
          : !activeDate
            ? 'Select a date first'
            : isFirstTimers
              ? hasExisting
                ? `Edit First Timers — ${fmtDate(activeDate)}`
                : `Mark First Timers — ${fmtDate(activeDate)}`
              : hasExisting
                ? `Edit Attendance — ${fmtDate(activeDate)}`
                : `Take Attendance — ${fmtDate(activeDate)}`
        }
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Mark Attendance
// ─────────────────────────────────────────────────────────────────────────────

function StepMark({
  group, date, members, attendance, markMode,
  loading, saving, onToggle, onSave, onBack,
  firstTimers = [], ftAttendance = {}, onToggleFT,
}) {
  const [search,  setSearch]  = useState('')
  const searchRef = useRef(null)

  const filtered       = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
  const filteredFT     = firstTimers.filter(ft => ft.name.toLowerCase().includes(search.toLowerCase()))
  const ftPresentCount = Object.values(ftAttendance).filter(Boolean).length
  const memberPresent  = Object.values(attendance).filter(Boolean).length
  const presentCount   = memberPresent + ftPresentCount
  const absentCount    = (members.length - memberPresent) + (firstTimers.length - ftPresentCount)
  const totalCount     = members.length + firstTimers.length
  const progress       = totalCount > 0 ? (presentCount / totalCount) * 100 : 0

  return (
    <div className="flex flex-col h-dvh bg-ivory">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-white" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button onClick={onBack} className="btn-ghost btn-sm px-2 shrink-0">
            <ChevronLeft />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-forest text-[15px] truncate">{group.name}</p>
            <p className="text-xs text-mist">{fmtDate(date)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="badge-green text-[11px]">{presentCount} present</span>
            <span className="badge-red text-[11px]">{absentCount} absent</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-ivory-deeper mx-4 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-success rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-mist w-4 h-4 pointer-events-none" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search members…"
              className="input pl-9 py-2.5 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minHeight: 40 }}
            />
          </div>
        </div>
      </div>

      {/* ── Member list ── */}
      {/* Scroll area — save bar is sticky so no large bottom padding needed */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {loading ? (
          <div className="space-y-2 pt-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-16 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-mist">
            {search ? `No members matching "${search}"` : 'No members in this group'}
          </div>
        ) : (
          <div className="space-y-1.5" style={{ paddingBottom: `calc(${BOTTOM_NAV_H}px + 64px + env(safe-area-inset-bottom, 0px))` }}>
            {filtered.map(member => {
              const isPresent = attendance[member.id] ?? false
              const av = getAv(member.name)
              return (
                <button
                  key={member.id}
                  onClick={() => onToggle(member.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border
                    transition-all duration-150 active:scale-[0.98] text-left
                    ${isPresent
                      ? 'bg-success/8 border-success/25 hover:bg-success/12'
                      : 'bg-white border-forest/10 hover:bg-ivory'
                    }`}
                >
                  <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>
                    {av.initials}
                  </div>
                  <span className="flex-1 font-medium text-forest text-[15px] truncate text-left">
                    {member.name}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors
                    ${isPresent
                      ? 'bg-success text-white'
                      : 'bg-ivory-deeper text-mist border border-forest/15'
                    }`}
                  >
                    {isPresent
                      ? <CheckIcon className="w-4 h-4" />
                      : <XIcon className="w-4 h-4" style={{ opacity: 0.5 }} />
                    }
                  </div>
                </button>
              )
            })}

            {/* ── First Timers section — appended to main list ── */}
            {firstTimers.length > 0 && (
              <>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 4px 6px' }}>
                  <div style={{ flex:1, height:1, background:'rgba(201,168,76,0.25)' }} />
                  <span style={{ fontSize:11, fontWeight:600, color:'#a8862e', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                    ⭐ First Timers ({filteredFT.length})
                  </span>
                  <div style={{ flex:1, height:1, background:'rgba(201,168,76,0.25)' }} />
                </div>
                {filteredFT.map(ft => {
                  const isPresent = ftAttendance[ft.id] ?? false
                  const av = getAv(ft.name)
                  return (
                    <button
                      key={'ft_' + ft.id}
                      onClick={() => onToggleFT && onToggleFT(ft.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border
                        transition-all duration-150 active:scale-[0.98] text-left
                        ${isPresent
                          ? 'bg-gold/8 border-gold/30 hover:bg-gold/12'
                          : 'bg-white border-gold/20 hover:bg-ivory'
                        }`}
                      style={{ borderStyle: 'dashed' }}
                    >
                      <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>
                        {av.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-forest text-[15px] truncate">{ft.name}</p>
                        {ft.phone && <p className="text-xs text-mist mt-0.5">{ft.phone}</p>}
                      </div>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors
                        ${isPresent
                          ? 'bg-gold text-white'
                          : 'bg-ivory-deeper text-mist border border-gold/20'
                        }`}
                      >
                        {isPresent
                          ? <CheckIcon className="w-4 h-4" />
                          : <XIcon className="w-4 h-4" style={{ opacity: 0.5 }} />
                        }
                      </div>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Fixed save bar — above bottom navbar, offset by sidebar on desktop ── */}
      <div className="attendance-save-bar">
        <button
          onClick={onSave}
          disabled={saving || loading || (members.length === 0 && firstTimers.length === 0)}
          className="btn-primary btn-lg w-full"
          style={{ background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)', minHeight: 52 }}
        >
          {saving ? (
            <span className="flex items-center gap-2"><Spinner /> Saving…</span>
          ) : (
            `Save Attendance — ${presentCount} Present · ${absentCount} Absent`
          )}
        </button>
      </div>
      <style>{`
        .attendance-save-bar {
          position: fixed;
          bottom: calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom, 0px));
          left: 248px;
          right: 0;
          padding: 10px 16px 12px;
          background: #fff;
          border-top: 1px solid rgba(26,58,42,0.1);
          box-shadow: 0 -4px 20px rgba(26,58,42,0.08);
          z-index: 110;
        }
        @media (max-width: 1023px) {
          .attendance-save-bar {
            left: 0;
          }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3b — Mark First Timers Attendance
// ─────────────────────────────────────────────────────────────────────────────

function StepMarkFirstTimers({ firstTimers, attendance, date, saving, onToggle, onSave, onBack }) {
  const [search,  setSearch]  = useState('')
  const searchRef = useRef(null)

  const filtered     = firstTimers.filter(ft => ft.name.toLowerCase().includes(search.toLowerCase()))
  const presentCount = Object.values(attendance).filter(Boolean).length

  if (firstTimers.length === 0) {
    return (
      <div className="page-content">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="btn-ghost btn-sm px-2 shrink-0">
            <ChevronLeft />
          </button>
          <h1 className="font-display text-xl font-semibold text-forest">First Timers</h1>
        </div>
        <div className="card text-center py-12">
          <p className="text-3xl mb-3">👋</p>
          <p className="font-medium text-forest mb-1">No first timers yet</p>
          <p className="text-sm text-mist">Add first timers on the First Timers page first.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh bg-ivory">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <button onClick={onBack} className="btn-ghost btn-sm px-2 shrink-0">
            <ChevronLeft />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-forest text-[15px]">First Timers</p>
            <p className="text-xs text-mist">{fmtDate(date)}</p>
          </div>
          <span className="badge-green text-[11px] shrink-0">{presentCount} present</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-ivory-deeper mx-4 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gold rounded-full transition-all duration-300"
            style={{ width: firstTimers.length > 0 ? `${(presentCount / firstTimers.length) * 100}%` : '0%' }}
          />
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-mist w-4 h-4 pointer-events-none" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search first timers…"
              className="input pl-9 py-2.5 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ minHeight: 40 }}
            />
          </div>
        </div>
      </div>

      {/* First timer list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="space-y-1.5" style={{ paddingBottom: `calc(${BOTTOM_NAV_H}px + 64px + env(safe-area-inset-bottom, 0px))` }}>
          {filtered.map(ft => {
            const isPresent = attendance[ft.id] ?? false
            const av = getAv(ft.name)
            return (
              <button
                key={ft.id}
                onClick={() => onToggle(ft.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border
                  transition-all duration-150 active:scale-[0.98] text-left
                  ${isPresent
                    ? 'bg-success/8 border-success/25'
                    : 'bg-white border-forest/10 hover:bg-ivory'
                  }`}
              >
                <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>
                  {av.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-forest text-[15px] truncate">{ft.name}</p>
                  {ft.phone && <p className="text-xs text-mist mt-0.5">{ft.phone}</p>}
                </div>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                  ${isPresent ? 'bg-success text-white' : 'bg-ivory-deeper text-mist border border-forest/15'}`}
                  style={isPresent ? {} : {}}
                >
                  {isPresent
                    ? <CheckIcon className="w-4 h-4" />
                    : <XIcon className="w-4 h-4" style={{ opacity: 0.5 }} />
                  }
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Fixed save bar ── */}
      <div className="attendance-save-bar">
        <button
          onClick={onSave}
          disabled={saving || firstTimers.length === 0}
          className="btn-primary btn-lg w-full"
          style={{ background: 'linear-gradient(135deg,#a8862e,#c9a84c)', minHeight: 52 }}
        >
          {saving ? (
            <span className="flex items-center gap-2"><Spinner /> Saving…</span>
          ) : (
            `Save Attendance — ${presentCount} Present · ${firstTimers.length - presentCount} Absent`
          )}
        </button>
      </div>
      <style>{`
        .attendance-save-bar {
          position: fixed;
          bottom: calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom, 0px));
          left: 248px;
          right: 0;
          padding: 10px 16px 12px;
          background: #fff;
          border-top: 1px solid rgba(26,58,42,0.1);
          box-shadow: 0 -4px 20px rgba(26,58,42,0.08);
          z-index: 110;
        }
        @media (max-width: 1023px) {
          .attendance-save-bar { left: 0; }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Summary
// ─────────────────────────────────────────────────────────────────────────────

function StepSummary({ group, date, members, attendance, result, onDone, onEdit }) {
  const router = useRouter()
  const [showAllPresent, setShowAllPresent] = useState(false)
  const [showAllAbsent,  setShowAllAbsent]  = useState(false)

  const PREVIEW = 5

  const allMembers    = result.isFirstTimers ? (result.ftMembers    ?? []) : members
  const allAttendance = result.isFirstTimers ? (result.ftAttendance ?? {}) : attendance

  const presentMembers = allMembers.filter(m =>  allAttendance[m.id])
  const absentMembers  = allMembers.filter(m => !allAttendance[m.id])
  const rate = attendanceRate(presentMembers.length, allMembers.length)

  const presentSlice = showAllPresent ? presentMembers : presentMembers.slice(0, PREVIEW)
  const absentSlice  = showAllAbsent  ? absentMembers  : absentMembers.slice(0, PREVIEW)

  return (
    <div className="page-content pb-10">

      {/* ── Header ── */}
      <div className="text-center py-6">
        <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
        <h2 className="font-display text-2xl font-bold text-forest">Attendance Saved</h2>
        <p className="text-sm text-mist mt-1">{group?.name ?? 'First Timers'} · {fmtDate(date)}</p>
        {result.offline && (
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>
            Saved offline — will sync when back online
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="flex gap-3 mb-2">
        <div className="flex-1 rounded-2xl py-4 text-center"
          style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' }}>
          <p className="font-display text-4xl font-bold text-success">{presentMembers.length}</p>
          <p className="text-xs text-mist mt-1 uppercase tracking-wide font-semibold">Present</p>
        </div>
        <div className="flex-1 rounded-2xl py-4 text-center"
          style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
          <p className="font-display text-4xl font-bold text-error">{absentMembers.length}</p>
          <p className="text-xs text-mist mt-1 uppercase tracking-wide font-semibold">Absent</p>
        </div>
        <div className="flex-1 rounded-2xl py-4 text-center"
          style={{ background: 'rgba(26,58,42,0.05)', border: '1px solid rgba(26,58,42,0.1)' }}>
          <p className="font-display text-4xl font-bold" style={{ color: rateColor(rate) }}>{rate}%</p>
          <p className="text-xs text-mist mt-1 uppercase tracking-wide font-semibold">Rate</p>
        </div>
      </div>
      <p className="text-xs text-mist text-center mb-5">out of {allMembers.length} members</p>

      {/* ── Present list ── */}
      {presentMembers.length > 0 && (
        <div className="card mb-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-success uppercase tracking-wide">Present</p>
            <p className="text-xs text-mist">
              {showAllPresent
                ? `all ${presentMembers.length}`
                : `showing ${Math.min(PREVIEW, presentMembers.length)} of ${presentMembers.length}`}
            </p>
          </div>
          <div className="space-y-0">
            {presentSlice.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 py-2 border-b border-forest/6 last:border-0">
                <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                <span className="text-sm text-forest">{m.name}</span>
              </div>
            ))}
          </div>
          {presentMembers.length > PREVIEW && (
            <button
              onClick={() => setShowAllPresent(v => !v)}
              className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-success transition-colors"
              style={{ background: 'rgba(22,163,74,0.07)' }}
            >
              {showAllPresent ? 'Show less' : `Show all ${presentMembers.length} present →`}
            </button>
          )}
        </div>
      )}

      {/* ── Absent list ── */}
      {absentMembers.length > 0 && (
        <div className="card mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-error uppercase tracking-wide">Absent</p>
            <p className="text-xs text-mist">
              {showAllAbsent
                ? `all ${absentMembers.length}`
                : `showing ${Math.min(PREVIEW, absentMembers.length)} of ${absentMembers.length}`}
            </p>
          </div>
          <div className="space-y-0">
            {absentSlice.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 py-2 border-b border-forest/6 last:border-0">
                <div className="w-2 h-2 rounded-full bg-error shrink-0" />
                <span className="text-sm text-forest">{m.name}</span>
              </div>
            ))}
          </div>
          {absentMembers.length > PREVIEW && (
            <button
              onClick={() => setShowAllAbsent(v => !v)}
              className="w-full mt-3 py-2.5 rounded-xl text-sm font-semibold text-error transition-colors"
              style={{ background: 'rgba(220,38,38,0.06)' }}
            >
              {showAllAbsent ? 'Show less' : `Show all ${absentMembers.length} absent →`}
            </button>
          )}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className="space-y-2.5">
        <button
          onClick={() => router.push('/report')}
          className="btn btn-primary w-full"
          style={{ height: 52, fontSize: 15 }}
        >
          Generate Report
        </button>
        {absentMembers.length > 0 && (
          <button
            onClick={() => router.push('/absentees')}
            className="btn w-full"
            style={{ height: 52, fontSize: 15, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            Follow Up Absentees
          </button>
        )}
        <button
          onClick={() => onEdit()}
          className="btn btn-outline w-full"
          style={{ height: 48, fontSize: 14 }}
        >
          Edit Attendance
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="btn w-full"
          style={{ height: 48, fontSize: 14, background: 'transparent', color: '#8a9e90', border: '1px solid rgba(26,58,42,0.15)' }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}