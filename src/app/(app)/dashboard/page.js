import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { getGreeting, fmtDate, attendanceRate } from '@/lib/utils'
import { CheckSquare, Users, BarChart2, Star, Settings } from 'lucide-react'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in →</a></div>

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><p>Could not load. <a href="/dashboard">Retry</a></p></div>

  const admin = createAdminClient()

  const [membersRes, sessionsRes, firstTimersRes, groupsRes] = await Promise.allSettled([
    admin.from('members').select('id,name').eq('church_id', church.id).eq('status', 'active'),
    admin.from('attendance_sessions')
      .select('id,date,group_id,groups(name),attendance_records(member_id,name,present)')
      .eq('church_id', church.id).order('date', { ascending: false }).limit(10),
    admin.from('first_timers').select('id').eq('church_id', church.id),
    admin.from('groups').select('id').eq('church_id', church.id).neq('name', 'First Timers'),
  ])

  const members     = membersRes.status     === 'fulfilled' ? (membersRes.value.data     ?? []) : []
  const sessions    = sessionsRes.status    === 'fulfilled' ? (sessionsRes.value.data    ?? []) : []
  const firstTimers = firstTimersRes.status === 'fulfilled' ? (firstTimersRes.value.data ?? []) : []

  // Avg attendance rate
  const withData = sessions.filter(s => s.attendance_records?.length > 0)
  const avgRate = withData.length > 0
    ? Math.round(withData.reduce((sum, s) => {
        const present = s.attendance_records.filter(r => r.present).length
        return sum + attendanceRate(present, s.attendance_records.length)
      }, 0) / withData.length)
    : null

  // Build real absentee names from latest session per group
  const followUpData = church.follow_up_data ?? {}
  const groupIds = groupsRes.status === 'fulfilled' ? (groupsRes.value.data ?? []).map(g => g.id) : []

  // Get latest session per group
  const latestByGroup = {}
  for (const s of sessions) {
    if (groupIds.includes(s.group_id) && !latestByGroup[s.group_id]) {
      latestByGroup[s.group_id] = s
    }
  }

  // Build absentee list with real names and follow-up status
  const absentees = []
  for (const session of Object.values(latestByGroup)) {
    for (const record of (session.attendance_records ?? [])) {
      if (record.present) continue
      const key = `${session.id}_${record.member_id}`
      const entry = followUpData[key]
      const reached = entry?.reached ?? false
      absentees.push({
        key,
        name: record.name || 'Unknown',
        reached,
        groupName: session.groups?.name ?? '',
      })
    }
  }

  const pendingAbsentees = absentees.filter(a => !a.reached)
  const totalAbsentees   = absentees.length
  const pendingCount     = pendingAbsentees.length

  const firstName = (church.admin_name || '').split(' ')[0]

  return (
    <>
      <style>{`
        .d-cta:hover    { transform: translateY(-2px); box-shadow: 0 12px 36px rgba(26,58,42,0.38) !important; }
        .d-stat:hover   { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26,58,42,0.1) !important; }
        .d-row:hover    { background: #fafaf9 !important; }
        .d-section:hover { border-color: rgba(26,58,42,0.18) !important; }
      `}</style>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, color: '#8a9e90', margin: '0 0 3px', fontWeight: 500 }}>
              {getGreeting()}{firstName ? `, ${firstName}` : ''}
            </p>
            <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: 0, letterSpacing: '-0.025em' }}>
              {church.name}
            </h1>
            <p style={{ fontSize: 12, color: '#b0bec0', margin: '3px 0 0' }}>{fmtDate(new Date())}</p>
          </div>
          <a href="/profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1px solid rgba(26,58,42,0.1)', color: '#4a8a65', textDecoration: 'none', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }} title="Settings">
            <Settings size={16} strokeWidth={1.75} />
          </a>
        </div>

        {/* Take Attendance CTA */}
        <a href="/attendance" className="d-cta" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.375rem', background: 'linear-gradient(135deg,#1a3a2a 0%,#2d5a42 100%)', borderRadius: 16, textDecoration: 'none', marginBottom: '1.25rem', boxShadow: '0 6px 24px rgba(26,58,42,0.28)', transition: 'transform 0.18s ease, box-shadow 0.18s ease' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(201,168,76,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckSquare size={20} color="#c9a84c" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#e8d5a0', margin: 0, fontFamily: 'var(--font-playfair),Georgia,serif', letterSpacing: '-0.01em' }}>Take Attendance</p>
            <p style={{ fontSize: 12, color: 'rgba(232,213,160,0.55)', margin: '2px 0 0' }}>Mark who's present at today's service</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(232,213,160,0.5)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>

        {/* Stats — centered content */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.25rem' }}>
          {[
            { label: 'Members',      value: members.length,                       Icon: Users,    href: '/members',     color: '#1a3a2a' },
            { label: 'Avg Rate',     value: avgRate !== null ? `${avgRate}%` : '—', Icon: BarChart2, href: '/analytics',   color: avgRate !== null && avgRate >= 75 ? '#16a34a' : avgRate !== null && avgRate >= 50 ? '#d97706' : '#1a3a2a' },
            { label: 'First Timers', value: firstTimers.length,                   Icon: Star,     href: '/firsttimers', color: '#a8862e' },
          ].map(({ label, value, Icon, href, color }) => (
            <a key={label} href={href} className="d-stat" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.375rem 0.75rem', background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.18s ease, box-shadow 0.18s ease', gap: 6 }}>
              <Icon size={18} color={color} strokeWidth={1.75} />
              <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 28, fontWeight: 800, color, margin: 0, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 12, color: '#8a9e90', margin: 0, fontWeight: 600 }}>{label}</p>
            </a>
          ))}
        </div>

        {/* Follow-up needed — real names */}
        {totalAbsentees > 0 && (
          <a href="/absentees" className="d-section" style={{ display: 'block', textDecoration: 'none', marginBottom: '1.25rem', background: '#fff', border: '1px solid rgba(220,38,38,0.14)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'border-color 0.15s' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem 0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(220,38,38,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Follow-up Needed</p>
                  <p style={{ fontSize: 11, color: '#8a9e90', margin: 0 }}>
                    {pendingCount} of {totalAbsentees} pending
                  </p>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4a8a65' }}>View all →</span>
            </div>

            {/* Progress bar */}
            <div style={{ height: 3, background: 'rgba(220,38,38,0.08)', margin: '0 1rem' }}>
              <div style={{ height: '100%', background: pendingCount === 0 ? '#16a34a' : '#dc2626', borderRadius: 2, width: `${totalAbsentees > 0 ? Math.round(((totalAbsentees - pendingCount) / totalAbsentees) * 100) : 0}%`, transition: 'width 0.5s ease' }} />
            </div>

            {/* Names list */}
            <div style={{ padding: '0.5rem 0 0.25rem' }}>
              {pendingAbsentees.slice(0, 5).map((a, i) => (
                <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 1rem', borderTop: i === 0 ? '1px solid rgba(26,58,42,0.05)' : 'none' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1a3a2a' }}>{a.name}</span>
                  {a.groupName && <span style={{ fontSize: 11, color: '#8a9e90' }}>{a.groupName}</span>}
                </div>
              ))}
              {pendingCount > 5 && (
                <div style={{ padding: '0.5rem 1rem 0.75rem', borderTop: '1px solid rgba(26,58,42,0.05)' }}>
                  <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 700 }}>+ {pendingCount - 5} more need follow-up</span>
                </div>
              )}
              {pendingCount === 0 && totalAbsentees > 0 && (
                <div style={{ padding: '0.625rem 1rem 0.875rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>All {totalAbsentees} absentees followed up!</span>
                </div>
              )}
            </div>
          </a>
        )}

        {/* Recent sessions */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 16, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>Recent Activity</h2>
            <a href="/attendance" style={{ fontSize: 13, color: '#4a8a65', fontWeight: 700, textDecoration: 'none' }}>View all →</a>
          </div>
          {sessions.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <BarChart2 size={36} color="#c9c9c9" strokeWidth={1.5} style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a3a2a', margin: '0 0 6px' }}>No sessions yet</p>
              <p style={{ fontSize: 13, color: '#8a9e90', margin: '0 0 16px' }}>Take your first attendance to see activity here</p>
              <a href="/attendance" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.125rem', background: '#1a3a2a', color: '#e8d5a0', borderRadius: 9, textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>Take Attendance</a>
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
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: rc+'12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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