import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

function isAdminAuthed(cookieStore) {
  // Read inside function — always fresh
  const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || null
  const SESSION_TOKEN  = process.env.SUPER_ADMIN_TOKEN    || null
  const effectiveToken = SESSION_TOKEN || (ADMIN_PASSWORD ? Buffer.from(ADMIN_PASSWORD).toString('base64') : null)

  if (!effectiveToken) return false
  const token = cookieStore.get('ct_super_admin')?.value
  return token === effectiveToken
}

export async function GET() {
  const cookieStore = await cookies()
  if (!isAdminAuthed(cookieStore)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const [churchesRes, membersRes, sessionsRes, ftRes] = await Promise.allSettled([
    admin.from('churches').select('id,name,admin_name,created_at,sms_credits,account_type').order('created_at', { ascending: false }),
    admin.from('members').select('id,church_id,status,created_at'),
    admin.from('attendance_sessions').select('id,church_id,date').order('date', { ascending: false }),
    admin.from('first_timers').select('id,church_id'),
  ])

  const churches = churchesRes.status === 'fulfilled' ? (churchesRes.value.data ?? []) : []
  const members  = membersRes.status  === 'fulfilled' ? (membersRes.value.data  ?? []) : []
  const sessions = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : []
  const ft       = ftRes.status       === 'fulfilled' ? (ftRes.value.data       ?? []) : []

  const churchStats = churches.map(c => ({
    id:           c.id,
    name:         c.name,
    adminName:    c.admin_name,
    accountType:  c.account_type,
    createdAt:    c.created_at,
    lastActive:   sessions.find(s => s.church_id === c.id)?.date ?? null,
    totalMembers: members.filter(m => m.church_id === c.id && m.status === 'active').length,
    totalSundays: sessions.filter(s => s.church_id === c.id).length,
    smsCredits:   c.sms_credits,
  }))

  return NextResponse.json({
    totals: {
      churches:    churches.length,
      members:     members.filter(m => m.status === 'active').length,
      sessions:    sessions.length,
      firstTimers: ft.length,
    },
    churches: churchStats,
  })
}
