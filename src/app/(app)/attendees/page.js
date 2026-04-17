import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AttendeesClient from '@/components/absentees/AttendeesClient'

export const metadata = { title: 'Attendees' }

export default async function AttendeesPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()

  const { data: groups } = await admin
    .from('groups').select('id,name')
    .eq('church_id', church.id).neq('name', 'First Timers')

  const groupIds = (groups ?? []).map(g => g.id)
  let attendeeData = []

  if (groupIds.length > 0) {
    const { data: sessions } = await admin
      .from('attendance_sessions')
      .select('id,date,group_id,groups(name),attendance_records(member_id,name,present)')
      .eq('church_id', church.id)
      .in('group_id', groupIds)
      .order('date', { ascending: false })

    // Latest session per group only
    const latestByGroup = {}
    for (const s of (sessions ?? [])) {
      if (!latestByGroup[s.group_id]) latestByGroup[s.group_id] = s
    }

    // Collect present members
    const allMemberIds = new Set()
    for (const session of Object.values(latestByGroup)) {
      for (const r of (session.attendance_records ?? [])) {
        if (r.present && r.member_id) allMemberIds.add(r.member_id)
      }
    }

    // Fetch phone numbers
    let phoneMap = {}
    if (allMemberIds.size > 0) {
      const { data: memberRecords } = await admin
        .from('members')
        .select('id, name, phone')
        .in('id', [...allMemberIds])
      for (const m of (memberRecords ?? [])) {
        phoneMap[m.id] = { phone: m.phone, name: m.name }
      }
    }

    for (const session of Object.values(latestByGroup)) {
      for (const r of (session.attendance_records ?? [])) {
        if (!r.present) continue
        const memberInfo = r.member_id ? phoneMap[r.member_id] : null
        attendeeData.push({
          memberId:  r.member_id,
          name:      memberInfo?.name || r.name || 'Unknown',
          phone:     memberInfo?.phone ?? null,
          sessionId: session.id,
          groupId:   session.group_id,
          groupName: session.groups?.name ?? '',
          date:      session.date,
        })
      }
    }
  }

  return (
    <AttendeesClient
      churchId={church.id}
      attendees={attendeeData}
      groups={groups ?? []}
      initialFollowUpData={church.attendee_followup_data ?? {}}
      currentUserName={church.admin_name || user.email || 'Team member'}
    />
  )
}