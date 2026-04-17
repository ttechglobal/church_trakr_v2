import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { normBirthday } from '@/lib/utils'

/**
 * POST /api/members
 *
 * Body: {
 *   name: string,
 *   phone?: string,
 *   address?: string,
 *   birthday?: string,
 *   groupIds?: string[],
 *   status?: 'active' | 'inactive'
 * }
 */
export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: church } = await supabase
      .from('churches')
      .select('id')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const body = await request.json()
    const { name, phone, address, birthday, groupIds, status } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { data: member, error } = await supabase
      .from('members')
      .insert({
        church_id: church.id,
        name: name.trim(),
        phone: phone?.trim() ?? null,
        address: address?.trim() ?? null,
        birthday: birthday ? normBirthday(birthday) : null,
        groupIds: groupIds ?? [],
        status: status ?? 'active',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, member })
  } catch (err) {
    console.error('[POST /api/members]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/members
 *
 * Body: { id: string, ...fields }
 */
export async function PATCH(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: church } = await supabase
      .from('churches')
      .select('id')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const body = await request.json()
    const { id, ...fields } = body

    if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 })

    // Normalize birthday if provided
    if (fields.birthday) fields.birthday = normBirthday(fields.birthday)

    // Only allow updating own church's members (RLS enforced + explicit check)
    const { data: member, error } = await supabase
      .from('members')
      .update(fields)
      .eq('id', id)
      .eq('church_id', church.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, member })
  } catch (err) {
    console.error('[PATCH /api/members]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/members?id=xxx
 */
export async function DELETE(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: church } = await supabase
      .from('churches')
      .select('id')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Church not found' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 })

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', id)
      .eq('church_id', church.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/members]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
