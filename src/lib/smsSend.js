/**
 * Shared send pipeline for /api/sms/send and /api/sms/broadcast. SERVER ONLY.
 * Returns { status, body } for the route to serialise.
 */
import {
  fitToBalance, reserveCredits, refundCredits, isPersonalised,
  sendBulk, sendPersonalised, pickSenderId,
} from '@/lib/sms'

export async function runSend({ admin, church, userId, plan, message, type }) {
  const apiKey = process.env.TERMII_API_KEY
  const balance = church.sms_credits ?? 0

  const invalid = plan.filter(p => !p.to)
  const validCount = plan.length - invalid.length
  if (validCount === 0) {
    return { status: 400, body: { error: 'No valid Nigerian phone numbers in this selection. Numbers should start with 0 or +234.' } }
  }

  const { toSend, skipped, totalCost } = fitToBalance(plan, balance)
  if (toSend.length === 0) {
    const cheapest = Math.min(...plan.filter(p => p.to).map(p => p.cost))
    return {
      status: 402,
      body: {
        error: `Not enough credits. This message costs ${cheapest} credits per person and you have ${balance}.`,
        creditsNeeded: cheapest, creditsAvailable: balance,
      },
    }
  }

  // Never fake-send in production: the church would be charged (or told it worked) for nothing.
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[sms] TERMII_API_KEY is not set — refusing to send')
      return { status: 503, body: { error: 'SMS service is temporarily unavailable. Please try again later.' } }
    }
    console.warn('[sms] No TERMII_API_KEY — simulating (no SMS sent, no credits deducted)')
    return {
      status: 200,
      body: {
        success: true, simulated: true,
        sent: toSend.length, failed: invalid.length, total: toSend.length,
        skipped: skipped.length, skippedRecipients: skipped.map(s => s.name),
        credits_used: 0, new_balance: balance, creditsRemaining: balance,
        results: toSend.map(i => ({ name: i.name, phone: i.phone, status: 'sent' })),
      },
    }
  }

  // ── Reserve credits atomically BEFORE sending ───────────────────────────────
  const reservation = await reserveCredits(admin, church.id, totalCost)
  if (!reservation.ok) {
    if (reservation.contention) {
      return { status: 409, body: { error: 'Your balance is being updated. Please try again in a moment.' } }
    }
    return {
      status: 402,
      body: {
        error: `Not enough credits. This send needs ${totalCost} and you have ${reservation.balance}.`,
        creditsNeeded: totalCost, creditsAvailable: reservation.balance,
      },
    }
  }

  const senderId = pickSenderId(church)
  const results = invalid.map(p => ({ name: p.name, phone: p.phone, status: 'failed', error: 'Invalid phone' }))
  let refund = 0
  let gatewayDown = false

  try {
    if (isPersonalised(message)) {
      const out = await sendPersonalised(toSend, { senderId, apiKey })
      for (const o of out) {
        if (o.ok) results.push({ name: o.item.name, phone: o.item.phone, status: 'sent' })
        else { refund += o.item.cost; results.push({ name: o.item.name, phone: o.item.phone, status: 'failed', error: o.error }) }
      }
    } else {
      const outcomes = await sendBulk({ numbers: toSend.map(i => i.to), message: toSend[0].msg, senderId, apiKey })
      const okSet = new Set(outcomes.filter(o => o.success).flatMap(o => o.numbers))
      for (const it of toSend) {
        if (okSet.has(it.to)) results.push({ name: it.name, phone: it.phone, status: 'sent' })
        else { refund += it.cost; results.push({ name: it.name, phone: it.phone, status: 'failed', error: 'Gateway rejected' }) }
      }
      gatewayDown = okSet.size === 0
    }
  } catch (err) {
    console.error('[sms] send crashed — refunding reservation')
    refund = totalCost
    gatewayDown = true
  }

  const newBalance = (await refundCredits(admin, church.id, refund)) ?? (reservation.balance + refund)
  const sentCount  = results.filter(r => r.status === 'sent').length
  const failCount  = results.filter(r => r.status === 'failed').length
  const creditsUsed = totalCost - refund

  if (creditsUsed > 0 || sentCount > 0) {
    const { error: logErr } = await admin.from('sms_logs').insert({
      church_id:       church.id,
      type:            type ?? 'custom',
      message,
      recipient_count: toSend.length,
      success_count:   sentCount,
      fail_count:      failCount,
      credits_used:    creditsUsed,
      sent_at:         new Date().toISOString(),
      sent_by:         userId,
    })
    if (logErr) console.error('[sms] sms_logs write failed:', logErr.code, logErr.message)
  }

  if (gatewayDown && sentCount === 0) {
    return { status: 502, body: { error: 'SMS gateway error. No credits were charged. Please try again.' } }
  }

  return {
    status: 200,
    body: {
      success: true,
      sent: sentCount, failed: failCount, total: toSend.length,
      skipped: skipped.length, skippedRecipients: skipped.map(s => s.name),
      partial: skipped.length > 0,
      credits_used: creditsUsed, new_balance: newBalance, creditsRemaining: newBalance,
      results,
    },
  }
}
