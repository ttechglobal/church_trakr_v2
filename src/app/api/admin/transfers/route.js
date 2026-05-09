/**
 * GET /api/admin/transfers?status=pending|credited|rejected|all
 * Returns manual transfer requests, optionally filtered by status.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'
import { cookies }           from 'next/headers'
import { isAdminAuthed }     from '@/lib/adminAuth'

export async function GET(request) {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // pending | credited | rejected | null → all

  const admin = createAdminClient()

  let query = admin
    .from('manual_transfer_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/admin/transfers]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const transfers = data ?? []

  return NextResponse.json({
    transfers,
    pendingCount: transfers.filter(t => t.status === 'pending').length,
  })
}
