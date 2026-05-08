import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import BroadcastClient from '@/components/messaging/BroadcastClient'

export const metadata = { title: 'Broadcast SMS' }

export default async function BroadcastPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) redirect('/dashboard')

  const admin = createAdminClient()
  const { data: groups } = await admin
    .from('groups')
    .select('id, name')
    .eq('church_id', church.id)
    .neq('name', 'First Timers')
    .order('name', { ascending: true })

  return <BroadcastClient church={church} groups={groups ?? []} />
}
