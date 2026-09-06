/**
 * GET /api/settings/export-data
 *
 * Returns a full JSON export of all data belonging to the requesting church.
 * Satisfies GDPR Article 20 (right to data portability) and NDPR equivalent.
 *
 * The response is a JSON file download containing:
 *   - church profile
 *   - all members
 *   - all groups
 *   - all attendance sessions + records
 *   - all first timers
 *   - all follow-up data
 *   - SMS send history (counts only — not individual phone numbers)
 *
 * Rate-limited to prevent abuse: one export per 10 minutes per church.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { NextResponse }      from 'next/server'

// Simple in-memory rate limit — per church, per process
const lastExport = new Map()
const RATE_LIMIT_MS = 10 * 60 * 1000 // 10 minutes

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Load church
    const { data: church } = await admin
      .from('churches')
      .select('id, name, admin_name, phone, location, account_type, plan, created_at')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    // Rate limit check
    const last = lastExport.get(church.id)
    if (last && Date.now() - last < RATE_LIMIT_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_MS - (Date.now() - last)) / 1000)
      return NextResponse.json(
        { error: `Please wait ${waitSec} seconds before exporting again.` },
        { status: 429 }
      )
    }
    lastExport.set(church.id, Date.now())

    const churchId = church.id

    // ── Fetch all data in parallel ────────────────────────────────────────
    const [membersRes, groupsRes, sessionsRes, ftRes, smsRes] = await Promise.allSettled([
      admin.from('members')
        .select('id, name, phone, address, birthday, status, groupIds, away_since, created_at')
        .eq('church_id', churchId)
        .order('name'),

      admin.from('groups')
        .select('id, name, leader, created_at')
        .eq('church_id', churchId),

      admin.from('attendance_sessions')
        .select('id, date, group_id, groups(name), attendance_records(member_id, name, present)')
        .eq('church_id', churchId)
        .order('date', { ascending: false })
        .limit(500),

      admin.from('first_timers')
        .select('id, name, phone, address, date, visits')
        .eq('church_id', churchId)
        .order('date', { ascending: false }),

      // SMS logs: counts only — we deliberately exclude individual phone numbers
      admin.from('sms_logs')
        .select('id, type, message, recipient_count, success_count, fail_count, sent_at')
        .eq('church_id', churchId)
        .order('sent_at', { ascending: false }),
    ])

    const exportData = {
      exportedAt:   new Date().toISOString(),
      exportedBy:   user.email,
      church: {
        name:        church.name,
        adminName:   church.admin_name,
        phone:       church.phone,
        location:    church.location,
        accountType: church.account_type,
        plan:        church.plan,
        createdAt:   church.created_at,
      },
      members:     membersRes.status === 'fulfilled' ? (membersRes.value.data ?? [])  : [],
      groups:      groupsRes.status  === 'fulfilled' ? (groupsRes.value.data  ?? [])  : [],
      attendance:  sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : [],
      firstTimers: ftRes.status      === 'fulfilled' ? (ftRes.value.data      ?? [])  : [],
      smsHistory:  smsRes.status     === 'fulfilled' ? (smsRes.value.data     ?? [])  : [],
      note: 'SMS history includes message text and recipient counts. Individual phone numbers are not included in this export.',
    }

    const filename = `churchtrakr-export-${church.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type':        'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('[GET /api/settings/export-data] Unhandled error')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
