import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: church } = await supabase
      .from('churches').select('id').eq('admin_user_id', user.id).single()
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { id } = await params
    const { name, leader } = await request.json()

    const { data: group, error } = await supabase
      .from('groups')
      .update({ name: name?.trim(), leader: leader?.trim() ?? '' })
      .eq('id', id)
      .eq('church_id', church.id)
      .select().single()

    if (error) throw error
    return NextResponse.json({ success: true, group })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: church } = await supabase
      .from('churches').select('id').eq('admin_user_id', user.id).single()
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { id } = await params

    // Prevent deleting First Timers group
    const { data: group } = await supabase
      .from('groups').select('name').eq('id', id).single()
    if (group?.name === 'First Timers') {
      return NextResponse.json({ error: 'Cannot delete First Timers group' }, { status: 400 })
    }

    const { error } = await supabase
      .from('groups').delete().eq('id', id).eq('church_id', church.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
