import { getUser, getChurch }  from '@/lib/auth'
import { createAdminClient }   from '@/lib/supabase/admin'
import FollowUpTeamClient      from '@/components/followup/FollowUpTeamClient'

export const metadata = { title: 'Follow-Up Team' }

export default async function FollowUpTeamPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div className="page-content"><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()

  // Load active members for the "add from members" picker
  const { data: members } = await admin
    .from('members')
    .select('id, name, phone')
    .eq('church_id', church.id)
    .eq('status', 'active')
    .order('name')

  // Current team lives in follow_up_data.__team__
  const team = (church.follow_up_data ?? {}).__team__ ?? []

  return (
    <FollowUpTeamClient
      initialTeam={team}
      membersList={members ?? []}
    />
  )
}
