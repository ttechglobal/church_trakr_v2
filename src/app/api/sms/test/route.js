/**
 * POST /api/sms/test
 * Admin tool — sends a single test SMS to verify the Termii integration.
 * Body: { phone: string, message?: string }
 */
import { createClient }      from '@/lib/supabase/server'
import { NextResponse }      from 'next/server'

function normalisePhone(raw) {
  if (!raw) return null
  const c = String(raw).replace(/\D/g, '')
  if (c.startsWith('234') && c.length >= 13) return c
  if (c.startsWith('0')   && c.length === 11) return '234' + c.slice(1)
  if (c.length === 10     && /^[789]/.test(c)) return '234' + c
  return null
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { phone, message } = await request.json().catch(() => ({}))
    const to = normalisePhone(phone)
    if (!to) return NextResponse.json({ error: 'Valid Nigerian phone number required' }, { status: 400 })

    const apiKey   = process.env.TERMII_API_KEY
    const senderId = process.env.TERMII_SENDER_ID ?? 'ChurchTrakr'

    console.log('=== SMS TEST ===')
    console.log('To:', to, '| API Key present:', !!apiKey, '| Prefix:', apiKey?.slice(0, 8))

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'TERMII_API_KEY environment variable is not set.',
        configured: false,
      })
    }

    const testMessage = message?.trim() || `Church Trakr test message. If you received this, SMS is working correctly. Sent at ${new Date().toLocaleTimeString('en-NG')}.`

    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey, to, from: senderId,
        sms: testMessage, type: 'plain', channel: 'generic',
      }),
    })

    const data = await res.json()
    console.log('Termii test response:', JSON.stringify(data, null, 2))

    const ok = res.ok && (data.message_id || data.code === 'ok' || (typeof data.message === 'string' && data.message.toLowerCase().includes('success')))

    return NextResponse.json({
      success: ok,
      to,
      senderId,
      termiiStatus: res.status,
      termiiResponse: data,
      configured: true,
    })

  } catch (err) {
    console.error('[POST /api/sms/test]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
