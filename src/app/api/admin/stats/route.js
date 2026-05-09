/**
 * GET /api/admin/stats
 * Platform overview for the admin dashboard.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'
import { cookies }           from 'next/headers'
import { isAdminAuthed }     from '@/lib/adminAuth'

export async function GET() {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const now        = new Date()
  const thirtyAgo  = new Date(now - 30 * 86400000).toISOString()
  const sevenAgo   = new Date(now -  7 * 86400000).toISOString()
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [churchesRes, membersRes, sessionsRes, txRes, smsRes, mtrRes] = await Promise.allSettled([
    admin.from('churches').select('id,name,admin_name,created_at,sms_credits,account_type').order('created_at', { ascending: false }),
    admin.from('members').select('id,church_id,status'),
    admin.from('attendance_sessions').select('id,church_id,date').order('date', { ascending: false }),
    admin.from('credit_transactions').select('id,church_id,credits,amount_kobo,status,gateway,created_at'),
    admin.from('sms_logs').select('id,church_id,recipient_count,credits_used,sent_at'),
    admin.from('manual_transfer_requests').select('id,status,created_at'),
  ])

  const churches = churchesRes.status === 'fulfilled' ? (churchesRes.value.data ?? []) : []
  const members  = membersRes.status  === 'fulfilled' ? (membersRes.value.data  ?? []) : []
  const sessions = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : []
  const txs      = txRes.status       === 'fulfilled' ? (txRes.value.data       ?? []) : []
  const smsLogs  = smsRes.status      === 'fulfilled' ? (smsRes.value.data      ?? []) : []
  const mtrs     = mtrRes.status      === 'fulfilled' ? (mtrRes.value.data      ?? []) : []

  const completedTxs = txs.filter(t => t.status === 'completed')
  const totalRevenue = completedTxs.reduce((a, t) => a + (t.amount_kobo ?? 0), 0)
  const totalCredSold = completedTxs.reduce((a, t) => a + (t.credits ?? 0), 0)
  const totalSmsSent  = smsLogs.reduce((a, l) => a + (l.recipient_count ?? 0), 0)
  const pendingTransfers = mtrs.filter(m => m.status === 'pending').length

  const activeIn30 = new Set(
    sessions.filter(s => s.date >= thirtyAgo.slice(0, 10)).map(s => s.church_id)
  ).size

  const newThisWeek  = churches.filter(c => c.created_at >= sevenAgo).length
  const newThisMonth = churches.filter(c => c.created_at >= startMonth).length

  const churchStats = churches.map(c => ({
    id:           c.id,
    name:         c.name,
    adminName:    c.admin_name,
    accountType:  c.account_type,
    createdAt:    c.created_at,
    lastActive:   sessions.find(s => s.church_id === c.id)?.date ?? null,
    totalMembers: members.filter(m => m.church_id === c.id && m.status === 'active').length,
    totalSundays: sessions.filter(s => s.church_id === c.id).length,
    smsCredits:   c.sms_credits ?? 0,
  }))

  return NextResponse.json({
    totals: {
      churches:         churches.length,
      members:          members.filter(m => m.status === 'active').length,
      sessions:         sessions.length,
      totalRevenue,       // kobo
      totalCredSold,
      totalSmsSent,
      activeIn30,
      newThisWeek,
      newThisMonth,
      pendingTransfers,
    },
    churches: churchStats,
  })
}
