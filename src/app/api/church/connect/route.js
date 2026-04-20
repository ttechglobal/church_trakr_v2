/**
 * POST /api/church/connect
 * Body: { code: string }
 * Subgroup sends a connection request to a church using their code.
 *
 * GET /api/church/connect
 * Returns current connection status for the calling subgroup.
 *
 * DELETE /api/church/connect
 * Disconnects the subgroup from its church.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function getSubgroup(user) {
  const admin = createAdminClient()
  const { data } = await admin.from('churches').select('*').eq('admin_user_id', user.id).single()
  return data
}

export async function POST(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subgroup = await getSubgroup(user)
  if (!subgroup) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  if (subgroup.account_type === 'church') return NextResponse.json({ error: 'Church accounts cannot send connection requests' }, { status: 400 })

  const { code } = await request.json()
  if (!code?.trim()) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const admin = createAdminClient()
  // Find the church
  const { data: church } = await admin.from('churches')
    .select('id, name')
    .eq('connection_code', code.trim().toUpperCase())
    .eq('account_type', 'church')
    .single()

  if (!church) return NextResponse.json({ error: 'No church found with that code' }, { status: 404 })

  // Check for existing connection
  const { data: existing } = await admin.from('church_connections')
    .select('id, status')
    .eq('church_id', church.id)
    .eq('subgroup_id', subgroup.id)
    .single()

  if (existing) {
    if (existing.status === 'approved') return NextResponse.json({ error: 'Already connected to this church' }, { status: 409 })
    if (existing.status === 'pending') return NextResponse.json({ error: 'Request already pending', connectionId: existing.id }, { status: 409 })
    // Re-request after disconnect
    await admin.from('church_connections')
      .update({ status: 'pending', requested_at: new Date().toISOString(), disconnected_at: null })
      .eq('id', existing.id)
    return NextResponse.json({ success: true, churchName: church.name, status: 'pending' })
  }

  // Create new request
  const { error } = await admin.from('church_connections').insert({
    church_id: church.id,
    subgroup_id: subgroup.id,
    status: 'pending',
    requested_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, churchName: church.name, status: 'pending' })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subgroup = await getSubgroup(user)
  if (!subgroup) return NextResponse.json({ connection: null })

  const admin = createAdminClient()
  const { data: conn } = await admin.from('church_connections')
    .select('id, status, connected_at, church_id')
    .eq('subgroup_id', subgroup.id)
    .neq('status', 'disconnected')
    .order('requested_at', { ascending: false })
    .limit(1)
    .single()

  if (!conn) return NextResponse.json({ connection: null })

  const { data: church } = await admin.from('churches').select('name').eq('id', conn.church_id).single()

  return NextResponse.json({ connection: { ...conn, churchName: church?.name ?? 'Unknown' } })
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subgroup = await getSubgroup(user)
  if (!subgroup) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  await admin.from('church_connections')
    .update({ status: 'disconnected', disconnected_at: new Date().toISOString() })
    .eq('subgroup_id', subgroup.id)
    .neq('status', 'disconnected')

  return NextResponse.json({ success: true })
}
