import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import MessageHistoryClient  from '@/components/messaging/MessageHistoryClient'

export const metadata = { title: 'Message History' }

export default async function MessageHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient()

  // Must use admin client — sms_logs RLS restricts anon/user client reads
  const { data: church, error: churchErr } = await admin
    .from('churches')
    .select('id')
    .eq('admin_user_id', user.id)
    .single()

  if (churchErr || !church) {
    console.error('[history] church fetch failed:', churchErr?.message)
    return <div className="page-content"><p className="text-mist text-sm">Could not load history.</p></div>
  }

  console.log('[history] fetching sms_logs for church_id:', church.id)

  const { data: logs, error: logsErr } = await admin
    .from('sms_logs')
    .select('id, type, message, recipient_count, success_count, fail_count, credits_used, sent_at')
    .eq('church_id', church.id)
    .order('sent_at', { ascending: false })
    .limit(100)

  if (logsErr) {
    console.error('[history] sms_logs fetch failed:', {
      code:    logsErr.code,
      message: logsErr.message,
      details: logsErr.details,
      hint:    logsErr.hint,
    })
  }

  console.log('[history] rows returned:', logs?.length ?? 0)

  return <MessageHistoryClient logs={logs ?? []} />
}
