import { getUser, getChurch }    from '@/lib/auth'
import { createAdminClient }      from '@/lib/supabase/admin'
import { redirect, notFound }     from 'next/navigation'
import GroupDetailClient          from '@/components/groups/GroupDetailClient'

export const metadata  = { title: 'Group' }
export const revalidate = 60

export default async function GroupDetailPage({ params }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  // Shares layout's cached church — no extra DB round-trip
  const church = await getChurch(user.id)
  if (!church) redirect('/signup')

  const admin = createAdminClient()

  // All four queries in parallel
  const [groupRes, membersRes, allMembersRes, sessionsRes] = await Promise.all([
    admin
      .from('groups')
      .select('id,name,leader,created_at')
      .eq('id', id)
      .eq('church_id', church.id)
      .single(),
    admin
      .from('members')
      .select('id,name,phone,status,groupIds,birthday,address,away_since')
      .eq('church_id', church.id)
      .eq('status', 'active')
      .contains('groupIds', [id])
      .order('name', { ascending: true }),
    admin
      .from('members')
      .select('id,name,groupIds')
      .eq('church_id', church.id)
      .eq('status', 'active')
      .order('name', { ascending: true }),
    admin
      .from('attendance_sessions')
      .select('id,date,attendance_records(present)')
      .eq('church_id', church.id)
      .eq('group_id', id)
      .order('date', { ascending: false })
      .limit(5),
  ])

  if (!groupRes.data) notFound()

  return (
    <GroupDetailClient
      church={church}
      group={groupRes.data}
      members={membersRes.data ?? []}
      allMembers={allMembersRes.data ?? []}
      sessions={sessionsRes.data ?? []}
    />
  )
}
