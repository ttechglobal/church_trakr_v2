/**
 * POST /api/credits/initiate
 * Manual bank transfer only — Paystack removed from UI flow for now.
 *
 * Pricing:
 *   Starter   200 credits  base ₦1,000 + ₦100 platform = ₦1,100 total
 *   Standard  400 credits  base ₦2,000 + ₦100 platform = ₦2,100 total
 *   Growth    600 credits  base ₦3,000 + ₦100 platform = ₦3,100 total
 *   Pro     1,000 credits  base ₦5,000 + ₦100 platform = ₦5,100 total
 *   Custom  (n) credits    base n×₦5   + ₦100 platform flat
 */
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

const PLATFORM_CHARGE = 100

const PACKS = {
  starter:  { credits: 200,  baseNaira: 1000, label: 'Starter'  },
  standard: { credits: 400,  baseNaira: 2000, label: 'Standard' },
  growth:   { credits: 600,  baseNaira: 3000, label: 'Growth'   },
  pro:      { credits: 1000, baseNaira: 5000, label: 'Pro'       },
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: church, error: churchErr } = await admin
      .from('churches')
      .select('id, name, admin_name')
      .eq('admin_user_id', user.id)
      .single()

    if (churchErr || !church) {
      return NextResponse.json({ error: 'Church not found' }, { status: 404 })
    }

    const body = await request.json()
    const { packId, customCredits } = body

    let credits, baseNaira, totalNaira, packLabel

    if (packId === 'custom') {
      const qty = parseInt(customCredits)
      if (!qty || qty < 10 || qty > 100000) {
        return NextResponse.json({ error: 'Custom credits must be between 10 and 100,000' }, { status: 400 })
      }
      credits    = qty
      baseNaira  = qty * 5
      totalNaira = baseNaira + PLATFORM_CHARGE
      packLabel  = `Custom (${qty} credits)`
    } else {
      const pack = PACKS[packId]
      if (!pack) return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
      credits    = pack.credits
      baseNaira  = pack.baseNaira
      totalNaira = baseNaira + PLATFORM_CHARGE
      packLabel  = pack.label
    }

    const reference = `CT-${church.id.slice(0, 8).toUpperCase()}-${Date.now()}`

    // Log the pending transaction — non-fatal if it fails
    try {
      await admin.from('credit_transactions').insert({
        church_id:   church.id,
        pack_id:     packId ?? 'custom',
        credits,
        amount_kobo: totalNaira * 100,
        reference,
        status:      'pending_manual',
        gateway:     'manual',
      })
    } catch (logErr) {
      console.warn('[initiate] tx log failed (non-fatal):', logErr?.message)
    }

    return NextResponse.json({
      manual:         true,
      reference,
      credits,
      baseNaira,
      totalNaira,
      platformCharge: PLATFORM_CHARGE,
      packLabel,
      paymentDetails: {
        bank:          process.env.NEXT_PUBLIC_BANK_NAME           ?? 'OPay',
        accountName:   process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME   ?? 'Golden Iroka',
        accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? '8050340350',
      },
    })

  } catch (err) {
    console.error('[POST /api/credits/initiate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}