/**
 * GET /api/church/lookup?code=XXXXX-XXXX
 * Returns church name if code matches — used by subgroup before sending request
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: church } = await admin.from('churches')
    .select('id, name')
    .eq('connection_code', code)
    .eq('account_type', 'church')
    .single()

  if (!church) return NextResponse.json({ error: 'No church found with that code' }, { status: 404 })

  return NextResponse.json({ churchId: church.id, churchName: church.name })
}
