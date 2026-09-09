import { getUser, getChurch }         from '@/lib/auth'
import { getCachedGroups,
         getCachedAbsenteeSessions }   from '@/lib/cached-queries'
import { createAdminClient }           from '@/lib/supabase/admin'
import AssignClient                    from '@/components/followup/AssignClient'

export const metadata  = { title: 'Assign Follow-Ups' }
export const revalidate = 30

export default async function AssignPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  // Needs follow_up_data for __team__ and __assignments__ — full getChurch is correct
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div className="page-content"><a href="/dashboard">Retry</a></div>

  const [groups, allSessions] = await Promise.all([
    getCachedGroups(church.id),
    getCachedAbsenteeSessions(church.id),   // limit 60, cached 60s
  ])

  const groupIds = new Set(groups.map(g => g.id))

  const latestByGroup = {}
  for (const s of allSessions) {
    if (groupIds.has(s.group_id) && !latestByGroup[s.group_id]) latestByGroup[s.group_id] = s
  }

  const absentMemberIds = new Set()
  for (const session of Object.values(latestByGroup)) {
    for (const r of (session.attendance_records ?? [])) {
      if (!r.present && r.member_id) absentMemberIds.add(r.member_id)
    }
  }

  let phoneMap = {}
  if (absentMemberIds.size > 0) {
    const admin = createAdminClient()
    const { data: mems } = await admin
      .from('members')
      .select('id, name, phone')
      .in('id', [...absentMemberIds])
    for (const m of (mems ?? [])) phoneMap[m.id] = { phone: m.phone, name: m.name }
  }

  const absentees = []
  for (const session of Object.values(latestByGroup)) {
    for (const r of (session.attendance_records ?? [])) {
      if (r.present) continue
      const info = r.member_id ? phoneMap[r.member_id] : null
      absentees.push({
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

  const blob       = church.follow_up_data ?? {}
  const team       = blob.__team__         ?? []
  const assignBlob = blob.__assignments__  ?? { weekKey: null, assignments: [], history: [] }

  const dates   = Object.values(latestByGroup).map(s => s.date).sort().reverse()
  const weekKey = dates[0] ?? new Date().toISOString().slice(0, 10)

  return (
    <AssignClient
      absentees={absentees}
      team={team}
      weekKey={weekKey}
      existingAssignments={assignBlob.weekKey === weekKey ? assignBlob.assignments : []}
      assignmentHistory={assignBlob.history ?? []}
      churchName={church.name ?? ''}
    />
  )
}
