import { NextResponse } from 'next/server'
import { withAuth }     from '@/lib/apiAuth'
import { FIELD_TO_KIND, cleanEntries } from '@/lib/followUp'

/**
 * POST /api/followup/save   { field, data: { "<key>": entry, ... } }
 *
 * Upserts ONLY the entries sent, newest-wins per key, inside the database.
 * A stale browser tab can no longer overwrite entries it did not touch, and the
 * reserved __team__ / __assignments__ keys cannot be clobbered from here.
 */
export const POST = withAuth(async (request, { church, admin }) => {
  const body = await request.json().catch(() => ({}))
  const kind = FIELD_TO_KIND[body.field]
  if (!kind) return NextResponse.json({ error: 'Invalid field' }, { status: 400 })

  const entries = cleanEntries(body.data)
  if (entries === null) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  if (Object.keys(entries).length === 0) return NextResponse.json({ success: true, written: 0 })

  const { data: written, error } = await admin.rpc('upsert_follow_up_entries', {
    p_church: church.id, p_kind: kind, p_entries: entries,
  })
  if (error) {
    console.error('[followup/save]', error.code, error.message)
    return NextResponse.json({ error: 'Could not save follow-ups' }, { status: 500 })
  }
  return NextResponse.json({ success: true, written })
})
