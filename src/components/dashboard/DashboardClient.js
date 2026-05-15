'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckSquare, Users, BarChart2, FileText, Star,
  ChevronRight, Settings, AlertTriangle, Phone,
} from 'lucide-react'
import { fmtDate, rateColor, getAv, attendanceRate } from '@/lib/utils'

// ── Greeting helper ────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── WhatsApp URL helper ────────────────────────────────────────────────────────
function waUrl(phone) {
  if (!phone) return null
  const c = String(phone).replace(/\D/g, '')
  const e164 = c.startsWith('234') ? c : c.startsWith('0') ? '234' + c.slice(1) : c
  return `https://wa.me/${e164}`
}

// ── Needs Attention Section ────────────────────────────────────────────────────
function NeedsAttentionSection({ consecutiveAbsent = [], lowAttendance = [] }) {
  const [showAllConsec, setShowAllConsec] = useState(false)
  const [showAllLow,    setShowAllLow]    = useState(false)

  if (!consecutiveAbsent.length && !lowAttendance.length) return null

  const PREVIEW = 3

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {/* Heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <AlertTriangle size={14} color="#d97706" strokeWidth={2} />
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8a9e90', margin: 0 }}>
          Needs Attention
        </p>
      </div>

      {/* ── Consecutive absences ── */}
      {consecutiveAbsent.length > 0 && (
        <div style={{
          background: 'rgba(217,119,6,0.05)', border: '1px solid rgba(217,119,6,0.18)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', flex: 1, margin: 0 }}>
              Missing 2+ Sundays in a row
            </p>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(217,119,6,0.15)', color: '#d97706' }}>
              {consecutiveAbsent.length}
            </span>
          </div>

          {(showAllConsec ? consecutiveAbsent : consecutiveAbsent.slice(0, PREVIEW)).map((m, i) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0',
              borderBottom: i < (showAllConsec ? consecutiveAbsent.length : Math.min(PREVIEW, consecutiveAbsent.length)) - 1
                ? '1px solid rgba(26,58,42,0.06)' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.name}
                </p>
                <p style={{ fontSize: 12, color: '#8a9e90', margin: '1px 0 0' }}>
                  Absent {m.streak} {m.streak === 1 ? 'Sunday' : 'Sundays'} in a row
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {m.phone && (
                  <a href={`tel:${m.phone}`}
                    style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(22,163,74,0.1)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)', textDecoration: 'none' }}
                    title="Call">
                    <Phone size={13} />
                  </a>
                )}
                {m.phone && (
                  <a href={waUrl(m.phone)} target="_blank" rel="noreferrer"
                    style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(37,211,102,0.1)', color: '#25D366', border: '1px solid rgba(37,211,102,0.2)', textDecoration: 'none' }}
                    title="WhatsApp">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </a>
                )}
              </div>
            </div>
          ))}

          {consecutiveAbsent.length > PREVIEW && (
            <button onClick={() => setShowAllConsec(v => !v)} style={{
              width: '100%', marginTop: 10, padding: '8px', borderRadius: 9,
              background: 'rgba(26,58,42,0.04)', border: '1px solid rgba(26,58,42,0.1)',
              color: '#8a9e90', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {showAllConsec ? 'Show less' : `See all ${consecutiveAbsent.length} →`}
            </button>
          )}
        </div>
      )}

      {/* ── Low attendance ── */}
      {lowAttendance.length > 0 && (
        <div style={{
          background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)',
          borderRadius: 14, padding: '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', flex: 1, margin: 0 }}>
              Below 50% attendance this month
            </p>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: 'rgba(220,38,38,0.12)', color: '#dc2626' }}>
              {lowAttendance.length}
            </span>
          </div>

          {(showAllLow ? lowAttendance : lowAttendance.slice(0, PREVIEW)).map((m, i) => (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0',
              borderBottom: i < (showAllLow ? lowAttendance.length : Math.min(PREVIEW, lowAttendance.length)) - 1
                ? '1px solid rgba(26,58,42,0.06)' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {m.name}
                </p>
                <p style={{ fontSize: 12, color: '#8a9e90', margin: '1px 0 0' }}>
                  {m.attended} of {m.total} Sundays this month
                </p>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#dc2626', margin: '0 0 4px' }}>
                  {m.percentage}%
                </p>
                <div style={{ width: 56, height: 4, background: 'rgba(26,58,42,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${m.percentage}%`, height: '100%', background: '#dc2626', borderRadius: 2 }} />
                </div>
              </div>
            </div>
          ))}

          {lowAttendance.length > PREVIEW && (
            <button onClick={() => setShowAllLow(v => !v)} style={{
              width: '100%', marginTop: 10, padding: '8px', borderRadius: 9,
              background: 'rgba(26,58,42,0.04)', border: '1px solid rgba(26,58,42,0.1)',
              color: '#8a9e90', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {showAllLow ? 'Show less' : `See all ${lowAttendance.length} →`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main dashboard client component ───────────────────────────────────────────
export default function DashboardPage({
  church, members, sessions, firstTimers,
  pendingFollowUps, pendingCount,
  lastSundayRate, lastSundayColor,
  consecutiveAbsent, lowAttendance,
}) {
  const avgRate = sessions.length > 0
    ? Math.round(
        sessions.slice(0, 4).reduce((sum, s) => {
          const t = s.attendance_records?.length ?? 0
          const p = s.attendance_records?.filter(r => r.present).length ?? 0
          return sum + (t > 0 ? (p / t) * 100 : 0)
        }, 0) / Math.min(sessions.length, 4)
      )
    : null

  return (
    <>
      <style>{`
        .d-cta:hover   { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(26,58,42,0.38) !important; }
        .d-stat:hover  { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,58,42,0.1) !important; }
        .d-quick:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,58,42,0.12) !important; }
        .d-row:hover   { background: #fafaf9 !important; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>

        {/* Greeting */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, color: '#8a9e90', margin: '0 0 2px' }}>{getGreeting()}</p>
            <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 24, fontWeight: 700, color: '#1a3a2a', margin: 0, letterSpacing: '-0.02em' }}>
              {church.admin_name || church.name}
            </h1>
            <p style={{ fontSize: 13, color: '#8a9e90', margin: '3px 0 0' }}>{church.name}</p>
          </div>
          <Link href="/profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1px solid rgba(26,58,42,0.1)', color: '#4a8a65', textDecoration: 'none', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }} title="Settings">
            <Settings size={16} strokeWidth={1.75} />
          </Link>
        </div>

        {/* Take Attendance CTA */}
        <Link href="/attendance" className="d-cta" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.375rem', background: 'linear-gradient(135deg,#1a3a2a 0%,#2d5a42 100%)', borderRadius: 16, textDecoration: 'none', marginBottom: '1.25rem', boxShadow: '0 6px 24px rgba(26,58,42,0.28)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(201,168,76,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckSquare size={20} color="#c9a84c" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#e8d5a0', margin: 0, fontFamily: 'var(--font-playfair),Georgia,serif', letterSpacing: '-0.01em' }}>Take Attendance</p>
            <p style={{ fontSize: 12, color: 'rgba(232,213,160,0.55)', margin: '2px 0 0' }}>Mark who's present at today's service</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,213,160,0.5)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[
            { label: 'Members',      value: members.length,                                      Icon: Users,    href: '/members',     color: '#1a3a2a' },
            { label: 'Last Sunday',  value: lastSundayRate !== null ? `${lastSundayRate}%` : '—', Icon: BarChart2, href: '/analytics', color: lastSundayColor },
            { label: 'First Timers', value: firstTimers.length,                                  Icon: Star,     href: '/firsttimers', color: '#a8862e' },
          ].map(({ label, value, Icon, href, color }) => (
            <Link key={label} href={href} className="d-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem 0.875rem', background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
              <Icon size={18} color={color} strokeWidth={1.75} style={{ marginBottom: 8, display: 'block' }} />
              <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 24, fontWeight: 800, color, margin: '0 0 3px', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: '#8a9e90', margin: 0, fontWeight: 600 }}>{label}</p>
            </Link>
          ))}
        </div>

        {/* ── NEEDS ATTENTION — appears here if there's anything to show ── */}
        <NeedsAttentionSection
          consecutiveAbsent={consecutiveAbsent}
          lowAttendance={lowAttendance}
        />

        {/* Quick actions */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 8px' }}>Quick Access</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: 'Reports',   Icon: FileText,  href: '/report',    desc: 'Generate & share' },
              { label: 'Analytics', Icon: BarChart2, href: '/analytics', desc: 'Trends & rates' },
              { label: 'Members',   Icon: Users,     href: '/members',   desc: 'Manage your list' },
            ].map(({ label, Icon, href, desc }) => (
              <Link key={label} href={href} className="d-quick" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', padding: '0.875rem 0.75rem', background: '#fff', border: '1px solid rgba(26,58,42,0.09)', borderRadius: 13, textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(26,58,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <Icon size={16} color="#1a3a2a" strokeWidth={1.75} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px', letterSpacing: '-0.01em' }}>{label}</p>
                <p style={{ fontSize: 11, color: '#8a9e90', margin: 0 }}>{desc}</p>
                <ChevronRight size={12} color="#c9c9c9" style={{ position: 'absolute', top: 10, right: 10 }} />
              </Link>
            ))}
          </div>
        </div>

        {/* Follow-up needed */}
        {pendingCount > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Follow-up Needed</h2>
              <Link href="/absentees" style={{ fontSize: 13, color: '#4a8a65', fontWeight: 700, textDecoration: 'none' }}>View all {pendingCount} →</Link>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(220,38,38,0.14)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {pendingFollowUps.slice(0, 4).map((p, i) => (
                <div key={p.key} className="d-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 1rem', borderBottom: i < Math.min(pendingFollowUps.length, 4) - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none', transition: 'background 0.14s' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1a3a2a' }}>{p.name}</span>
                  <Link href="/absentees" style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', textDecoration: 'none', padding: '3px 9px', background: 'rgba(220,38,38,0.08)', borderRadius: 20 }}>Follow up</Link>
                </div>
              ))}
              {pendingCount > 4 && (
                <div style={{ padding: '0.6rem 1rem', background: 'rgba(220,38,38,0.03)' }}>
                  <Link href="/absentees" style={{ fontSize: 13, color: '#dc2626', fontWeight: 700, textDecoration: 'none' }}>+ {pendingCount - 4} more need follow-up →</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Recent sessions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Recent Activity</h2>
            <Link href="/attendance" style={{ fontSize: 13, color: '#4a8a65', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
          </div>
          {sessions.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <BarChart2 size={36} color="#c9c9c9" strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 6px' }}>No sessions yet</p>
              <p style={{ fontSize: 13, color: '#8a9e90', margin: '0 0 16px' }}>Take your first attendance to see activity here</p>
              <Link href="/attendance" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.125rem', background: '#1a3a2a', color: '#e8d5a0', borderRadius: 9, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                Take Attendance
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {sessions.slice(0, 5).map(s => {
                const total   = s.attendance_records?.length ?? 0
                const present = s.attendance_records?.filter(r => r.present).length ?? 0
                const rate    = total > 0 ? Math.round((present / total) * 100) : 0
                const rc      = rate >= 75 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a2a', margin: 0 }}>{fmtDate(s.date)}</p>
                      <p style={{ fontSize: 12, color: '#8a9e90', margin: '2px 0 0' }}>{present} of {total} present</p>
                    </div>
                    <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 20, fontWeight: 800, color: rc, margin: 0, flexShrink: 0 }}>{rate}%</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}