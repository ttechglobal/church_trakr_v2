/**
 * GET    /api/church/requests  — list pending + approved connections
 * PATCH  /api/church/requests  — approve or reject { connectionId, action: 'approve'|'reject'|'disconnect' }
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function getChurch(user) {
  const admin = createAdminClient()
  const { data } = await admin.from('churches').select('*').eq('admin_user_id', user.id).single()
  return data
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const church = await getChurch(user)
  if (!church || church.account_type !== 'church') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createAdminClient()
  const { data: connections } = await admin.from('church_connections')
    .select('id, status, requested_at, connected_at, disconnected_at, subgroup_id')
    .eq('church_id', church.id)
    .order('requested_at', { ascending: false })

  if (!connections?.length) return NextResponse.json({ connections: [] })

  // Get subgroup names
  const subIds = connections.map(c => c.subgroup_id)
  const { data: subgroups } = await admin.from('churches')
    .select('id, name, admin_name')
    .in('id', subIds)

  const subMap = Object.fromEntries((subgroups ?? []).map(s => [s.id, s]))

  return NextResponse.json({
    connections: connections.map(c => ({
      ...c,
      subgroupName: subMap[c.subgroup_id]?.name ?? 'Unknown',
      subgroupAdmin: subMap[c.subgroup_id]?.admin_name ?? '',
    })),
  })
}

export async function PATCH(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const church = await getChurch(user)
  if (!church || church.account_type !== 'church') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { connectionId, action } = await request.json()
  if (!connectionId || !action) return NextResponse.json({ error: 'connectionId and action required' }, { status: 400 })

  const admin = createAdminClient()
  const now = new Date().toISOString()

  let update
  if (action === 'approve') {
    update = { status: 'approved', connected_at: now }
  } else if (action === 'reject' || action === 'disconnect') {
    update = { status: 'disconnected', disconnected_at: now }
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { error } = await admin.from('church_connections')
    .update(update)
    .eq('id', connectionId)
    .eq('church_id', church.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
