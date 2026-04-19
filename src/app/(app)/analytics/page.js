import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import AnalyticsClient from '@/components/analytics/AnalyticsClient'

export const metadata = { title: 'Analytics' }

export default async function AnalyticsPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()
  const [groupsRes, sessionsRes, membersRes, firstTimersRes, awayRes, followUpRes] = await Promise.allSettled([
    admin.from('groups').select('id,name').eq('church_id', church.id).neq('name', 'First Timers'),
    admin.from('attendance_sessions')
      .select('id,date,group_id,groups(name),attendance_records(member_id,name,present)')
      .eq('church_id', church.id)
      .order('date', { ascending: false })
      .limit(300),
    admin.from('members').select('id,name,status,created_at,groupIds').eq('church_id', church.id),
    admin.from('first_timers').select('id,name,date,visits').eq('church_id', church.id).order('date', { ascending: false }),
    admin.from('members').select('id,name,away_since').eq('church_id', church.id).eq('status', 'away'),
    Promise.resolve({ data: church.follow_up_data ?? {} }),
  ])

  const groups      = groupsRes.status      === 'fulfilled' ? (groupsRes.value.data      ?? []) : []
  const sessions    = sessionsRes.status    === 'fulfilled' ? (sessionsRes.value.data    ?? []) : []
  const members     = membersRes.status     === 'fulfilled' ? (membersRes.value.data     ?? []) : []
  const firstTimers = firstTimersRes.status === 'fulfilled' ? (firstTimersRes.value.data ?? []) : []
  const awayMembers = awayRes.status        === 'fulfilled' ? (awayRes.value.data        ?? []) : []
  const followUpData = followUpRes.status   === 'fulfilled' ? (followUpRes.value.data    ?? {}) : {}

  return (
    <AnalyticsClient
      church={church}
      groups={groups}
      sessions={sessions}
      members={members}
      firstTimers={firstTimers}
      awayMembers={awayMembers}
      followUpData={followUpData}
    />
  )
}
