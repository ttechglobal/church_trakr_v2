/**
 * POST /api/admin/auth — super admin login
 * DELETE /api/admin/auth — logout
 *
 * Reads env vars INSIDE the handler (not at module level) so they are
 * always current — no restart required after adding them.
 *
 * TEMPORARY DIAGNOSTIC MODE — added to find the 401 root cause on
 * churchtrakr.online. Safe to ship: never echoes actual secret values,
 * only booleans/lengths/first-char so we can compare without exposing
 * anything sensitive in the response or in logs.
 *
 * ⚠️ REMOVE the `debug` block below once the real bug is found and fixed.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request) {
  // Read inside handler — never stale
  const ADMIN_EMAIL    = process.env.SUPER_ADMIN_EMAIL    || 'admin@churchtrackr.com'
  const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || null
  const SESSION_TOKEN  = process.env.SUPER_ADMIN_TOKEN    || null

  const body = await request.json().catch(() => ({}))
  const { email, password } = body

  // ── Safe diagnostics — no secret values ever leave this function ────────
  const debug = {
    envEmailLength:     ADMIN_EMAIL?.length ?? 0,
    envPasswordSet:     !!ADMIN_PASSWORD,
    envPasswordLength:  ADMIN_PASSWORD?.length ?? 0,
    envTokenSet:        !!SESSION_TOKEN,
    inputEmailLength:   email?.length ?? 0,
    inputPasswordLength:password?.length ?? 0,
    emailMatchesIgnoringCase:
      typeof email === 'string' && email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
    emailExactMatch:    email === ADMIN_EMAIL,
    passwordExactMatch: password === ADMIN_PASSWORD,
    // Catches the #1 real-world cause: trailing newline/space pasted into
    // the Vercel dashboard field when the env var was added.
    passwordMatchesTrimmed:
      typeof password === 'string' && ADMIN_PASSWORD != null &&
      password.trim() === ADMIN_PASSWORD.trim(),
  }

  console.log('[admin/auth] DIAGNOSTIC:', JSON.stringify(debug))

  if (!ADMIN_PASSWORD) {
    return NextResponse.json({
      error: 'SUPER_ADMIN_PASSWORD is not set in your .env.local file. Add it and restart the dev server.',
      debug,
    }, { status: 503 })
  }

  const effectiveToken = SESSION_TOKEN || Buffer.from(ADMIN_PASSWORD).toString('base64')

  const emailMatch    = email    === ADMIN_EMAIL
  const passwordMatch = password === ADMIN_PASSWORD

  if (!emailMatch || !passwordMatch) {
    await new Promise(r => setTimeout(r, 200))
    return NextResponse.json({ error: 'Invalid credentials', debug }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('ct_super_admin', effectiveToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',          // '/' not '/admin' — avoids cookie scope issues
    maxAge:   60 * 60 * 8,  // 8 hours
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete('ct_super_admin')
  return NextResponse.json({ success: true })
}