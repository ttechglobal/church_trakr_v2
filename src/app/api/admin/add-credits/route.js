/**
 * POST /api/admin/add-credits
 *
 * Uses admin_add_credits() RPC for a single atomic round-trip:
 *   - increments churches.sms_credits
 *   - inserts credit_transactions row
 *   - prepends notification to churches.notifications
 *   - optionally marks manual_transfer_request as credited
 *   - writes admin_audit_log
 *
 * Body: { churchId, credits, note?, transferId? }
 */
import { createAdminClient }         from '@/lib/supabase/admin'
import { NextResponse }              from 'next/server'
import { cookies }                   from 'next/headers'
import { isAdminAuthed }             from '@/lib/adminAuth'

export async function POST(request) {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { churchId, credits, note, transferId } = body

  if (!churchId)           return NextResponse.json({ error: 'churchId required' }, { status: 400 })
  if (!credits || credits < 1) return NextResponse.json({ error: 'credits must be ≥ 1' }, { status: 400 })

  const admin = createAdminClient()

  // Single RPC call — atomic, one round-trip
  const { data, error } = await admin.rpc('admin_add_credits', {
    p_church_id:   churchId,
    p_credits:     credits,
    p_note:        note ?? '',
    p_transfer_id: transferId ?? null,
    p_reference:   `ADMIN-${Date.now()}`,
  })

  if (error) {
    console.error('[POST /api/admin/add-credits] RPC error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)   // { success, newBalance, credits }
}
