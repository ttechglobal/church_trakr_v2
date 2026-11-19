import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Handles:
 * 1. Email confirmation after signup
 * 2. Password reset redirect
 * 3. OAuth callback (if added later)
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Only allow same-site relative paths (blocks //evil.com and /\evil.com open redirects)
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next = /^\/(?![\/\\])/.test(rawNext) ? rawNext : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
