/**
 * POST /api/sms/broadcast
 *
 * Sends a broadcast SMS to all active members or a specific group.
 *
 * Bugs fixed vs previous version:
 *  1. Credit check now uses CREDITS_PER_SMS (5) not 1 — was always under-checking
 *  2. sms_sender_id_status added to SELECT — was missing, so approved custom IDs never used
 *  3. normalisePhone now strips ALL non-digit chars (same as /api/sms/send) — was leaving '+' in some cases
 *  4. Credits deducted only on confirmed success, using correct per-SMS rate
 *  5. Termii success detection hardened — mirrors the working /api/sms/send logic exactly
 *  6. Sends in batches of 5 with 300ms gap — prevents Termii rate-limit rejections on large lists
 */
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

// ── Constants — must match /api/sms/send ─────────────────────────────────────
const CREDITS_PER_SMS = 5   // 1 SMS page = 5 credits
const SEND_BATCH_SIZE = 5   // concurrent Termii calls per batch
const BATCH_DELAY_MS  = 300 // ms between batches

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise a Nigerian phone number to E.164 without leading '+'.
 * Mirrors the implementation in /api/sms/send exactly.
 */
function normalisePhone(raw) {
  if (!raw) return null
  // Strip everything that isn't a digit — including '+', spaces, dashes, parens
  const digits = String(raw).replace(/\D/g, '')
  if (digits.startsWith('234') && digits.length >= 13) return digits  // already international
  if (digits.startsWith('0')   && digits.length === 11) return '234' + digits.slice(1)
  if (digits.length === 10     && /^[789]/.test(digits)) return '234' + digits
  if (digits.startsWith('234')) return digits                          // short international
  return null  // unrecognisable — skip
}

/**
 * Send a single SMS via Termii.
 * Returns { success: boolean, raw: object }
 * Mirrors termiiSingle() in /api/sms/send.
 */
