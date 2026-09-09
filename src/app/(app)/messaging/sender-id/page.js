import { getUser, getChurch }    from '@/lib/auth'
import { createAdminClient }      from '@/lib/supabase/admin'
import SenderIdClient             from '@/components/messaging/SenderIdClient'

export const metadata  = { title: 'Sender ID' }
export const revalidate = 120

export default async function SenderIdPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  // Shares the layout's cached church — no separate auth.getUser() call needed
  const church = await getChurch(user.id)
  if (!church) return <div className="page-content"><p>Church not found.</p></div>

  const admin = createAdminClient()

  // Sender ID request — parallel with nothing else so just a single query
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
