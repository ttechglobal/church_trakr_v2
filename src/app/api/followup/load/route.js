import { NextResponse } from 'next/server'
import { withAuth }     from '@/lib/apiAuth'
import { loadFollowUp, FIELD_TO_KIND } from '@/lib/followUp'

// GET /api/followup/load?field=follow_up_data|attendee_followup_data
export const GET = withAuth(async (request, { church, admin }) => {
  const field = new URL(request.url).searchParams.get('field')
  const kind  = FIELD_TO_KIND[field]
  if (!kind) return NextResponse.json({ error: 'Invalid field' }, { status: 400 })

  const data = await loadFollowUp(admin, church.id, kind)
  return NextResponse.json({ data })
})
