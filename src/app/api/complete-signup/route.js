/**
 * POST /api/complete-signup
 * Writes the churches record using service role — bypasses RLS.
 * Idempotent: safe to call multiple times.
 * No session required: works right after auth.signUp() before email confirmation.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = n => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${seg(5)}-${seg(4)}`
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const { userId, name, adminName, accountType } = body

  console.log('[complete-signup] Received:', { userId: userId?.slice(0,8)+'…', name, adminName, accountType })

  // Validate
  if (!userId)          return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  if (!name?.trim())    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  if (!adminName?.trim()) return NextResponse.json({ error: 'adminName is required' }, { status: 400 })

  let admin
  try {
    admin = createAdminClient()
    console.log('[complete-signup] Admin client created OK')
  } catch (err) {
    console.error('[complete-signup] createAdminClient() threw:', err.message)
    return NextResponse.json({
      error: 'Server configuration error: ' + err.message,
      hint: 'Check that SUPABASE_SERVICE_ROLE_KEY is set in your environment variables and the server has been restarted.',
    }, { status: 503 })
  }

  // Verify userId exists in auth.users
  const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(userId)
  if (authErr || !authUser?.user) {
    console.error('[complete-signup] getUserById failed:', authErr?.message)
    return NextResponse.json({ error: 'User ID not found in auth system' }, { status: 404 })
  }
  console.log('[complete-signup] Auth user verified:', authUser.user.email)

  // Idempotent check
  const { data: existing, error: selectErr } = await admin
    .from('churches')
    .select('id, account_type')
    .eq('admin_user_id', userId)
    .maybeSingle()

  if (selectErr) {
    console.error('[complete-signup] Select existing failed:', {
      message: selectErr.message, code: selectErr.code,
      details: selectErr.details, hint: selectErr.hint,
    })
    // Don't block on this — attempt insert anyway
  }

  if (existing) {
    console.log('[complete-signup] Record already exists:', existing.id, 'type:', existing.account_type)
    return NextResponse.json({ success: true, churchId: existing.id, alreadyExisted: true })
  }

  const isChurch = accountType === 'church'
  const payload = {
    admin_user_id:   userId,
    name:            name.trim(),
    admin_name:      adminName.trim(),
    plan:            'free',
    sms_credits:     0,
    account_type:    isChurch ? 'church' : 'group',
    connection_code: isChurch ? makeCode() : null,
  }
  console.log('[complete-signup] Inserting churches record:', { ...payload, admin_user_id: userId.slice(0,8)+'…' })

  const { data: church, error: insertErr } = await admin
    .from('churches')
    .insert(payload)
    .select('id')
    .single()

  if (insertErr || !church) {
    console.error('[complete-signup] Insert FAILED:', {
      message: insertErr?.message,
      code:    insertErr?.code,
      details: insertErr?.details,
      hint:    insertErr?.hint,
    })
    return NextResponse.json({
      error:   insertErr?.message ?? 'Database insert failed',
      code:    insertErr?.code,
      details: insertErr?.details,
      hint:    insertErr?.hint,
    }, { status: 500 })
  }

  console.log('[complete-signup] Church record created:', church.id)

  // Default group for subgroup accounts (non-fatal)
  if (!isChurch) {
    const { error: groupErr } = await admin.from('groups').insert({
      church_id: church.id,
      name:      name.trim(),
      leader:    adminName.trim(),
    })
    if (groupErr) console.warn('[complete-signup] Default group failed (non-fatal):', groupErr.message)
    else          console.log('[complete-signup] Default group created OK')
  }

  return NextResponse.json({ success: true, churchId: church.id })
}
