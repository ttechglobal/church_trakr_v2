/**
 * POST /api/followup/mark
 * Body: { key: "{sessionId}_{memberId}", reached?: boolean, note?: string, reachedBy?: string }
 *
 * The merge happens inside Postgres (row-locked), so two people marking at the
 * same moment can never overwrite each other.
 */
import { NextResponse }  from 'next/server'
import { revalidateTag } from 'next/cache'
import { withAuth }      from '@/lib/apiAuth'

export const POST = withAuth(async (request, { church, admin }) => {
  const { key, reached, note, reachedBy } = await request.json().catch(() => ({}))

  if (typeof key !== 'string' || !key || key.length > 200 || key.startsWith('__')) {
    return NextResponse.json({ error: 'Valid key required' }, { status: 400 })
  }
  if (reached !== undefined && reached !== null && typeof reached !== 'boolean') {
    return NextResponse.json({ error: 'reached must be a boolean' }, { status: 400 })
  }

  const { data: entry, error } = await admin.rpc('mark_follow_up', {
    p_church:     church.id,
    p_key:        key,
    p_reached:    reached ?? null,
    p_note:       typeof note === 'string' ? note : null,
    p_reached_by: typeof reachedBy === 'string' ? reachedBy.slice(0, 120) : null,
  })
  if (error) {
    console.error('[followup/mark]', error.code, error.message)
    return NextResponse.json({ error: 'Could not save follow-up' }, { status: 500 })
  }

  revalidateTag(`followup-badge:${church.id}`)
  return NextResponse.json({ success: true, entry })
})
