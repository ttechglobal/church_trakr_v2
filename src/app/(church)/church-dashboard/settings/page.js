import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ChurchSettingsClient from '@/components/church/ChurchSettingsClient'

export const metadata = { title: 'Church Settings' }

export default async function ChurchSettingsPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const church = await getChurch(user.id)
  if (!church || church.account_type !== 'church') redirect('/dashboard')

  const admin = createAdminClient()
  const { data: connections } = await admin
    .from('church_connections')
    .select('id, status, connected_at, disconnected_at, requested_at, subgroup_id')
    .eq('church_id', church.id)
    .order('requested_at', { ascending: false })

  const subIds = (connections ?? []).map(c => c.subgroup_id)
  let subgroups = []
  if (subIds.length > 0) {
    const { data } = await admin.from('churches').select('id, name, admin_name').in('id', subIds)
    subgroups = data ?? []
  }

  const enriched = (connections ?? []).map(c => ({
    ...c,
    subgroupName: subgroups.find(s => s.id === c.subgroup_id)?.name ?? 'Unknown',
    subgroupAdmin: subgroups.find(s => s.id === c.subgroup_id)?.admin_name ?? '',
  }))

  return <ChurchSettingsClient church={church} connections={enriched} />
}
