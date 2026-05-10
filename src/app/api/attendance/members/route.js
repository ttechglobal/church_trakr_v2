import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { NextResponse }      from 'next/server'

/**
 * GET /api/attendance/members?groupId=xxx&churchId=xxx&date=yyyy-mm-dd
 *
 * Returns group members for attendance marking.
 *
 * Inclusion rules (per spec):
 *   - active   → include ✅
 *   - inactive → include ✅
 *   - null     → include ✅  (members imported without status set)
 *   - away     → exclude ❌
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const groupId  = searchParams.get('groupId')
    const churchId = searchParams.get('churchId')
    const date     = searchParams.get('date')

    if (!groupId || !churchId) {
      return NextResponse.json({ error: 'groupId and churchId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Verify the user owns this church
    const { data: church } = await admin
      .from('churches')
      .select('id')
      .eq('id', churchId)
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Fetch members — exclude ONLY away, include active/inactive/null ────────
    // Using .neq('status', 'away') instead of .eq('status', 'active') so that:
    //   - members imported without a status (null) are included
    //   - inactive members (still in the group, not removed) are included
    //   - only members explicitly marked 'away' are excluded
    const [membersRes, sessionRes] = await Promise.all([
      admin
        .from('members')
        .select('id, name, phone, groupIds, status')
        .eq('church_id', churchId)
        .neq('status', 'away')
        .order('name', { ascending: true }),

      // Parallel: load existing session if date provided
      date
        ? admin
            .from('attendance_sessions')
            .select('id, attendance_records ( member_id, present )')
            .eq('church_id', churchId)
            .eq('group_id', groupId)
            .eq('date', date)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    if (membersRes.error) {
      console.error('[attendance/members] member fetch error:', {
        code:    membersRes.error.code,
        message: membersRes.error.message,
        details: membersRes.error.details,
        hint:    membersRes.error.hint,
      })
      return NextResponse.json({ error: 'Failed to load members', members: [], existingRecords: null })
    }

    const allMembers = membersRes.data ?? []
    console.log(`[attendance/members] fetched ${allMembers.length} non-away members for church ${churchId}`)

    // Filter to this group:
    //   - members whose groupIds contains this groupId
    //   - OR ungrouped members (groupIds null/empty) — appear in all groups
    const members = allMembers.filter(m => {
      const ids = m.groupIds ?? []
      return ids.length === 0 || ids.includes(groupId)
    })

    console.log(`[attendance/members] ${members.length} members in group ${groupId}`)

    const existingSession  = sessionRes.data
    const existingRecords  = existingSession?.attendance_records?.length > 0
      ? existingSession.attendance_records
      : null

    return NextResponse.json({
      members,
      existingRecords,
    })

  } catch (err) {
    console.error('[GET /api/attendance/members]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}