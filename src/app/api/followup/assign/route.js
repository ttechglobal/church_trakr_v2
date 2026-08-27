/**
 * POST /api/followup/assign
 *
 * Saves follow-up assignments for the current absentee list.
 * Stored in follow_up_data under "__assignments__" as:
 * {
 *   weekKey: string,          // e.g. "2026-08-25"
 *   assignments: [
 *     { memberId, memberName, assigneeId, assigneeName, assigneePhone, assignedAt }
 *   ],
 *   history: [                // last 4 weeks — used for rotation logic
 *     { weekKey, memberId, assigneeId }
 *   ]
 * }
 *
 * GET /api/followup/assign?week=YYYY-MM-DD
 * Returns assignments for the given week (defaults to latest).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { NextResponse }      from 'next/server'

async function getChurchRecord(userId, admin) {
  const { data, error } = await admin
    .from('churches')
    .select('id, follow_up_data')
    .eq('admin_user_id', userId)
    .single()
  if (error || !data) return null
  return data
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin  = createAdminClient()
    const church = await getChurchRecord(user.id, admin)
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const blob        = church.follow_up_data ?? {}
    const assignBlob  = blob.__assignments__ ?? { weekKey: null, assignments: [], history: [] }

    const { searchParams } = new URL(request.url)
    const week = searchParams.get('week') // optional filter

    if (week && assignBlob.weekKey !== week) {
      // Week not found — return empty
      return NextResponse.json({ weekKey: week, assignments: [], history: assignBlob.history ?? [] })
    }

    return NextResponse.json(assignBlob)
  } catch (err) {
    console.error('[GET /api/followup/assign]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
// Body: { weekKey: string, assignments: [{ memberId, memberName, assigneeId, assigneeName, assigneePhone }] }
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin  = createAdminClient()
    const church = await getChurchRecord(user.id, admin)
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const { weekKey, assignments } = body

    if (!weekKey || !Array.isArray(assignments)) {
      return NextResponse.json({ error: 'weekKey and assignments required' }, { status: 400 })
    }

    const blob       = church.follow_up_data ?? {}
    const existing   = blob.__assignments__  ?? { weekKey: null, assignments: [], history: [] }

    // Build timestamped assignments
    const now = new Date().toISOString()
    const stamped = assignments.map(a => ({
      memberId:      a.memberId,
      memberName:    a.memberName,
      assigneeId:    a.assigneeId,
      assigneeName:  a.assigneeName,
      assigneePhone: a.assigneePhone ?? '',
      assignedAt:    now,
    }))

    // Keep history — last 8 entries per member (rolling, capped at 200 rows total)
    const prevHistory = existing.history ?? []
    const newHistory  = [
      ...prevHistory,
      ...stamped.map(a => ({ weekKey, memberId: a.memberId, assigneeId: a.assigneeId })),
    ].slice(-200) // keep last 200 history rows

    const updatedAssignBlob = { weekKey, assignments: stamped, history: newHistory }
    const updated = { ...blob, __assignments__: updatedAssignBlob }

    const { error } = await admin
      .from('churches')
      .update({ follow_up_data: updated })
      .eq('id', church.id)

    if (error) throw error

    return NextResponse.json({ success: true, weekKey, assignments: stamped })
  } catch (err) {
    console.error('[POST /api/followup/assign]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
