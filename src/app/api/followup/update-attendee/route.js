import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/apiAuth'

export const PATCH = withAuth(async (request, { church, admin }) => {
  const { key, reached, markedBy, markedAt } = await request.json()

  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const existing = church.attendee_followup_data ?? {}
  const updated  = {
    ...existing,
    [key]: {
      ...(existing[key] ?? {}),
      reached:   reached ?? false,
      markedBy:  reached ? (markedBy ?? '') : '',
      markedAt:  reached ? (markedAt ?? '') : '',
      updatedAt: new Date().toISOString(),
    },
  }

  const { error } = await admin
    .from('churches')
    .update({ attendee_followup_data: updated })
    .eq('id', church.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, entry: updated[key] })
})