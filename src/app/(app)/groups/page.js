import { getUser, getChurchLean }  from '@/lib/auth'
import { createAdminClient }        from '@/lib/supabase/admin'
import { getCachedGroups }          from '@/lib/cached-queries'
import { unstable_cache }           from 'next/cache'
import GroupsClient                 from '@/components/groups/GroupsClient'

export const metadata  = { title: 'Groups' }
export const revalidate = 60

function getCachedGroupStats(churchId, groupIds) {
  const admin = createAdminClient()
  return unstable_cache(
    async () => {
      // Member counts and last-session data in two parallel queries
      const [membersRes, sessionsRes] = await Promise.all([
        admin
          .from('members')
          .select('id, groupIds')
          .eq('church_id', churchId)
          .eq('status', 'active'),
        groupIds.length > 0
          ? admin
              .from('attendance_sessions')
              .select('id, date, group_id, attendance_records(present)')
              .eq('church_id', churchId)
              .in('group_id', groupIds)
              .order('date', { ascending: false })
              .limit(groupIds.length * 2)
          : Promise.resolve({ data: [] }),
      ])

      const memberCountByGroup = {}
      for (const m of (membersRes.data ?? [])) {
        for (const gid of (m.groupIds ?? [])) {
          memberCountByGroup[gid] = (memberCountByGroup[gid] ?? 0) + 1
        }
      }

      const lastSessionByGroup = {}
      for (const s of (sessionsRes.data ?? [])) {
        if (!lastSessionByGroup[s.group_id]) lastSessionByGroup[s.group_id] = s
      }

      return { memberCountByGroup, lastSessionByGroup }
    },
    [`group-stats:${churchId}`],
    { revalidate: 60, tags: [`members:${churchId}`, `sessions:${churchId}`] }
  )()
}

export default async function GroupsPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const church = await getChurchLean(user.id)
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  const groups   = await getCachedGroups(church.id)
  const groupIds = groups.map(g => g.id)
  const { memberCountByGroup, lastSessionByGroup } = await getCachedGroupStats(church.id, groupIds)

  const enriched = groups.map(g => ({
    ...g,
    memberCount: memberCountByGroup[g.id] ?? 0,
    lastSession: lastSessionByGroup[g.id] ?? null,
  }))

  return <GroupsClient churchId={church.id} groups={enriched} />
}
