/**
 * GET  /api/church/code   — get current code (generate if missing)
 * POST /api/church/code   — regenerate code
 */
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

function makeCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const seg = n => Array.from({length:n}, () => chars[Math.floor(Math.random()*chars.length)]).join('')
  return `${seg(5)}-${seg(4)}`
}

async function getChurch(user) {
  const admin = createAdminClient()
  const { data } = await admin.from('churches').select('*').eq('admin_user_id', user.id).single()
  return data
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const church = await getChurch(user)
  if (!church || church.account_type !== 'church') return NextResponse.json({ error: 'Not a church account' }, { status: 403 })

  // Generate code if missing
  if (!church.connection_code) {
    const code = makeCode()
    const { data: updated } = await admin.from('churches').update({ connection_code: code }).eq('id', church.id).select().single()
    return NextResponse.json({ code: updated.connection_code, churchName: church.name })
  }

  return NextResponse.json({ code: church.connection_code, churchName: church.name })
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const church = await getChurch(user)
  if (!church || church.account_type !== 'church') return NextResponse.json({ error: 'Not a church account' }, { status: 403 })

  const code = makeCode()
  await admin.from('churches').update({ connection_code: code }).eq('id', church.id)
  return NextResponse.json({ code, churchName: church.name })
}
