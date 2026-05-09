/**
 * GET /api/admin/accounts
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'
import { cookies }           from 'next/headers'
import { isAdminAuthed }     from '@/lib/adminAuth'

export async function GET() {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const [churchesRes, membersRes, sessionsRes, smsRes] = await Promise.allSettled([
    admin.from('churches')
      .select('id,name,admin_name,account_type,sms_credits,created_at,phone,location')
      .order('created_at', { ascending: false }),
    admin.from('members').select('id,church_id,status'),
    admin.from('attendance_sessions').select('id,church_id,date').order('date', { ascending: false }),
    admin.from('sms_logs').select('id,church_id,credits_used'),
  ])

  const churches = churchesRes.status === 'fulfilled' ? (churchesRes.value.data ?? []) : []
  const members  = membersRes.status  === 'fulfilled' ? (membersRes.value.data  ?? []) : []
  const sessions = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : []
  const smsLogs  = smsRes.status      === 'fulfilled' ? (smsRes.value.data      ?? []) : []

  const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  // Fetch emails from auth.users via admin API
  // Build a map of admin_user_id → email using the admin client
  let emailMap = {}
  try {
    // We need to look up users from Supabase auth — batch the church admin_user_ids
    const adminUserIds = [...new Set(churches.map(c => c.admin_user_id).filter(Boolean))]
    // Supabase admin.auth.admin.listUsers() returns paginated results
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    for (const u of (usersData?.users ?? [])) {
      emailMap[u.id] = u.email ?? ''
    }
  } catch (e) {
    console.warn('[admin/accounts] Could not fetch emails:', e.message)
  }

  const accounts = churches.map(c => {
    const cSessions   = sessions.filter(s => s.church_id === c.id)
    const lastActive  = cSessions[0]?.date ?? null
    const isActive30  = cSessions.some(s => s.date >= thirtyAgo)
    const creditsSpent = smsLogs.filter(l => l.church_id === c.id).reduce((a, l) => a + (l.credits_used ?? 0), 0)

    return {
      id:           c.id,
      name:         c.name,
      adminName:    c.admin_name,
      email:        emailMap[c.admin_user_id] ?? '',
      phone:        c.phone ?? '',
      location:     c.location ?? '',
      accountType:  c.account_type,
      smsCredits:   c.sms_credits ?? 0,
      totalMembers: members.filter(m => m.church_id === c.id && m.status === 'active').length,
      totalSundays: cSessions.length,
      lastActive,
      isActive30,
      creditsSpent,
      createdAt:    c.created_at,
    }
  })

  return NextResponse.json({ accounts })
}
