import Link from 'next/link'
import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGreeting, fmtDate, attendanceRate } from '@/lib/utils'
import { CheckSquare, Users, BarChart2, Star, Settings, FileText, ChevronRight } from 'lucide-react'
import DashboardGreeting from '@/components/dashboard/DashboardGreeting'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in →</a></div>

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><p>Could not load. <a href="/dashboard">Retry</a></p></div>

  const admin = createAdminClient()
  const [membersRes, sessionsRes, firstTimersRes] = await Promise.allSettled([
    admin.from('members').select('id').eq('church_id', church.id).eq('status', 'active'),
    admin.from('attendance_sessions')
      .select('id,date,group_id,groups(name),attendance_records(present)')
      .eq('church_id', church.id).order('date', { ascending: false }).limit(10),
    admin.from('first_timers').select('id').eq('church_id', church.id),
  ])

  const members     = membersRes.status     === 'fulfilled' ? (membersRes.value.data     ?? []) : []
  const sessions    = sessionsRes.status    === 'fulfilled' ? (sessionsRes.value.data    ?? []) : []
  const firstTimers = firstTimersRes.status === 'fulfilled' ? (firstTimersRes.value.data ?? []) : []

  const withData = sessions.filter(s => s.attendance_records?.length > 0)
  const avgRate  = withData.length > 0
    ? Math.round(withData.reduce((sum, s) => {
        const present = s.attendance_records.filter(r => r.present).length
        return sum + attendanceRate(present, s.attendance_records.length)
      }, 0) / withData.length)
    : null

  // ── Follow-up: query the most recent session's absentees from DB ───────────
  // Pull actual absent members from last session, cross-check follow_up_data
  // to filter out those already marked as reached.
  const followUpData = church.follow_up_data ?? {}

  // Find the most recent attendance session for this church
  let pendingFollowUps = []
  {
    const { data: latestSession } = await admin
      .from('attendance_sessions')
      .select('id, date, group_id, groups(name), attendance_records(member_id, name, present)')
      .eq('church_id', church.id)
      .order('date', { ascending: false })
      .limit(1)
      .single()

    if (latestSession) {
      // Get absent members from latest session
      const absentRecords = (latestSession.attendance_records ?? [])
        .filter(r => !r.present && r.member_id)

      if (absentRecords.length > 0) {
        // Look up real names from members table
        const memberIds = absentRecords.map(r => r.member_id)
        const { data: memberRows } = await admin
          .from('members')
          .select('id, name')
          .in('id', memberIds)
        const nameMap = {}
        for (const m of (memberRows ?? [])) nameMap[m.id] = m.name

        // Build pending list — skip those already marked as reached
        for (const r of absentRecords) {
          const key     = `${latestSession.id}_${r.member_id}`
          const reached = followUpData[key]?.reached ?? false
          if (!reached) {
            pendingFollowUps.push({
              key,
              memberId:  r.member_id,
              name:      nameMap[r.member_id] || r.name || 'Unknown',
              sessionId: latestSession.id,
              date:      latestSession.date,
              groupName: latestSession.groups?.name ?? '',
            })
          }
        }
      }
    }
  }
  const pendingCount = pendingFollowUps.length

  return (
    <>
      <style>{`
        .d-cta:hover    { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(26,58,42,0.38) !important; }
        .d-stat:hover   { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,58,42,0.1) !important; }
        .d-quick:hover  { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,58,42,0.12) !important; }
        .d-row:hover    { background: #fafaf9 !important; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>

        {/* Page header — DashboardGreeting reads device display name from localStorage */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: 12 }}>
          <DashboardGreeting
            fallbackName={church.admin_name || ''}
            greeting={getGreeting()}
            churchName={church.name}
            date={fmtDate(new Date())}
          />
          <Link href="/profile" prefetch style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1px solid rgba(26,58,42,0.1)', color: '#4a8a65', textDecoration: 'none', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'all 0.14s' }} title="Settings">
            <Settings size={16} strokeWidth={1.75} />
          </Link>
        </div>

        {/* Take Attendance CTA */}
        <Link href="/attendance" prefetch className="d-cta" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.375rem', background: 'linear-gradient(135deg,#1a3a2a 0%,#2d5a42 100%)', borderRadius: 16, textDecoration: 'none', marginBottom: '1.25rem', boxShadow: '0 6px 24px rgba(26,58,42,0.28)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
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
            { label: 'Members',      value: members.length,     Icon: Users,    href: '/members',     color: '#1a3a2a' },
            { label: 'Avg Rate',     value: avgRate !== null ? `${avgRate}%` : '—', Icon: BarChart2, href: '/analytics', color: avgRate !== null && avgRate >= 75 ? '#16a34a' : avgRate !== null && avgRate >= 50 ? '#d97706' : '#1a3a2a' },
            { label: 'First Timers', value: firstTimers.length, Icon: Star,     href: '/firsttimers', color: '#a8862e' },
          ].map(({ label, value, Icon, href, color }) => (
            <Link key={label} href={href} prefetch className="d-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1rem 0.875rem', background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
              <Icon size={18} color={color} strokeWidth={1.75} style={{ marginBottom: 8, display: 'block' }} />
              <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 24, fontWeight: 800, color, margin: '0 0 3px', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 11, color: '#8a9e90', margin: 0, fontWeight: 600 }}>{label}</p>
            </Link>
          ))}
        </div>

        {/* Quick actions — Reports, Analytics, Members */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 8px' }}>Quick Access</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: 'Reports',   Icon: FileText,  href: '/report',    desc: 'Generate & share' },
              { label: 'Analytics', Icon: BarChart2, href: '/analytics', desc: 'Trends & rates' },
              { label: 'Members',   Icon: Users,     href: '/members',   desc: 'Manage your list' },
            ].map(({ label, Icon, href, desc }) => (
              <Link key={label} href={href} prefetch className="d-quick" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative',
                padding: '0.875rem 0.75rem',
                background: '#fff', border: '1px solid rgba(26,58,42,0.09)',
                borderRadius: 13, textDecoration: 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              }}>
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

        {/* Absentees follow-up — dynamic from most recent session */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Follow-up Needed</h2>
            {pendingCount > 0 && (
              <Link href="/absentees" prefetch style={{ fontSize: 13, color: '#4a8a65', fontWeight: 700, textDecoration: 'none' }}>View all {pendingCount} →</Link>
            )}
          </div>
          {pendingCount === 0 ? (
            <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, padding: '1.25rem 1rem', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <p style={{ fontSize: 14, color: '#4a8a65', fontWeight: 600, margin: 0 }}>All caught up — no pending follow-ups</p>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid rgba(220,38,38,0.14)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {pendingFollowUps.slice(0, 4).map((p, i) => (
                <div key={p.key} className="d-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.7rem 1rem', borderBottom: i < Math.min(pendingFollowUps.length,4)-1 ? '1px solid rgba(26,58,42,0.06)' : 'none', transition: 'background 0.14s' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1a3a2a' }}>{p.name}</span>
                  <Link href="/absentees" prefetch style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', textDecoration: 'none', padding: '3px 9px', background: 'rgba(220,38,38,0.08)', borderRadius: 20 }}>Follow up</Link>
                </div>
              ))}
              {pendingCount > 4 && (
                <div style={{ padding: '0.6rem 1rem', background: 'rgba(220,38,38,0.03)' }}>
                  <Link href="/absentees" prefetch style={{ fontSize: 13, color: '#dc2626', fontWeight: 700, textDecoration: 'none' }}>+ {pendingCount-4} more need follow-up →</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent sessions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Recent Activity</h2>
            <Link href="/attendance" prefetch style={{ fontSize: 13, color: '#4a8a65', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
          </div>
          {sessions.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <BarChart2 size={36} color="#c9c9c9" strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 6px' }}>No sessions yet</p>
              <p style={{ fontSize: 13, color: '#8a9e90', margin: '0 0 16px' }}>Take your first attendance to see activity here</p>
              <Link href="/attendance" prefetch style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.125rem', background: '#1a3a2a', color: '#e8d5a0', borderRadius: 9, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>
                Take Attendance
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {sessions.slice(0,5).map(s => {
                const total   = s.attendance_records?.length ?? 0
                const present = s.attendance_records?.filter(r => r.present).length ?? 0
                const rate    = attendanceRate(present, total)
                const rc      = rate >= 75 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626'
                return (
                  <div key={s.id} className="d-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.8rem 1rem', background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 12, transition: 'background 0.14s', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: rc + '12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: rc, lineHeight: 1 }}>{rate}</span>
                      <span style={{ fontSize: 9, color: rc, fontWeight: 700 }}>%</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.groups?.name ?? 'Unknown group'}</p>
                      <p style={{ fontSize: 12, color: '#8a9e90', margin: 0 }}>{fmtDate(s.date)} · {present}/{total} present</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ height: 40 }} />
      </div>
    </>
  )
}
