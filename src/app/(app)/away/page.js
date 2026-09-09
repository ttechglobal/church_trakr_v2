import { getUser, getChurchLean }  from '@/lib/auth'
import { createAdminClient }        from '@/lib/supabase/admin'
import { unstable_cache }           from 'next/cache'
import AwayClient                   from '@/components/away/AwayClient'

export const metadata  = { title: 'Away Members' }
export const revalidate = 60

function getCachedAwayAndActiveMembers(churchId) {
  const admin = createAdminClient()
  return unstable_cache(
    async () => {
      const { data } = await admin
        .from('members')
        .select('id, name, phone, status, groupIds, away_since, away_contact')
        .eq('church_id', churchId)
        .in('status', ['away', 'active'])
        .order('name', { ascending: true })
      return data ?? []
    },
    [`away-members:${churchId}`],
    { revalidate: 60, tags: [`members:${churchId}`] }
  )()
}

export default async function AwayPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  // away page only needs admin_name for display — lean query is sufficient
  const church = await getChurchLean(user.id)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const allMembers  = await getCachedAwayAndActiveMembers(church.id)
  const awayMembers   = allMembers.filter(m => m.status === 'away')
  const activeMembers = allMembers.filter(m => m.status === 'active')

  return (
    <AwayClient
      churchId={church.id}
      awayMembers={awayMembers}
      activeMembers={activeMembers}
      currentUserName={church.admin_name || user.email || 'Team member'}
    />
  )
}
