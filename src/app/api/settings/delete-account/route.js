/**
 * DELETE /api/settings/delete-account
 *
 * Permanently deletes the church account, ALL its data, and the sign-in identity.
 * Irreversible — no soft delete, no recovery.
 *
 * Body: { confirmText: "DELETE MY ACCOUNT", password: "<current password>" }
 *
 * Safety:
 *  - The current password is re-verified, so a stolen/shared logged-in session
 *    cannot wipe an account (failed attempts are rate-limited per user).
 *  - Data deletion is ONE database transaction (delete_church_data): all of it or none.
 *  - The auth user is removed only after the data is gone. If an earlier attempt
 *    removed the data but not the login, calling this again finishes the cleanup.
 */
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { NextResponse }      from 'next/server'

const CONFIRM_TEXT = 'DELETE MY ACCOUNT'
const MAX_FAILS    = 5
const WINDOW_MS    = 15 * 60 * 1000

// Per-instance limiter for wrong-password attempts (best effort on serverless)
const fails = new Map()   // userId -> { n, resetAt }
function tooMany(userId) {
  const f = fails.get(userId)
  if (!f) return false
  if (Date.now() > f.resetAt) { fails.delete(userId); return false }
  return f.n >= MAX_FAILS
}
function recordFail(userId) {
  const f = fails.get(userId)
  if (!f || Date.now() > f.resetAt) fails.set(userId, { n: 1, resetAt: Date.now() + WINDOW_MS })
  else f.n++
}

async function passwordIsValid(email, password) {
  // Separate, cookie-less client so this never touches the user's real session
  const verifier = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
  const { error } = await verifier.auth.signInWithPassword({ email, password })
  return !error
}

export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    if (body.confirmText !== CONFIRM_TEXT) {
      return NextResponse.json({ error: `Type "${CONFIRM_TEXT}" to confirm deletion` }, { status: 400 })
    }
    if (typeof body.password !== 'string' || !body.password || body.password.length > 200) {
      return NextResponse.json({ error: 'Enter your password to confirm' }, { status: 400 })
    }
    if (!user.email) {
      return NextResponse.json({ error: 'This account has no email sign-in; please contact support.' }, { status: 400 })
    }

    if (tooMany(user.id)) {
      return NextResponse.json({ error: 'Too many wrong attempts. Try again in 15 minutes.' }, { status: 429 })
    }
    if (!(await passwordIsValid(user.email, body.password))) {
      recordFail(user.id)
      return NextResponse.json({ error: 'Incorrect password' }, { status: 403 })
    }
    fails.delete(user.id)

    const admin = createAdminClient()

    const { data: church, error: churchErr } = await admin
      .from('churches').select('id').eq('admin_user_id', user.id).maybeSingle()
    if (churchErr) {
      console.error('[delete-account] church lookup failed:', churchErr.code)
      return NextResponse.json({ error: 'Could not delete your account. Please try again.' }, { status: 500 })
    }

    // ── 1. Data: one transaction, all or nothing ──────────────────────────
    // (No church row = a previous attempt already removed the data; finish the login cleanup.)
    if (church) {
      const { error } = await admin.rpc('delete_church_data', { p_church: church.id })
      if (error && error.code !== 'P0002') {
        console.error('[delete-account] delete_church_data failed:', error.code, error.message)
        return NextResponse.json(
          { error: 'We could not delete your data, so nothing was changed. Please try again or contact support.' },
          { status: 500 }
        )
      }
    }

    // ── 2. Sign-in identity (data is already gone, so retry once) ─────────
    let removed = false
    for (let i = 0; i < 2 && !removed; i++) {
      const { error } = await admin.auth.admin.deleteUser(user.id)
      if (!error) removed = true
      else console.error('[delete-account] auth user delete failed (attempt', i + 1, '):', error.message)
    }

    // End this browser session either way
    await supabase.auth.signOut().catch(() => {})

    if (!removed) {
      // Data is erased. A leftover login is harmless but should be cleaned up.
      return NextResponse.json({
        success: true,
        warning: 'Your data was deleted, but your login could not be fully removed. Contact support to finish.',
      })
    }
    return NextResponse.json({ success: true, message: 'Account and all data permanently deleted.' })
  } catch (err) {
    console.error('[DELETE /api/settings/delete-account] Unhandled error:', err?.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
