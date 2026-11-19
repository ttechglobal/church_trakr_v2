import { getUser, getChurchFull }         from '@/lib/auth'
import { getCachedGroups,
         getCachedAbsenteeSessions }   from '@/lib/cached-queries'   // reuse — same shape
import { createAdminClient }           from '@/lib/supabase/admin'
import AttendeesClient                 from '@/components/absentees/AttendeesClient'

export const metadata  = { title: 'Attendees' }
export const revalidate = 30

export default async function AttendeesPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  // Needs attendee_followup_data — full getChurch is correct here
  const church = await getChurchFull(user.id)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  // Use cached queries — sessions limited to 60, groups cached 5 min
  const [groups, allSessions] = await Promise.all([
    getCachedGroups(church.id),
    getCachedAbsenteeSessions(church.id),   // limit 60, tagged sessions:churchId
  ])

  const groupIds = new Set(groups.map(g => g.id))

  // Latest session per group
  const latestByGroup = {}
  for (const s of allSessions) {
    if (groupIds.has(s.group_id) && !latestByGroup[s.group_id]) latestByGroup[s.group_id] = s
  }

  // Collect present member IDs
  const presentMemberIds = new Set()
  for (const session of Object.values(latestByGroup)) {
    for (const r of (session.attendance_records ?? [])) {
      if (r.present && r.member_id) presentMemberIds.add(r.member_id)
    }
  }

  // Targeted phone lookup — only for members who were present
  let phoneMap = {}
  if (presentMemberIds.size > 0) {
    const admin = createAdminClient()
    const { data: mems } = await admin
      .from('members')
      .select('id, name, phone')
      .in('id', [...presentMemberIds])
    for (const m of (mems ?? [])) phoneMap[m.id] = { phone: m.phone, name: m.name }
  }

  const attendeeData = []
  for (const session of Object.values(latestByGroup)) {
    for (const r of (session.attendance_records ?? [])) {
      if (!r.present) continue
      const info = r.member_id ? phoneMap[r.member_id] : null
      attendeeData.push({
        memberId:  r.member_id,
        name:      info?.name || r.name || 'Unknown',
        phone:     info?.phone ?? null,
        sessionId: session.id,
        groupId:   session.group_id,
        groupName: session.groups?.name ?? '',
        date:      session.date,
      })
    }
  }

  return (
    <AttendeesClient
      churchId={church.id}
      attendees={attendeeData}
      groups={groups}
      initialFollowUpData={church.attendee_followup_data ?? {}}
      currentUserName={church.admin_name || user.email || 'Team member'}
    />
  )
}
