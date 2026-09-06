import { getUser }        from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import FirstTimersClient from '@/components/firsttimers/FirstTimersClient'

export const metadata = { title: 'First Timers' }
export const revalidate = 60

export default async function FirstTimersPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient()

  const { data: church } = await admin
    .from('churches').select('id,sms_credits').eq('admin_user_id', user.id).single()
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  const { data: firstTimers } = await admin
    .from('first_timers').select('*')
    .eq('church_id', church.id).order('date', { ascending: false })

  const { data: groups } = await admin
    .from('groups').select('id,name')
    .eq('church_id', church.id).neq('name', 'First Timers')

  return (
    <FirstTimersClient
      churchId={church.id}
      firstTimers={firstTimers ?? []}
      groups={groups ?? []}
      hasCredits={church.sms_credits > 0}
    />
  )
}