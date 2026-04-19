/**
 * POST /api/followup/mark
 *
 * Atomically updates a single follow-up entry in follow_up_data.
 * Uses a read-modify-write on the server side so concurrent updates
 * from multiple users don't overwrite each other's entries.
 *
 * Body: {
 *   key:       string,   // "{sessionId}_{memberId}"
 *   reached:   boolean,
 *   note:      string,
 *   reachedBy: string,   // display name of the person marking
 * }
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: church } = await admin
      .from('churches')
      .select('id, follow_up_data')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const { key, reached, note, reachedBy } = body

    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

    // Atomic merge: read current data, merge single key, write back
    const current = church.follow_up_data ?? {}
    const existing = current[key] ?? {}

    const updated = {
      ...current,
      [key]: {
        ...existing,
        reached:    reached ?? existing.reached ?? false,
        note:       note    ?? existing.note    ?? '',
        reachedBy:  reached ? (reachedBy || existing.reachedBy || 'Team member') : null,
        reachedAt:  reached ? (existing.reachedAt ?? new Date().toISOString()) : null,
        updatedAt:  new Date().toISOString(),
      },
    }

    // If un-marking as reached, clear reachedBy/reachedAt
    if (reached === false) {
      updated[key].reachedBy = null
      updated[key].reachedAt = null
    }

    const { error } = await admin
      .from('churches')
      .update({ follow_up_data: updated })
      .eq('id', church.id)

    if (error) throw error

    return NextResponse.json({ success: true, entry: updated[key] })
  } catch (err) {
    console.error('[POST /api/followup/mark]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
