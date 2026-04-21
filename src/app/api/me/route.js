/**
 * GET /api/me
 *
 * Returns the current user's account type and setup status.
 * Used by login and app-load routing to decide where to send the user.
 *
 * Returns:
 *   { accountType: 'group' | 'church', complete: true }
 *   { accountType: null, complete: false }   ← profile not set up yet
 *   401 if not authenticated
 */
import { createClient }   from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse }   from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: church } = await admin
      .from('churches')
      .select('id, account_type, name, admin_name')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) {
      return NextResponse.json({ accountType: null, complete: false })
    }

    return NextResponse.json({
      accountType: church.account_type ?? 'group',
      complete:    true,
      name:        church.name,
      adminName:   church.admin_name,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
