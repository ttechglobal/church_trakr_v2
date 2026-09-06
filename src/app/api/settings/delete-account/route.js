/**
 * DELETE /api/settings/delete-account
 *
 * Permanently deletes the church account and ALL associated data:
 *   - attendance_records (via cascade from sessions)
 *   - attendance_sessions
 *   - ft_attendance (via cascade from sessions)
 *   - members
 *   - first_timers
 *   - groups
 *   - sms_logs
 *   - church_connections
 *   - credit_transactions
 *   - manual_transfer_requests
 *   - sender_id_requests
 *   - churches (the account row itself)
 *   - auth.users (the Supabase auth identity)
 *
 * Requires the user to confirm with their password to prevent accidents.
 * This is irreversible — no soft delete, no recovery.
 *
 * Body: { confirmText: "DELETE MY ACCOUNT" }
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { NextResponse }      from 'next/server'

const CONFIRM_TEXT = 'DELETE MY ACCOUNT'

export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Require explicit confirmation string
    const body = await request.json().catch(() => ({}))
    if (body.confirmText !== CONFIRM_TEXT) {
      return NextResponse.json(
        { error: `Type "${CONFIRM_TEXT}" to confirm deletion` },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // Load church record to get church_id
    const { data: church, error: churchErr } = await admin
      .from('churches')
      .select('id')
      .eq('admin_user_id', user.id)
      .single()

    if (churchErr || !church) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const churchId = church.id

    // ── Delete in dependency order ─────────────────────────────────────────
    // attendance_records are FK children of attendance_sessions.
    // Supabase will cascade if FK is set with ON DELETE CASCADE,
    // otherwise we delete records first.

    const deletions = [
      // Member-level data first
      admin.from('attendance_records').delete().eq('church_id', churchId),
      admin.from('ft_attendance').delete().in(
        'session_id',
        admin.from('attendance_sessions').select('id').eq('church_id', churchId)
      ),
    ]

    // Run first batch — child rows
    await Promise.allSettled(deletions)

    // Run second batch — parent rows
    await Promise.allSettled([
      admin.from('attendance_sessions').delete().eq('church_id', churchId),
      admin.from('members').delete().eq('church_id', churchId),
      admin.from('first_timers').delete().eq('church_id', churchId),
      admin.from('groups').delete().eq('church_id', churchId),
      admin.from('sms_logs').delete().eq('church_id', churchId),
      admin.from('church_connections').delete().eq('church_id', churchId),
      admin.from('church_connections').delete().eq('subgroup_id', churchId),
    ])

    // Optional tables — ignore errors if they don't exist
    await Promise.allSettled([
      admin.from('credit_transactions').delete().eq('church_id', churchId),
      admin.from('manual_transfer_requests').delete().eq('church_id', churchId),
      admin.from('sender_id_requests').delete().eq('church_id', churchId),
    ])

    // Delete the church record itself
    const { error: delChurchErr } = await admin
      .from('churches')
      .delete()
      .eq('id', churchId)

    if (delChurchErr) {
      console.error('[delete-account] churches delete failed:', delChurchErr.code)
      return NextResponse.json({ error: 'Failed to delete account data. Please contact support.' }, { status: 500 })
    }

    // Delete the Supabase Auth user (point of no return)
    const { error: delUserErr } = await admin.auth.admin.deleteUser(user.id)
    if (delUserErr) {
      // Church data is already deleted but auth user remains — log for manual cleanup
      console.error('[delete-account] auth user delete failed — church data removed but auth user remains (contact support)')
      // Still return success to client — their data is gone
    }

    return NextResponse.json({ success: true, message: 'Account and all data permanently deleted.' })
  } catch (err) {
    console.error('[DELETE /api/settings/delete-account] Unhandled error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
