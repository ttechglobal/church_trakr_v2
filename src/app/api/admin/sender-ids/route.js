/**
 * GET  /api/admin/sender-ids          — list all sender ID requests
 * POST /api/admin/sender-ids/approve  — approve a request
 * POST /api/admin/sender-ids/reject   — reject a request
 */
import { createAdminClient }             from '@/lib/supabase/admin'
import { NextResponse }                  from 'next/server'
import { cookies }                       from 'next/headers'
import { isAdminAuthed, logAdminAction } from '@/lib/adminAuth'

export async function GET(request) {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // pending | approved | rejected | all

  const admin = createAdminClient()
  let query = admin
    .from('sender_id_requests')
    .select('*, churches(name, admin_name)')
    .order('requested_at', { ascending: false })

  if (status && status !== 'all') query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    requests:     data ?? [],
    pendingCount: (data ?? []).filter(r => r.status === 'pending').length,
  })
}
