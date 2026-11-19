/**
 * POST /api/sms/broadcast
 * Body: { type, message, recipients?: 'group:<id>' }
 *
 * Sends to all active members (or one group) with a phone number.
 * Recipients are looked up server-side; credits are reserved atomically
 * before sending and failures are refunded (see lib/sms.js + lib/smsSend.js).
 */
import { NextResponse }   from 'next/server'
import { getAuthContext } from '@/lib/apiAuth'
import { buildPlan, MAX_MESSAGE_LENGTH } from '@/lib/sms'
import { runSend }        from '@/lib/smsSend'

export const maxDuration = 60

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    const { type, recipients } = body
    const message = typeof body.message === 'string' ? body.message : ''

    if (!message.trim()) return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    if (!type)           return NextResponse.json({ error: 'Message type is required' }, { status: 400 })
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` }, { status: 400 })
    }

    let query = admin.from('members')
      .select('id, name, phone')
      .eq('church_id', church.id)
      .eq('status', 'active')
      .not('phone', 'is', null)
      .neq('phone', '')

    if (typeof recipients === 'string' && recipients.startsWith('group:')) {
      const groupId = recipients.slice('group:'.length)
      if (!UUID_RE.test(groupId)) return NextResponse.json({ error: 'Invalid group' }, { status: 400 })
      query = query.contains('groupIds', [groupId])
    }

    const { data: memberRows, error: membersErr } = await query
    if (membersErr) {
      console.error('[broadcast] members fetch failed')
      return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
    }
    if (!memberRows?.length) {
      return NextResponse.json({ error: 'No members with phone numbers found for this selection' }, { status: 400 })
    }

    const plan = buildPlan(memberRows, message)
    const { status, body: out } = await runSend({
      admin, church, userId: user.id, plan, message, type: String(type).slice(0, 40),
    })
    return NextResponse.json(out, { status })
  } catch (err) {
    console.error('[POST /api/sms/broadcast] Unhandled error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
