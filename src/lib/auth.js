import { createClient }      from './supabase/server'
import { createAdminClient } from './supabase/admin'
import { cache }             from 'react'

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
// Never use select('*') — the churches table has 3 JSONB columns
// (follow_up_data, attendee_followup_data, push_subscriptions) that can be
// hundreds of KB each. We define two explicit column sets:
//
//   LEAN_COLS  — everything EXCEPT the heavy JSONB blobs.
//                Used by the layout shell, attendance, members, groups,
//                messaging, credits, settings, and any page that only needs
//                church.id / plan / sms_credits / sender_id etc.
//
//   FULL_COLS  — adds follow_up_data + attendee_followup_data.
//                Used ONLY by pages that must read the JSONB directly:
//                dashboard, absentees, attendees, analytics, report,
//                follow-up-team, assign.

const LEAN_COLS =
  'id, name, admin_name, phone, location, admin_user_id, account_type, ' +
  'plan, sms_credits, sms_sender_id, sms_sender_id_status, connection_code, created_at'

const FULL_COLS = LEAN_COLS + ', follow_up_data, attendee_followup_data'

// ── getChurch ─────────────────────────────────────────────────────────────────
// Returns lean columns by default (the layout doesn't need the JSONB blobs).
// Pass { full: true } for pages that need follow_up_data / attendee_followup_data.
//
// IMPORTANT: The cache key includes the `full` flag so lean and full results
// are stored independently and React cache() de-dups correctly within a render.
export const getChurch = cache(async function _getChurch(userId, opts = {}) {
  if (!userId) return null
  const full = opts?.full === true
  const cols = full ? FULL_COLS : LEAN_COLS

  try {
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('churches')
      .select(cols)
      .eq('admin_user_id', userId)
      .single()

    if (existing) return existing

    // Auto-create on first login (only runs if no record found)
    const { data: created, error } = await admin
      .from('churches')
      .insert({
        admin_user_id:          userId,
        name:                   'My Church',
        admin_name:             'Admin',
        plan:                   'free',
        sms_credits:            0,
        follow_up_data:         {},
        attendee_followup_data: {},
      })
      .select(cols)
      .single()

    if (error) {
      if (error.code === '23505') {
        // Race condition: inserted by another request — just fetch it
        const { data: retry } = await admin
          .from('churches').select(cols).eq('admin_user_id', userId).single()
        return retry ?? null
      }
      console.error('[getChurch] insert error:', error.message)
      return null
    }
    return created
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
