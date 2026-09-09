import { getUser, getChurch }        from '@/lib/auth'
import { getCachedGroups,
         getCachedRecentSessions,
         getCachedFirstTimers,
         getCachedMembers }           from '@/lib/cached-queries'
import { createAdminClient }          from '@/lib/supabase/admin'
import { unstable_cache }             from 'next/cache'
import ReportClient                   from '@/components/report/ReportClient'

// Report was missing this entirely — caused full SSR on every visit
export const metadata  = { title: 'Reports' }
export const revalidate = 120  // reports are fine with 2min cache

function getCachedAwayMembers(churchId) {
  const admin = createAdminClient()
  return unstable_cache(
    async () => {
      const { data } = await admin
        .from('members')
        .select('id,name,status,away_since')
        .eq('church_id', churchId)
        .eq('status', 'away')
      return data ?? []
    },
    [`members:away:${churchId}`],
    { revalidate: 120, tags: [`members:${churchId}`] }
  )()
}

export default async function ReportPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  // Reports uses follow_up_data from church — full getChurch is correct
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  // All data served from cache — report fetching 200 sessions uncached was very expensive
  const [groups, sessions, members, firstTimers, awayMembers] = await Promise.all([
    getCachedGroups(church.id),
    getCachedRecentSessions(church.id, 200),
    getCachedMembers(church.id, 'id,name,status,created_at,groupIds'),
    getCachedFirstTimers(church.id, 500),
    getCachedAwayMembers(church.id),
  ])

  return (
    <ReportClient
      church={church}
      groups={groups}
      sessions={sessions}
      members={members}
      firstTimers={firstTimers}
      awayMembers={awayMembers}
    />
  )
}
