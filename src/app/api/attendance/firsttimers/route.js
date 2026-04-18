/**
 * POST /api/attendance/firsttimers
 * GET  /api/attendance/firsttimers?date=YYYY-MM-DD&churchId=xxx
 *
 * Mirrors the regular attendance API but works with first_timers records.
 * Uses a dedicated "First Timers" group in attendance_sessions so the data
 * persists and loads exactly like regular group attendance.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function getAuthContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: church } = await admin
    .from('churches').select('id').eq('admin_user_id', user.id).single()
  if (!church) return null

  return { user, church, admin }
}

// Get or create the "First Timers" group record for this church
async function getFirstTimersGroup(admin, churchId) {
  // Try to find existing First Timers group
  const { data: existing } = await admin
    .from('groups')
    .select('id')
    .eq('church_id', churchId)
    .eq('name', 'First Timers')
    .single()

  if (existing) return existing.id

  // Create it if it doesn't exist
  const { data: created } = await admin
    .from('groups')
    .insert({ church_id: churchId, name: 'First Timers' })
    .select('id')
    .single()

  return created?.id ?? null
}

// GET — load existing first-timers attendance for a date
export async function GET(request) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { church, admin } = ctx
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  if (!date) return NextResponse.json({ records: null })

  const groupId = await getFirstTimersGroup(admin, church.id)
  if (!groupId) return NextResponse.json({ records: null })

  const { data: session } = await admin
    .from('attendance_sessions')
    .select('id, attendance_records(member_id, present, name)')
    .eq('church_id', church.id)
    .eq('group_id', groupId)
    .eq('date', date)
    .single()

  // Decode records: name is stored as "ft:{ftId}:{name}" — parse back to { member_id, name }
  const records = (session?.attendance_records ?? []).map(r => {
    if (r.name?.startsWith('ft:')) {
      const parts = r.name.split(':')
      return { ...r, member_id: parts[1], name: parts.slice(2).join(':') }
    }
    return r
  })

  return NextResponse.json({
    sessionId: session?.id ?? null,
    records:   session ? records : null,
  })
}

// POST — save first-timers attendance (upsert)
export async function POST(request) {
  const ctx = await getAuthContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { church, admin } = ctx
  const body = await request.json()
  const { date, records } = body  // records: [{ memberId, name, present }]

  if (!date || !Array.isArray(records)) {
    return NextResponse.json({ error: 'date and records required' }, { status: 400 })
  }

  const groupId = await getFirstTimersGroup(admin, church.id)
  if (!groupId) return NextResponse.json({ error: 'Could not resolve group' }, { status: 500 })

  // Upsert session
  let sessionId = null
  const { data: existing } = await admin
    .from('attendance_sessions')
    .select('id')
    .eq('church_id', church.id)
    .eq('group_id', groupId)
    .eq('date', date)
    .single()

  if (existing) {
    sessionId = existing.id
    // Delete old records before reinserting
    await admin.from('attendance_records').delete().eq('session_id', sessionId)
  } else {
    const { data: newSession, error } = await admin
      .from('attendance_sessions')
      .insert({ church_id: church.id, group_id: groupId, date })
      .select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sessionId = newSession.id
  }

  // Insert records
  // IMPORTANT: member_id is a FK to the members table — first_timers are NOT in that table.
  // So we set member_id = null and encode the first_timer id in the name field as a prefix.
  // Format: "ft:{firstTimerId}:{name}" — the GET handler decodes this on load.
  if (records.length > 0) {
    const { error } = await admin.from('attendance_records').insert(
      records.map(r => ({
        session_id: sessionId,
        member_id:  null,                              // null — FT ids are not in members table
        name:       `ft:${r.memberId}:${r.name}`,     // encode FT id for reload
        present:    r.present,
      }))
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success:   true,
    sessionId,
    present:   records.filter(r => r.present).length,
    absent:    records.filter(r => !r.present).length,
    total:     records.length,
  })
}
