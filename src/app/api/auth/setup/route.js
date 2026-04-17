import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeInput } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()

    const userId    = sanitizeInput(body.userId ?? '')
    const groupName = sanitizeInput(body.groupName ?? '') || 'My Church'
    const adminName = sanitizeInput(body.adminName ?? '') || 'Admin'

    if (!userId || userId.length !== 36) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check if already exists — idempotent
    const { data: existing } = await admin
      .from('churches')
      .select('id')
      .eq('admin_user_id', userId)
      .single()

    if (existing) {
      return NextResponse.json({ success: true, created: false })
    }

    const { error } = await admin
      .from('churches')
      .insert({
        admin_user_id: userId,
        name: groupName,
        admin_name: adminName,
        plan: 'free',
        sms_credits: 0,
        follow_up_data: {},
        attendee_followup_data: {},
      })

    if (error) {
      // Race condition — already created by another request
      if (error.code === '23505') {
        return NextResponse.json({ success: true, created: false })
      }
      console.error('[/api/auth/setup]', error.message)
      return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, created: true })
  } catch (err) {
    console.error('[/api/auth/setup] unexpected:', err.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}