/**
 * GET /api/credits/verify?ref=CT-XXXXXX
 * Called by Paystack after payment. Verifies payment and adds credits.
 * Redirects to /credits?status=success or /credits?status=failed
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const ref = searchParams.get('ref')

  if (!ref) {
    return NextResponse.redirect(new URL('/credits?status=failed', request.url))
  }

  try {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackKey) {
      return NextResponse.redirect(new URL('/credits?status=failed', request.url))
    }

    // Verify with Paystack
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
      { headers: { Authorization: `Bearer ${paystackKey}` } }
    )
    const verifyData = await verifyRes.json()

    if (!verifyData.status || verifyData.data?.status !== 'success') {
      return NextResponse.redirect(new URL('/credits?status=failed', request.url))
    }

    const admin = createAdminClient()
    const meta  = verifyData.data.metadata

    // Check not already processed
    const { data: tx } = await admin
      .from('credit_transactions')
      .select('id, status, credits, church_id')
      .eq('reference', ref)
      .single()

    if (!tx || tx.status === 'completed') {
      return NextResponse.redirect(new URL('/credits?status=already_credited', request.url))
    }

    // Add credits to the church
    const { data: church } = await admin
      .from('churches')
      .select('sms_credits')
      .eq('id', tx.church_id)
      .single()

    await admin.from('churches')
      .update({ sms_credits: (church?.sms_credits ?? 0) + tx.credits })
      .eq('id', tx.church_id)

    // Mark transaction complete
    await admin.from('credit_transactions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('reference', ref)

    return NextResponse.redirect(
      new URL(`/credits?status=success&credits=${tx.credits}`, request.url)
    )

  } catch (err) {
    console.error('[GET /api/credits/verify]', err)
    return NextResponse.redirect(new URL('/credits?status=failed', request.url))
  }
}
