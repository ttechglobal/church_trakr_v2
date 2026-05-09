import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient }  from '@/lib/supabase/admin'
import AbsenteesClient        from '@/components/absentees/AbsenteesClient'

export const metadata = { title: 'Follow-Up' }

export default async function AbsenteesPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()

  // ── Parallel: groups + latest sessions ──────────────────────────────────────
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

  // Latest session per group
  const latestByGroup = {}
  for (const s of (sessionsRes.data ?? [])) {
    if (groupIds.has(s.group_id) && !latestByGroup[s.group_id]) latestByGroup[s.group_id] = s
  }

  // Collect absent member IDs
  const absentMemberIds = new Set()
  for (const session of Object.values(latestByGroup)) {
    for (const r of (session.attendance_records ?? [])) {
      if (!r.present && r.member_id) absentMemberIds.add(r.member_id)
    }
  }

  // Fetch phone numbers only for absent members
  let phoneMap = {}
  if (absentMemberIds.size > 0) {
    const { data: mems } = await admin.from('members')
      .select('id,name,phone').in('id', [...absentMemberIds])
    for (const m of (mems ?? [])) phoneMap[m.id] = { phone: m.phone, name: m.name }
  }

  const absenteeData = []
  for (const session of Object.values(latestByGroup)) {
    for (const r of (session.attendance_records ?? [])) {
      if (r.present) continue
      const info = r.member_id ? phoneMap[r.member_id] : null
      absenteeData.push({
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
    <AbsenteesClient
      churchId={church.id}
      absentees={absenteeData}
      groups={groups}
      initialFollowUpData={church.follow_up_data ?? {}}
      hasCredits={(church.sms_credits ?? 0) > 0}
      smsCredits={church.sms_credits ?? 0}
      churchName={church.name ?? ''}
    />
  )
}
