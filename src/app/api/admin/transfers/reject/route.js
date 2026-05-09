/**
 * POST /api/admin/transfers/reject
 * Body: { transferId, note? }
 */
import { createAdminClient }             from '@/lib/supabase/admin'
import { NextResponse }                  from 'next/server'
import { cookies }                       from 'next/headers'
import { isAdminAuthed, logAdminAction } from '@/lib/adminAuth'

export async function POST(request) {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { transferId, note } = body

  if (!transferId) {
    return NextResponse.json({ error: 'transferId required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: mtr, error: fetchErr } = await admin
    .from('manual_transfer_requests')
    .select('id, church_id, credits_requested')
    .eq('id', transferId)
    .single()

  if (fetchErr || !mtr) {
    return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  }

  await admin
    .from('manual_transfer_requests')
    .update({ status: 'rejected', admin_note: note ?? null })
    .eq('id', transferId)

  await logAdminAction(admin, {
    actionType:     'reject_transfer',
    targetChurchId: mtr.church_id,
    details: { transferId, note: note ?? '' },
  })

  return NextResponse.json({ success: true })
}
