import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import MembersClient from '@/components/members/MembersClient'

export const metadata = { title: 'Members' }

export default async function MembersPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div className="page-content"><p>Could not load account.</p></div>

  const admin = createAdminClient()

  const { data: members } = await admin
    .from('members').select('*')
    .eq('church_id', church.id).order('name', { ascending: true })

  const { data: groups } = await admin
    .from('groups').select('id,name')
    .eq('church_id', church.id).neq('name', 'First Timers')

  return (
    <MembersClient
      churchId={church.id}
      members={members ?? []}
      groups={groups ?? []}
    />
  )
}