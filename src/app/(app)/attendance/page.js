import { getUser, getChurch }    from '@/lib/auth'
import { getCachedGroups }        from '@/lib/cached-queries'
import { createAdminClient }      from '@/lib/supabase/admin'
import { unstable_cache }         from 'next/cache'
import AttendanceFlow             from '@/components/attendance/AttendanceFlow'

export const metadata  = { title: 'Attendance' }
// No global revalidate = 0 — that was bypassing ALL caching including groups.
// Instead we cache groups (5 min) and sessions (60s) individually, and the
// attendance save already calls revalidateTag('sessions:churchId') to bust
// stale session data the moment attendance is recorded.
export const revalidate = 60

// Cache first-timers list for 2 min on the attendance page
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

// Cache the per-group recent sessions used for the streak display.
// Busted immediately when attendance is saved via revalidateTag('sessions:churchId').
function getCachedSessionsByGroup(churchId, groupIds) {
  if (!groupIds.length) return Promise.resolve({})
  const admin = createAdminClient()
  return unstable_cache(
    async () => {
      const { data: sessions } = await admin
        .from('attendance_sessions')
        .select('id,date,group_id,attendance_records(present)')
        .eq('church_id', churchId)
        .in('group_id', groupIds)
        .order('date', { ascending: false })
        .limit(groupIds.length * 3)

      const byGroup = {}
      for (const s of (sessions ?? [])) {
        if (!byGroup[s.group_id]) byGroup[s.group_id] = []
        if (byGroup[s.group_id].length < 2) byGroup[s.group_id].push(s)
      }
      return byGroup
    },
    [`sessions:attendance:${churchId}`],
    { revalidate: 60, tags: [`sessions:${churchId}`] }
  )()
}

export default async function AttendancePage({ searchParams }) {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  // getChurch() is de-duped with the layout's call via React cache() —
  // no second DB round-trip here.
  const church = await getChurch(user.id)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  // Both are cached — groups for 5 min, sessions for 60s
  const groups   = await getCachedGroups(church.id)
  const groupIds = groups.map(g => g.id)

  const [sessionsByGroup, firstTimers] = await Promise.all([
    getCachedSessionsByGroup(church.id, groupIds),
    getCachedRecentFT(church.id),
  ])

  const params = await searchParams
  return (
    <AttendanceFlow
      church={church}
      groups={groups}
      sessionsByGroup={sessionsByGroup}
      preselectedGroupId={params?.group ?? null}
      firstTimers={firstTimers}
    />
  )
}
