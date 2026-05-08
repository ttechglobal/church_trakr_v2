/**
 * POST /api/sms/broadcast
 *
 * Sends an SMS blast to a group of members.
 * Body: {
 *   type: 'sunday_reminder' | 'special_program' | 'custom'
 *   message: string          — the text to send (personalised with {name})
 *   recipients: 'all' | 'group:{groupId}'
 *   programTitle?: string    — for special_program type display only
 * }
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function sendSMS({ to, message, senderId }) {
  const apiKey    = process.env.TERMII_API_KEY
  const provider  = process.env.SMS_PROVIDER ?? 'termii'

  if (!apiKey) {
    console.warn('[broadcast] No SMS API key — skipping actual send')
    return { success: true, simulated: true }
  }

  if (provider === 'termii') {
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        from:    senderId || 'ChurchTrakr',
        sms:     message,
        type:    'plain',
        channel: 'generic',
        api_key: apiKey,
      }),
    })
    const data = await res.json()
    return { success: res.ok, data }
  }

  return { success: false, error: 'Unknown provider' }
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: church } = await admin
      .from('churches')
      .select('id, name, sms_credits, sms_sender_id')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const body = await request.json()
    const { type, message, recipients } = body

    if (!message?.trim())   return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    if (!type)              return NextResponse.json({ error: 'Type is required' }, { status: 400 })

    // Fetch recipients
    let query = admin.from('members')
      .select('id, name, phone')
      .eq('church_id', church.id)
      .eq('status', 'active')
      .not('phone', 'is', null)
      .neq('phone', '')

    if (recipients && recipients.startsWith('group:')) {
      const groupId = recipients.replace('group:', '')
      query = query.contains('groupIds', [groupId])
    }

    const { data: members } = await query

    if (!members?.length) {
      return NextResponse.json({ error: 'No members with phone numbers found' }, { status: 400 })
    }

    const msgCount = members.length
    if (church.sms_credits < msgCount) {
      return NextResponse.json({
        error: `Not enough SMS credits. Need ${msgCount}, have ${church.sms_credits}.`,
        needed: msgCount,
        have: church.sms_credits,
      }, { status: 402 })
    }

    // Send to each member
    const results = []
    let successCount = 0, failCount = 0

    for (const member of members) {
      const firstName = (member.name || '').split(' ')[0] || 'Friend'
      const personalised = message.replace(/\{name\}/gi, firstName)
      const phone = member.phone.replace(/\s+/g, '').replace(/^0/, '+234')

      const result = await sendSMS({
        to: phone,
        message: personalised,
        senderId: church.sms_sender_id || 'ChurchTrakr',
      })

      if (result.success) {
        successCount++
        results.push({ memberId: member.id, name: member.name, status: 'sent' })
      } else {
        failCount++
        results.push({ memberId: member.id, name: member.name, status: 'failed', error: result.error })
      }
    }

    // Deduct credits
    await admin.from('churches')
      .update({ sms_credits: church.sms_credits - successCount })
      .eq('id', church.id)

    // Log to sms_logs
    await admin.from('sms_logs').insert({
      church_id:    church.id,
      type:         type,
      message:      message,
      recipient_count: msgCount,
      success_count:   successCount,
      fail_count:      failCount,
      sent_at:      new Date().toISOString(),
      sent_by:      user.id,
    }).catch(() => {}) // non-fatal

    return NextResponse.json({
      success: true,
      sent:    successCount,
      failed:  failCount,
      total:   msgCount,
      creditsRemaining: church.sms_credits - successCount,
    })

  } catch (err) {
    console.error('[POST /api/sms/broadcast]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
