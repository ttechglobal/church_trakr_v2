/**
 * GET  /api/followup/team  — load follow-up team
 * POST /api/followup/team  — save follow-up team
 *
 * Team is stored inside follow_up_data JSONB under the key "__team__"
 * so it lives alongside existing follow-up entries with zero migration.
 *
 * Team member shape: { id, name, phone, addedAt }
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { NextResponse }      from 'next/server'

async function getChurchForUser(userId, admin) {
  const { data, error } = await admin
    .from('churches')
    .select('id, follow_up_data')
    .eq('admin_user_id', userId)
    .single()
  if (error || !data) return null
  return data
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin  = createAdminClient()
    const church = await getChurchForUser(user.id, admin)
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const team = (church.follow_up_data ?? {}).__team__ ?? []
    return NextResponse.json({ team })
  } catch (err) {
    console.error('[GET /api/followup/team]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────
// Body: { team: [{ id, name, phone }] }
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin  = createAdminClient()
    const church = await getChurchForUser(user.id, admin)
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const incoming = body.team
    if (!Array.isArray(incoming)) {
      return NextResponse.json({ error: 'team must be an array' }, { status: 400 })
    }

    // Sanitise — keep only expected fields, ensure each member has an id
    const team = incoming.map((m, i) => ({
      id:      m.id      || `tm_${Date.now()}_${i}`,
      name:    (m.name   || '').trim(),
      phone:   (m.phone  || '').trim(),
      addedAt: m.addedAt || new Date().toISOString(),
    })).filter(m => m.name)

    // Merge into existing follow_up_data — preserve all other keys
    const current = church.follow_up_data ?? {}
    const updated = { ...current, __team__: team }

    const { error } = await admin
      .from('churches')
      .update({ follow_up_data: updated })
      .eq('id', church.id)

    if (error) throw error

    return NextResponse.json({ success: true, team })
  } catch (err) {
    console.error('[POST /api/followup/team]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
