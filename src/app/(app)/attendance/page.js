import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AttendanceFlow from '@/components/attendance/AttendanceFlow'

export const metadata = { title: 'Attendance' }

export default async function AttendancePage({ searchParams }) {
  const user = await getUser()
  if (!user) return <Unauthed />

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <NoChurch />

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

  const params = await searchParams
  return (
    <AttendanceFlow
      church={church}
      groups={groups ?? []}
      sessionsByGroup={sessionsByGroup}
      preselectedGroupId={params?.group ?? null}
    />
  )
}

function Unauthed() {
  return <div className="page"><a href="/login" className="btn btn-primary">Sign in</a></div>
}
function NoChurch() {
  return <div className="page"><p style={{ color: '#8a9e90' }}>Could not load account.</p></div>
}