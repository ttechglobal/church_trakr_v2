'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BackButton from '@/components/ui/BackButton'
import { Phone, MessageSquare, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { getAv } from '@/lib/utils'

const BDAY_MSG_KEY = 'ct_birthday_message'

const DEFAULT_MSG =
  'Hi {name}, happy birthday from all of us at {group}. Wishing you a day full of joy and God\'s blessings.'

// ── Date helpers ──────────────────────────────────────────────────────────────

function today()     { return new Date() }
function todayISO()  { return today().toISOString().slice(0, 10) }
function todayMonth(){ return today().getMonth() }    // 0-11
function todayDay()  { return today().getDate() }     // 1-31

function parseBday(str) {
  if (!str) return null
  // Handle YYYY-MM-DD and MM-DD and MM/DD
  const parts = str.replace(/\//g, '-').split('-')
  if (parts.length === 3) return { month: parseInt(parts[1]) - 1, day: parseInt(parts[2]), year: parseInt(parts[0]) }
  if (parts.length === 2) return { month: parseInt(parts[0]) - 1, day: parseInt(parts[1]), year: null }
  return null
}

function getAge(bday) {
  if (!bday?.year) return null
  const t = today()
  const turned = t.getMonth() > bday.month || (t.getMonth() === bday.month && t.getDate() >= bday.day)
  return t.getFullYear() - bday.year - (turned ? 0 : 1)
}

function isToday(bday)    { return bday && bday.month === todayMonth() && bday.day === todayDay() }
function isSameDay(bday, d) { return bday && bday.month === d.getMonth() && bday.day === d.getDate() }

function getWeekRange() {
  const d = today()
  const dow = d.getDay() // 0=Sun
  const mon = new Date(d); mon.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  return { mon, sun }
}

function isThisWeek(bday) {
  if (!bday) return false
  const { mon, sun } = getWeekRange()
  const t = today()
  // Test every day in the week
  for (let offset = 0; offset <= 6; offset++) {
    const d = new Date(mon); d.setDate(mon.getDate() + offset)
    if (bday.month === d.getMonth() && bday.day === d.getDate()) return true
  }
  return false
}

function fmtBdayShort(bday) {
  if (!bday) return ''
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${MONTHS[bday.month]} ${bday.day}`
}

function fmtFullDate(d) {
  return d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })
}

function normalisePhone(raw) {
  if (!raw) return null
  const c = String(raw).replace(/\D/g, '')
  if (c.startsWith('234') && c.length >= 13) return c
  if (c.startsWith('0') && c.length === 11) return '234' + c.slice(1)
  return c || null
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ── Main component ────────────────────────────────────────────────────────────

export default function BirthdaysClient({ members, churchName, churchId }) {
  const router = useRouter()
  const [tab,         setTab]         = useState('today')
  const [bdayMsg,     setBdayMsg]     = useState(DEFAULT_MSG)
  const [editingMsg,  setEditingMsg]  = useState(false)
  const [draftMsg,    setDraftMsg]    = useState('')
  const [openMonths,  setOpenMonths]  = useState(() => [today().getMonth()])
  const [sendingId,   setSendingId]   = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem(BDAY_MSG_KEY)
    if (saved) setBdayMsg(saved)
  }, [])

  function saveMsg() {
    setBdayMsg(draftMsg)
    localStorage.setItem(BDAY_MSG_KEY, draftMsg)
    setEditingMsg(false)
  }

  function resolveMsg(member) {
    return bdayMsg
      .replace(/\{name\}/gi, member.name.split(' ')[0] || member.name)
      .replace(/\[Name\]/gi, member.name.split(' ')[0] || member.name)
      .replace(/\{group\}/gi, churchName)
      .replace(/\[Group Name\]/gi, churchName)
  }

  function waUrl(member) {
    const phone = normalisePhone(member.phone)
    if (!phone) return null
    return `https://wa.me/${phone}?text=${encodeURIComponent(resolveMsg(member))}`
  }

  async function handleSMS(member) {
    // Navigate to messaging/send with this member pre-selected
    router.push(
      `/messaging/send?recipientPhone=${encodeURIComponent(member.phone ?? '')}&recipientName=${encodeURIComponent(member.name)}&message=${encodeURIComponent(resolveMsg(member))}`
    )
  }

  // ── Process members with birthdays ────────────────────────────────────────
  const withBday = useMemo(() =>
    members
      .map(m => ({ ...m, bday: parseBday(m.birthday) }))
      .filter(m => m.bday),
  [members])

  const todayMembers   = useMemo(() => withBday.filter(m => isToday(m.bday)), [withBday])
  const thisWeekMembers = useMemo(() => withBday.filter(m => isThisWeek(m.bday)), [withBday])
  const thisMonthMembers = useMemo(() =>
    withBday.filter(m => m.bday.month === todayMonth())
      .sort((a, b) => a.bday.day - b.bday.day),
  [withBday])

  // Group this week by day
  const weekByDay = useMemo(() => {
    const { mon } = getWeekRange()
    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon); d.setDate(mon.getDate() + i)
      const hits = thisWeekMembers.filter(m => isSameDay(m.bday, d))
      if (hits.length) days.push({ date: d, members: hits })
    }
    return days
  }, [thisWeekMembers])

  // Group all members by month
  const byMonth = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => ({
      name, idx,
      members: withBday
        .filter(m => m.bday.month === idx)
        .sort((a, b) => a.bday.day - b.bday.day),
    }))
  }, [withBday])

  // Next upcoming birthday (for empty week state)
  const nextBirthday = useMemo(() => {
    if (!withBday.length) return null
    const t = today()
    const upcoming = withBday
      .map(m => {
        const d = new Date(t.getFullYear(), m.bday.month, m.bday.day)
        if (d < t) d.setFullYear(t.getFullYear() + 1)
        return { ...m, next: d }
      })
      .sort((a, b) => a.next - b.next)
    return upcoming[0]
  }, [withBday])

  const TABS = [
    { id: 'today',  label: 'Today',      count: todayMembers.length     },
    { id: 'week',   label: 'This Week',  count: thisWeekMembers.length  },
    { id: 'month',  label: 'This Month', count: thisMonthMembers.length },
    { id: 'all',    label: 'All',        count: null                    },
  ]

  return (
    <div className="page-content pb-10">
      <BackButton />
      <div className="flex items-center gap-3 mb-5">
        <span style={{ fontSize: 28 }}>🎂</span>
        <div>
          <h1 className="font-display text-2xl font-bold text-forest">Birthdays</h1>
          <p className="text-sm text-mist mt-0.5">{withBday.length} members with birthdays recorded</p>
        </div>
      </div>

      {/* ── Customise message ── */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-forest">Birthday Message</p>
          {!editingMsg && (
            <button onClick={() => { setDraftMsg(bdayMsg); setEditingMsg(true) }}
              className="btn btn-outline btn-sm gap-1.5 text-xs" style={{ minHeight: 32 }}>
              <Edit2 size={11} /> Edit
            </button>
          )}
        </div>
        {editingMsg ? (
          <>
            <textarea className="input resize-none text-sm w-full" style={{ minHeight: 88 }}
              value={draftMsg} onChange={e => setDraftMsg(e.target.value)} autoFocus />
            <p className="text-xs text-mist mt-1">Use {'{name}'} and {'{group}'} as placeholders</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setEditingMsg(false)} className="btn btn-outline flex-1 text-sm">Cancel</button>
              <button onClick={saveMsg} className="btn btn-primary flex-1 text-sm gap-1.5">
                <Check size={12} /> Save
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-mist leading-relaxed">{bdayMsg}</p>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, background: '#ede9e0', borderRadius: 12, padding: 3, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: tab === t.id ? 700 : 500,
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? '#1a3a2a' : '#8a9e90',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              transition: 'all .15s',
              position: 'relative',
            }}>
            {t.label}
            {t.count > 0 && (
              <span style={{
                position: 'absolute', top: 3, right: 3,
                width: 14, height: 14, borderRadius: '50%',
                background: '#dc2626', color: '#fff',
                fontSize: 8, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TODAY TAB ── */}
      {tab === 'today' && (
        todayMembers.length === 0 ? (
          <div className="card text-center py-10">
            <p style={{ fontSize: 36, marginBottom: 12 }}>📅</p>
            <p className="font-semibold text-forest">No birthdays today</p>
            <p className="text-sm text-mist mt-1">
              {nextBirthday
                ? `Next birthday: ${nextBirthday.name} on ${fmtBdayShort(nextBirthday.bday)}`
                : 'Check back tomorrow'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayMembers.map(m => {
              const age  = getAge(m.bday)
              const wa   = waUrl(m)
              const av   = getAv(m.name)
              return (
                <div key={m.id} style={{
                  background: 'linear-gradient(135deg,rgba(26,58,42,0.06),rgba(201,168,76,0.06))',
                  border: '1px solid rgba(201,168,76,0.25)',
                  borderRadius: 18, padding: '16px',
                }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div style={{ fontSize: 24, flexShrink: 0 }}>🎂</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-forest text-base">{m.name}</p>
                      <p className="text-xs text-mist mt-0.5">
                        {age !== null ? `Turns ${age} today` : 'Birthday today'}
                      </p>
                    </div>
                    <div className="avatar shrink-0 text-xs" style={{ background: av.bg, color: av.color }}>
                      {av.initials}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {m.phone && (
                      <a href={`tel:${m.phone}`}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 40, borderRadius: 10, background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                        <Phone size={13} /> Call
                      </a>
                    )}
                    {wa && (
                      <a href={wa} target="_blank" rel="noreferrer"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 40, borderRadius: 10, background: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)', textDecoration: 'none', fontSize: 12, fontWeight: 700 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </a>
                    )}
                    {m.phone && (
                      <button onClick={() => handleSMS(m)}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, height: 40, borderRadius: 10, background: 'rgba(26,58,42,0.07)', color: '#1a3a2a', border: '1px solid rgba(26,58,42,0.15)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        <MessageSquare size={13} /> SMS
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── THIS WEEK TAB ── */}
      {tab === 'week' && (
        weekByDay.length === 0 ? (
          <div className="card text-center py-10">
            <p style={{ fontSize: 36, marginBottom: 12 }}>📅</p>
            <p className="font-semibold text-forest">No birthdays this week</p>
            {nextBirthday && (
              <p className="text-sm text-mist mt-1">
                Next: {nextBirthday.name} on {fmtBdayShort(nextBirthday.bday)}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {weekByDay.map(({ date, members: dayMembers }) => {
              const isTod = date.toDateString() === today().toDateString()
              return (
                <div key={date.toISOString()}>
                  <p className="text-xs font-bold text-mist uppercase tracking-widest mb-2"
                    style={{ color: isTod ? '#c9a84c' : undefined }}>
                    {fmtFullDate(date)} {isTod ? '🎂' : ''}
                  </p>
                  <div className="space-y-2">
                    {dayMembers.map(m => {
                      const age = getAge(m.bday)
                      return (
                        <div key={m.id} className="card flex items-center gap-3"
                          style={isTod ? { borderColor: 'rgba(201,168,76,0.3)', background: 'rgba(201,168,76,0.04)' } : {}}>
                          <div style={{ fontSize: 20, flexShrink: 0 }}>{isTod ? '🎂' : '🎁'}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-forest text-sm">{m.name}</p>
                            <p className="text-xs text-mist">
                              {age !== null ? `Turns ${age}` : 'Birthday'} · {fmtBdayShort(m.bday)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── THIS MONTH TAB ── */}
      {tab === 'month' && (
        thisMonthMembers.length === 0 ? (
          <div className="card text-center py-10">
            <p style={{ fontSize: 36, marginBottom: 12 }}>📅</p>
            <p className="font-semibold text-forest">No birthdays recorded for {MONTH_NAMES[todayMonth()]}</p>
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold text-mist uppercase tracking-widest mb-3">
              {MONTH_NAMES[todayMonth()]} Birthdays
            </p>
            <div className="card p-0 overflow-hidden">
              {thisMonthMembers.map((m, i) => {
                const isTod  = isToday(m.bday)
                const isPast = !isTod && m.bday.day < todayDay()
                const age    = getAge(m.bday)
                return (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    borderBottom: i < thisMonthMembers.length - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none',
                    background: isTod ? 'rgba(201,168,76,0.05)' : 'transparent',
                    opacity: isPast ? 0.55 : 1,
                  }}>
                    <p style={{
                      fontSize: 12, fontWeight: 700, color: isTod ? '#c9a84c' : '#8a9e90',
                      minWidth: 42, flexShrink: 0,
                    }}>
                      {MONTH_NAMES[todayMonth()].slice(0,3)} {m.bday.day}
                    </p>
                    <p className="flex-1 text-sm font-medium text-forest truncate">{m.name}</p>
                    {isTod && <span style={{ fontSize: 16 }}>🎂</span>}
                    {age !== null && !isTod && (
                      <p className="text-xs text-mist shrink-0">turns {age}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* ── ALL MONTHS TAB ── */}
      {tab === 'all' && (
        <div className="space-y-2">
          {byMonth.map(({ name, idx, members: mems }) => {
            const isCurrentMonth = idx === todayMonth()
            const isOpen = openMonths.includes(idx)
            return (
              <div key={idx} className="card p-0 overflow-hidden">
                <button
                  onClick={() => setOpenMonths(prev =>
                    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                  )}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    width: '100%', padding: '14px 16px',
                    background: isCurrentMonth ? 'rgba(26,58,42,0.03)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}>
                  <p style={{
                    flex: 1, fontSize: 14, fontWeight: 700,
                    color: isCurrentMonth ? '#1a3a2a' : mems.length === 0 ? '#8a9e90' : '#1a3a2a',
                  }}>
                    {name}
                    {isCurrentMonth && <span className="ml-2 text-xs font-normal text-mist">← this month</span>}
                  </p>
                  <p style={{ fontSize: 12, color: '#8a9e90', flexShrink: 0 }}>
                    {mems.length === 0 ? '—' : `${mems.length} birthday${mems.length > 1 ? 's' : ''}`}
                  </p>
                  {mems.length > 0 && (
                    isOpen ? <ChevronUp size={14} color="#8a9e90"/> : <ChevronDown size={14} color="#8a9e90"/>
                  )}
                </button>

                {isOpen && mems.length > 0 && (
                  <div style={{ borderTop: '1px solid rgba(26,58,42,0.06)' }}>
                    {mems.map((m, i) => {
                      const age    = getAge(m.bday)
                      const isTod  = isToday(m.bday)
                      return (
                        <div key={m.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 16px',
                          borderBottom: i < mems.length - 1 ? '1px solid rgba(26,58,42,0.04)' : 'none',
                          background: isTod ? 'rgba(201,168,76,0.05)' : 'transparent',
                        }}>
                          <p style={{ fontSize: 12, color: isTod ? '#c9a84c' : '#8a9e90', minWidth: 42, flexShrink: 0, fontWeight: isTod ? 700 : 400 }}>
                            {name.slice(0,3)} {m.bday.day}
                          </p>
                          <p className="flex-1 text-sm text-forest truncate">{m.name}</p>
                          {isTod && <span style={{ fontSize: 14 }}>🎂</span>}
                          {age !== null && <p className="text-xs text-mist shrink-0">age {age}</p>}
                        </div>
                      )
                    })}
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