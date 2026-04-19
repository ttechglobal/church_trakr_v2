import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/attendance/members?groupId=xxx&churchId=xxx&date=yyyy-mm-dd
 *
 * Returns group members. If date is provided, also returns existing
 * attendance records so the UI can pre-fill an editing session.
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

    // Verify church ownership (user must own this church)
    const { data: church } = await admin
      .from('churches')
      .select('id')
      .eq('id', churchId)
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch active (non-away) members for this group.
    // Strategy: members explicitly in this group OR members with no group assignment
    // (ungrouped members belong to whatever group is taking attendance — this ensures
    // imported members without groupIds still appear in attendance).
    const { data: allActiveMembers } = await admin
      .from('members')
      .select('id, name, phone, groupIds')
      .eq('church_id', churchId)
      .eq('status', 'active')
      .order('name', { ascending: true })

    // Include member if:
    // 1. Their groupIds contains this groupId, OR
    // 2. Their groupIds is empty/null (ungrouped — show in all groups)
    const members = (allActiveMembers ?? []).filter(m => {
      const ids = m.groupIds ?? []
      return ids.length === 0 || ids.includes(groupId)
    })

    // If date provided, load existing session records for pre-filling the attendance UI
    let existingRecords = null
    if (date) {
      const { data: session } = await admin
        .from('attendance_sessions')
        .select('id, attendance_records ( member_id, present )')
        .eq('church_id', churchId)
        .eq('group_id', groupId)
        .eq('date', date)
        .single()

      if (session?.attendance_records?.length > 0) {
        existingRecords = session.attendance_records
      }
    }

    return NextResponse.json({
      members:         members ?? [],
      existingRecords,   // null if no session exists, array if editing
    })

  } catch (err) {
    console.error('[GET /api/attendance/members]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
