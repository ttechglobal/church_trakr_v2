import { createAdminClient } from './supabase/admin'
import { createClient }      from './supabase/server'

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message)
    this.status = status
    this.isAuth = true
  }
}

// ── Internal: authenticate the request ──────────────────────────────────────
async function resolveUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) throw new AuthError('Not authenticated', 401)
  return data.user
}

// ── getAuthContext (lean) ────────────────────────────────────────────────────
// Used by most API routes that only need church.id for scoping queries.
// Selects the minimum columns — does NOT fetch follow_up_data JSONB.
export async function getAuthContext() {
  const user  = await resolveUser()
  const admin = createAdminClient()

  const { data: church, error } = await admin
    .from('churches')
    .select('id, name, admin_name, sms_credits, sms_sender_id, sms_sender_id_status')
    .eq('admin_user_id', user.id)
    .single()

  if (error || !church) throw new AuthError('Church not found', 404)
  return { user, church, admin }
}

// ── withAuth ─────────────────────────────────────────────────────────────────
// Wraps a handler with lean auth (no follow_up_data). Use for 95% of routes.
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
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
