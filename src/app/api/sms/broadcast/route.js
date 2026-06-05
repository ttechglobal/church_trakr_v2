// src/app/api/sms/broadcast/route.js
/**
 * POST /api/sms/broadcast
 *
 * Sends a broadcast SMS to all members or a specific group.
 * Credits cost: 5 credits per SMS (1 page), same as /api/sms/send.
 * Deducts credits AFTER successful send.
 */
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

const CREDITS_PER_SMS = 5

function normalisePhone(raw) {
  if (!raw) return null
  const c = String(raw).replace(/[\s\-().+]/g, '')
  if (c.startsWith('234') && c.length >= 13) return c
  if (c.startsWith('0')   && c.length === 11) return '234' + c.slice(1)
  if (c.length === 10     && /^[789]/.test(c)) return '234' + c
  if (c.startsWith('234')) return c
  return null
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

  console.log(`[broadcast] to=${to} http=${res.status}`, JSON.stringify(data).slice(0, 200))

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
    const { data: church, error: churchErr } = await admin
      .from('churches')
      .select('id, name, sms_credits, sms_sender_id, sms_sender_id_status')
      .eq('admin_user_id', user.id)
      .single()

    if (churchErr || !church) {
      console.error('[broadcast] church fetch failed:', churchErr?.message)
      return NextResponse.json({ error: 'Church not found' }, { status: 404 })
    }

    const body = await request.json()
    const { type, message, recipients } = body

    if (!message?.trim()) return NextResponse.json({ error: 'Message is required'    }, { status: 400 })
    if (!type)            return NextResponse.json({ error: 'Message type is required' }, { status: 400 })

    // ── Build recipient list ─────────────────────────────────────────────────
    let query = admin.from('members')
      .select('id, name, phone')
      .eq('church_id', church.id)
      .eq('status', 'active')
      .not('phone', 'is', null)
      .neq('phone', '')

    if (recipients?.startsWith('group:')) {
      const groupId = recipients.replace('group:', '')
      query = query.contains('groupIds', [groupId])
    }

    const { data: members, error: membersErr } = await query
    if (membersErr) {
      console.error('[broadcast] members fetch failed:', membersErr.message)
      return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
    }

    if (!members?.length) {
      return NextResponse.json({ error: 'No members with phone numbers found for this selection' }, { status: 400 })
    }

    // ── Credit check ─────────────────────────────────────────────────────────
    const currentBalance = church.sms_credits ?? 0
    const totalCost      = members.length * CREDITS_PER_SMS
    const maxCanSend     = Math.floor(currentBalance / CREDITS_PER_SMS)

    console.log(`[broadcast] ${members.length} recipients | Cost: ${totalCost} credits | Balance: ${currentBalance} | MaxCanSend: ${maxCanSend}`)

    if (maxCanSend === 0) {
      return NextResponse.json({
        error: `Not enough SMS credits. Sending to ${members.length} member${members.length !== 1 ? 's' : ''} costs ${totalCost} credits (${CREDITS_PER_SMS} per SMS). You have ${currentBalance} credits.`,
        creditsNeeded:    totalCost,
        creditsAvailable: currentBalance,
      }, { status: 402 })
    }

    // Only send to as many as credits allow
    const toSend  = members.slice(0, maxCanSend)
    const skipped = members.slice(maxCanSend)

    if (skipped.length > 0) {
      console.warn(`[broadcast] Skipping ${skipped.length} recipients due to insufficient credits`)
    }

    // ── Sender ID ────────────────────────────────────────────────────────────
    const senderId = (church.sms_sender_id_status === 'approved' && church.sms_sender_id)
      ? church.sms_sender_id
      : (process.env.TERMII_SENDER_ID ?? 'ChurchTrakr')

    const apiKey = process.env.TERMII_API_KEY
    console.log(`[broadcast] Sender: ${senderId} | API key present: ${!!apiKey}`)

    // ── Simulate if no API key ────────────────────────────────────────────────
    if (!apiKey) {
      console.warn('[broadcast] No TERMII_API_KEY — simulating send')
      const creditsUsed = toSend.length * CREDITS_PER_SMS
      const newBalance  = Math.max(0, currentBalance - creditsUsed)

      await admin.from('churches').update({ sms_credits: newBalance }).eq('id', church.id)

      const { error: logErr } = await admin.from('sms_logs').insert({
        church_id:       church.id,
        type,
        message,
        recipient_count: toSend.length,
        success_count:   toSend.length,
        fail_count:      0,
        credits_used:    creditsUsed,
        sent_at:         new Date().toISOString(),
        sent_by:         user.id,
      })
      if (logErr) console.error('[broadcast] sms_logs write failed (simulated):', logErr.message)

      return NextResponse.json({
        success:          true,
        sent:             toSend.length,
        failed:           0,
        total:            toSend.length,
        skipped:          skipped.length,
        creditsRemaining: newBalance,
        simulated:        true,
      })
    }

    // ── Real send — personalised, batched ────────────────────────────────────
    let successCount = 0
    let failCount    = 0
    const results    = []

    const BATCH = 5
    for (let i = 0; i < toSend.length; i += BATCH) {
      const batch = toSend.slice(i, i + BATCH)
      const batchResults = await Promise.all(batch.map(async member => {
        const to = normalisePhone(member.phone)
        if (!to) {
          return { name: member.name, status: 'failed', error: 'Invalid phone number' }
        }
        const firstName = (member.name || '').split(' ')[0] || 'Friend'
        const msg = message
          .replace(/\{name\}/gi, firstName)
          .replace(/\[Name\]/gi, firstName)

        const result = await sendSMS({ to, message: msg, senderId, apiKey })
        return { name: member.name, status: result.success ? 'sent' : 'failed', error: result.success ? undefined : (result.data?.message ?? 'Send failed') }
      }))

      for (const r of batchResults) {
        if (r.status === 'sent') successCount++
        else failCount++
        results.push(r)
      }

      // Small delay between batches to avoid rate limits
      if (i + BATCH < toSend.length) {
        await new Promise(r => setTimeout(r, 300))
      }
    }

    // ── Deduct credits after send ─────────────────────────────────────────────
    const creditsUsed = successCount * CREDITS_PER_SMS
    const newBalance  = Math.max(0, currentBalance - creditsUsed)

    console.log(`[broadcast] Sent: ${successCount} | Failed: ${failCount} | Credits used: ${creditsUsed} | New balance: ${newBalance}`)

    await Promise.allSettled([
      admin.from('churches').update({ sms_credits: newBalance }).eq('id', church.id),
      admin.from('sms_logs').insert({
        church_id:       church.id,
        type,
        message,
        recipient_count: toSend.length,
        success_count:   successCount,
        fail_count:      failCount,
        credits_used:    creditsUsed,
        sent_at:         new Date().toISOString(),
        sent_by:         user.id,
      }),
    ])

    return NextResponse.json({
      success:          true,
      sent:             successCount,
      failed:           failCount,
      total:            toSend.length,
      skipped:          skipped.length,
      creditsRemaining: newBalance,
    })

  } catch (err) {
    console.error('[POST /api/sms/broadcast]', err)
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 })
  }
}
