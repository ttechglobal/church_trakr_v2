import { getUser, getChurchLean }  from '@/lib/auth'
import { getCachedGroups }          from '@/lib/cached-queries'
import { createAdminClient }        from '@/lib/supabase/admin'
import { unstable_cache }           from 'next/cache'
import MembersClient                from '@/components/members/MembersClient'

export const metadata  = { title: 'Members' }
export const revalidate = 60

// Members page needs all statuses so we can't use getCachedActiveMembers
function getCachedAllMembers(churchId) {
  const admin = createAdminClient()
  return unstable_cache(
    async () => {
      const { data } = await admin
        .from('members')
        .select('id, name, phone, status, birthday, groupIds, created_at, address, away_since')
        .eq('church_id', churchId)
        .order('name', { ascending: true })
      return data ?? []
    },
    [`members:all:${churchId}`],
    { revalidate: 60, tags: [`members:${churchId}`] }
  )()
}

export default async function MembersPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  // Members page only needs id — use lean query
  const church = await getChurchLean(user.id)
  if (!church) return <div className="page-content"><p>Could not load account.</p></div>

  const [members, groups] = await Promise.all([
    getCachedAllMembers(church.id),
    getCachedGroups(church.id),
  ])

  return (
    <MembersClient
      churchId={church.id}
      members={members}
      groups={groups}
    />
  )
}
