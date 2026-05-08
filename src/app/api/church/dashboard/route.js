/**
 * GET /api/church/dashboard
 * Query params:
 *   view=sunday|month (default: sunday)
 *   date=YYYY-MM-DD   (for sunday view — defaults to most recent Sunday)
 *   month=YYYY-MM     (for month view)
 */
import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }      from 'next/server'

function getMostRecentSunday() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}

function getSundaysInMonth(yearMonth) {
  const [year, month] = yearMonth.split('-').map(Number)
  const sundays = []
  const d = new Date(year, month - 1, 1)
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1)
  while (d.getMonth() === month - 1) {
    sundays.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 7)
  }
  return sundays
}

function getPastSundays(n = 12) {
  const sundays = []
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  for (let i = 0; i < n; i++) {
    sundays.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() - 7)
  }
  return sundays
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: church } = await admin
    .from('churches').select('id,name,connection_code')
    .eq('admin_user_id', user.id).single()
  if (!church || !church.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const view  = searchParams.get('view')  ?? 'sunday'
  const date  = searchParams.get('date')  ?? getMostRecentSunday()
  const month = searchParams.get('month') ?? new Date().toISOString().slice(0, 7)

  // Approved + disconnected connections
  const { data: connections } = await admin
    .from('church_connections')
    .select('subgroup_id, status, connected_at, disconnected_at')
    .eq('church_id', church.id)

  const approved     = (connections ?? []).filter(c => c.status === 'approved')
  const disconnected = (connections ?? []).filter(c => c.status === 'disconnected')
  const allSubIds    = [...approved, ...disconnected].map(c => c.subgroup_id)

  if (!allSubIds.length) {
    return NextResponse.json({
      view, date, month,
      pastSundays: getPastSundays(),
      groups: [],
      aggregated: null,
      connectionCode: church.connection_code,
    })
  }

  // Subgroup names
  const { data: subgroups } = await admin
    .from('churches').select('id,name,admin_name')
    .in('id', allSubIds)
  const subMap  = Object.fromEntries((subgroups ?? []).map(s => [s.id, s]))
  const connMap = Object.fromEntries((connections ?? []).map(c => [c.subgroup_id, c]))

  // Determine which dates to query
  const targetDates = view === 'sunday'
    ? [date]
    : getSundaysInMonth(month)

  // Fetch sessions + records for target dates across all subgroups
  const { data: sessions } = await admin
    .from('attendance_sessions')
    .select('id,date,church_id,groups(name),attendance_records(member_id,present)')
    .in('church_id', allSubIds)
    .in('date', targetDates)

  // Fetch follow_up_data for each church to count reached
  const { data: churchData } = await admin
    .from('churches')
    .select('id,follow_up_data')
    .in('id', allSubIds)
  const followMap = Object.fromEntries((churchData ?? []).map(c => [c.id, c.follow_up_data ?? {}]))

  // Compute stats per subgroup
  const groups = allSubIds.map(sid => {
    const sub  = subMap[sid] ?? { id: sid, name: 'Unknown', admin_name: '' }
    const conn = connMap[sid]
    const isDisconnected = conn?.status === 'disconnected'

    const groupSessions = (sessions ?? []).filter(s =>
      s.church_id === sid &&
      s.groups?.name !== 'First Timers' &&
      (s.attendance_records ?? []).some(r => r.member_id !== null)
    )

    if (!groupSessions.length) {
      return {
        id: sid, name: sub.name, adminName: sub.admin_name,
        status: conn?.status ?? 'unknown',
        hasData: false,
        present: 0, absent: 0, reached: 0, total: 0,
        sessionCount: 0,
        lastDate: null,
      }
    }

    let present = 0, total = 0
    const followUp = followMap[sid] ?? {}

    for (const s of groupSessions) {
      for (const r of (s.attendance_records ?? [])) {
        if (!r.member_id) continue
        total++
        if (r.present) present++
      }
    }

    const absent = total - present

    // Count reached: follow_up entries that are reached, keyed to sessions in this date range
    const sessionIds = new Set(groupSessions.map(s => s.id))
    let reached = 0
    for (const [key, entry] of Object.entries(followUp)) {
      const sessionId = key.split('_')[0]
      if (sessionIds.has(sessionId) && entry.reached) reached++
    }

    // Most recent session date
    const lastDate = groupSessions
      .map(s => s.date)
      .sort((a, b) => b.localeCompare(a))[0] ?? null

    return {
      id: sid, name: sub.name, adminName: sub.admin_name,
      status: conn?.status ?? 'unknown',
      hasData: total > 0,
      present, absent, reached, total,
      sessionCount: groupSessions.length,
      lastDate,
    }
  })

  // Aggregate
  const reported = groups.filter(g => g.hasData && g.status === 'approved')
  const totalPresent = reported.reduce((s, g) => s + g.present, 0)
  const totalAbsent  = reported.reduce((s, g) => s + g.absent,  0)
  const totalReached = reported.reduce((s, g) => s + g.reached, 0)

  // Trend: compare to previous Sunday
  let trendText = null
  if (view === 'sunday' && totalPresent > 0) {
    const prevDate = new Date(date + 'T00:00:00')
    prevDate.setDate(prevDate.getDate() - 7)
    const prevStr = prevDate.toISOString().slice(0, 10)
    const { data: prevSessions } = await admin
      .from('attendance_sessions')
      .select('attendance_records(member_id,present)')
      .in('church_id', approved.map(c => c.subgroup_id))
      .eq('date', prevStr)
    const prevPresent = (prevSessions ?? [])
      .flatMap(s => s.attendance_records ?? [])
      .filter(r => r.member_id && r.present).length
    if (prevPresent > 0) {
      const diff = totalPresent - prevPresent
      if (diff > 0) trendText = `↑ Up ${diff} from last Sunday`
      else if (diff < 0) trendText = `↓ Down ${Math.abs(diff)} from last Sunday`
      else trendText = '→ Same as last Sunday'
    }
  }

  return NextResponse.json({
    view, date, month,
    pastSundays: getPastSundays(),
    groups: groups.sort((a, b) => {
      // Approved with data first, then approved no data, then disconnected
      if (a.status !== b.status) return a.status === 'approved' ? -1 : 1
      if (a.hasData !== b.hasData) return a.hasData ? -1 : 1
      return a.name.localeCompare(b.name)
    }),
    aggregated: {
      totalPresent, totalAbsent, totalReached,
      reportedCount: reported.length,
      approvedCount:  approved.length,
      trendText,
    },
    connectionCode: church.connection_code,
  })
}
