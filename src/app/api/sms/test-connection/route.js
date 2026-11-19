/**
 * GET /api/sms/test-connection
 *
 * Super-admin only — verifies the Termii API key by calling the balance
 * endpoint. Never exposes the key or the raw gateway response.
 */
import { NextResponse }  from 'next/server'
import { cookies }       from 'next/headers'
import { isAdminAuthed } from '@/lib/adminAuth'

export async function GET() {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.TERMII_API_KEY
  const senderId = process.env.TERMII_SENDER_ID ?? 'ChurchTrakr'
  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      error: 'TERMII_API_KEY is not set in environment variables.',
      senderId,
    })
  }

  try {
    const res = await fetch(`https://api.ng.termii.com/api/get-balance?api_key=${encodeURIComponent(apiKey)}`)
    const text = await res.text()
    let data
    try { data = JSON.parse(text) } catch { data = {} }

    if (!res.ok) {
      return NextResponse.json({
        configured: true,
        connected:  false,
        error:      data.message ?? `Termii returned HTTP ${res.status}`,
        senderId,
      })
    }

    return NextResponse.json({
      configured: true,
      connected:  true,
      balance:    data.balance ?? null,
      currency:   data.currency ?? 'NGN',
      senderId,
    })
  } catch (err) {
    console.error('[GET /api/sms/test-connection] failed')
    return NextResponse.json({ error: 'Could not reach SMS gateway' }, { status: 502 })
  }
}
