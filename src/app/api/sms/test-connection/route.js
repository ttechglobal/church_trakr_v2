/**
 * GET /api/sms/test-connection
 *
 * Admin tool — verifies Termii API key is working by calling
 * the Termii balance endpoint. Returns account balance and
 * sender ID status so you can confirm credentials without sending a real SMS.
 *
 * Protected: requires valid user session (church admin).
 */
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const apiKey = process.env.TERMII_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        configured:  false,
        error:       'TERMII_API_KEY is not set in environment variables.',
        senderId:    process.env.TERMII_SENDER_ID ?? null,
      })
    }

    // Call Termii balance endpoint to verify key
    const res = await fetch(`https://api.ng.termii.com/api/get-balance?api_key=${apiKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = { raw: text } }

    console.log('[test-connection] Termii balance response:', JSON.stringify(data))

    if (!res.ok) {
      return NextResponse.json({
        configured:  true,
        connected:   false,
        error:       data.message ?? `Termii returned HTTP ${res.status}`,
        senderId:    process.env.TERMII_SENDER_ID ?? null,
        raw:         data,
      })
    }

    // Fetch church's sender ID status too
    const admin = createAdminClient()
    const { data: church } = await admin
      .from('churches')
      .select('sms_sender_id, sms_sender_id_status')
      .eq('admin_user_id', user.id)
      .single()

    return NextResponse.json({
      configured:  true,
      connected:   true,
      balance:     data.balance ?? null,
      currency:    data.currency ?? 'NGN',
      senderId:    process.env.TERMII_SENDER_ID ?? 'ChurchTrakr',
      customSenderId:       church?.sms_sender_id ?? null,
      customSenderIdStatus: church?.sms_sender_id_status ?? null,
      termiiResponse: data,
    })

  } catch (err) {
    console.error('[GET /api/sms/test-connection]', err)
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 })
  }
}
