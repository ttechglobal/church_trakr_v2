import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import MessageHistoryClient  from '@/components/messaging/MessageHistoryClient'

export const metadata = { title: 'Message History' }

export default async function MessageHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient()

  const { data: church, error: churchErr } = await admin
    .from('churches')
    .select('id')
    .eq('admin_user_id', user.id)
    .single()

  if (churchErr || !church) {
    console.error('[history] church fetch failed:', churchErr?.message)
    return (
      <div className="page-content">
        <p className="text-mist text-sm">Could not load history.</p>
      </div>
    )
  }

  // ── Fetch logs — columns added by migration ───────────────────────────────
  // If the migration has NOT been run yet, the SELECT will fail with 42703.
  // We catch that case and fall back to the minimal columns that have always
  // existed (id, church_id, recipient_count, success_count, sent_at), so the
  // page still renders rather than crashing.
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
      hint:    fullErr.hint,
    })

    // 42703 = undefined_column — migration hasn't been run yet.
    // Fall back to the columns that definitely exist so the page doesn't crash.
    if (fullErr.code === '42703') {
      console.warn('[history] Falling back to minimal columns — run sms_logs_migration.sql in Supabase to fix this')

      const { data: minimalLogs, error: minErr } = await admin
        .from('sms_logs')
        .select('id, recipient_count, success_count, sent_at')
        .eq('church_id', church.id)
        .order('sent_at', { ascending: false })
        .limit(100)

      if (minErr) {
        console.error('[history] minimal fallback also failed:', minErr.message)
      } else {
        // Normalise to the shape MessageHistoryClient expects —
        // missing columns default to null/0 so the UI renders gracefully
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
    }
    // For any other error, logs stays [] and the empty-state renders
  } else {
    logs = fullLogs ?? []
  }

  return <MessageHistoryClient logs={logs} />
}
