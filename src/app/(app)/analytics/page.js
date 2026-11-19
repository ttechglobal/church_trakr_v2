import { getUser, getChurchFull }       from '@/lib/auth'
import { getCachedGroups,
         getCachedRecentSessions,
         getCachedMembers,
         getCachedFirstTimers }      from '@/lib/cached-queries'
import { createAdminClient }         from '@/lib/supabase/admin'
import { unstable_cache }            from 'next/cache'
import AnalyticsClient               from '@/components/analytics/AnalyticsClient'

export const metadata  = { title: 'Analytics' }
export const revalidate = 300  // analytics are fine with 5min cache

function getCachedAwayMembers(churchId) {
  const admin = createAdminClient()
  return unstable_cache(
    async () => {
      const { data } = await admin
        .from('members')
        .select('id,name,away_since')
        .eq('church_id', churchId)
        .eq('status', 'away')
      return data ?? []
    },
    [`members:away:${churchId}`],
    { revalidate: 300, tags: [`members:${churchId}`] }
  )()
}

export default async function AnalyticsPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  // Analytics uses follow_up_data — full getChurch is correct
  const church = await getChurchFull(user.id)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const [groups, sessions, members, firstTimers, awayMembers] = await Promise.all([
    getCachedGroups(church.id),
    getCachedRecentSessions(church.id, 52),
    getCachedMembers(church.id, 'id,name,status,created_at,groupIds'),
    getCachedFirstTimers(church.id, 500),
    getCachedAwayMembers(church.id),
  ])

  return (
    <AnalyticsClient
      church={church}
      groups={groups}
      sessions={sessions}
      members={members}
      firstTimers={firstTimers}
      awayMembers={awayMembers}
      followUpData={church.follow_up_data ?? {}}
    />
  )
}
