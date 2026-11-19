/**
 * GET  /api/followup/team  — load follow-up team
 * POST /api/followup/team  — replace follow-up team
 * Stored as the reserved entry "__team__" in follow_up_entries (kind 'absentee').
 * Member shape: { id, name, phone, addedAt }
 */
import { NextResponse } from 'next/server'
import { withAuth }     from '@/lib/apiAuth'
import { mutateEntry }  from '@/lib/followUp'

export const GET = withAuth(async (_req, { church, admin }) => {
  const { data } = await admin
    .from('follow_up_entries').select('data')
    .eq('church_id', church.id).eq('kind', 'absentee').eq('key', '__team__')
    .maybeSingle()
  return NextResponse.json({ team: Array.isArray(data?.data) ? data.data : [] })
})

export const POST = withAuth(async (request, { church, admin }) => {
  const { team: incoming } = await request.json().catch(() => ({}))
  if (!Array.isArray(incoming) || incoming.length > 200) {
    return NextResponse.json({ error: 'team must be an array (max 200)' }, { status: 400 })
  }

  const team = incoming.map((m, i) => ({
    id:      String(m?.id || `tm_${Date.now()}_${i}`).slice(0, 80),
    name:    String(m?.name  || '').trim().slice(0, 120),
    phone:   String(m?.phone || '').trim().slice(0, 30),
    addedAt: m?.addedAt || new Date().toISOString(),
  })).filter(m => m.name)

  await mutateEntry(admin, church.id, 'absentee', '__team__', () => team)
  return NextResponse.json({ success: true, team })
})
