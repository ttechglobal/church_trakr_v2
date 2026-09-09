import { getUser, getChurch }    from '@/lib/auth'
import { createAdminClient }      from '@/lib/supabase/admin'
import MessageHistoryClient       from '@/components/messaging/MessageHistoryClient'

export const metadata  = { title: 'Message History' }
export const revalidate = 60

export default async function MessageHistoryPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  // Shares the layout's cached church — no separate auth.getUser() call needed
  const church = await getChurch(user.id)
  if (!church) return <div className="page-content"><p className="text-mist text-sm">Could not load history.</p></div>

  const admin = createAdminClient()

  // Fetch logs — graceful fallback if sms_logs migration hasn't been run yet
  let logs = []

  const { data: fullLogs, error: fullErr } = await admin
    .from('sms_logs')
    .select('id, type, message, recipient_count, success_count, fail_count, credits_used, sent_at')
    .eq('church_id', church.id)
    .order('sent_at', { ascending: false })
    .limit(100)

  if (fullErr) {
    console.error('[history] sms_logs fetch failed:', {
      code:    fullErr.code,
      message: fullErr.message,
    })

    // 42703 = undefined_column — migration hasn't been run yet
    if (fullErr.code === '42703') {
      console.warn('[history] Falling back to minimal columns — run sms_logs_migration.sql in Supabase')
      const { data: minimalLogs } = await admin
        .from('sms_logs')
        .select('id, recipient_count, success_count, sent_at')
        .eq('church_id', church.id)
        .order('sent_at', { ascending: false })
        .limit(100)

      logs = (minimalLogs ?? []).map(row => ({
        id:              row.id,
        type:            null,
        message:         null,
        recipient_count: row.recipient_count ?? 0,
        success_count:   row.success_count   ?? 0,
        fail_count:      0,
        credits_used:    0,
        sent_at:         row.sent_at,
      }))
    }
  } else {
    logs = fullLogs ?? []
  }

  return <MessageHistoryClient logs={logs} />
}
