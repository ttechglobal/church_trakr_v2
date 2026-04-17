import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/apiAuth'

/**
 * POST /api/notifications/subscribe
 * Saves a push subscription to the church record.
 * Multiple devices per church are supported.
 */
export const POST = withAuth(async (request, { church, admin }) => {
  const { subscription } = await request.json()

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  // Store subscription in church record under push_subscriptions JSONB array
  // We keep up to 20 subscriptions (one per device)
  const existing = church.push_subscriptions ?? []

  // Remove any existing subscription with the same endpoint (re-subscribe)
  const filtered = existing.filter(s => s.endpoint !== subscription.endpoint)

  // Add new subscription with timestamp
  const updated = [
    ...filtered,
    { ...subscription, subscribedAt: new Date().toISOString() },
  ].slice(-20)   // keep latest 20

  const { error } = await admin
    .from('churches')
    .update({ push_subscriptions: updated })
    .eq('id', church.id)

  if (error) {
    console.error('[POST /api/notifications/subscribe]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: updated.length })
})

/**
 * DELETE /api/notifications/subscribe
 * Removes a push subscription (user unsubscribed on this device).
 */
export const DELETE = withAuth(async (request, { church, admin }) => {
  const { endpoint } = await request.json()

  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 })
  }

  const existing = church.push_subscriptions ?? []
  const updated  = existing.filter(s => s.endpoint !== endpoint)

  await admin
    .from('churches')
    .update({ push_subscriptions: updated })
    .eq('id', church.id)

  return NextResponse.json({ success: true })
})
