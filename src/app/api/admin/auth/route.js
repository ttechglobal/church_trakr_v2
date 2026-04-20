/**
 * POST /api/admin/auth — super admin login
 * DELETE /api/admin/auth — logout
 *
 * Reads env vars INSIDE the handler (not at module level) so they are
 * always current — no restart required after adding them.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request) {
  // Read inside handler — never stale
  const ADMIN_EMAIL    = process.env.SUPER_ADMIN_EMAIL    || 'admin@churchtrackr.com'
  const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || null
  const SESSION_TOKEN  = process.env.SUPER_ADMIN_TOKEN    || null

  // Debug: log what we see (remove after confirming it works)
  console.log('[admin/auth] ENV check — password set:', !!ADMIN_PASSWORD, '| token set:', !!SESSION_TOKEN)

  if (!ADMIN_PASSWORD) {
    return NextResponse.json({
      error: 'SUPER_ADMIN_PASSWORD is not set in your .env.local file. Add it and restart the dev server.'
    }, { status: 503 })
  }

  // If no token set, generate one from the password (simpler local setup)
  const effectiveToken = SESSION_TOKEN || Buffer.from(ADMIN_PASSWORD).toString('base64')

  const body = await request.json()
  const { email, password } = body

  const emailMatch    = email    === ADMIN_EMAIL
  const passwordMatch = password === ADMIN_PASSWORD

  if (!emailMatch || !passwordMatch) {
    await new Promise(r => setTimeout(r, 200))
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
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
