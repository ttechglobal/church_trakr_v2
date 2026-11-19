import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeInput } from '@/lib/auth'
import { resolveSignupUserId } from '@/lib/signupAuth'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()

    const groupName = sanitizeInput(body.groupName ?? '').slice(0, 120) || 'My Church'
    const adminName = sanitizeInput(body.adminName ?? '').slice(0, 120) || 'Admin'

    // Verify identity — never trust a bare userId from the client
    const userId = await resolveSignupUserId(sanitizeInput(body.userId ?? ''))
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Check if already exists — idempotent
    const { data: existing } = await admin
      .from('churches')
      .select('id')
      .eq('admin_user_id', userId)
      .maybeSingle()

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
