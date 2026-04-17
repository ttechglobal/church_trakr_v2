import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * PATCH /api/followup/update
 * Updates a single follow-up entry for an absentee.
 * Stored in churches.follow_up_data as a JSONB map.
 *
 * Body: { key, reached, note, markedBy, markedAt }
 */
export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Verify church ownership
    const { data: church } = await admin
      .from('churches')
      .select('id, follow_up_data')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { key, reached, note, markedBy, markedAt } = await request.json()

    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

    // Merge the update into the existing JSONB
    const existing = church.follow_up_data ?? {}
    const updated = {
      ...existing,
      [key]: {
        ...(existing[key] ?? {}),
        reached: reached ?? existing[key]?.reached ?? false,
        note:     note     !== undefined ? note     : (existing[key]?.note ?? ''),
        markedBy: reached  ? (markedBy ?? existing[key]?.markedBy ?? '')  : '',
        markedAt: reached  ? (markedAt ?? existing[key]?.markedAt ?? '')  : '',
        updatedAt: new Date().toISOString(),
      },
    }

    const { error } = await admin
      .from('churches')
      .update({ follow_up_data: updated })
      .eq('id', church.id)

    if (error) throw error

    return NextResponse.json({ success: true, entry: updated[key] })
  } catch (err) {
    console.error('[PATCH /api/followup/update]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}