/**
 * POST /api/sms/send
 *
 * Pricing: 5 credits per SMS page per recipient.
 * Page boundary: 157 chars (accounts for personalisation overhead).
 *
 * Order of operations (CRITICAL):
 *   1. Validate inputs & check balance
 *   2. Format phone numbers
 *   3. Call Termii bulk API
 *   4. Parse response
 *   5. Deduct credits for successful sends only
 *   6. Log to sms_logs
 *   7. Return result to client
 *
 * Never deduct before Termii confirms.
 */
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

const CREDITS_PER_PAGE = 5
const PAGE_SIZE        = 157   // conservative single-page limit (accounts for {name} expansion)
const MAX_PAGES        = 2     // hard limit on message length (2 pages max)

// ── Helpers ───────────────────────────────────────────────────────────────────

function smsPages(text) {
  if (!text) return 1
  const len = text.length
  if (len <= PAGE_SIZE) return 1
  return Math.min(MAX_PAGES, Math.ceil(len / 153))
}

function formatToInternational(phone) {
  if (!phone) return null
  const cleaned = String(phone).replace(/\D/g, '')
  if (cleaned.startsWith('234') && cleaned.length >= 13) return cleaned
  if (cleaned.startsWith('0')   && cleaned.length === 11) return '234' + cleaned.slice(1)
  if (cleaned.length === 10     && /^[789]/.test(cleaned)) return '234' + cleaned
  if (cleaned.startsWith('234')) return cleaned
  return cleaned || null
}

function personalise(message, name) {
  const first = (name || '').split(' ')[0] || 'Friend'
  return message.replace(/\{name\}/gi, first)
}

// ── Termii: send to a single recipient ───────────────────────────────────────

async function termiiSingle({ to, message, senderId, apiKey }) {
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

  const ok = res.ok && (
    data.message_id ||
    data.code === 'ok' ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('success'))
  )
  return { success: ok, messageId: data.message_id ?? null, raw: data }
}

// ── Termii: bulk send (same message to multiple numbers, no personalisation) ─

