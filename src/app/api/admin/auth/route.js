/**
 * POST   /api/admin/auth — super admin login
 * DELETE /api/admin/auth — logout
 *
 * Env vars are read inside the handler so they're always current.
 * Session cookie is a signed, expiring, per-login token (see lib/adminAuth.js).
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, ADMIN_SESSION_SEC, createAdminSession, safeEqual } from '@/lib/adminAuth'

// Best-effort brute-force throttle (per server instance).
// For multi-instance deployments, back this with Redis/Upstash.
const attempts = new Map() // ip -> { count, resetAt }
const MAX_ATTEMPTS = 5
const WINDOW_MS    = 15 * 60 * 1000

function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function isLimited(ip) {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || rec.resetAt < now) return false
  return rec.count >= MAX_ATTEMPTS
}

function recordFailure(ip) {
  const now = Date.now()
  const rec = attempts.get(ip)
  if (!rec || rec.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  else rec.count++
  if (attempts.size > 1000) {
    for (const [k, v] of attempts) if (v.resetAt < now) attempts.delete(k)
  }
}

export async function POST(request) {
  const ADMIN_EMAIL    = process.env.SUPER_ADMIN_EMAIL    || null
  const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || null

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('[admin/auth] SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD are not configured')
    return NextResponse.json({ error: 'Admin login is not configured.' }, { status: 503 })
  }

  const ip = clientIp(request)
  if (isLimited(ip)) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const { email, password } = body

  // Evaluate both so timing doesn't reveal which field was wrong
  const emailOk = safeEqual(String(email ?? '').toLowerCase(), ADMIN_EMAIL.toLowerCase())
  const passOk  = safeEqual(password, ADMIN_PASSWORD)

  if (!emailOk || !passOk) {
    recordFailure(ip)
    await new Promise(r => setTimeout(r, 300))
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  attempts.delete(ip)

  const session = createAdminSession()
  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, session, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   ADMIN_SESSION_SEC,
  })

  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
  return NextResponse.json({ success: true })
}
