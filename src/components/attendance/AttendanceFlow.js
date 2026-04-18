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

export default function AttendanceFlow({
  church, groups, sessionsByGroup, preselectedGroupId, firstTimers = []
}) {
  const router = useRouter()
  const [step, setStep] = useState(preselectedGroupId ? STEP.DATE : STEP.GROUP)
  const [selectedGroup, setSelectedGroup] = useState(
    preselectedGroupId ? groups.find(g => g.id === preselectedGroupId) ?? null : null
  )
  const [selectedDate, setSelectedDate] = useState(null)
  const [members, setMembers] = useState([])
  const [attendance, setAttendance] = useState({}) // { memberId: boolean }
  const [markMode, setMarkMode] = useState('present') // 'present' | 'absent'
  const [existingSessionId, setExistingSessionId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savedResult, setSavedResult] = useState(null)
  const [loadingMembers, setLoadingMembers] = useState(false)
  // First-timers attendance state (separate from regular attendance)
  const [ftAttendance, setFtAttendance] = useState({})
  const [savingFT, setSavingFT] = useState(false)

  // Load mark mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ct_mark_mode')
    if (saved === 'present' || saved === 'absent') setMarkMode(saved)
  }, [])

  // ── Step 1: Group selected ──
  function handleGroupSelect(group) {
    setSelectedGroup(group)
    setStep(STEP.DATE)
    // First Timers goes through date step just like regular groups
    // so existing attendance can be loaded when editing
  }

  // ── Step 2: Date selected ──
  async function handleDateSelect(date, existingId = null) {
    setSelectedDate(date)
    setExistingSessionId(existingId)
    setLoadingMembers(true)

    try {
      if (selectedGroup.id === FIRST_TIMERS_ID) {
        // ── FIRST TIMERS path ──
        // Load existing FT attendance for this date from the dedicated API
        const res  = await fetch(`/api/attendance/firsttimers?date=${date}&churchId=${church.id}`)
        const data = await res.json()

        // Start all unmarked, then overlay existing records
        const init = {}
        firstTimers.forEach(ft => { init[ft.id] = false })
        if (data.records && data.records.length > 0) {
          for (const r of data.records) {
            if (r.member_id in init) init[r.member_id] = r.present
          }
          setExistingSessionId(data.sessionId)
        }
        setFtAttendance(init)
        setMembers([]) // not used for FT path
      } else {
        // ── Regular group path ──
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
      }
    } catch (err) {
      console.error('Failed to load members', err)
    } finally {
      setLoadingMembers(false)
    }

    setStep(STEP.MARK)
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
      setSavedResult(data)
      setStep(STEP.SUMMARY)

      // Mark today's date so afternoon reminder knows attendance was taken
      localStorage.setItem('ct_last_attendance_date', selectedDate)

      // Notify team that attendance was submitted
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

  // ── First-timers save ── mirrors handleSave exactly, uses dedicated API ──────
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
        // Provide members/attendance for the summary page
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

  // ── Online: flush offline queue ──
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
          {groups.map((group, i) => {
            const sessions = sessionsByGroup[group.id] ?? []
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
                className="card w-full text-left flex items-center gap-4 hover:shadow-card-hover transition-all
                  active:scale-[0.98] animate-slide-up animate-fill-both"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-ivory font-display font-bold text-base"
                  style={{ background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)' }}
                >
                  {group.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-forest text-[15px] truncate">{group.name}</p>
                  {group.leader && <p className="text-xs text-mist truncate">{group.leader}</p>}
                  {latest && (
                    <p className="text-xs text-mist mt-0.5">Last: {fmtDate(latest.date)}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {latestRate !== null && (
                    <p className={`font-display text-xl font-bold ${rateColor(latestRate)}`}>
                      {latestRate}%
                    </p>
                  )}
                  {trend && (
                    <p className={`text-sm font-semibold ${trend.color}`}>
                      {trend.symbol} {Math.abs(trend.delta)}%
                    </p>
                  )}
                  {latestRate === null && (
                    <p className="text-xs text-mist">No data</p>
                  )}
                </div>
                <ChevronRight className="text-mist shrink-0" />
              </button>
            )
          })}
        </div>
      )}

      {/* ── First Timers attendance card ── */}
      <button
        onClick={() => onSelect({ id: FIRST_TIMERS_ID, name: 'First Timers' })}
        className="card w-full text-left flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]"
        style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.04)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(201,168,76,0.15)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a8862e" strokeWidth="2" strokeLinecap="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-forest text-[15px]">First Timers</p>
          <p className="text-xs text-mist mt-0.5">
            {firstTimers.length > 0
              ? `${firstTimers.length} first timer${firstTimers.length !== 1 ? 's' : ''} · mark who came today`
              : 'No first timers recorded yet'}
          </p>
        </div>
        <div className="text-right shrink-0">
          {firstTimers.length > 0 && (
            <p className="font-display text-xl font-bold text-gold-dark">{firstTimers.length}</p>
          )}
        </div>
        <ChevronRight className="text-mist shrink-0" />
      </button>

      {/* ── Away Members link ── */}
      <a
        href="/away"
        className="card w-full text-left flex items-center gap-4 hover:shadow-card-hover transition-all active:scale-[0.98]"
        style={{ borderColor: 'rgba(217,119,6,0.2)', background: 'rgba(217,119,6,0.03)', textDecoration: 'none' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(217,119,6,0.1)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
            <path d="M3 17h1m16 0h1M6 11l-2.5 6M18 11l2.5 6M6 11h12l-1-6H7L6 11z"/>
            <circle cx="12" cy="5" r="2"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-forest text-[15px]">Away Members</p>
          <p className="text-xs text-mist mt-0.5">
            Manage members who are travelling or on leave
          </p>
        </div>
        <ChevronRight className="text-mist shrink-0" />
      </a>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Date Selection
// ─────────────────────────────────────────────────────────────────────────────

function StepDate({ group, church, onSelect, onBack, isFirstTimers = false }) {
  /*
    DO NOT CHANGE — date selection rules (permanent):
    - Tapping "This Sunday" / "Last Sunday" HIGHLIGHTS the button only.
    - It does NOT auto-navigate. User must tap "Take Attendance" / "Go" to proceed.
    - This prevents accidental navigation and gives a moment to confirm.
  */
  const [selectedDate, setSelectedDate] = useState('')
  const [customDate,   setCustomDate]   = useState('')
  const [checking,     setChecking]     = useState(false)
  const [existingMap,  setExistingMap]  = useState({}) // date → sessionId | false

  const thisSunday = toISODate(getLastSunday())
  const lastSunday = toISODate(getPrevSunday())

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

  // Highlight quick button — pre-check in background, but do NOT navigate yet
  async function handleQuickTap(date) {
    setSelectedDate(date)
    setCustomDate('')
    // Pre-fetch existence so Go is instant
    checkDate(date)
  }

  // Go button — now actually navigate
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

  const activeDate   = selectedDate || customDate
  const existingId   = existingMap[activeDate]
  const hasExisting  = !!existingId

  const quickDates = [
    { label: 'This Sunday', date: thisSunday },
    { label: 'Last Sunday', date: lastSunday },
  ]

  return (
    <div className="page-content">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn-ghost btn-sm px-2">
          <ChevronLeft />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest">{group.name}</h1>
          <p className="text-sm text-mist">Select a date then tap Go</p>
        </div>
      </div>

      {/* Quick tiles — tap to SELECT only, not to navigate */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {quickDates.map(({ label, date }) => {
          const isSelected = selectedDate === date
          const existing   = existingMap[date]
          return (
            <button
              key={date}
              onClick={() => handleQuickTap(date)}
              className="card text-left p-4 transition-all active:scale-[0.98]"
              style={{
                background:   isSelected ? '#1a3a2a' : '#ffffff',
                borderColor:  isSelected ? 'rgba(26,58,42,0.6)' : undefined,
                boxShadow:    isSelected ? 'var(--shadow-card-hover)' : undefined,
                transition:   'background 0.15s, box-shadow 0.15s',
              }}
            >
              <p style={{
                fontWeight: 600, fontSize: 15,
                color: isSelected ? '#ede9e0' : '#1a3a2a',
              }}>
                {label}
              </p>
              <p style={{
                fontSize: 12, marginTop: 4,
                color: isSelected ? 'rgba(237,233,224,0.6)' : '#8a9e90',
              }}>
                {fmtDate(date)}
              </p>
              {existing && (
                <span style={{
                  display: 'inline-block', marginTop: 8,
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: isSelected ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.15)',
                  color:      isSelected ? '#e8d5a0'               : '#a8862e',
                }}>
                  Edit existing
                </span>
              )}
              {isSelected && !existing && (
                <span style={{
                  display: 'inline-block', marginTop: 8,
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: 'rgba(237,233,224,0.15)', color: 'rgba(237,233,224,0.8)',
                }}>
                  ✓ Selected
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Custom date */}
      <div className="card mb-4">
        <p className="text-sm font-semibold text-forest mb-3">Custom date</p>
        <input
          type="date"
          className="input w-full"
          value={customDate}
          max={toISODate(new Date())}
          onChange={e => handleCustomChange(e.target.value)}
        />
        {customDate && existingMap[customDate] && (
          <p className="text-xs text-warning mt-2">
            ⚠️ Attendance already recorded — tapping Go will open it for editing.
          </p>
        )}
      </div>

      {/* Go button — always visible, only active when a date is selected */}
      <button
        onClick={handleGo}
        disabled={!activeDate || checking}
        className="btn-primary btn-lg w-full"
        style={{
          background: activeDate && !checking
            ? isFirstTimers
              ? 'linear-gradient(135deg,#a8862e,#c9a84c)'  // gold = first timers
              : hasExisting
                ? 'linear-gradient(135deg,#a8862e,#c9a84c)'  // gold = editing
                : 'linear-gradient(135deg,#1a3a2a,#2d5a42)'  // green = new
            : undefined,
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
  loading, saving, onToggle, onSave, onBack
}) {
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const presentCount = Object.values(attendance).filter(Boolean).length
  const absentCount = members.length - presentCount
  const progress = members.length > 0 ? (presentCount / members.length) * 100 : 0

  return (
    <div className="flex flex-col h-dvh bg-ivory">
      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-20 bg-white"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Row 1: back + title + mode */}
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

        {/* Search bar */}
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
          <div className="space-y-1.5 pb-28">
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
                  {/* Avatar */}
                  <div
                    className="avatar shrink-0"
                    style={{ background: av.bg, color: av.color }}
                  >
                    {av.initials}
                  </div>

                  {/* Name — left aligned */}
                  <span className="flex-1 font-medium text-forest text-[15px] truncate text-left">
                    {member.name}
                  </span>

                  {/*
                    DEFAULT STATE = X gray dot (card stays white/neutral).
                    PRESENT = green filled circle with checkmark.
                    DO NOT make the card red. Only the dot shows the absent state.
                  */}
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
          </div>
        )}
      </div>

      {/* ── Fixed bottom save bar ── */}
      <div
        className="fixed bottom-0 inset-x-0 bg-white px-4 pt-3 pb-4 safe-bottom"
        style={{ borderTop: '1px solid var(--border)', boxShadow: '0 -4px 20px rgba(26,58,42,0.08)' }}
      >
        <button
          onClick={onSave}
          disabled={saving || loading || members.length === 0}
          className="btn-primary btn-lg w-full"
          style={{ background: 'linear-gradient(135deg,#1a3a2a,#2d5a42)' }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Spinner /> Saving…
            </span>
          ) : (
            `Save · ${presentCount} present, ${absentCount} absent`
          )}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3b — Mark First Timers Attendance
// ─────────────────────────────────────────────────────────────────────────────

function StepMarkFirstTimers({ firstTimers, attendance, date, saving, onToggle, onSave, onBack }) {
  const [search, setSearch] = useState('')
  const searchRef = useRef(null)

  const filtered = firstTimers.filter(ft =>
    ft.name.toLowerCase().includes(search.toLowerCase())
  )

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
        {firstTimers.length > 6 && (
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
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="space-y-1.5 pb-28">
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
                    ? 'bg-gold/8 border-gold/30 hover:bg-gold/12'
                    : 'bg-white border-forest/10 hover:bg-ivory'
                  }`}
              >
                <div className="avatar shrink-0" style={{ background: av.bg, color: av.color }}>
                  {av.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-forest text-[15px] truncate block">
                    {ft.name}
                  </span>
                  {ft.date && (
                    <span className="text-xs text-mist">First visit: {fmtDate(ft.date)}</span>
                  )}
                </div>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0
                  ${isPresent
                    ? 'text-white'
                    : 'bg-forest/8 text-mist'
                  }`}
                  style={isPresent ? { background: '#c9a84c' } : {}}
                >
                  {isPresent
                    ? <CheckIcon className="w-4 h-4" />
                    : <XIcon className="w-4 h-4" />
                  }
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Save bar */}
      <div
        className="fixed bottom-0 inset-x-0 bg-white px-4 pt-3 pb-4 safe-bottom"
        style={{ borderTop: '1px solid var(--border)', boxShadow: '0 -4px 20px rgba(26,58,42,0.08)' }}
      >
        <button
          onClick={onSave}
          disabled={saving || firstTimers.length === 0}
          className="btn-primary btn-lg w-full"
          style={{ background: 'linear-gradient(135deg,#a8862e,#c9a84c)' }}
        >
          {saving ? (
            <span className="flex items-center gap-2"><Spinner /> Saving…</span>
          ) : (
            `Save · ${presentCount} of ${firstTimers.length} present`
          )}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4 — Summary
// ─────────────────────────────────────────────────────────────────────────────

function StepSummary({ group, date, members, attendance, result, onDone, onEdit }) {
  // For FT, use members from result; for regular, use members prop
  const allMembers = result.isFirstTimers ? (result.ftMembers ?? []) : members
  const allAttendance = result.isFirstTimers ? (result.ftAttendance ?? {}) : attendance

  const presentMembers = allMembers.filter(m => allAttendance[m.id])
  const absentMembers  = allMembers.filter(m => !allAttendance[m.id])
  const rate = attendanceRate(presentMembers.length, allMembers.length)

  return (
    <div className="page-content pb-10">
      {/* Stats card */}
      <div className="card text-center py-6 animate-slide-up animate-fill-both">
        <p className="text-sm text-mist mb-4">{group?.name ?? 'First Timers'} · {fmtDate(date)}</p>
        <RateRing rate={rate} size={110} />
        {/* Full breakdown — Total, Present, Absent */}
        <div className="flex justify-center gap-6 mt-5">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-forest">{allMembers.length}</p>
            <p className="text-xs text-mist mt-1 font-medium">Total</p>
          </div>
          <div className="w-px bg-ivory-deeper" />
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-success">{presentMembers.length}</p>
            <p className="text-xs text-mist mt-1 font-medium">Present</p>
          </div>
          <div className="w-px bg-ivory-deeper" />
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-error">{absentMembers.length}</p>
            <p className="text-xs text-mist mt-1 font-medium">Absent</p>
          </div>
        </div>
        {result.offline && (
          <p className="text-xs text-warning mt-4 bg-warning/10 rounded-lg px-3 py-2">
            Saved offline · Will sync when back online
          </p>
        )}
      </div>

      {/* Message attendees shortcut */}
      {presentMembers.length > 0 && !result.isFirstTimers && (
        <a
          href="/attendees"
          className="card flex items-center gap-3 hover:shadow-card-hover transition-shadow
            animate-slide-up animate-fill-both animate-stagger-1"
        >
          <div className="w-10 h-10 rounded-xl bg-forest/8 flex items-center justify-center text-xl">💬</div>
          <div className="flex-1">
            <p className="font-semibold text-forest text-[14px]">
              Message {presentMembers.length} attendee{presentMembers.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-mist mt-0.5">Send a thank-you message →</p>
          </div>
          <ChevronRight className="text-mist" />
        </a>
      )}

      {/* Present list */}
      <SummaryList
        title={`Present · ${presentMembers.length}`}
        members={presentMembers}
        color="success"
        defaultOpen={true}
        maxVisible={999}
      />

      {/* Absent list — collapsed with show more */}
      <SummaryList
        title={`Absent · ${absentMembers.length}`}
        members={absentMembers}
        color="error"
        defaultOpen={absentMembers.length <= 5}
        maxVisible={5}
      />

      {/* Action buttons */}
      <div className="flex gap-3 pb-8 animate-slide-up animate-fill-both animate-stagger-3">
        <button onClick={onEdit} className="btn-outline flex-1 btn-lg gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
        <button onClick={onDone} className="btn-primary flex-1 btn-lg">
          Done ✓
        </button>
      </div>
    </div>
  )
}

function SummaryList({ title, members, color, defaultOpen, maxVisible = 5 }) {
  const [open,     setOpen]     = useState(defaultOpen)
  const [showAll,  setShowAll]  = useState(false)

  const visible  = showAll ? members : members.slice(0, maxVisible)
  const hiddenCount = members.length - maxVisible
  const isSuccess   = color === 'success'

  return (
    <div className={`card overflow-hidden animate-slide-up animate-fill-both animate-stagger-2`}
      style={{ borderColor: isSuccess ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)' }}
    >
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between py-1"
      >
        <span className={`font-semibold text-[14px] ${isSuccess ? 'text-success' : 'text-error'}`}>
          {title}
        </span>
        <ChevronRight className={`text-mist transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-forest/8 mt-2 pt-2">
          {members.length === 0 ? (
            <p className="text-sm text-mist py-2">None</p>
          ) : (
            <>
              <div className="space-y-0">
                {visible.map((m, i) => {
                  const av = getAv(m.name)
                  return (
                    <div key={m.id}
                      className="flex items-center gap-3 py-2.5 px-1"
                      style={{ borderBottom: i < visible.length - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none' }}
                    >
                      <div className="avatar text-xs shrink-0"
                        style={{ background: av.bg, color: av.color, width: 30, height: 30, borderRadius: 9 }}>
                        {av.initials}
                      </div>
                      <span className="text-[14px] text-forest font-medium">{m.name}</span>
                      {isSuccess && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" className="ml-auto shrink-0">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  )
                })}
              </div>
              {!showAll && hiddenCount > 0 && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full mt-2 py-2 text-xs font-semibold text-forest-muted
                    hover:text-forest bg-ivory rounded-xl transition-colors"
                >
                  Show {hiddenCount} more ↓
                </button>
              )}
              {showAll && hiddenCount > 0 && (
                <button
                  onClick={() => setShowAll(false)}
                  className="w-full mt-2 py-2 text-xs font-semibold text-forest-muted
                    hover:text-forest bg-ivory rounded-xl transition-colors"
                >
                  Show less ↑
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Rate Ring SVG ─────────────────────────────────────────────────────────────
function RateRing({ rate, size = 100 }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ - (rate / 100) * circ
  const color = rate >= 75 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e0dbd0" strokeWidth={size * 0.08} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={size * 0.08}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-bold" style={{ fontSize: size * 0.22, color, lineHeight: 1 }}>
          {rate}%
        </span>
        <span className="text-mist" style={{ fontSize: size * 0.1 }}>attendance</span>
      </div>
    </div>
  )
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
function ChevronLeft({ className = '' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="15 18 9 12 15 6"/></svg>
}
function ChevronRight({ className = '' }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 18 15 12 9 6"/></svg>
}
function CheckIcon({ className = '' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
}
function XIcon({ className = '' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}
function SearchIcon({ className = '' }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function Spinner() {
  return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/></svg>
}