async function termiiBulk({ numbers, message, senderId, apiKey }) {
  console.log(`[termii/bulk] sending to ${numbers.length} numbers, msg length ${message.length}`)
  const res = await fetch('https://api.ng.termii.com/api/sms/send/bulk', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      to:      numbers,
      from:    senderId,
      sms:     message,
      type:    'plain',
      channel: 'generic',
    }),
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { raw: text } }
  console.log(`[termii/bulk] response status=${res.status}`, JSON.stringify(data).slice(0, 300))

  const ok = res.ok && (
    data.message_id ||
    data.code === 'ok' ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('success'))
  )
  return { success: ok, raw: data }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Load church via admin client (bypasses RLS)
    const admin = createAdminClient()
    const { data: church, error: churchErr } = await admin
      .from('churches')
      .select('id, name, sms_credits, sms_sender_id, sms_sender_id_status')
      .eq('admin_user_id', user.id)
      .single()

    if (churchErr || !church) {
      return NextResponse.json({ error: 'Church not found' }, { status: 404 })
    }

    // 3. Parse body
    const body = await request.json()
    const { recipients, message, type } = body

    if (!recipients?.length) return NextResponse.json({ error: 'No recipients provided' }, { status: 400 })
    if (!message?.trim())    return NextResponse.json({ error: 'Message is required' }, { status: 400 })

    // 4. Calculate pages & credits
    const pages          = smsPages(message)
    const creditsPerSms  = pages * CREDITS_PER_PAGE
    const currentBalance = church.sms_credits ?? 0
    const maxCanSend     = Math.floor(currentBalance / creditsPerSms)

    console.log(`[sms/send] pages=${pages} creditsPerSms=${creditsPerSms} balance=${currentBalance} maxCanSend=${maxCanSend} requested=${recipients.length}`)

    if (maxCanSend === 0) {
      return NextResponse.json({
        error: `Not enough credits. This message is ${pages} page${pages > 1 ? 's' : ''} — costs ${creditsPerSms} credits per person. You have ${currentBalance} credits.`,
        creditsNeeded: creditsPerSms,
        creditsAvailable: currentBalance,
      }, { status: 402 })
    }

    // 5. Partial send: slice to what we can afford
    const toSend  = recipients.slice(0, maxCanSend)
    const skipped = recipients.slice(maxCanSend)

    // 6. Determine sender ID (fallback to ChurchTrakr)
    const senderId = (church.sms_sender_id_status === 'approved' && church.sms_sender_id)
      ? church.sms_sender_id
      : (process.env.TERMII_SENDER_ID ?? 'ChurchTrakr')

    const apiKey = process.env.TERMII_API_KEY

    // ── No API key: simulate ──────────────────────────────────────────────────
    if (!apiKey) {
      console.warn('[sms/send] TERMII_API_KEY not set — simulating send')
      const creditsUsed = toSend.length * creditsPerSms
      const newBalance  = Math.max(0, currentBalance - creditsUsed)
      await admin.from('churches').update({ sms_credits: newBalance }).eq('id', church.id)
      try {
        await admin.from('sms_logs').insert({
          church_id: church.id, type: type ?? 'custom', message,
          recipient_count: toSend.length, success_count: toSend.length,
          fail_count: 0, credits_used: creditsUsed,
          sent_at: new Date().toISOString(), sent_by: user.id,
        })
      } catch (e) { console.warn('[sms/send] sms_logs insert failed:', e.message) }
      return NextResponse.json({
        success: true, sent: toSend.length, failed: 0,
        skipped: skipped.length, skippedRecipients: skipped.map(r => r.name),
        credits_used: creditsUsed, new_balance: newBalance, simulated: true,
      })
    }

    // ── Check if message contains {name} — if so, must send individually ─────
    const isPersonalised = /\{name\}/i.test(message)

    let sentCount   = 0
    let failCount   = 0
    const results   = []

    if (isPersonalised) {
      // Send individually so each person gets their name in the message
      // Batch in groups of 5 to avoid hammering Termii
      const BATCH = 5
      for (let i = 0; i < toSend.length; i += BATCH) {
        const batch = toSend.slice(i, i + BATCH)
        const batchResults = await Promise.all(batch.map(async (r) => {
          const to = formatToInternational(r.phone)
          if (!to) {
            return { name: r.name, phone: r.phone, status: 'failed', error: 'Invalid phone number' }
          }
          const msg    = personalise(message, r.name)
          const result = await termiiSingle({ to, message: msg, senderId, apiKey })
          console.log(`[termii] ${to} → ${result.success ? 'sent' : 'failed'}`, result.raw?.message ?? '')
          return {
            name:   r.name,
            phone:  r.phone,
            status: result.success ? 'sent' : 'failed',
            error:  result.success ? undefined : (result.raw?.message ?? 'Send failed'),
          }
        }))
        results.push(...batchResults)
        if (i + BATCH < toSend.length) await new Promise(res => setTimeout(res, 200))
      }
    } else {
      // All recipients get the same message — use bulk endpoint
      const numbers = toSend.map(r => formatToInternational(r.phone)).filter(Boolean)
      const invalidCount = toSend.length - numbers.length

      const bulkResult = await termiiBulk({ numbers, message, senderId, apiKey })

      if (bulkResult.success) {
        numbers.forEach((phone, i) => results.push({ name: toSend[i]?.name, phone, status: 'sent' }))
        // Mark invalid phones as failed
        toSend.filter(r => !formatToInternational(r.phone)).forEach(r => {
          results.push({ name: r.name, phone: r.phone, status: 'failed', error: 'Invalid phone' })
        })
      } else {
        // Bulk failed — mark all as failed, do not deduct credits
        toSend.forEach(r => results.push({
          name: r.name, phone: r.phone, status: 'failed',
          error: bulkResult.raw?.message ?? 'Bulk send failed',
        }))
      }
    }

    sentCount = results.filter(r => r.status === 'sent').length
    failCount = results.filter(r => r.status !== 'sent').length

    // 7. Deduct credits ONLY for successful sends (AFTER Termii confirms)
    const creditsUsed = sentCount * creditsPerSms
    const newBalance  = Math.max(0, currentBalance - creditsUsed)

    await Promise.allSettled([
      admin.from('churches').update({ sms_credits: newBalance }).eq('id', church.id),
      admin.from('sms_logs').insert({
        church_id:       church.id,
        type:            type ?? 'custom',
        message,
        recipient_count: toSend.length,
        success_count:   sentCount,
        fail_count:      failCount,
        credits_used:    creditsUsed,
        sent_at:         new Date().toISOString(),
        sent_by:         user.id,
      }),
    ])

    return NextResponse.json({
      success:           true,
      sent:              sentCount,
      failed:            failCount,
      skipped:           skipped.length,
      skippedRecipients: skipped.map(r => r.name),
      credits_used:      creditsUsed,
      new_balance:       newBalance,
      results,
      partial:           skipped.length > 0,
    })

  } catch (err) {
    console.error('[POST /api/sms/send]', err)
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 })
  }
}
