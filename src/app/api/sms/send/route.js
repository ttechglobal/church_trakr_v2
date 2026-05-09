/**
 * POST /api/sms/send
 *
 * Uses admin client for ALL DB operations to bypass RLS.
 * sms_logs insert is explicit with full error logging — never silently swallowed.
 * Credits deducted AFTER Termii confirms delivery.
 */
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

const CREDITS_PER_PAGE = 5
const GSM7_PAGE        = 157
const UCS2_PAGE        = 70

// Unicode triggers — does NOT include [ ] (template placeholders)
const UNICODE_TRIGGERS = ['^','{','}','\\','~','|','€','\u2018','\u2019','\u201C','\u201D']

function analyseMessage(text) {
  if (!text) return { pages: 1, creditsPerSms: CREDITS_PER_PAGE }
  const resolved = text
    .replace(/\{name\}/gi, 'Friend')
    .replace(/\[Name\]/gi, 'Friend')
    .replace(/\[Group Name\]/gi, 'Group')
  const isUnicode = UNICODE_TRIGGERS.some(c => resolved.includes(c)) ||
                    /\p{Emoji_Presentation}/u.test(resolved)
  const pageSize  = isUnicode ? UCS2_PAGE : GSM7_PAGE
  const pages     = Math.max(1, Math.ceil(resolved.length / pageSize))
  return { pages, creditsPerSms: pages * CREDITS_PER_PAGE }
}

function normalisePhone(raw) {
  if (!raw) return null
  const c = String(raw).replace(/\D/g, '')
  if (c.startsWith('234') && c.length >= 13) return c
  if (c.startsWith('0')   && c.length === 11) return '234' + c.slice(1)
  if (c.length === 10     && /^[789]/.test(c)) return '234' + c
  if (c.startsWith('234')) return c
  return null
}

async function termiiSingle({ to, message, senderId, apiKey }) {
  const res  = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, to, from: senderId, sms: message, type: 'plain', channel: 'generic' }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  const ok = res.ok && (data.message_id || data.code === 'ok' ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('success')))
  console.log(`[termii] to=${to} ok=${ok}`, JSON.stringify(data).slice(0, 200))
  return { success: ok, messageId: data.message_id ?? null, raw: data }
}

async function termiiBulk({ numbers, message, senderId, apiKey }) {
  console.log(`[termii/bulk] → ${numbers.length} numbers`)
  const res  = await fetch('https://api.ng.termii.com/api/sms/send/bulk', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, to: numbers, from: senderId, sms: message, type: 'plain', channel: 'generic' }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  const ok = res.ok && (data.message_id || data.code === 'ok' ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('success')))
  console.log(`[termii/bulk] status=${res.status} ok=${ok}`, JSON.stringify(data).slice(0, 300))
  return { success: ok, raw: data }
}

