/**
 * POST /api/admin/sender-ids/approve
 * Body: { requestId }
 *
 * Marks the request as approved and updates the church's sender ID status.
 * Admin must have already submitted the ID to Termii externally.
 * Also creates an in-app notification for the church.
 */
import { createAdminClient }             from '@/lib/supabase/admin'
import { NextResponse }                  from 'next/server'
import { cookies }                       from 'next/headers'
import { isAdminAuthed, logAdminAction } from '@/lib/adminAuth'

export async function POST(request) {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { requestId } = await request.json().catch(() => ({}))
  if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: req } = await admin
    .from('sender_id_requests')
    .select('id, church_id, requested_sender_id')
    .eq('id', requestId)
    .single()

  if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  // Update request status
  await admin.from('sender_id_requests').update({
    status:           'approved',
    termii_submitted: true,
    reviewed_at:      new Date().toISOString(),
    reviewed_by:      'super_admin',
  }).eq('id', requestId)

  // Update church's sender ID status to approved
  await admin.from('churches').update({
    sms_sender_id:        req.requested_sender_id,
    sms_sender_id_status: 'approved',
  }).eq('id', req.church_id)

  // Send in-app notification via churches.notifications JSONB
  const { data: church } = await admin
    .from('churches').select('notifications').eq('id', req.church_id).single()

  const notif = {
    id:        crypto.randomUUID(),
    type:      'sender_id_approved',
    message:   `Your custom Sender ID '${req.requested_sender_id}' has been approved! Your messages will now show this name.`,
    href:      '/profile',
    read:      false,
    createdAt: new Date().toISOString(),
  }
  await admin.from('churches').update({
    notifications: [notif, ...(church?.notifications ?? [])].slice(0, 50),
  }).eq('id', req.church_id)

  await logAdminAction(admin, {
    actionType:     'approve_sender_id',
    targetChurchId: req.church_id,
    details: { requestId, senderId: req.requested_sender_id },
  })

  return NextResponse.json({ success: true })
}
