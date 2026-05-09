/**
 * GET /api/admin/accounts/[id]
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'
import { cookies }           from 'next/headers'
import { isAdminAuthed }     from '@/lib/adminAuth'

export async function GET(request, { params }) {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const [churchRes, membersRes, txRes, smsRes, sessionsRes, mtrRes] = await Promise.allSettled([
    admin.from('churches').select('*').eq('id', id).single(),
    admin.from('members').select('id,name,status,created_at').eq('church_id', id).order('name'),
    admin.from('credit_transactions')
      .select('id,credits,amount_kobo,reference,status,gateway,created_at,completed_at')
      .eq('church_id', id).order('created_at', { ascending: false }),
    admin.from('sms_logs')
      .select('id,type,recipient_count,credits_used,sent_at')
      .eq('church_id', id).order('sent_at', { ascending: false }),
    admin.from('attendance_sessions')
      .select('id,date').eq('church_id', id).order('date', { ascending: false }),
    admin.from('manual_transfer_requests')
      .select('id,package_name,credits_requested,amount_paid,status,created_at,reference,admin_note')
      .eq('church_id', id).order('created_at', { ascending: false }),
  ])

  const church = churchRes.status === 'fulfilled' ? churchRes.value.data : null
  if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch email from auth
  let email = ''
  try {
    if (church.admin_user_id) {
      const { data: authUser } = await admin.auth.admin.getUserById(church.admin_user_id)
      email = authUser?.user?.email ?? ''
    }
  } catch {}

  const members  = membersRes.status  === 'fulfilled' ? (membersRes.value.data  ?? []) : []
  const txs      = txRes.status       === 'fulfilled' ? (txRes.value.data       ?? []) : []
  const smsLogs  = smsRes.status      === 'fulfilled' ? (smsRes.value.data      ?? []) : []
  const sessions = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : []
  const mtrs     = mtrRes.status      === 'fulfilled' ? (mtrRes.value.data      ?? []) : []

  return NextResponse.json({
    church: { ...church, email },
    members,
    creditTransactions: txs,
    manualTransfers:    mtrs,
    smsLogs,
    stats: {
      totalMembers:    members.filter(m => m.status === 'active').length,
      totalSundays:    sessions.length,
      lastActive:      sessions[0]?.date ?? null,
      totalSmsSent:    smsLogs.reduce((a, l) => a + (l.recipient_count ?? 0), 0),
      totalCreditsUsed: smsLogs.reduce((a, l) => a + (l.credits_used ?? 0), 0),
    },
  })
}
