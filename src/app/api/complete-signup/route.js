import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }       from 'next/server'

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, (_, i) =>
    i === 4 ? '-' : chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      userId, name, adminName, accountType,
      phone, country, state, churchSize, useCases,
    } = body

    if (!userId)      return NextResponse.json({ error: 'userId is required' },      { status: 400 })
    if (!name?.trim()) return NextResponse.json({ error: 'name is required' },       { status: 400 })
    if (!adminName?.trim()) return NextResponse.json({ error: 'adminName required'}, { status: 400 })

    const isChurch = accountType === 'church'
    const admin    = createAdminClient()

    const payload = {
      admin_user_id:  userId,
      name:           name.trim(),
      admin_name:     adminName.trim(),
      account_type:   isChurch ? 'church' : 'group',
      phone:          phone?.trim() || null,
      sms_credits:    0,
      // Onboarding fields
      country:                country  || null,
      state:                  state    || null,
      church_size:            churchSize || null,
      use_cases:              Array.isArray(useCases) ? useCases : [],
      onboarding_complete:    true,
      onboarding_completed_at: new Date().toISOString(),
      connection_code:        isChurch ? makeCode() : null,
    }

    // New church profile being created

    const { data: church, error: insertErr } = await admin
      .from('churches')
      .insert(payload)
      .select('id')
      .single()

    if (insertErr || !church) {
      console.error('[complete-signup] insert failed:', {
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

    // Church profile created successfully

    // Default group for subgroup accounts
    if (!isChurch) {
      const { error: groupErr } = await admin.from('groups').insert({
        church_id: church.id,
        name:      name.trim(),
        leader:    adminName.trim(),
      })
      if (groupErr) console.warn('[complete-signup] default group failed (non-fatal):', groupErr.message)
    }

    return NextResponse.json({ success: true, churchId: church.id })

  } catch (err) {
    console.error('[POST /api/complete-signup]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
