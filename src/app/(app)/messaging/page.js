import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import MessagingHome from '@/components/messaging/MessagingHome'

export const metadata = { title: 'Messaging' }

export default async function MessagingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: church } = await admin
    .from('churches').select('id,sms_credits,sms_sender_id,sms_sender_id_status')
    .eq('admin_user_id', user.id).single()
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  const { data: groups } = await admin
    .from('groups').select('id,name')
    .eq('church_id', church.id).neq('name', 'First Timers')

  const { data: members } = await admin
    .from('members').select('id,name,phone,groupIds')
    .eq('church_id', church.id).eq('status', 'active')

  const groupIds = (groups ?? []).map(g => g.id)
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
  for (const m of (members ?? [])) {
    if (m.phone) phoneMap[m.id] = { phone: m.phone, name: m.name }
  }

  return (
    <MessagingHome
      church={church} groups={groups ?? []} members={members ?? []}
      latestByGroup={latestByGroup} phoneMap={phoneMap}
    />
  )
}