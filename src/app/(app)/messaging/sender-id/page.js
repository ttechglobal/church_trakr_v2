import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import SenderIdClient        from '@/components/messaging/SenderIdClient'

export const metadata = { title: 'Sender ID' }

export default async function SenderIdPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient()
  const { data: church } = await admin
    .from('churches')
    .select('id, sms_sender_id, sms_sender_id_status')
    .eq('admin_user_id', user.id)
    .single()

  if (!church) return <div className="page-content"><p>Church not found.</p></div>

  // Also load latest sender_id_request for rejection reason
  const { data: request } = await admin
    .from('sender_id_requests')
    .select('id, requested_sender_id, status, rejection_reason, requested_at')
    .eq('church_id', church.id)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <SenderIdClient
      churchId={church.id}
      currentSenderId={church.sms_sender_id ?? null}
      currentStatus={church.sms_sender_id_status ?? null}
      latestRequest={request ?? null}
    />
  )
}
