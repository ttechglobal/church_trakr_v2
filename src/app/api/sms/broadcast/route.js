// src/app/api/sms/broadcast/route.js

import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

function normalisePhone(raw) {
  if (!raw) return null
  let phone = String(raw).replace(/[\s\-().]/g, '')
  if (phone.startsWith('+'))                              return phone.slice(1)
  if (phone.startsWith('234'))                            return phone
  if (phone.startsWith('0') && phone.length === 11)       return '234' + phone.slice(1)
  if (phone.length === 10 && /^[789]/.test(phone))        return '234' + phone
  return phone
}

async function sendSMS({ to, message, senderId, apiKey }) {
  const res = await fetch('https://api.ng.termii.com/api/sms/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      to,
      from:    senderId,
      sms:     message,
      type:    'plain',
      channel: 'generic',
    }),
  })

  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }

  console.log(`[termii/broadcast] to=${to} http=${res.status}`, JSON.stringify(data).slice(0, 200))

  const isSuccess = res.ok && (
    data.message_id ||
    data.code === 'ok' ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('success'))
  )

  return { success: isSuccess, data }
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

    if (!message?.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    if (!type)            return NextResponse.json({ error: 'Type is required'    }, { status: 400 })

    let query = admin.from('members')
      .select('id, name, phone')
      .eq('church_id', church.id)
      .eq('status', 'active')
      .not('phone', 'is', null)
      .neq('phone', '')

    if (recipients?.startsWith('group:')) {
      query = query.contains('groupIds', [recipients.replace('group:', '')])
    }

    const { data: members } = await query
    if (!members?.length) {
      return NextResponse.json({ error: 'No members with phone numbers found' }, { status: 400 })
    }

    if (church.sms_credits < members.length) {
      return NextResponse.json({
        error: `Not enough SMS credits. Need ${members.length}, have ${church.sms_credits}.`,
      }, { status: 402 })
    }

    const apiKey   = process.env.TERMII_API_KEY
    const senderId = church.sms_sender_id || process.env.TERMII_SENDER_ID || 'ChurchTrakr'

    if (!apiKey) {
      console.warn('[broadcast] No TERMII_API_KEY — simulating')
      const newBalance = church.sms_credits - members.length
      await admin.from('churches').update({ sms_credits: newBalance }).eq('id', church.id)
      return NextResponse.json({ success: true, sent: members.length, failed: 0, total: members.length, creditsRemaining: newBalance, simulated: true })
    }

    let successCount = 0, failCount = 0
    const results = []

    for (const member of members) {
      const to        = normalisePhone(member.phone)
      const firstName = (member.name || '').split(' ')[0] || 'Friend'
      const msg       = message.replace(/\{name\}/gi, firstName)

      if (!to) {
        failCount++
        results.push({ name: member.name, status: 'failed', error: 'Invalid phone' })
        continue
      }

      const result = await sendSMS({ to, message: msg, senderId, apiKey })
      if (result.success) { successCount++; results.push({ name: member.name, status: 'sent' }) }
      else                { failCount++;    results.push({ name: member.name, status: 'failed', error: result.data?.message }) }
    }

    const newBalance = Math.max(0, church.sms_credits - successCount)

    await Promise.allSettled([
      admin.from('churches').update({ sms_credits: newBalance }).eq('id', church.id),
      admin.from('sms_logs').insert({
        church_id:       church.id,
        type,
        message,
        recipient_count: members.length,
        success_count:   successCount,
        fail_count:      failCount,
        credits_used:    successCount,
        sent_at:         new Date().toISOString(),
        sent_by:         user.id,
      }),
    ])

    return NextResponse.json({ success: true, sent: successCount, failed: failCount, total: members.length, creditsRemaining: newBalance })

  } catch (err) {
    console.error('[POST /api/sms/broadcast]', err)
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 })
  }
}