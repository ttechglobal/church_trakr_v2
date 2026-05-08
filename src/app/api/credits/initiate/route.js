/**
 * POST /api/credits/initiate
 * Initiates a credit purchase.
 *
 * If PAYSTACK_SECRET_KEY is set → creates a Paystack payment session
 * and returns a paymentUrl to redirect to.
 *
 * If no gateway is configured → returns manual payment details
 * (bank transfer) so the user knows what to do.
 */
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

const PACKS = {
  starter:  { credits: 100,  price: 150000 },  // ₦1,500 in kobo
  basic:    { credits: 300,  price: 400000 },
  standard: { credits: 600,  price: 750000 },
  growth:   { credits: 1200, price: 1400000 },
  premium:  { credits: 2500, price: 2750000 },
}

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
    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const { packId } = await request.json()
    const pack = PACKS[packId]
    if (!pack) return NextResponse.json({ error: 'Invalid pack' }, { status: 400 })

    const reference = `CT-${church.id.slice(0, 8).toUpperCase()}-${Date.now()}`

    // ── Paystack integration ────────────────────────────────────────────────
    const paystackKey = process.env.PAYSTACK_SECRET_KEY
    if (paystackKey) {
      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email:     user.email,
          amount:    pack.price,  // in kobo
          reference,
          metadata: {
            church_id:   church.id,
            pack_id:     packId,
            credits:     pack.credits,
            church_name: church.name,
            custom_fields: [
              { display_name: 'Church',   variable_name: 'church',  value: church.name },
              { display_name: 'Credits',  variable_name: 'credits', value: String(pack.credits) },
            ],
          },
          callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/credits/verify?ref=${reference}`,
        }),
      })
      const paystackData = await paystackRes.json()
      if (paystackData.status && paystackData.data?.authorization_url) {
        // Log pending transaction
        await admin.from('credit_transactions').insert({
          church_id:   church.id,
          pack_id:     packId,
          credits:     pack.credits,
          amount_kobo: pack.price,
          reference,
          status:      'pending',
          gateway:     'paystack',
          created_at:  new Date().toISOString(),
        }).catch(() => {})  // non-fatal — table may not exist yet

        return NextResponse.json({
          paymentUrl: paystackData.data.authorization_url,
          reference,
        })
      }
    }

    // ── Manual bank transfer fallback ───────────────────────────────────────
    // When no payment gateway is configured, return bank details.
    // Admin manually adds credits after confirming payment.
    await admin.from('credit_transactions').insert({
      church_id:   church.id,
      pack_id:     packId,
      credits:     pack.credits,
      amount_kobo: pack.price,
      reference,
      status:      'pending_manual',
      gateway:     'manual',
      created_at:  new Date().toISOString(),
    }).catch(() => {})

    return NextResponse.json({
      manual: true,
      reference,
      paymentDetails: {
        'Bank':          process.env.BANK_NAME    ?? 'Contact us for bank details',
        'Account Name':  process.env.BANK_ACCOUNT_NAME ?? 'ChurchTrakr',
        'Account Number': process.env.BANK_ACCOUNT_NUMBER ?? '—',
        'Amount':        `₦${(pack.price / 100).toLocaleString()}`,
        'Reference':     reference,
      },
    })

  } catch (err) {
    console.error('[POST /api/credits/initiate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