async function sendSingle({ to, message, senderId, apiKey }) {
  let raw = {}
  try {
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
    try { raw = JSON.parse(text) } catch { raw = { rawText: text } }

    console.log(`[broadcast] to=${to} http=${res.status}`, JSON.stringify(raw).slice(0, 200))

    // Termii success conditions — same set used in /api/sms/send
    const success = res.ok && (
      raw.message_id != null ||
      raw.code === 'ok' ||
      (typeof raw.message === 'string' && raw.message.toLowerCase().includes('success'))
    )

    return { success, raw }
  } catch (err) {
    console.error(`[broadcast] fetch error to=${to}:`, err.message)
    return { success: false, raw: { error: err.message } }
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(request) {
  console.log('=== BROADCAST SEND ATTEMPT ===')

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // ── Fetch church — include sms_sender_id_status (was missing before) ──────
    const { data: church, error: churchErr } = await admin
      .from('churches')
      .select('id, name, sms_credits, sms_sender_id, sms_sender_id_status')
      .eq('admin_user_id', user.id)
      .single()

    if (churchErr || !church) {
      console.error('[broadcast] church fetch failed:', churchErr?.message)
      return NextResponse.json({ error: 'Church not found' }, { status: 404 })
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}))
    const { type, message, recipients } = body

    if (!message?.trim()) return NextResponse.json({ error: 'Message is required'    }, { status: 400 })
    if (!type)            return NextResponse.json({ error: 'Message type is required' }, { status: 400 })

    // ── Build recipient list ──────────────────────────────────────────────────
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

    const { data: memberRows, error: membersErr } = await query

    if (membersErr) {
      console.error('[broadcast] members fetch failed:', membersErr.message)
      return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
    }

    if (!memberRows?.length) {
      return NextResponse.json({
        error: 'No members with phone numbers found for this selection',
      }, { status: 400 })
    }

    // Filter down to members whose phones normalise successfully
    const members = memberRows
      .map(m => ({ ...m, normPhone: normalisePhone(m.phone) }))
      .filter(m => m.normPhone !== null)

    const skippedBadPhone = memberRows.length - members.length
    if (skippedBadPhone > 0) {
      console.warn(`[broadcast] ${skippedBadPhone} member(s) skipped — unrecognisable phone number`)
    }

    if (!members.length) {
      return NextResponse.json({
        error: 'No members have valid Nigerian phone numbers. Check that numbers start with 0 or +234.',
      }, { status: 400 })
    }

    // ── Credit check (correct rate: CREDITS_PER_SMS per message) ─────────────
    const currentBalance = church.sms_credits ?? 0
    const maxCanSend     = Math.floor(currentBalance / CREDITS_PER_SMS)

    console.log(`[broadcast] ${members.length} valid recipients | Balance: ${currentBalance} credits | Max can send: ${maxCanSend} | Cost per SMS: ${CREDITS_PER_SMS}`)

    if (maxCanSend === 0) {
      return NextResponse.json({
        error: `Not enough credits. Each SMS costs ${CREDITS_PER_SMS} credits and you have ${currentBalance}. Top up to send to your ${members.length} member${members.length !== 1 ? 's' : ''}.`,
        creditsNeeded:    members.length * CREDITS_PER_SMS,
        creditsAvailable: currentBalance,
      }, { status: 402 })
    }

    // Trim list to what credits can cover
    const toSend      = members.slice(0, maxCanSend)
    const skippedCost = members.slice(maxCanSend)

    if (skippedCost.length > 0) {
      console.warn(`[broadcast] ${skippedCost.length} recipient(s) skipped — insufficient credits`)
    }

    // ── Sender ID ─────────────────────────────────────────────────────────────
    const senderId = (church.sms_sender_id_status === 'approved' && church.sms_sender_id)
      ? church.sms_sender_id
      : (process.env.TERMII_SENDER_ID ?? 'ChurchTrakr')

    const apiKey = process.env.TERMII_API_KEY
    console.log(`[broadcast] Sender ID: ${senderId} | API key present: ${!!apiKey}`)

    // ── Simulate when no API key (dev / staging) ──────────────────────────────
    if (!apiKey) {
      console.warn('[broadcast] TERMII_API_KEY not set — simulating send (no real SMS will be sent)')
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
        skipped:          skippedCost.length + skippedBadPhone,
        creditsRemaining: newBalance,
        simulated:        true,
      })
    }

    // ── Real send — batched, personalised ─────────────────────────────────────
    let successCount = 0
    let failCount    = 0
    const results    = []

    for (let i = 0; i < toSend.length; i += SEND_BATCH_SIZE) {
      const batch = toSend.slice(i, i + SEND_BATCH_SIZE)

      const batchResults = await Promise.all(batch.map(async member => {
        const firstName = (member.name || '').split(' ')[0] || 'Friend'
        const msg = message
          .replace(/\{name\}/gi, firstName)
          .replace(/\[Name\]/gi, firstName)

        const result = await sendSingle({
          to:       member.normPhone,
          message:  msg,
          senderId,
          apiKey,
        })

        return {
          name:   member.name,
          phone:  member.phone,
          status: result.success ? 'sent' : 'failed',
          error:  result.success ? undefined : (result.raw?.message ?? 'Unknown error'),
        }
      }))

      for (const r of batchResults) {
        if (r.status === 'sent') successCount++
        else failCount++
        results.push(r)
      }

      // Delay between batches — prevents Termii rate-limit errors on large lists
      if (i + SEND_BATCH_SIZE < toSend.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS))
      }
    }

    // ── Deduct credits only for confirmed successful sends ────────────────────
    const creditsUsed = successCount * CREDITS_PER_SMS
    const newBalance  = Math.max(0, currentBalance - creditsUsed)

    console.log(`[broadcast] Sent: ${successCount} | Failed: ${failCount} | Credits used: ${creditsUsed} | New balance: ${newBalance}`)

    // Update balance + write log in parallel
    const [creditRes, logRes] = await Promise.allSettled([
      admin.from('churches')
        .update({ sms_credits: newBalance })
        .eq('id', church.id),
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

    if (creditRes.status === 'rejected' || creditRes.value?.error) {
      console.error('[broadcast] credit update failed:', creditRes.reason ?? creditRes.value?.error?.message)
    }
    if (logRes.status === 'rejected' || logRes.value?.error) {
      console.error('[broadcast] sms_logs write failed:', logRes.reason ?? logRes.value?.error?.message)
    }

    return NextResponse.json({
      success:          true,
      sent:             successCount,
      failed:           failCount,
      total:            toSend.length,
      skipped:          skippedCost.length + skippedBadPhone,
      creditsRemaining: newBalance,
    })

  } catch (err) {
    console.error('[POST /api/sms/broadcast] Unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 })
  }
}
