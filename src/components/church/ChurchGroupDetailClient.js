'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, Calendar } from 'lucide-react'

const C = {
  forest:'#1a3a2a', mid:'#2d5a42', muted:'#8a9e90',
  gold:'#c9a84c', goldDk:'#a8862e', ivory:'#f7f5f0', ivoryDeep:'#e0dbd0',
  ivoryBorder:'rgba(26,58,42,0.08)',
  success:'#16a34a', error:'#dc2626', warning:'#d97706',
}

// ── Safe date formatter — never returns "Invalid Date" ─────────────────────────
function safeDate(raw, opts) {
  if (!raw) return '—'
  const d = typeof raw === 'string' ? new Date(raw.includes('T') ? raw : raw + 'T00:00:00') : new Date(raw)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', opts)
}

function fmtTableDate(d) {
  return safeDate(d, { weekday:'short', day:'numeric', month:'short', year:'numeric' })
}

function fmtHeaderDate(d) {
  return safeDate(d, { day:'numeric', month:'long', year:'numeric' })
}

const PERIODS = [
  { label:'This Month',    value:'1m'  },
  { label:'Last 3 Months', value:'3m'  },
  { label:'Last 6 Months', value:'6m'  },
  { label:'All Time',      value:'all' },
]

function periodStart(p) {
  const now = new Date()
  if (p === '1m') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)
  if (p === '3m') return new Date(now.getFullYear(), now.getMonth()-2, 1).toISOString().slice(0,10)
  if (p === '6m') return new Date(now.getFullYear(), now.getMonth()-5, 1).toISOString().slice(0,10)
  return null
}

