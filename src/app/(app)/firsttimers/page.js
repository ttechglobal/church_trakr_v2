import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import FirstTimersClient from '@/components/firsttimers/FirstTimersClient'

export const metadata = { title: 'First Timers' }

export default async function FirstTimersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

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