import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/credits/verify
 *
 * Called after a church admin confirms they've made a bank transfer.
 * In production, this would be triggered by a webhook or manual admin action.
 * For now, it's a self-service "I've paid" endpoint that logs the request
 * and sends a WhatsApp message to the admin for manual verification.
 *
 * Body: {
 *   package: number,      // credits being purchased
 *   amount: number,       // NGN amount paid
 *   reference?: string,   // bank transfer reference
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: church } = await supabase
      .from('churches')
      .select('id, name, admin_name, sms_credits')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const body = await request.json()
    const { package: creditPackage, amount, reference } = body

    // Log the purchase request
    await supabase.from('usage_logs').insert({
      church_id: church.id,
      event_type: 'credits_purchase_request',
      recipient_count: creditPackage,
      metadata: {
        amount,
        reference,
        church_name: church.name,
        admin_name: church.admin_name,
        current_balance: church.sms_credits,
        email: user.email,
      },
    })

    // In production: trigger webhook or notification to admin
    // For now, return a "pending" response with WhatsApp contact info
    return NextResponse.json({
      success: true,
      status: 'pending',
      message: 'Your payment request has been logged. Credits will be added once payment is confirmed.',
      whatsappContact: '2348050340350',
      reference: reference ?? `CT-${church.id.slice(0, 8).toUpperCase()}`,
    })
  } catch (err) {
    console.error('[POST /api/credits/verify]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
