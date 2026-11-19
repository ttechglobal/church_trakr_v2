/**
 * POST /api/followup/assign   { weekKey, assignments: [{ memberId, memberName, assigneeId, assigneeName, assigneePhone }] }
 * GET  /api/followup/assign?week=YYYY-MM-DD
 *
 * Stored as the reserved entry "__assignments__" (kind 'absentee'):
 *   { weekKey, assignments: [...], history: [{ weekKey, memberId, assigneeId }] }  // history: last 200 rows
 */
import { NextResponse } from 'next/server'
import { withAuth }     from '@/lib/apiAuth'
import { mutateEntry }  from '@/lib/followUp'

const EMPTY = { weekKey: null, assignments: [], history: [] }
const str = (v, n) => String(v ?? '').slice(0, n)

export const GET = withAuth(async (request, { church, admin }) => {
  const { data } = await admin
    .from('follow_up_entries').select('data')
    .eq('church_id', church.id).eq('kind', 'absentee').eq('key', '__assignments__')
    .maybeSingle()
  const blob = data?.data ?? EMPTY

  const week = new URL(request.url).searchParams.get('week')
  if (week && blob.weekKey !== week) {
    return NextResponse.json({ weekKey: week, assignments: [], history: blob.history ?? [] })
  }
  return NextResponse.json(blob)
})

export const POST = withAuth(async (request, { church, admin }) => {
  const { weekKey, assignments } = await request.json().catch(() => ({}))
  if (!weekKey || typeof weekKey !== 'string' || !Array.isArray(assignments) || assignments.length > 2000) {
    return NextResponse.json({ error: 'weekKey and assignments required' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const stamped = assignments.map(a => ({
    memberId:      str(a?.memberId, 80),
    memberName:    str(a?.memberName, 120),
    assigneeId:    str(a?.assigneeId, 80),
    assigneeName:  str(a?.assigneeName, 120),
    assigneePhone: str(a?.assigneePhone, 30),
    assignedAt:    now,
  }))

  await mutateEntry(admin, church.id, 'absentee', '__assignments__', (existing = EMPTY) => ({
    weekKey: weekKey.slice(0, 20),
    assignments: stamped,
    history: [
      ...(existing.history ?? []),
      ...stamped.map(a => ({ weekKey, memberId: a.memberId, assigneeId: a.assigneeId })),
    ].slice(-200),
  }))

  return NextResponse.json({ success: true, weekKey, assignments: stamped })
})
