import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import ReportClient from '@/components/report/ReportClient'

export const metadata = { title: 'Reports' }

export default async function ReportPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()
  const [groupsRes, sessionsRes, membersRes, firstTimersRes, awayRes] = await Promise.allSettled([
    admin.from('groups').select('id,name').eq('church_id', church.id).neq('name', 'First Timers'),
    admin.from('attendance_sessions')
      .select('id,date,group_id,groups(name),attendance_records(member_id,name,present)')
      .eq('church_id', church.id)
      .order('date', { ascending: false })
      .limit(200),
    admin.from('members').select('id,name,status,created_at,groupIds').eq('church_id', church.id),
    admin.from('first_timers').select('id,name,date,visits,phone').eq('church_id', church.id).order('date', { ascending: false }),
    admin.from('members').select('id,name,status,away_since').eq('church_id', church.id).eq('status', 'away'),
  ])

  // Pass full church object (includes follow_up_data for follow-up stats)
  return (
    <ReportClient
      church={church}
      groups={groupsRes.status === 'fulfilled' ? (groupsRes.value.data ?? []) : []}
      sessions={sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : []}
      members={membersRes.status === 'fulfilled' ? (membersRes.value.data ?? []) : []}
      firstTimers={firstTimersRes.status === 'fulfilled' ? (firstTimersRes.value.data ?? []) : []}
      awayMembers={awayRes.status === 'fulfilled' ? (awayRes.value.data ?? []) : []}
    />
  )
}
