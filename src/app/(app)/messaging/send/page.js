import { getUser, getChurch }    from '@/lib/auth'
import { createAdminClient }      from '@/lib/supabase/admin'
import { getCachedGroups }        from '@/lib/cached-queries'
import MessagingComposer          from '@/components/messaging/MessagingComposer'

export const metadata  = { title: 'Send Message' }
export const revalidate = 60

export default async function SendMessagePage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  // Shares the layout's cached church — no extra DB round-trip.
  const church = await getChurch(user.id)
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  const admin    = createAdminClient()
  const groupIds = (await getCachedGroups(church.id)).map(g => g.id)

  // All three run in parallel now — no nested await inside Promise.all
  const [groupsData, membersRes, sessionsRes] = await Promise.all([
    getCachedGroups(church.id),  // already cached — instant second call
    admin
      .from('members')
      .select('id,name,phone,groupIds')
      .eq('church_id', church.id)     // scoped to this church — security fence
      .eq('status', 'active')
      .not('phone', 'is', null),
    groupIds.length > 0
      ? admin
          .from('attendance_sessions')
          .select('id,date,group_id,attendance_records(member_id,name,present)')
          .eq('church_id', church.id)
          .in('group_id', groupIds)
          .order('date', { ascending: false })
          .limit(groupIds.length * 2)
      : Promise.resolve({ data: [] }),
  ])

  const groups  = groupsData
  const members = (membersRes.data ?? []).filter(m => m.phone)

  const latestByGroup = {}
  for (const s of (sessionsRes.data ?? [])) {
    if (!latestByGroup[s.group_id]) latestByGroup[s.group_id] = s
  }

  const phoneMap = {}
  for (const m of members) phoneMap[m.id] = { phone: m.phone, name: m.name }

  return (
    <MessagingComposer
      church={church}
      groups={groups}
      members={members}
      latestByGroup={latestByGroup}
      phoneMap={phoneMap}
    />
  )
}