export async function POST(request) {
  console.log('=== SMS SEND ATTEMPT ===')
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Admin client bypasses RLS on churches AND sms_logs
    const admin = createAdminClient()

    const { data: church, error: churchErr } = await admin
      .from('churches')
      .select('id, name, sms_credits, sms_sender_id, sms_sender_id_status')
      .eq('admin_user_id', user.id)
      .single()

    if (churchErr || !church) {
      console.error('[sms/send] church fetch failed:', churchErr?.message)
      return NextResponse.json({ error: 'Church not found' }, { status: 404 })
    }

    const body = await request.json()
    const { recipients, message, type } = body
    console.log(`Recipients: ${recipients?.length} | Message length: ${message?.length} | Type: ${type}`)

    if (!recipients?.length || !message?.trim()) {
      return NextResponse.json({ error: 'Recipients and message are required' }, { status: 400 })
    }

    const { pages, creditsPerSms } = analyseMessage(message)
    const currentBalance = church.sms_credits ?? 0
    const maxCanSend     = Math.floor(currentBalance / creditsPerSms)

    console.log(`Pages: ${pages} | Credits/SMS: ${creditsPerSms} | Balance: ${currentBalance} | MaxCanSend: ${maxCanSend}`)

    if (maxCanSend === 0) {
      return NextResponse.json({
        error: `Not enough credits. This message costs ${creditsPerSms} credits per person. You have ${currentBalance}.`,
        creditsNeeded: creditsPerSms, creditsAvailable: currentBalance,
      }, { status: 402 })
    }

    const toSend  = recipients.slice(0, maxCanSend)
    const skipped = recipients.slice(maxCanSend)

    const senderId = (church.sms_sender_id_status === 'approved' && church.sms_sender_id)
      ? church.sms_sender_id
      : (process.env.TERMII_SENDER_ID ?? 'ChurchTrakr')

    const apiKey = process.env.TERMII_API_KEY
    console.log(`Sender: ${senderId} | API key present: ${!!apiKey} | Prefix: ${apiKey?.slice(0, 8)}`)

    // ── Simulate if no API key ────────────────────────────────────────────────
    if (!apiKey) {
      console.warn('[sms/send] No TERMII_API_KEY — simulating')
      const creditsUsed = toSend.length * creditsPerSms
      const newBalance  = Math.max(0, currentBalance - creditsUsed)

      await admin.from('churches').update({ sms_credits: newBalance }).eq('id', church.id)

      const { error: logErr } = await admin.from('sms_logs').insert({
        church_id:       church.id,
        type:            type ?? 'custom',
        message,
        recipient_count: toSend.length,
        success_count:   toSend.length,
        fail_count:      0,
        credits_used:    creditsUsed,
        sent_at:         new Date().toISOString(),
        sent_by:         user.id,
      })

      if (logErr) {
        console.error('[sms/send] sms_logs write failed (simulated):', {
          code: logErr.code, message: logErr.message,
          details: logErr.details, hint: logErr.hint,
        })
      } else {
        console.log('[sms/send] sms_logs write succeeded (simulated)')
      }

      return NextResponse.json({
        success: true, sent: toSend.length, failed: 0, simulated: true,
        skipped: skipped.length, skippedRecipients: skipped.map(r => r.name),
        credits_used: creditsUsed, new_balance: newBalance,
        results: toSend.map(r => ({ name: r.name, phone: r.phone, status: 'sent' })),
      })
    }

    // ── Real send ─────────────────────────────────────────────────────────────
    const isPersonalised = /\{name\}|\[Name\]/i.test(message)
    const results = []

    if (isPersonalised) {
      const BATCH = 5
      for (let i = 0; i < toSend.length; i += BATCH) {
        const batch = toSend.slice(i, i + BATCH)
        const batchResults = await Promise.all(batch.map(async r => {
          const to  = normalisePhone(r.phone)
          if (!to)  return { name: r.name, phone: r.phone, status: 'failed', error: 'Invalid phone' }
          const msg = message
            .replace(/\{name\}/gi, (r.name || '').split(' ')[0] || 'Friend')
            .replace(/\[Name\]/gi, (r.name || '').split(' ')[0] || 'Friend')
          const result = await termiiSingle({ to, message: msg, senderId, apiKey })
          return { name: r.name, phone: r.phone, status: result.success ? 'sent' : 'failed', error: result.success ? undefined : (result.raw?.message ?? 'Failed') }
        }))
        results.push(...batchResults)
        if (i + BATCH < toSend.length) await new Promise(r => setTimeout(r, 200))
      }
    } else {
      const numbers    = toSend.map(r => normalisePhone(r.phone)).filter(Boolean)
      const bulkResult = await termiiBulk({ numbers, message, senderId, apiKey })
      if (bulkResult.success) {
        numbers.forEach((phone, i) => results.push({ name: toSend[i]?.name ?? '', phone, status: 'sent' }))
        toSend.filter(r => !normalisePhone(r.phone)).forEach(r =>
          results.push({ name: r.name, phone: r.phone, status: 'failed', error: 'Invalid phone' }))
      } else {
        return NextResponse.json({
          error: `SMS gateway error: ${bulkResult.raw?.message ?? 'Unknown error'}`,
        }, { status: 502 })
      }
    }

    // ── Deduct credits AFTER successful send ──────────────────────────────────
    const sentCount   = results.filter(r => r.status === 'sent').length
    const failCount   = results.filter(r => r.status !== 'sent').length
    const creditsUsed = sentCount * creditsPerSms
    const newBalance  = Math.max(0, currentBalance - creditsUsed)

    console.log(`Sent: ${sentCount} | Failed: ${failCount} | Credits used: ${creditsUsed} | New balance: ${newBalance}`)

    // Update credits
    const { error: creditErr } = await admin
      .from('churches')
      .update({ sms_credits: newBalance })
      .eq('id', church.id)
    if (creditErr) console.error('[sms/send] credit update failed:', creditErr.message)

    // Log to sms_logs — explicit error logging, never swallowed
    const { error: logErr } = await admin.from('sms_logs').insert({
      church_id:       church.id,
      type:            type ?? 'custom',
      message,
      recipient_count: toSend.length,
      success_count:   sentCount,
      fail_count:      failCount,
      credits_used:    creditsUsed,
      sent_at:         new Date().toISOString(),
      sent_by:         user.id,
    })

    if (logErr) {
      console.error('[sms/send] sms_logs write FAILED:', {
        code:    logErr.code,
        message: logErr.message,
        details: logErr.details,
        hint:    logErr.hint,
      })
    } else {
      console.log('[sms/send] sms_logs write succeeded')
    }

    return NextResponse.json({
      success: true, sent: sentCount, failed: failCount,
      skipped: skipped.length, skippedRecipients: skipped.map(r => r.name),
      credits_used: creditsUsed, new_balance: newBalance, results,
      partial: skipped.length > 0,
    })

  } catch (err) {
    console.error('[POST /api/sms/send]', err)
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 })
  }
}
