import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
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
        return NextResponse.json({ error: 'Church not found', detail: error?.message }, { status: 404 })
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

    // ── UPSERT session ──────────────────────────────────────────────────────
    // Always look for an existing session first (by group + date) — fixes duplicate key error
    let sessionId = existingSessionId ?? null

    if (!sessionId) {
      const { data: existing } = await admin
        .from('attendance_sessions')
        .select('id')
        .eq('church_id', church.id)
        .eq('group_id', groupId)
        .eq('date', date)
        .single()

      if (existing) {
        // Session already exists — reuse it
        sessionId = existing.id
      }
    }

    if (!sessionId) {
      // Create new session
      const { data: newSession, error: sessionErr } = await admin
        .from('attendance_sessions')
        .insert({ church_id: church.id, group_id: groupId, date })
        .select('id')
        .single()

      if (sessionErr || !newSession?.id) {
        return NextResponse.json({
          error: 'Failed to create session',
          detail: sessionErr?.message,
          code: sessionErr?.code,
        }, { status: 500 })
      }
      sessionId = newSession.id
    }

    // ── Delete old records then re-insert ───────────────────────────────────
    await admin.from('attendance_records').delete().eq('session_id', sessionId)

    const rows = records.map(r => ({
      session_id: sessionId,
      member_id:  r.memberId,
      name:       r.name ?? '',
      present:    Boolean(r.present),
    }))

    const { error: recErr } = await admin.from('attendance_records').insert(rows)
    if (recErr) {
      return NextResponse.json({
        error: 'Failed to save records',
        detail: recErr.message,
      }, { status: 500 })
    }

    const presentCount = records.filter(r => r.present).length
    return NextResponse.json({
      success: true, sessionId,
      present: presentCount,
      absent: records.length - presentCount,
      total: records.length,
    })

  } catch (err) {
    console.error('[POST /api/attendance]', err)
    return NextResponse.json({ error: 'Internal server error', detail: err.message }, { status: 500 })
  }
}