import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/sms/send
 *
 * Body: {
 *   recipients: Array<{ name: string, phone: string }>,
 *   message: string,      // may contain {name} token
 *   type: string,         // 'absentees' | 'attendees' | 'group' | 'all' | 'custom'
 * }
 *
 * Returns: {
 *   success: boolean,
 *   sent: number,
 *   failed: number,
 *   credits_used: number,
 *   new_balance: number,
 *   results: Array<{ phone: string, status: string, messageId?: string }>
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: church } = await supabase
      .from('churches')
      .select('id, sms_credits, sms_sender_id, sms_sender_id_status')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const body = await request.json()
    const { recipients, message, type } = body

    if (!recipients?.length || !message?.trim()) {
      return NextResponse.json({ error: 'Recipients and message are required' }, { status: 400 })
    }

    // Each SMS costs 1 credit (1 segment). More segments = more credits.
    const creditsNeeded = recipients.length // simplified — extend for multi-segment
    if (church.sms_credits < creditsNeeded) {
      return NextResponse.json({
        error: 'Insufficient credits',
        creditsNeeded,
        creditsAvailable: church.sms_credits,
      }, { status: 402 })
    }

    // Determine sender ID
    const senderId = church.sms_sender_id_status === 'approved' && church.sms_sender_id
      ? church.sms_sender_id
      : (process.env.TERMII_SENDER_ID ?? 'ChurchTrakr')

    const provider = process.env.SMS_PROVIDER ?? 'termii'

    // ── Send via provider ───────────────────────────────────────────
    const results = await sendViaSMSProvider(provider, {
      recipients,
      message,
      senderId,
    })

    const sent = results.filter(r => r.status === 'sent').length
    const failed = results.filter(r => r.status !== 'sent').length
    const creditsUsed = sent // only deduct for successful sends

    // ── Deduct credits ──────────────────────────────────────────────
    const newBalance = Math.max(0, church.sms_credits - creditsUsed)
    await supabase
      .from('churches')
      .update({ sms_credits: newBalance })
      .eq('id', church.id)

    // ── Log the send ────────────────────────────────────────────────
    await supabase.from('sms_logs').insert({
      church_id: church.id,
      type,
      recipient_count: recipients.length,
      message,
      results,
      credits_used: creditsUsed,
    })

    return NextResponse.json({
      success: true,
      sent,
      failed,
      credits_used: creditsUsed,
      new_balance: newBalance,
      results,
    })
  } catch (err) {
    console.error('[POST /api/sms/send]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── SMS Provider Abstraction ──────────────────────────────────────────────────
// Add new providers here without changing the messaging pages.

async function sendViaSMSProvider(provider, { recipients, message, senderId }) {
  switch (provider) {
    case 'termii':
      return sendViaTermii({ recipients, message, senderId })
    case 'twilio':
      return sendViaTwilio({ recipients, message, senderId })
    default:
      throw new Error(`Unknown SMS provider: ${provider}`)
  }
}

async function sendViaTermii({ recipients, message, senderId }) {
  const TERMII_URL = 'https://api.ng.termii.com/api/sms/send'
  const apiKey = process.env.TERMII_API_KEY

  const results = []

  // Send in parallel batches of 10
  const BATCH = 10
  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH)
    const promises = batch.map(async (recipient) => {
      const personalizedMessage = message.replace(/\{name\}/g, recipient.name.split(' ')[0])
      try {
        const res = await fetch(TERMII_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            to: recipient.phone,
            from: senderId,
            sms: personalizedMessage,
            type: 'plain',
            channel: 'generic',
          }),
        })
        const data = await res.json()
        return {
          phone: recipient.phone,
          name: recipient.name,
          status: data.code === 'ok' ? 'sent' : 'failed',
          messageId: data.message_id,
          error: data.code !== 'ok' ? data.message : undefined,
        }
      } catch (err) {
        return { phone: recipient.phone, name: recipient.name, status: 'failed', error: err.message }
      }
    })
    results.push(...await Promise.all(promises))
  }

  return results
}

async function sendViaTwilio({ recipients, message, senderId }) {
  // Stub — implement when Twilio is needed
  // import twilio from 'twilio'
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  throw new Error('Twilio provider not yet implemented')
}
