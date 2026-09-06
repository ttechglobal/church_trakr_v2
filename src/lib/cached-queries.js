/**
 * cached-queries.js — SERVER ONLY
 *
 * Wraps every hot Supabase query in Next.js unstable_cache so the
 * server doesn't hit the database on every navigation.
 *
 * Cache strategy:
 *   - church record          : 5 min  (rarely changes mid-session)
 *   - members                : 2 min  (may be added during a session)
 *   - groups                 : 5 min  (very rarely change)
 *   - attendance sessions    : 60 sec (updated when attendance is saved)
 *   - first timers           : 2 min
 *
 * Tags: every cache entry is tagged so we can revalidate on mutation.
 * Call revalidateCacheForChurch(churchId) from any API route after writes.
 */
import { unstable_cache, revalidateTag } from 'next/cache'
import { createAdminClient }             from '@/lib/supabase/admin'

// ── Revalidation ──────────────────────────────────────────────────────────────
export function revalidateCacheForChurch(churchId) {
  if (!churchId) return
  revalidateTag(`church:${churchId}`)
  revalidateTag(`members:${churchId}`)
  revalidateTag(`sessions:${churchId}`)
  revalidateTag(`ft:${churchId}`)
}

export function revalidateSessionsForChurch(churchId) {
  if (!churchId) return
  revalidateTag(`sessions:${churchId}`)
}

export function revalidateMembersForChurch(churchId) {
  if (!churchId) return
  revalidateTag(`members:${churchId}`)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function admin() { return createAdminClient() }

// ── Church ────────────────────────────────────────────────────────────────────
export function getCachedChurch(userId) {
  return unstable_cache(
    async () => {
      const { data } = await admin()
        .from('churches')
        .select('*')
        .eq('admin_user_id', userId)
        .single()
      return data ?? null
    },
    [`church:user:${userId}`],
    { revalidate: 300, tags: [`church:user:${userId}`] }
  )()
}

// ── Members ───────────────────────────────────────────────────────────────────
export function getCachedMembers(churchId, fields = 'id,name,phone,status,groupIds') {
  return unstable_cache(
    async () => {
      const { data } = await admin()
        .from('members')
        .select(fields)
        .eq('church_id', churchId)
        .order('name', { ascending: true })
      return data ?? []
    },
    [`members:${churchId}:${fields}`],
    { revalidate: 120, tags: [`members:${churchId}`] }
  )()
}

export function getCachedActiveMembers(churchId) {
  return unstable_cache(
    async () => {
      const { data } = await admin()
        .from('members')
        .select('id,name,phone,status,groupIds')
        .eq('church_id', churchId)
        .in('status', ['active'])
        .order('name', { ascending: true })
      return data ?? []
    },
    [`members:active:${churchId}`],
    { revalidate: 120, tags: [`members:${churchId}`] }
  )()
}

// ── Groups ────────────────────────────────────────────────────────────────────
export function getCachedGroups(churchId) {
  return unstable_cache(
    async () => {
      const { data } = await admin()
        .from('groups')
        .select('id,name,leader')
        .eq('church_id', churchId)
        .neq('name', 'First Timers')
        .order('created_at', { ascending: true })
      return data ?? []
    },
    [`groups:${churchId}`],
    { revalidate: 300, tags: [`church:${churchId}`] }
  )()
}

// ── Attendance sessions ───────────────────────────────────────────────────────
export function getCachedRecentSessions(churchId, limit = 30) {
  return unstable_cache(
    async () => {
      const { data } = await admin()
        .from('attendance_sessions')
        .select('id,date,group_id,groups(name),attendance_records(member_id,name,present)')
        .eq('church_id', churchId)
        .order('date', { ascending: false })
        .limit(limit)
      return data ?? []
    },
    [`sessions:recent:${churchId}:${limit}`],
    { revalidate: 60, tags: [`sessions:${churchId}`] }
  )()
}

// Lighter version for dashboard — no attendance_records content, just dates
export function getCachedSessionSummaries(churchId, limit = 10) {
  return unstable_cache(
    async () => {
      const { data } = await admin()
        .from('attendance_sessions')
        .select('id,date,group_id,attendance_records(present)')
        .eq('church_id', churchId)
        .order('date', { ascending: false })
        .limit(limit)
      return data ?? []
    },
    [`sessions:summary:${churchId}:${limit}`],
    { revalidate: 60, tags: [`sessions:${churchId}`] }
  )()
}

// For absentees — needs attendance_records with member_id
export function getCachedAbsenteeSessions(churchId) {
  return unstable_cache(
    async () => {
      const { data } = await admin()
        .from('attendance_sessions')
        .select('id,date,group_id,groups(name),attendance_records(member_id,name,present)')
        .eq('church_id', churchId)
        .order('date', { ascending: false })
        .limit(60)   // reduced from 120 — latest 60 is more than enough for latest-per-group
      return data ?? []
    },
    [`sessions:absentees:${churchId}`],
    { revalidate: 60, tags: [`sessions:${churchId}`] }
  )()
}

// ── First timers ──────────────────────────────────────────────────────────────
export function getCachedFirstTimers(churchId, limit = 100) {
  return unstable_cache(
    async () => {
      const { data } = await admin()
        .from('first_timers')
        .select('id,name,phone,date,visits')
        .eq('church_id', churchId)
        .order('date', { ascending: false })
        .limit(limit)
      return data ?? []
    },
    [`ft:${churchId}`],
    { revalidate: 120, tags: [`ft:${churchId}`] }
  )()
}
