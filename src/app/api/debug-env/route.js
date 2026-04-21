/**
 * GET /api/debug-env
 * Temporary endpoint to verify env vars are loaded (REMOVE BEFORE PRODUCTION).
 * Shows only whether each key is set — never shows the actual value.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL:    !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:   !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV:                    process.env.NODE_ENV,
  })
}
