/**
 * POST /api/settings/sender-id
 *
 * Submits a custom sender ID request.
 * Validates Termii rules server-side before saving.
 * Saves to sender_id_requests table for admin review.
 */
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

// Termii sender ID rules
const BLOCKED_GENERIC = ['sms', 'alert', 'info', 'news', 'update', 'notify', 'notification', 'message', 'text', 'promo', 'offer', 'deal']

function validateSenderId(id) {
  if (!id || typeof id !== 'string') return 'Sender ID is required'
  const trimmed = id.trim()
  if (trimmed.length < 3)  return 'Sender ID must be at least 3 characters'
  if (trimmed.length > 11) return 'Sender ID must be 11 characters or fewer'
  if (!/^[A-Za-z0-9]+$/.test(trimmed)) return 'Sender ID must be letters and numbers only — no spaces or special characters'
  if (BLOCKED_GENERIC.includes(trimmed.toLowerCase())) return `"${trimmed}" is too generic and will be rejected by the SMS network. Use your organisation name instead.`
  return null // valid
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { senderId, useCase } = body

    // Validate
    const validationError = validateSenderId(senderId)
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    if (!useCase?.trim()) return NextResponse.json({ error: 'Please provide a use case / reason' }, { status: 400 })

    const admin = createAdminClient()
    const { data: church } = await admin
      .from('churches')
      .select('id, sms_sender_id, sms_sender_id_status')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    // Cancel any existing pending request
    await admin.from('sender_id_requests')
      .update({ status: 'cancelled' })
      .eq('church_id', church.id)
      .eq('status', 'pending')

    // Create new request
    const { data: req, error } = await admin
      .from('sender_id_requests')
      .insert({
        church_id:           church.id,
        requested_sender_id: senderId.trim(),
        use_case:            useCase.trim(),
        status:              'pending',
        termii_submitted:    false,
      })
      .select()
      .single()

    if (error) throw error

    // Update churches.sms_sender_id to the requested value with 'pending' status
    await admin.from('churches')
      .update({ sms_sender_id: senderId.trim(), sms_sender_id_status: 'pending' })
      .eq('id', church.id)

    return NextResponse.json({ success: true, request: req })

  } catch (err) {
    console.error('[POST /api/settings/sender-id]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  // Cancel a pending sender ID request
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: church } = await admin
      .from('churches').select('id').eq('admin_user_id', user.id).single()
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await admin.from('sender_id_requests')
      .update({ status: 'cancelled' })
      .eq('church_id', church.id)
      .eq('status', 'pending')

    await admin.from('churches')
      .update({ sms_sender_id: null, sms_sender_id_status: null })
      .eq('id', church.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
