import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'

/**
 * SERVER ONLY — do not import this file in any 'use client' component.
 * For validation utilities, import from @/lib/validation instead.
 */

export async function getUser() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

export async function getChurch(userId, userMetadata = {}) {
  if (!userId) return null

  try {
    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('churches')
      .select('*')
      .eq('admin_user_id', userId)
      .single()

    if (existing) return existing

    const adminName = userMetadata?.admin_name
      || userMetadata?.full_name
      || 'Admin'
    const groupName = userMetadata?.group_name
      || userMetadata?.organization
      || 'My Church'

    const { data: created, error } = await admin
      .from('churches')
      .insert({
        admin_user_id: userId,
        name: groupName,
        admin_name: adminName,
        plan: 'free',
        sms_credits: 0,
        follow_up_data: {},
        attendee_followup_data: {},
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        const { data: retry } = await admin
          .from('churches')
          .select('*')
          .eq('admin_user_id', userId)
          .single()
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
}