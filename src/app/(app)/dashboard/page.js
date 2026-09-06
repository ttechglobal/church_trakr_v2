import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient }  from '@/lib/supabase/admin'
import { redirect }           from 'next/navigation'
import DashboardClient        from '@/components/dashboard/DashboardClient'

export const metadata = { title: 'Dashboard' }
export const revalidate = 30  // revalidate at most every 30s

function attendanceRate(present, total) {
  if (!total) return 0
  return Math.round((present / total) * 100)
}

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) redirect('/login')
  if (church.account_type === 'church') redirect('/church-dashboard')

  const admin = createAdminClient()

  // ── Parallel data fetch ───────────────────────────────────────────────────
  const [membersRes, sessionsRes, ftRes] = await Promise.all([
    admin.from('members')
      .select('id, name, phone')
      .eq('church_id', church.id)
      .eq('status', 'active'),  // skip inactive/away — not needed on dashboard

    admin.from('attendance_sessions')
      .select('id, date, group_id, groups(name), attendance_records(member_id, present)')
      .eq('church_id', church.id)
      .order('date', { ascending: false })
      .limit(8),   // only need last 4-8 for streak detection

    admin.from('first_timers')
      .select('id, name, date')
      .eq('church_id', church.id)
      .order('date', { ascending: false })
      .limit(50),
  ])

  const members     = membersRes.data  ?? []
  const sessions    = (sessionsRes.data ?? []).filter(s =>
    s.groups?.name !== 'First Timers' &&
    (s.attendance_records ?? []).some(r => r.member_id !== null)
  )
  const firstTimers = ftRes.data ?? []

  // ── Last Sunday rate ──────────────────────────────────────────────────────
  const lastSession = sessions[0] ?? null
  const lastSundayRate = lastSession
    ? attendanceRate(
        lastSession.attendance_records.filter(r => r.present).length,
        lastSession.attendance_records.length
      )
    : null
  const lastSundayColor = lastSundayRate === null ? '#1a3a2a'
    : lastSundayRate >= 70 ? '#16a34a' : '#dc2626'

  // ── Pending follow-ups ────────────────────────────────────────────────────
  const followUpData = church.follow_up_data ?? {}
  const pendingFollowUps = []

  if (lastSession) {
    const absentRecords = (lastSession.attendance_records ?? []).filter(r => !r.present && r.member_id)
    const nameMap = {}
    for (const m of members) nameMap[m.id] = m.name
    for (const r of absentRecords) {
      const key = `${lastSession.id}_${r.member_id}`
      if (!(followUpData[key]?.reached)) {
        pendingFollowUps.push({ key, memberId: r.member_id, name: nameMap[r.member_id] || r.name || 'Unknown', sessionId: lastSession.id, date: lastSession.date })
      }
    }
  }

  // ── Needs Attention: consecutive absences (2+ Sundays in a row) ───────────
  const recentSessions = sessions.slice(0, 4)
  const consecutiveAbsent = []

  if (recentSessions.length >= 2) {
    const phoneMap = {}
    for (const m of members) if (m.phone) phoneMap[m.id] = m.phone

    for (const member of members) {
      let streak = 0
      for (const s of recentSessions) {
        const rec = (s.attendance_records ?? []).find(r => r.member_id === member.id)
        if (!rec || !rec.present) streak++
        else break
      }
      if (streak >= 2) {
        consecutiveAbsent.push({ id: member.id, name: member.name, phone: member.phone ?? null, streak })
      }
    }
    consecutiveAbsent.sort((a, b) => b.streak - a.streak)
  }

  // ── Needs Attention: below 50% this month ────────────────────────────────
  const now          = new Date()
  const thisMonth    = now.getMonth()
  const thisYear     = now.getFullYear()

  const monthSessions = sessions.filter(s => {
    const d = new Date(s.date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })

  const lowAttendance = []

  if (monthSessions.length >= 2) {
    for (const member of members) {
      const attended = monthSessions.filter(s =>
        (s.attendance_records ?? []).find(r => r.member_id === member.id && r.present)
      ).length
      const percentage = Math.round((attended / monthSessions.length) * 100)
      if (percentage < 50) {
        lowAttendance.push({ id: member.id, name: member.name, attended, total: monthSessions.length, percentage })
      }
    }
    lowAttendance.sort((a, b) => a.percentage - b.percentage)
  }

  return (
    <DashboardClient
      church={church}
      members={members}
      sessions={sessions}
      firstTimers={firstTimers}
      pendingFollowUps={pendingFollowUps}
      pendingCount={pendingFollowUps.length}
      lastSundayRate={lastSundayRate}
      lastSundayColor={lastSundayColor}
      consecutiveAbsent={consecutiveAbsent}
      lowAttendance={lowAttendance}
    />
  )
}