/**
 * Shared admin auth check — used by every /api/admin/* route.
 * Call with the result of `await cookies()`.
 */
export function isAdminAuthed(cookieStore) {
  const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || null
  const SESSION_TOKEN  = process.env.SUPER_ADMIN_TOKEN    || null
  const effectiveToken = SESSION_TOKEN || (ADMIN_PASSWORD ? Buffer.from(ADMIN_PASSWORD).toString('base64') : null)
  if (!effectiveToken) return false
  return cookieStore.get('ct_super_admin')?.value === effectiveToken
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
