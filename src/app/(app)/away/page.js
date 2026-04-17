import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AwayClient from '@/components/away/AwayClient'

export const metadata = { title: 'Away Members' }

export default async function AwayPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()

  const { data: allMembers } = await admin
    .from('members')
    .select('id, name, phone, status, groupIds, away_since, away_contact')
    .eq('church_id', church.id)
    .in('status', ['away', 'active'])
    .order('name', { ascending: true })

  const awayMembers   = (allMembers ?? []).filter(m => m.status === 'away')
  const activeMembers = (allMembers ?? []).filter(m => m.status === 'active')

  return (
    <AwayClient
      churchId={church.id}
      awayMembers={awayMembers}
      activeMembers={activeMembers}
      currentUserName={church.admin_name || user.email || 'Team member'}
    />
  )
}