import { getUser, getChurchLean }   from '@/lib/auth'
import { createAdminClient }         from '@/lib/supabase/admin'
import { unstable_cache }            from 'next/cache'
import AttendanceFlow                from '@/components/attendance/AttendanceFlow'

export const metadata  = { title: 'Attendance' }
export const revalidate = 0  // always fresh — user is actively marking

// Cache first-timers list for 2 min on the attendance page
// (we still need them available for the FT tab)
function getCachedRecentFT(churchId) {
  const admin = createAdminClient()
  return unstable_cache(
    async () => {
      const { data } = await admin
        .from('first_timers')
        .select('id,name,phone,date')
        .eq('church_id', churchId)
        .order('date', { ascending: false })
        .limit(50)
      return data ?? []
    },
    [`ft:attendance:${churchId}`],
    { revalidate: 120, tags: [`ft:${churchId}`] }
  )()
}

export default async function AttendancePage({ searchParams }) {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  // Attendance only needs church.id and the object for AttendanceFlow — lean is enough
  const church = await getChurchLean(user.id)
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

  const [firstTimers] = await Promise.all([
    getCachedRecentFT(church.id),
  ])

  const params = await searchParams
  return (
    <AttendanceFlow
      church={church}
      groups={groups ?? []}
      sessionsByGroup={sessionsByGroup}
      preselectedGroupId={params?.group ?? null}
      firstTimers={firstTimers}
    />
  )
}
