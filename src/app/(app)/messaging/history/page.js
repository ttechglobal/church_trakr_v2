import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient }  from '@/lib/supabase/admin'
import MessageHistoryClient   from '@/components/messaging/MessageHistoryClient'

export const metadata = { title: 'Message History' }

export default async function MessageHistoryPage() {
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()

  const { data: logs } = await admin
    .from('sms_logs')
    .select('id,type,message,recipient_count,success_count,fail_count,credits_used,sent_at')
    .eq('church_id', church.id)
    .order('sent_at', { ascending: false })
    .limit(100)

  return <MessageHistoryClient logs={logs ?? []} />
}
