import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import GroupsClient from '@/components/groups/GroupsClient'

export const metadata = { title: 'Groups' }

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: church } = await admin
    .from('churches').select('id').eq('admin_user_id', user.id).single()
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  const { data: groups } = await admin
    .from('groups').select('id,name,leader,created_at')
    .eq('church_id', church.id).neq('name', 'First Timers')
    .order('created_at', { ascending: true })

  const { data: members } = await admin
    .from('members').select('id,groupIds')
    .eq('church_id', church.id).eq('status', 'active')

  const memberCountByGroup = {}
  for (const m of (members ?? [])) {
    for (const gid of (m.groupIds ?? [])) {
      memberCountByGroup[gid] = (memberCountByGroup[gid] ?? 0) + 1
    }
  }

  const groupIds = (groups ?? []).map(g => g.id)
  const lastSessionByGroup = {}
  if (groupIds.length > 0) {
    const { data: sessions } = await admin
      .from('attendance_sessions')
      .select('id,date,group_id,attendance_records(present)')
      .eq('church_id', church.id).in('group_id', groupIds)
      .order('date', { ascending: false }).limit(groupIds.length * 2)
    for (const s of (sessions ?? [])) {
      if (!lastSessionByGroup[s.group_id]) lastSessionByGroup[s.group_id] = s
    }
  }

  const enriched = (groups ?? []).map(g => ({
    ...g,
    memberCount: memberCountByGroup[g.id] ?? 0,
    lastSession: lastSessionByGroup[g.id] ?? null,
  }))

  return <GroupsClient churchId={church.id} groups={enriched} />
}