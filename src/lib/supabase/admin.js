import { createClient } from '@supabase/supabase-js'

/**
 * Admin (service role) Supabase client — bypasses RLS.
 * Use ONLY in server-side code (Server Components, API routes).
 * NEVER import this in Client Components.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY env var.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. ' +
      'Add SUPABASE_SERVICE_ROLE_KEY to your Vercel environment variables.'
    )
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken:  false,
      persistSession:    false,
      detectSessionInUrl: false,
    },
  })
}
