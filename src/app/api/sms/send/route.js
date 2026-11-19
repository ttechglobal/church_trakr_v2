/**
 * POST /api/sms/send
 * Body: { recipients: [{ name, phone }], message, type? }
 *
 * Credits are reserved atomically before sending and failures are refunded
 * (see lib/sms.js + lib/smsSend.js).
 */
import { NextResponse }      from 'next/server'
import { getAuthContext }    from '@/lib/apiAuth'
import { buildPlan, MAX_MESSAGE_LENGTH, MAX_RECIPIENTS_PER_REQUEST } from '@/lib/sms'
import { runSend }           from '@/lib/smsSend'

export const maxDuration = 60

export async function POST(request) {
  try {
    let ctx
    try { ctx = await getAuthContext() }
    catch (err) {
      if (err.isAuth) return NextResponse.json({ error: err.message }, { status: err.status })
      throw err
    }
    const { user, church, admin } = ctx

    const body = await request.json().catch(() => ({}))
    const { recipients, type } = body
    const message = typeof body.message === 'string' ? body.message : ''

    if (!Array.isArray(recipients) || recipients.length === 0 || !message.trim()) {
      return NextResponse.json({ error: 'Recipients and message are required' }, { status: 400 })
    }
    if (recipients.length > MAX_RECIPIENTS_PER_REQUEST) {
      return NextResponse.json({ error: `You can message at most ${MAX_RECIPIENTS_PER_REQUEST} people at once.` }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` }, { status: 400 })
    }

    const clean = recipients
      .filter(r => r && typeof r === 'object')
      .map(r => ({ name: String(r.name ?? '').slice(0, 120), phone: String(r.phone ?? '').slice(0, 30) }))

    const plan = buildPlan(clean, message)
    const { status, body: out } = await runSend({
      admin, church, userId: user.id, plan, message, type: typeof type === 'string' ? type.slice(0, 40) : 'custom',
    })
    return NextResponse.json(out, { status })
  } catch (err) {
    console.error('[POST /api/sms/send]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
