import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GroupDetailClient from '@/components/groups/GroupDetailClient'

export async function generateMetadata() {
  return { title: 'Group' }
}

export default async function GroupDetailPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: church } = await supabase
    .from('churches').select('id, sms_credits').eq('admin_user_id', user.id).single()
  if (!church) redirect('/signup')

  const { data: group } = await supabase
    .from('groups').select('*').eq('id', id).eq('church_id', church.id).single()
  if (!group) notFound()

  const { data: members } = await supabase
    .from('members').select('*').eq('church_id', church.id).eq('status', 'active')
    .contains('groupIds', [id]).order('name', { ascending: true })

  const { data: allMembers } = await supabase
    .from('members').select('id, name, groupIds').eq('church_id', church.id)
    .eq('status', 'active').order('name', { ascending: true })

  const { data: sessions } = await supabase
    .from('attendance_sessions')
    .select('id, date, attendance_records ( present )')
    .eq('church_id', church.id).eq('group_id', id)
    .order('date', { ascending: false }).limit(5)

  return (
    <GroupDetailClient
      church={church}
      group={group}
      members={members ?? []}
      allMembers={allMembers ?? []}
      sessions={sessions ?? []}
    />
  )
}
