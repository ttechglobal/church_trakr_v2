import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import MessagingHub          from '@/components/messaging/MessagingHub'

export const metadata = { title: 'Messaging' }

export default async function MessagingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient()

  const [churchRes, logsRes] = await Promise.all([
    admin.from('churches')
      .select('id,name,sms_credits,sms_sender_id,sms_sender_id_status')
      .eq('admin_user_id', user.id)
      .single(),
    // will be loaded after we have churchId
    Promise.resolve({ data: null }),
  ])

  const church = churchRes.data
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  const { data: recentLogs } = await admin
    .from('sms_logs')
    .select('id,type,recipient_count,success_count,credits_used,sent_at')
    .eq('church_id', church.id)
    .order('sent_at', { ascending: false })
    .limit(3)

  return <MessagingHub church={church} recentLogs={recentLogs ?? []} />
}
