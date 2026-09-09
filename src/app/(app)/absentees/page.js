import { getUser, getChurch }         from '@/lib/auth'
import { getCachedGroups,
         getCachedAbsenteeSessions }   from '@/lib/cached-queries'
import { createAdminClient }           from '@/lib/supabase/admin'
import AbsenteesClient                 from '@/components/absentees/AbsenteesClient'

export const metadata  = { title: 'Follow-Up' }
export const revalidate = 30

export default async function AbsenteesPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  // Absentees needs follow_up_data — full getChurch is correct here
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  // ── Use cached queries ────────────────────────────────────────────────────
  const [groups, allSessions] = await Promise.all([
    getCachedGroups(church.id),
    getCachedAbsenteeSessions(church.id),
  ])

  const groupIds = new Set(groups.map(g => g.id))

  // Latest session per group
  const latestByGroup = {}
  for (const s of allSessions) {
    if (groupIds.has(s.group_id) && !latestByGroup[s.group_id]) latestByGroup[s.group_id] = s
  }

  // Collect absent member IDs
  const absentMemberIds = new Set()
  for (const session of Object.values(latestByGroup)) {
    for (const r of (session.attendance_records ?? [])) {
      if (!r.present && r.member_id) absentMemberIds.add(r.member_id)
    }
  }

  // Fetch phone numbers only for absent members (small targeted query — can't cache this)
  let phoneMap = {}
  if (absentMemberIds.size > 0) {
    const admin = createAdminClient()
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
