import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ChurchGroupDetailClient from '@/components/church/ChurchGroupDetailClient'

export const metadata = { title: 'Group Detail' }

export default async function ChurchGroupPage({ params }) {
  const { id: subgroupId } = await params
  const user = await getUser()
  if (!user) redirect('/login')
  const church = await getChurch(user.id)
  if (!church || church.account_type !== 'church') redirect('/dashboard')

  const admin = createAdminClient()

  // Verify this church has approved access to this subgroup
  const { data: conn } = await admin.from('church_connections')
    .select('id, status, connected_at')
    .eq('church_id', church.id)
    .eq('subgroup_id', subgroupId)
    .single()

  if (!conn) redirect('/church-dashboard')

  // Fetch subgroup info (name only)
  const { data: subgroup } = await admin.from('churches')
    .select('id, name, admin_name')
    .eq('id', subgroupId)
    .single()

  // Fetch all sessions for this subgroup
  const { data: sessions } = await admin.from('attendance_sessions')
    .select('id, date, groups(name), attendance_records(member_id, name, present)')
    .eq('church_id', subgroupId)
    .order('date', { ascending: false })
    .limit(100)

  // Active member count (name + status only)
  const { data: members } = await admin.from('members')
    .select('id, name, status')
    .eq('church_id', subgroupId)
    .eq('status', 'active')

  return (
    <ChurchGroupDetailClient
      church={church}
      subgroup={subgroup ?? { id: subgroupId, name: 'Unknown', admin_name: '' }}
      connection={conn}
      sessions={(sessions ?? []).filter(s =>
        s.groups?.name !== 'First Timers' &&
        (s.attendance_records ?? []).some(r => r.member_id !== null)
      )}
      memberCount={(members ?? []).length}
    />
  )
}
