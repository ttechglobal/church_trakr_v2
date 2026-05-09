import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AbsenteesClient from '@/components/absentees/AbsenteesClient'

export const metadata = { title: 'Follow-Up' }

export default async function AbsenteesPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()

  // ── Parallel fetch: groups + sessions ────────────────────────────────────
  const [groupsRes, sessionsRes] = await Promise.all([
    admin.from('groups').select('id,name')
      .eq('church_id', church.id).neq('name', 'First Timers'),
    admin.from('attendance_sessions')
      .select('id,date,group_id,groups(name),attendance_records(member_id,name,present)')
      .eq('church_id', church.id)
      .order('date', { ascending: false })
      .limit(100),
  ])

  const groups   = groupsRes.data ?? []
  const groupIds = groups.map(g => g.id)

  const latestByGroup = {}
  for (const s of (sessionsRes.data ?? [])) {
    if (groupIds.includes(s.group_id) && !latestByGroup[s.group_id]) {
      latestByGroup[s.group_id] = s
    }
  }

  const allMemberIds = new Set()
  for (const session of Object.values(latestByGroup)) {
    for (const r of (session.attendance_records ?? [])) {
      if (!r.present && r.member_id) allMemberIds.add(r.member_id)
    }
  }

  let phoneMap = {}
  if (allMemberIds.size > 0) {
    const { data: memberRecords } = await admin
      .from('members').select('id, name, phone').in('id', [...allMemberIds])
    for (const m of (memberRecords ?? [])) {
      phoneMap[m.id] = { phone: m.phone, name: m.name }
    }
  }

  const absenteeData = []
  for (const session of Object.values(latestByGroup)) {
    for (const r of (session.attendance_records ?? [])) {
      if (r.present) continue
      const memberInfo = r.member_id ? phoneMap[r.member_id] : null
      absenteeData.push({
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

  return (
    <AbsenteesClient
      churchId={church.id}
      absentees={absenteeData}
      groups={groups}
      initialFollowUpData={church.follow_up_data ?? {}}
      hasCredits={church.sms_credits > 0}
      smsCredits={church.sms_credits ?? 0}
      churchName={church.name ?? ''}
      currentUserName={church.admin_name || user.email || 'Team member'}
    />
  )
}
