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

// ── getChurch (full — needed by pages that use follow_up_data) ────────────────
export const getChurch = cache(async function _getChurch(userId, userMetadata = {}) {
  if (!userId) return null
  try {
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('churches')
      .select('*')
      .eq('admin_user_id', userId)
      .single()

    if (existing) return existing

    // Auto-create on first login
    const adminName = userMetadata?.admin_name || userMetadata?.full_name || 'Admin'
    const groupName = userMetadata?.group_name  || userMetadata?.organization || 'My Church'

    const { data: created, error } = await admin
      .from('churches')
      .insert({
        admin_user_id: userId,
        name:          groupName,
        admin_name:    adminName,
        plan:          'free',
        sms_credits:   0,
        follow_up_data:        {},
        attendee_followup_data: {},
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: retry } = await admin
          .from('churches').select('*').eq('admin_user_id', userId).single()
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

// ── getChurchLean ─────────────────────────────────────────────────────────────
// For pages that don't need follow_up_data (attendance, members, analytics, etc.)
// Skips the heavy JSONB columns — significantly faster.
export const getChurchLean = cache(async function _getChurchLean(userId) {
  if (!userId) return null
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('churches')
      .select('id, name, admin_name, admin_user_id, account_type, plan, sms_credits, sms_sender_id, connection_code')
      .eq('admin_user_id', userId)
      .single()
    return data ?? null
  } catch {
    return null
  }
})

export { sanitizeInput, validateSignupFields } from './validation'
