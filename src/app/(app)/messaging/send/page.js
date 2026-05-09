import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import MessagingComposer     from '@/components/messaging/MessagingComposer'

export const metadata = { title: 'Send Message' }

export default async function SendMessagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient()

  const [churchRes, groupsRes, membersRes] = await Promise.all([
    admin.from('churches')
      .select('id,name,sms_credits,sms_sender_id,sms_sender_id_status')
      .eq('admin_user_id', user.id).single(),
    admin.from('groups').select('id,name')
      .eq('church_id', (await admin.from('churches').select('id').eq('admin_user_id', user.id).single()).data?.id ?? '')
      .neq('name', 'First Timers'),
    admin.from('members').select('id,name,phone,groupIds')
      .eq('status', 'active').not('phone', 'is', null),
  ])

  const church = churchRes.data
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  const groups  = groupsRes.data  ?? []
  const members = (membersRes.data ?? []).filter(m => m.phone)

  // Build latestByGroup and phoneMap
  const groupIds = groups.map(g => g.id)
  const latestByGroup = {}
  if (groupIds.length > 0) {
    const { data: sessions } = await admin
      .from('attendance_sessions')
      .select('id,date,group_id,attendance_records(member_id,name,present)')
      .eq('church_id', church.id).in('group_id', groupIds)
      .order('date', { ascending: false }).limit(groupIds.length * 2)
    for (const s of (sessions ?? [])) {
      if (!latestByGroup[s.group_id]) latestByGroup[s.group_id] = s
    }
  }

  const phoneMap = {}
  for (const m of members) phoneMap[m.id] = { phone: m.phone, name: m.name }

  return (
    <MessagingComposer
      church={church} groups={groups} members={members}
      latestByGroup={latestByGroup} phoneMap={phoneMap}
    />
  )
}
