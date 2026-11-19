import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Shared admin auth — used by every /api/admin/* route.
 *
 * The session cookie is a random per-login nonce + expiry, signed with an
 * HMAC key derived from server-side secrets. It can't be forged from the
 * password alone, differs for every login, and expires on its own.
 *
 * Rotating SUPER_ADMIN_TOKEN (or the password) invalidates all sessions.
 */
export const ADMIN_COOKIE      = 'ct_super_admin'
export const ADMIN_SESSION_SEC = 60 * 60 * 8 // 8 hours

function signingKey() {
  const secret = process.env.SUPER_ADMIN_TOKEN
  const pass   = process.env.SUPER_ADMIN_PASSWORD
  if (!pass) return null
  // Mix both so a leaked token alone (or password alone) can't mint cookies.
  return createHmac('sha256', `ct-admin:${secret ?? ''}`).update(pass).digest()
}

function sign(payload, key) {
  return createHmac('sha256', key).update(payload).digest('hex')
}

/** Constant-time string comparison (safe for different lengths). */
export function safeEqual(a, b) {
  const ha = createHmac('sha256', 'cmp').update(String(a ?? '')).digest()
  const hb = createHmac('sha256', 'cmp').update(String(b ?? '')).digest()
  return timingSafeEqual(ha, hb)
}

/** Create a fresh signed session value, or null if admin auth isn't configured. */
export function createAdminSession() {
  const key = signingKey()
  if (!key) return null
  const expires = Math.floor(Date.now() / 1000) + ADMIN_SESSION_SEC
  const payload = `${expires}.${randomBytes(16).toString('hex')}`
  return `${payload}.${sign(payload, key)}`
}

export function isAdminAuthed(cookieStore) {
  const key = signingKey()
  if (!key) return false
  const value = cookieStore.get(ADMIN_COOKIE)?.value
  if (!value) return false

  const parts = value.split('.')
  if (parts.length !== 3) return false
  const [expires, nonce, sig] = parts
  if (!(Number(expires) > Math.floor(Date.now() / 1000))) return false
  return safeEqual(sig, sign(`${expires}.${nonce}`, key))
}

/**
 * Log an admin action to admin_audit_log.
 * Non-fatal — never throws.
 */
export async function logAdminAction(admin, { actionType, targetChurchId, details }) {
  try {
    await admin.from('admin_audit_log').insert({
      action_type:      actionType,
      target_church_id: targetChurchId ?? null,
      details:          details ?? {},
      performed_at:     new Date().toISOString(),
    })
  } catch (e) {
    console.warn('[adminAuth] audit log failed:', e.message)
  }
}
