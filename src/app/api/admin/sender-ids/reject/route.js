/**
 * POST /api/admin/sender-ids/reject
 * Body: { requestId, reason }
 */
import { createAdminClient }             from '@/lib/supabase/admin'
import { NextResponse }                  from 'next/server'
import { cookies }                       from 'next/headers'
import { isAdminAuthed, logAdminAction } from '@/lib/adminAuth'

export async function POST(request) {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId, reason } = await request.json().catch(() => ({}))
  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: req } = await admin
    .from('sender_id_requests')
    .select('id, church_id, requested_sender_id')
    .eq('id', requestId)
    .single()

  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  await admin.from('sender_id_requests').update({
    status:           'rejected',
    rejection_reason: reason ?? '',
    reviewed_at:      new Date().toISOString(),
    reviewed_by:      'super_admin',
  }).eq('id', requestId)

  // Revert church sender ID back to default
  await admin.from('churches').update({
    sms_sender_id:        null,
    sms_sender_id_status: null,
  }).eq('id', req.church_id)

  // In-app notification
  const { data: church } = await admin
    .from('churches').select('notifications').eq('id', req.church_id).single()

  const notif = {
    id:        crypto.randomUUID(),
    type:      'sender_id_rejected',
    message:   `Your Sender ID request '${req.requested_sender_id}' was not approved${reason ? `. Reason: ${reason}` : ''}. You can submit a new request.`,
    href:      '/profile',
    read:      false,
    createdAt: new Date().toISOString(),
  }
  await admin.from('churches').update({
    notifications: [notif, ...(church?.notifications ?? [])].slice(0, 50),
  }).eq('id', req.church_id)

  await logAdminAction(admin, {
    actionType:     'reject_sender_id',
    targetChurchId: req.church_id,
    details: { requestId, senderId: req.requested_sender_id, reason },
  })

  return NextResponse.json({ success: true })
}
