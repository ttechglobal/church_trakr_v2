import { createClient } from './supabase/server'
import { unstable_cache } from 'next/cache'

/**
 * Get the authenticated user's church record.
 * Returns null if not authenticated or no church found.
 */
export async function getChurch() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('churches')
    .select('*')
    .eq('admin_user_id', user.id)
    .single()

  return data ?? null
}

/**
 * Get all groups for a church (excluding "First Timers").
 */
export async function getGroups(churchId) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('church_id', churchId)
    .neq('name', 'First Timers')
    .order('created_at', { ascending: true })

  return data ?? []
}

/**
 * Get the "First Timers" special group for a church.
 */
export async function getFirstTimersGroup(churchId) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('groups')
    .select('*')
    .eq('church_id', churchId)
    .eq('name', 'First Timers')
    .single()

  return data ?? null
}

/**
 * Get all active members for a church.
 */
export async function getMembers(churchId, { includeInactive = false } = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('members')
    .select('*')
    .eq('church_id', churchId)
    .order('name', { ascending: true })

  if (!includeInactive) {
    query = query.eq('status', 'active')
  }

  const { data } = await query
  return data ?? []
}

/**
 * Get members belonging to a specific group.
 */
export async function getGroupMembers(churchId, groupId) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('members')
    .select('*')
    .eq('church_id', churchId)
    .eq('status', 'active')
    .contains('groupIds', [groupId])
    .order('name', { ascending: true })

  return data ?? []
}

/**
 * Get attendance history for a church (paginated, max 500/page).
 * Cached for 5 minutes, revalidated by tag.
 */
export function getCachedAttendanceHistory(churchId) {
  return unstable_cache(
    async () => fetchAllAttendanceHistory(churchId),
    ['attendance', churchId],
    { revalidate: 300, tags: [`attendance-${churchId}`] }
  )()
}

async function fetchAllAttendanceHistory(churchId) {
  const supabase = await createClient()
  const allSessions = []
  let page = 0
  const PAGE_SIZE = 500

  while (true) {
    const { data, error } = await supabase
      .from('attendance_sessions')
      .select(`
        id, date, group_id,
        groups ( name ),
        attendance_records ( id, member_id, name, present )
      `)
      .eq('church_id', churchId)
      .order('date', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error || !data || data.length === 0) break
    allSessions.push(...data)
    if (data.length < PAGE_SIZE) break
    page++
  }

  return allSessions
}

/**
 * Get recent attendance sessions (last N).
 */
export async function getRecentSessions(churchId, limit = 10) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('attendance_sessions')
    .select(`
      id, date, group_id,
      groups ( name ),
      attendance_records ( present )
    `)
    .eq('church_id', churchId)
    .order('date', { ascending: false })
    .limit(limit)

  return data ?? []
}

/**
 * Get first timers for a church.
 */
export async function getFirstTimers(churchId) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('first_timers')
    .select('*')
    .eq('church_id', churchId)
    .order('date', { ascending: false })

  return data ?? []
}

/**
 * Ensure the special "First Timers" group exists (deduplication safe).
 * Returns the group record.
 */
export async function ensureFirstTimersGroup(churchId) {
  const supabase = await createClient()

  // Check if it already exists
  const { data: existing } = await supabase
    .from('groups')
    .select('*')
    .eq('church_id', churchId)
    .eq('name', 'First Timers')

  if (existing && existing.length > 0) {
    // Deduplicate if multiple were created (race condition guard)
    if (existing.length > 1) {
      const [keep, ...dupes] = existing
      await supabase
        .from('groups')
        .delete()
        .in('id', dupes.map(g => g.id))
      return keep
    }
    return existing[0]
  }

  // Create it
  const { data } = await supabase
    .from('groups')
    .insert({ church_id: churchId, name: 'First Timers', leader: '' })
    .select()
    .single()

  return data
}
