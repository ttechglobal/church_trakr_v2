/**
 * GET /api/church/dashboard?period=1m|3m|6m|1y
 * Returns aggregated stats for all approved subgroups.
 * Only accessible by church accounts.
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

function periodStart(p) {
  const now = new Date()
  if (p === '1m') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10)
  if (p === '3m') return new Date(now.getFullYear(), now.getMonth()-2, 1).toISOString().slice(0,10)
  if (p === '6m') return new Date(now.getFullYear(), now.getMonth()-5, 1).toISOString().slice(0,10)
  return new Date(now.getFullYear(), 0, 1).toISOString().slice(0,10)
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: church } = await admin.from('churches').select('*').eq('admin_user_id', user.id).single()
  if (!church || church.account_type !== 'church') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get approved subgroups
  const { data: connections } = await admin.from('church_connections')
    .select('subgroup_id, status, connected_at, disconnected_at')
    .eq('church_id', church.id)

  const approved = (connections ?? []).filter(c => c.status === 'approved')
  const disconnected = (connections ?? []).filter(c => c.status === 'disconnected')
  const allSubIds = [...approved, ...disconnected].map(c => c.subgroup_id)

  if (!allSubIds.length) return NextResponse.json({ groups: [], aggregated: null })

  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? '1m'
  const start = periodStart(period)

  // Fetch subgroup info (name only — no PII)
  const { data: subgroups } = await admin.from('churches')
    .select('id, name, admin_name')
    .in('id', allSubIds)

  // Fetch sessions + records for all approved subgroups
  const { data: sessions } = await admin.from('attendance_sessions')
    .select('id, date, church_id, groups(name), attendance_records(member_id, present)')
    .in('church_id', allSubIds)
    .gte('date', start)
    .order('date', { ascending: false })

  // Fetch member counts (active only, name+status — no PII)
  const { data: members } = await admin.from('members')
    .select('id, church_id, status, name')
    .in('church_id', allSubIds)
    .eq('status', 'active')

  const subMap = Object.fromEntries((subgroups ?? []).map(s => [s.id, s]))
  const connMap = Object.fromEntries(connections.map(c => [c.subgroup_id, c]))

  // Build per-group stats
  const groupStats = allSubIds.map(sid => {
    const sub = subMap[sid] ?? { id: sid, name: 'Unknown', admin_name: '' }
    const conn = connMap[sid]
    const groupSessions = (sessions ?? []).filter(s =>
      s.church_id === sid &&
      s.groups?.name !== 'First Timers' &&
      (s.attendance_records ?? []).some(r => r.member_id !== null)
    )
    const groupMembers = (members ?? []).filter(m => m.church_id === sid)

    // Attendance trend
    const byDate = {}
    for (const s of groupSessions) {
      if (!byDate[s.date]) byDate[s.date] = { present: 0, total: 0 }
      for (const r of (s.attendance_records ?? [])) {
        if (!r.member_id) continue
        byDate[s.date].total++
        if (r.present) byDate[s.date].present++
      }
    }

    const trend = Object.entries(byDate)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([date, {present, total}]) => ({
        date,
        label: new Date(date+'T00:00:00').toLocaleDateString(undefined, {month:'short',day:'numeric'}),
        present, total,
        rate: total > 0 ? Math.round((present/total)*100) : 0,
      }))

    const lastEntry = trend[trend.length - 1] ?? null
    const avgRate = trend.length > 0
      ? Math.round(trend.reduce((s,d) => s+d.rate, 0) / trend.length)
      : null

    return {
      id:          sid,
      name:        sub.name,
      adminName:   sub.admin_name,
      status:      conn?.status ?? 'unknown',
      connectedAt: conn?.connected_at ?? null,
      disconnectedAt: conn?.disconnected_at ?? null,
      memberCount:    groupMembers.length,
      lastSession:    lastEntry,
      avgRate,
      trend,
      totalSessions:  groupSessions.length,
    }
  })

  // Aggregated totals
  const approvedGroups = groupStats.filter(g => g.status === 'approved')
  const totalMembers = approvedGroups.reduce((s,g) => s + g.memberCount, 0)
  const overallRates = approvedGroups.filter(g => g.avgRate !== null).map(g => g.avgRate)
  const overallAvgRate = overallRates.length > 0
    ? Math.round(overallRates.reduce((s,r) => s+r, 0) / overallRates.length)
    : null

  // Most recent Sunday across all groups
  const allDates = approvedGroups.flatMap(g => g.trend.map(t => t.date))
  const latestDate = allDates.sort((a,b) => b.localeCompare(a))[0] ?? null

  let lastSunday = null
  if (latestDate) {
    let present = 0, total = 0
    for (const g of approvedGroups) {
      const d = g.trend.find(t => t.date === latestDate)
      if (d) { present += d.present; total += d.total }
    }
    lastSunday = { date: latestDate, present, total, rate: total > 0 ? Math.round((present/total)*100) : 0 }
  }

  return NextResponse.json({
    groups:   groupStats,
    aggregated: {
      totalMembers,
      overallAvgRate,
      lastSunday,
      connectedCount: approvedGroups.length,
    },
  })
}
