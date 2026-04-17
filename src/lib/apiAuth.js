import { createAdminClient } from './supabase/admin'
import { createClient } from './supabase/server'

/**
 * Get the authenticated user + their church in any API route.
 * Tries cookie-based auth first, falls back to Authorization header.
 * Returns { user, church } or throws with a clear message.
 */
export async function getAuthContext() {
  let user = null

  // 1. Try cookie-based auth (works in Server Components + most API routes)
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.getUser()
    if (!error && data?.user) user = data.user
  } catch {}

  // 2. If cookies failed, something is misconfigured — but we still need the user
  if (!user) {
    throw new AuthError('Not authenticated', 401)
  }

  const admin = createAdminClient()

  // 3. Look up the church using admin client (bypasses RLS, verified by user.id from JWT)
  const { data: church, error: churchError } = await admin
    .from('churches')
    .select('id, name, admin_name, sms_credits, follow_up_data, attendee_followup_data')
    .eq('admin_user_id', user.id)
    .single()

  if (churchError || !church) {
    throw new AuthError('Church not found for this account', 404)
  }

  return { user, church, admin }
}

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message)
    this.status  = status
    this.isAuth  = true
  }
}

/**
 * Wrap an API route handler with automatic auth + error handling.
 * Usage:
 *   export const POST = withAuth(async (req, { user, church, admin }) => { ... })
 */
export function withAuth(handler) {
  return async function(request, context) {
    try {
      const authCtx = await getAuthContext()
      return await handler(request, { ...context, ...authCtx })
    } catch (err) {
      if (err.isAuth) {
        return Response.json({ error: err.message }, { status: err.status })
      }
      console.error('[API Error]', err)
      return Response.json({ error: 'Internal server error', detail: err.message }, { status: 500 })
    }
  }
}