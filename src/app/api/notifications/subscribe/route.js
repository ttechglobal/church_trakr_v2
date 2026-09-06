/**
 * POST /api/notifications/subscribe
 * Saves a Web Push subscription for the current user's church.
 * Subscription is stored in churches.push_subscriptions (jsonb array).
 *
 * DELETE /api/notifications/subscribe
 * Removes a push subscription (on permission revoke / logout).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { NextResponse }      from 'next/server'

async function getChurchId(admin, userId) {
  const { data } = await admin
    .from('churches').select('id, push_subscriptions').eq('admin_user_id', userId).single()
  return data
}

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const subscription = await request.json()
    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const admin  = createAdminClient()
    const church = await getChurchId(admin, user.id)
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Add to subscriptions array, deduplicating by endpoint
    const existing = church.push_subscriptions ?? []
    const filtered = existing.filter(s => s.endpoint !== subscription.endpoint)
    const updated  = [...filtered, { ...subscription, userId: user.id, savedAt: new Date().toISOString() }]

    await admin.from('churches')
      .update({ push_subscriptions: updated })
      .eq('id', church.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/notifications/subscribe]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { endpoint } = await request.json().catch(() => ({}))
    const admin  = createAdminClient()
    const church = await getChurchId(admin, user.id)
    if (!church) return NextResponse.json({ success: true })

    const updated = (church.push_subscriptions ?? []).filter(s => s.endpoint !== endpoint)
    await admin.from('churches').update({ push_subscriptions: updated }).eq('id', church.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/notifications/subscribe]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
