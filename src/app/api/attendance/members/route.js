import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    // Verify the user is authenticated
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

    // Use admin client to bypass RLS for reads
    // Security: we verify the church belongs to the authenticated user first
    const admin = createAdminClient()

    // Verify ownership
    const { data: church } = await admin
      .from('churches')
      .select('id')
      .eq('id', churchId)
      .eq('admin_user_id', user.id)
      .single()

    if (!church) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch active members in this group
    const { data: members, error: membersError } = await admin
      .from('members')
      .select('id, name, phone, groupIds')
      .eq('church_id', churchId)
      .eq('status', 'active')
      .contains('groupIds', [groupId])
      .order('name', { ascending: true })

    if (membersError) {
      console.error('Members fetch error:', membersError)
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    // If a date is provided, fetch existing attendance records
    let existingRecords = null
    if (date) {
      const { data: session } = await admin
        .from('attendance_sessions')
        .select('id, attendance_records(member_id, present)')
        .eq('church_id', churchId)
        .eq('group_id', groupId)
        .eq('date', date)
        .single()

      if (session) {
        existingRecords = session.attendance_records
      }
    }

    return NextResponse.json({
      members: members ?? [],
      existingRecords,
    })
  } catch (err) {
    console.error('[GET /api/attendance/members]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}