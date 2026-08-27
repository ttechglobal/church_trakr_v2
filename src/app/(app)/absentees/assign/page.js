import { getUser, getChurch }  from '@/lib/auth'
import { createAdminClient }   from '@/lib/supabase/admin'
import AssignClient            from '@/components/followup/AssignClient'

export const metadata = { title: 'Assign Follow-Ups' }

export default async function AssignPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div className="page-content"><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()

  // Load groups and latest sessions (same logic as absentees page)
  const [groupsRes, sessionsRes] = await Promise.all([
    admin.from('groups').select('id,name')
      .eq('church_id', church.id).neq('name', 'First Timers'),
    admin.from('attendance_sessions')
      .select('id,date,group_id,groups(name),attendance_records(member_id,name,present)')
      .eq('church_id', church.id)
      .order('date', { ascending: false })
      .limit(120),
  ])

  const groups   = groupsRes.data ?? []
  const groupIds = new Set(groups.map(g => g.id))

  const latestByGroup = {}
  for (const s of (sessionsRes.data ?? [])) {
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
    const { data: mems } = await admin.from('members')
      .select('id,name,phone').in('id', [...absentMemberIds])
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

  // Team + assignment history from follow_up_data
  const blob        = church.follow_up_data ?? {}
  const team        = blob.__team__         ?? []
  const assignBlob  = blob.__assignments__  ?? { weekKey: null, assignments: [], history: [] }

  // Week key = date of the most recent session
  const dates = Object.values(latestByGroup).map(s => s.date).sort().reverse()
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
