import { createClient }      from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NEW_USER_WINDOW_MS = 60 * 60 * 1000 // 1 hour

/**
 * Resolve WHO is allowed to create a church record. Never trust a userId alone.
 *
 *  1. A signed-in session always wins — the session user is returned and any
 *     body-supplied userId is ignored (or must match).
 *  2. No session (email confirmation pending right after signUp): accept the
 *     claimed userId only if that auth user really exists, was created within
 *     the last hour, and has no church yet. UUIDs are unguessable, so this
 *     only lets the person who just signed up finish their own onboarding.
 *
 * Returns the verified user id, or null.
 */
export async function resolveSignupUserId(claimedUserId) {
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      if (claimedUserId && claimedUserId !== data.user.id) return null
      return data.user.id
    }
  } catch { /* fall through to unconfirmed-signup path */ }

  if (typeof claimedUserId !== 'string' || !UUID_RE.test(claimedUserId)) return null

  const admin = createAdminClient()
  const { data: authData, error } = await admin.auth.admin.getUserById(claimedUserId)
  const u = authData?.user
  if (error || !u) return null

  const age = Date.now() - new Date(u.created_at).getTime()
  if (!(age >= 0 && age <= NEW_USER_WINDOW_MS)) return null

  const { data: existing } = await admin
    .from('churches').select('id').eq('admin_user_id', claimedUserId).maybeSingle()
  if (existing) return null

  return claimedUserId
}
