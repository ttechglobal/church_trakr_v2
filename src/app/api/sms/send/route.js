// src/app/api/sms/send/route.js

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
      .select('id, sms_credits, sms_sender_id, sms_sender_id_status')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const body = await request.json()
    const { recipients, message, type } = body

    if (!recipients?.length || !message?.trim()) {
      return NextResponse.json({ error: 'Recipients and message are required' }, { status: 400 })
    }

    const creditsNeeded = recipients.length
    if (church.sms_credits < creditsNeeded) {
      return NextResponse.json({
        error: `Insufficient credits. Need ${creditsNeeded}, have ${church.sms_credits}.`,
        creditsNeeded,
        creditsAvailable: church.sms_credits,
      }, { status: 402 })
    }

    const senderId = (church.sms_sender_id_status === 'approved' && church.sms_sender_id)
      ? church.sms_sender_id
      : (process.env.TERMII_SENDER_ID ?? 'ChurchTrakr')

    const apiKey = process.env.TERMII_API_KEY

    // Simulate if no API key (dev mode)
    if (!apiKey) {
      console.warn('[sms/send] No TERMII_API_KEY — simulating send')
      const newBalance = Math.max(0, church.sms_credits - recipients.length)
      await admin.from('churches').update({ sms_credits: newBalance }).eq('id', church.id)
      return NextResponse.json({
        success: true, sent: recipients.length, failed: 0,
        credits_used: recipients.length, new_balance: newBalance, simulated: true,
      })
    }

    const results = await sendViaTermii({ recipients, message, senderId, apiKey })

    const sent        = results.filter(r => r.status === 'sent').length
    const failed      = results.filter(r => r.status !== 'sent').length
    const creditsUsed = sent
    const newBalance  = Math.max(0, church.sms_credits - creditsUsed)

    await Promise.allSettled([
      admin.from('churches').update({ sms_credits: newBalance }).eq('id', church.id),
      admin.from('sms_logs').insert({
        church_id:       church.id,
        type:            type ?? 'custom',
        recipient_count: recipients.length,
        success_count:   sent,
        fail_count:      failed,
        credits_used:    creditsUsed,
        sent_at:         new Date().toISOString(),
        sent_by:         user.id,
      }),
    ])

    return NextResponse.json({ success: true, sent, failed, credits_used: creditsUsed, new_balance: newBalance, results })

  } catch (err) {
    console.error('[POST /api/sms/send]', err)
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 })
  }
}

// Normalise Nigerian phone numbers to Termii format: 2348012345678
function normalisePhone(raw) {
  if (!raw) return null
  let phone = String(raw).replace(/[\s\-().]/g, '')
  if (phone.startsWith('+'))                              return phone.slice(1)
  if (phone.startsWith('234'))                            return phone
  if (phone.startsWith('0') && phone.length === 11)       return '234' + phone.slice(1)
  if (phone.length === 10 && /^[789]/.test(phone))        return '234' + phone
  return phone
}

async function sendViaTermii({ recipients, message, senderId, apiKey }) {
  const TERMII_URL = 'https://api.ng.termii.com/api/sms/send'
  const results    = []
  const BATCH      = 5

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH)

    const batchResults = await Promise.all(batch.map(async (recipient) => {
      const to = normalisePhone(recipient.phone)
      if (!to) return { phone: recipient.phone, name: recipient.name, status: 'failed', error: 'Invalid phone number' }

      const firstName       = (recipient.name || '').split(' ')[0] || 'Friend'
      const personalisedMsg = message.replace(/\{name\}/gi, firstName)

      try {
        const res = await fetch(TERMII_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: apiKey,
            to,
            from:    senderId,
            sms:     personalisedMsg,
            type:    'plain',
            channel: 'generic',
          }),
        })

        const text = await res.text()
        let data
        try { data = JSON.parse(text) } catch { data = { raw: text } }

        console.log(`[termii] to=${to} http=${res.status}`, JSON.stringify(data).slice(0, 200))

        const isSuccess = res.ok && (
          data.message_id ||
          data.code === 'ok' ||
          (typeof data.message === 'string' && data.message.toLowerCase().includes('success'))
        )

        return {
          phone:     recipient.phone,
          name:      recipient.name,
          status:    isSuccess ? 'sent' : 'failed',
          messageId: data.message_id ?? null,
          error:     isSuccess ? undefined : (data.message ?? `HTTP ${res.status}`),
        }
      } catch (err) {
        return { phone: recipient.phone, name: recipient.name, status: 'failed', error: err.message }
      }
    }))

    results.push(...batchResults)
    if (i + BATCH < recipients.length) await new Promise(r => setTimeout(r, 200))
  }

  return results
}