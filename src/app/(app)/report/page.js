import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import ReportClient from '@/components/report/ReportClient'

export const metadata = { title: 'Reports' }

export default async function ReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: church } = await admin
    .from('churches')
    .select('id,name,follow_up_data,attendee_followup_data')
    .eq('admin_user_id', user.id).single()
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  const { data: groups } = await admin
    .from('groups').select('id,name')
    .eq('church_id', church.id).neq('name', 'First Timers')

  const { data: sessions } = await admin
    .from('attendance_sessions')
    .select('id,date,group_id,groups(name),attendance_records(member_id,name,present)')
    .eq('church_id', church.id).order('date', { ascending: false }).limit(100)

  const { data: members } = await admin
    .from('members').select('id,name')
    .eq('church_id', church.id).eq('status', 'active')

  return (
    <ReportClient
      church={church} groups={groups ?? []}
      sessions={sessions ?? []} members={members ?? []}
    />
  )
}