import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AttendeesClient from '@/components/absentees/AttendeesClient'

export const metadata = { title: 'Attendees' }

export default async function AttendeesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: church } = await supabase
    .from('churches')
    .select('id, sms_credits, attendee_followup_data')
    .eq('admin_user_id', user.id)
    .single()

  if (!church) redirect('/signup')

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name')
    .eq('church_id', church.id)
    .neq('name', 'First Timers')
    .order('created_at', { ascending: true })

  const groupIds = (groups ?? []).map(g => g.id)
  let attendeeData = []

  if (groupIds.length > 0) {
    const { data: sessions } = await supabase
      .from('attendance_sessions')
      .select('id, date, group_id, groups ( name ), attendance_records ( member_id, name, present )')
      .eq('church_id', church.id)
      .in('group_id', groupIds)
      .order('date', { ascending: false })

    const latestByGroup = {}
    for (const s of (sessions ?? [])) {
      if (!latestByGroup[s.group_id]) latestByGroup[s.group_id] = s
    }

    for (const session of Object.values(latestByGroup)) {
      const present = (session.attendance_records ?? [])
        .filter(r => r.present)
        .map(r => ({
          memberId: r.member_id,
          name: r.name,
          sessionId: session.id,
          groupId: session.group_id,
          groupName: session.groups?.name ?? '',
          date: session.date,
        }))
      attendeeData.push(...present)
    }

    if (attendeeData.length > 0) {
      const memberIds = [...new Set(attendeeData.map(a => a.memberId))]
      const { data: members } = await supabase
        .from('members').select('id, phone').in('id', memberIds)
      const phoneMap = {}
      for (const m of (members ?? [])) phoneMap[m.id] = m.phone
      attendeeData = attendeeData.map(a => ({ ...a, phone: phoneMap[a.memberId] ?? null }))
    }
  }

  return (
    <AttendeesClient
      churchId={church.id}
      attendees={attendeeData}
      groups={groups ?? []}
      initialFollowUpData={church.attendee_followup_data ?? {}}
    />
  )
}
