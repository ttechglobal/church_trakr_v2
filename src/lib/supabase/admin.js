import { createClient } from '@supabase/supabase-js'

let adminClient = null

/**
 * Service role client — bypasses RLS.
 * ONLY import this in:
 *   - src/app/api/** (Route Handlers)
 *   - src/app/(app)/**/
 
//  page.js server components that need it
//  * NEVER import in client components or expose to the browser.
//  */
export function createAdminClient() {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    )
  }

  adminClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}