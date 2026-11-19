import { createClient }      from './supabase/server'
import { createAdminClient } from './supabase/admin'
import { cache }             from 'react'
import { loadFollowUp }      from './followUp'

/**
 * SERVER ONLY — do not import this file in any 'use client' component.
 *
 * React cache() de-duplicates calls within a single server render tree.
 * If getUser() is called from the layout AND the page in the same request,
 * Supabase is only hit once.
 */

// ── getUser ───────────────────────────────────────────────────────────────────
export const getUser = cache(async function _getUser() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
})

// ── CHURCH COLUMN SETS ────────────────────────────────────────────────────────
// Never use select('*'). Follow-ups no longer live on this table — they are in
// follow_up_entries and are attached only when a page asks for { full: true }
// (dashboard, absentees, attendees, analytics, report, follow-up team, assign).

const LEAN_COLS =
  'id, name, admin_name, phone, location, admin_user_id, account_type, ' +
  'plan, sms_credits, sms_sender_id, sms_sender_id_status, connection_code, created_at'


// Attach follow-up entries (from the follow_up_entries table) under the same
// property names the UI has always read: follow_up_data / attendee_followup_data.
async function withFollowUps(admin, church) {
  const [follow_up_data, attendee_followup_data] = await Promise.all([
    loadFollowUp(admin, church.id, 'absentee'),
    loadFollowUp(admin, church.id, 'attendee'),
  ])
  return { ...church, follow_up_data, attendee_followup_data }
}

// ── getChurch ─────────────────────────────────────────────────────────────────
// Returns lean columns by default (the layout doesn't need the JSONB blobs).
// Pass { full: true } (or use getChurchFull) for pages that need follow-up data.
//
// IMPORTANT: The cache key includes the `full` flag so lean and full results
// are stored independently and React cache() de-dups correctly within a render.
export const getChurch = cache(async function _getChurch(userId, opts = {}) {
  if (!userId) return null
  const full = opts?.full === true
  const cols = LEAN_COLS

  try {
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('churches')
      .select(cols)
      .eq('admin_user_id', userId)
      .single()

    if (existing) return full ? await withFollowUps(admin, existing) : existing

    // Auto-create on first login (only runs if no record found)
    const { data: created, error } = await admin
      .from('churches')
      .insert({
        admin_user_id:          userId,
        name:                   'My Church',
        admin_name:             'Admin',
        plan:                   'free',
        sms_credits:            0,
      })
      .select(cols)
      .single()

    if (error) {
      if (error.code === '23505') {
        // Race condition: inserted by another request — just fetch it
        const { data: retry } = await admin
          .from('churches').select(cols).eq('admin_user_id', userId).single()
        return retry ? (full ? await withFollowUps(admin, retry) : retry) : null
      }
      console.error('[getChurch] insert error:', error.message)
      return null
    }
    return full ? await withFollowUps(admin, created) : created
  } catch (err) {
    console.error('[getChurch] unexpected error:', err.message)
    return null
  }
})

// ── getChurchFull ─────────────────────────────────────────────────────────────
// Convenience wrapper — identical to getChurch(userId, { full: true }).
// Import this in pages that NEED follow_up_data / attendee_followup_data.
// React cache() will de-dup with any other getChurch(userId, { full: true })
// call in the same render tree.
export const getChurchFull = cache(async function _getChurchFull(userId) {
  return getChurch(userId, { full: true })
})

// ── getChurchLean (DEPRECATED alias) ─────────────────────────────────────────
// Kept for backwards compatibility during migration. Now just calls getChurch()
// so both the layout and lean pages de-dup against the same cache entry.
export const getChurchLean = (userId) => getChurch(userId)

export { sanitizeInput, validateSignupFields } from './validation'
