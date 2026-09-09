import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient }   from '@/lib/supabase/admin'
import { redirect }            from 'next/navigation'
import ChurchGroupDetailClient from '@/components/church/ChurchGroupDetailClient'

export const metadata  = { title: 'Group Detail' }
export const revalidate = 30

export default async function ChurchGroupPage({ params }) {
  const { id: subgroupId } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  // Lean church — shared with layout's React cache() call, no second DB hit
  const church = await getChurch(user.id)
  if (!church || church.account_type !== 'church') redirect('/dashboard')

  const admin = createAdminClient()

  // All three run in parallel
  const [connRes, subgroupRes, sessionsRes, membersRes] = await Promise.all([
    admin.from('church_connections')
      .select('id, status, connected_at')
      .eq('church_id', church.id)
      .eq('subgroup_id', subgroupId)
      .single(),
    admin.from('churches')
      .select('id, name, admin_name')
      .eq('id', subgroupId)
      .single(),
    admin.from('attendance_sessions')
      .select('id, date, groups(name), attendance_records(member_id, name, present)')
      .eq('church_id', subgroupId)
      .order('date', { ascending: false })
      .limit(100),
    admin.from('members')
      .select('id, status')
      .eq('church_id', subgroupId)
      .eq('status', 'active'),
  ])

  if (!connRes.data) redirect('/church-dashboard')

  return (
    <ChurchGroupDetailClient
      church={church}
      subgroup={subgroupRes.data ?? { id: subgroupId, name: 'Unknown', admin_name: '' }}
      connection={connRes.data}
      sessions={(sessionsRes.data ?? []).filter(s =>
        s.groups?.name !== 'First Timers' &&
        (s.attendance_records ?? []).some(r => r.member_id !== null)
      )}
      memberCount={(membersRes.data ?? []).length}
    />
  )
}
