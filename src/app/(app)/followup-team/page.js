import { getUser, getChurchFull }   from '@/lib/auth'
import { getCachedActiveMembers } from '@/lib/cached-queries'
import FollowUpTeamClient         from '@/components/followup/FollowUpTeamClient'

export const metadata  = { title: 'Follow-Up Team' }
export const revalidate = 60

export default async function FollowUpTeamPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  // Needs follow_up_data for __team__ array — full getChurch is correct here
  const church = await getChurchFull(user.id)
  if (!church) return <div className="page-content"><a href="/dashboard">Retry</a></div>

  // Member picker list — use cached active members
  const members = await getCachedActiveMembers(church.id)

  // Team lives in follow_up_data.__team__
  const team = (church.follow_up_data ?? {}).__team__ ?? []

  return (
    <FollowUpTeamClient
      initialTeam={team}
      membersList={members}
    />
  )
}
