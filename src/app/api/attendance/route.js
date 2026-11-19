import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { groupId, churchId, date, records, existingSessionId } = body

    if (!groupId)        return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    if (!date)           return NextResponse.json({ error: 'date is required' }, { status: 400 })
    if (!records?.length) return NextResponse.json({ error: 'records array is required' }, { status: 400 })

    const admin = createAdminClient()

    // Verify church ownership
    let church = null
    if (churchId) {
      const { data } = await admin
        .from('churches').select('id')
        .eq('id', churchId).eq('admin_user_id', user.id).single()
      if (data) church = data
    }
    if (!church) {
      const { data, error } = await admin
        .from('churches').select('id')
        .eq('admin_user_id', user.id).single()
      if (error || !data) {
        return NextResponse.json({ error: 'Church not found' }, { status: 404 })
      }
      church = data
    }

    // Verify group belongs to this church
    const { data: group, error: groupError } = await admin
      .from('groups').select('id')
      .eq('id', groupId).eq('church_id', church.id).single()
    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    // Validate payload
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
    }
    if (records.length > 5000) {
      return NextResponse.json({ error: 'Too many records' }, { status: 400 })
    }
    const clean = records
      .filter(r => r && UUID.test(String(r.memberId)))
      .map(r => ({
        member_id: r.memberId,
        name:      String(r.name ?? '').slice(0, 120),
        present:   Boolean(r.present),
      }))
    if (!clean.length) return NextResponse.json({ error: 'No valid records' }, { status: 400 })

    // One atomic DB call: verifies session/group/members belong to this church,
    // replaces the records in a single transaction (no delete-then-insert gap).
    const { data: saved, error: saveErr } = await admin.rpc('save_attendance', {
      p_church_id:  church.id,
      p_group_id:   groupId,
      p_date:       date,
      p_session_id: existingSessionId && UUID.test(String(existingSessionId)) ? existingSessionId : null,
      p_records:    clean,
    })
    if (saveErr) {
      if (saveErr.code === 'P0002') {
        return NextResponse.json({ error: 'Session or group not found' }, { status: 404 })
      }
      console.error('[POST /api/attendance] save_attendance:', saveErr.code, saveErr.message)
      return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 })
    }
    const sessionId = saved.sessionId

    // Bust the sessions cache and follow-up badge so the UI reflects the save immediately
    revalidateTag(`sessions:${church.id}`)
    revalidateTag(`followup-badge:${church.id}`)

    return NextResponse.json({
      success: true, sessionId,
      present: saved.present,
      absent:  saved.total - saved.present,
      total:   saved.total,
    })

  } catch (err) {
    console.error('[POST /api/attendance]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}