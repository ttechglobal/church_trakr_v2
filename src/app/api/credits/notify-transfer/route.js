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

    const { reference, packageName } = await request.json().catch(() => ({}))
    if (!reference || typeof reference !== 'string') {
      return NextResponse.json({ success: false, error: 'reference required' }, { status: 400 })
    }

    // Credits and amount come from OUR record of the order, never from the client.
    const { data: tx } = await admin
      .from('credit_transactions')
      .select('credits, amount_kobo, status')
      .eq('reference', reference)
      .eq('church_id', church.id)
      .maybeSingle()
    if (!tx) return NextResponse.json({ success: false, error: 'Unknown order reference' }, { status: 404 })

    // One request per order
    const { data: dup } = await admin
      .from('manual_transfer_requests')
      .select('id').eq('reference', reference).eq('church_id', church.id).maybeSingle()
    if (dup) return NextResponse.json({ success: true, duplicate: true })

    await admin.from('manual_transfer_requests').insert({
      church_id:             church.id,
      display_name:          church.admin_name ?? 'Unknown',
      email:                 user.email ?? '',
      group_name:            church.name,
      package_name:          String(packageName ?? 'Unknown').slice(0, 60),
      amount_paid:           Math.round((tx.amount_kobo ?? 0) / 100),
      credits_requested:     tx.credits ?? 0,
      reference,
      status:                'pending',
      notified_via_whatsapp: true,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/credits/notify-transfer]', err)
    // Return 200 even on error — WhatsApp still opens on the client
    return NextResponse.json({ success: false })
  }
}
