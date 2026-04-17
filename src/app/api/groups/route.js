import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: church } = await supabase
      .from('churches').select('id').eq('admin_user_id', user.id).single()
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { name, leader } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const { data: group, error } = await supabase
      .from('groups')
      .insert({ church_id: church.id, name: name.trim(), leader: leader?.trim() ?? '' })
      .select().single()

    if (error) throw error
    return NextResponse.json({ success: true, group })
  } catch (err) {
    console.error('[POST /api/groups]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