export default function ChurchGroupDetailClient({ church, subgroup, connection, sessions, memberCount }) {
  const [period, setPeriod] = useState('1m')
  const isDisconnected = connection.status === 'disconnected'

  const filteredSessions = useMemo(() => {
    const start = periodStart(period)
    if (!start) return sessions
    return sessions.filter(s => s.date && s.date >= start)
  }, [sessions, period])

  // Build clean session rows — only real sessions with member data
  const sessionRows = useMemo(() => {
    return filteredSessions
      .map(s => {
        // Only include sessions that have real attendance data
        const recs = (s.attendance_records ?? []).filter(r => r.member_id !== null)
        if (!recs.length) return null

        const present = recs.filter(r => r.present).length
        const total   = recs.length
        const absent  = total - present

        // Validate date before including this row
        const dateObj = s.date ? new Date(s.date + 'T00:00:00') : null
        if (!dateObj || isNaN(dateObj.getTime())) return null

        return { id: s.id, date: s.date, present, absent, total }
      })
      .filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date))  // most recent first
  }, [filteredSessions])

  // Summary stats from filtered data
  const totalPresent = sessionRows.reduce((s, r) => s + r.present, 0)
  const totalAbsent  = sessionRows.reduce((s, r) => s + r.absent,  0)
  const totalSessions = sessionRows.length

  return (
    <div className="page-content pb-20">

      {/* ── Back link ── */}
      <Link
        href="/church-dashboard"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: C.muted, textDecoration: 'none', fontSize: 13,
          marginBottom: 16, fontWeight: 500,
        }}
      >
        <ChevronLeft size={14} />
        All Groups
      </Link>

      {/* ── Group header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1
            className="font-display"
            style={{ fontSize: 22, fontWeight: 800, color: C.forest, margin: 0, letterSpacing: '-0.02em' }}
          >
            {subgroup.name}
          </h1>
          {isDisconnected && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
              background: 'rgba(220,38,38,0.1)', color: C.error, flexShrink: 0,
            }}>
              Disconnected
            </span>
          )}
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.5 }}>
          {memberCount} active members
          {connection.connected_at && ` · Connected ${fmtHeaderDate(connection.connected_at)}`}
        </p>
      </div>

      {/* ── Period filter ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: C.ivoryDeep, borderRadius: 10, padding: 3,
      }}>
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            style={{
              flex: 1, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: period === p.value ? 700 : 500,
              background: period === p.value ? '#fff' : 'transparent',
              color: period === p.value ? C.forest : C.muted,
              boxShadow: period === p.value ? '0 1px 3px rgba(26,58,42,0.12)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── No data state ── */}
      {sessionRows.length === 0 && (
        <div style={{
          background: '#fff',
          borderRadius: 14,
          boxShadow: `0 1px 4px rgba(26,58,42,0.07), 0 0 0 1px ${C.ivoryBorder}`,
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}>
          <Calendar size={36} color={C.muted} strokeWidth={1.25} style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: C.forest, margin: '0 0 5px' }}>
            No attendance records yet
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            Try selecting a wider date range above.
          </p>
        </div>
      )}

      {sessionRows.length > 0 && (
        <>
          {/* ── Summary stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total Present',  value: totalPresent,  color: C.success  },
              { label: 'Total Absent',   value: totalAbsent,   color: C.error    },
              { label: 'Sundays',        value: totalSessions, color: C.forest   },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  background: '#fff',
                  borderRadius: 14,
                  boxShadow: `0 1px 4px rgba(26,58,42,0.07), 0 0 0 1px ${C.ivoryBorder}`,
                  padding: '16px 10px',
                  textAlign: 'center',
                }}
              >
                <p style={{
                  fontFamily: 'var(--font-playfair,Georgia,serif)',
                  fontSize: 30, fontWeight: 800, color, lineHeight: 1,
                  margin: '0 0 5px', letterSpacing: '-0.03em',
                }}>
                  {value}
                </p>
                <p style={{
                  fontSize: 10, color: C.muted, margin: 0,
                  textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
                }}>
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* ── Attendance history table ── */}
          <div style={{
            background: '#fff',
            borderRadius: 14,
            boxShadow: `0 1px 4px rgba(26,58,42,0.07), 0 0 0 1px ${C.ivoryBorder}`,
            overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              padding: '14px 16px 10px',
              borderBottom: `1px solid ${C.ivoryBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h2 style={{
                fontFamily: 'var(--font-playfair,Georgia,serif)',
                fontSize: 15, fontWeight: 700, color: C.forest, margin: 0,
              }}>
                Attendance History
              </h2>
              <span style={{
                fontSize: 11, fontWeight: 600, color: C.muted,
                background: C.ivoryDeep, borderRadius: 99, padding: '2px 8px',
              }}>
                {sessionRows.length} {sessionRows.length === 1 ? 'Sunday' : 'Sundays'}
              </span>
            </div>

            {/* Scrollable table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 340 }}>
                <thead>
                  <tr style={{ background: C.ivory }}>
                    {['Date', 'Present', 'Absent', 'Total'].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          fontSize: 10, fontWeight: 700, color: C.muted,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          padding: '9px 16px',
                          textAlign: i === 0 ? 'left' : 'right',
                          whiteSpace: 'nowrap',
                          borderBottom: `1px solid ${C.ivoryBorder}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionRows.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{
                        background: i % 2 === 0 ? '#fff' : C.ivory,
                        borderBottom: i < sessionRows.length - 1 ? `1px solid ${C.ivoryBorder}` : 'none',
                      }}
                    >
                      {/* Date */}
                      <td style={{
                        padding: '12px 16px',
                        fontSize: 13, fontWeight: 600, color: C.forest,
                        whiteSpace: 'nowrap',
                      }}>
                        {fmtTableDate(row.date)}
                      </td>
                      {/* Present */}
                      <td style={{
                        padding: '12px 16px',
                        fontSize: 15, fontWeight: 800, color: C.success,
                        textAlign: 'right',
                        fontFamily: 'var(--font-playfair,Georgia,serif)',
                      }}>
                        {row.present}
                      </td>
                      {/* Absent */}
                      <td style={{
                        padding: '12px 16px',
                        fontSize: 15, fontWeight: 800, color: C.error,
                        textAlign: 'right',
                        fontFamily: 'var(--font-playfair,Georgia,serif)',
                      }}>
                        {row.absent}
                      </td>
                      {/* Total */}
                      <td style={{
                        padding: '12px 16px',
                        fontSize: 15, fontWeight: 700, color: C.muted,
                        textAlign: 'right',
                        fontFamily: 'var(--font-playfair,Georgia,serif)',
                      }}>
                        {row.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
