import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AttendanceFlow from '@/components/attendance/AttendanceFlow'

export const metadata = { title: 'Attendance' }

export default async function AttendancePage({ searchParams }) {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()
  const { data: groups } = await admin
    .from('groups').select('id,name,leader')
    .eq('church_id', church.id).neq('name', 'First Timers')
    .order('created_at', { ascending: true })

  const groupIds = (groups ?? []).map(g => g.id)
  const sessionsByGroup = {}
  if (groupIds.length > 0) {
    const { data: sessions } = await admin
      .from('attendance_sessions')
      .select('id,date,group_id,attendance_records(present)')
      .eq('church_id', church.id).in('group_id', groupIds)
      .order('date', { ascending: false }).limit(groupIds.length * 3)
    for (const s of (sessions ?? [])) {
      if (!sessionsByGroup[s.group_id]) sessionsByGroup[s.group_id] = []
      if (sessionsByGroup[s.group_id].length < 2) sessionsByGroup[s.group_id].push(s)
    }
  }

  // Fetch first timers for the first-timers attendance option
  const { data: firstTimers } = await admin
    .from('first_timers')
    .select('id,name,phone,date')
    .eq('church_id', church.id)
    .order('date', { ascending: false })
    .limit(50)

  const params = await searchParams
  return (
    <AttendanceFlow
      church={church}
      groups={groups ?? []}
      sessionsByGroup={sessionsByGroup}
      preselectedGroupId={params?.group ?? null}
      firstTimers={firstTimers ?? []}
    />
  )
}
