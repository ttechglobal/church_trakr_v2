/**
 * POST /api/credits/notify-transfer
 *
 * Called when user taps "I Have Made This Transfer".
 * Saves a manual_transfer_request row so the admin can see and action it.
 * Non-blocking — even if this fails, the WhatsApp message still opens.
 */
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: church } = await admin
      .from('churches')
      .select('id, name, admin_name')
      .eq('admin_user_id', user.id)
      .single()
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { reference, packageName, creditsRequested, amountPaid } = await request.json()

    await admin.from('manual_transfer_requests').insert({
      church_id:             church.id,
      display_name:          church.admin_name ?? 'Unknown',
      email:                 user.email ?? '',
      group_name:            church.name,
      package_name:          packageName ?? 'Unknown',
      amount_paid:           amountPaid ?? 0,
      credits_requested:     creditsRequested ?? 0,
      reference:             reference ?? null,
      status:                'pending',
      notified_via_whatsapp: true,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/credits/notify-transfer]', err)
    // Return 200 even on error — WhatsApp still opens on the client
    return NextResponse.json({ success: false, error: err.message })
  }
}
