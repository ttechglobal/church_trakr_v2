import { NextResponse }  from 'next/server'
import { withAuth }      from '@/lib/apiAuth'
import { normBirthday }  from '@/lib/utils'

/**
 * POST /api/members
 * Body: { name, phone?, address?, birthday?, groupIds?, status? }
 */
export const POST = withAuth(async (request, { church, admin }) => {
  const { name, phone, address, birthday, groupIds, status } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  // If no groupIds, auto-assign to the first group so the member appears in attendance
  let resolvedGroupIds = Array.isArray(groupIds) ? groupIds : []
  if (resolvedGroupIds.length === 0) {
    const { data: defaultGroup } = await admin
      .from('groups')
      .select('id')
      .eq('church_id', church.id)
      .neq('name', 'First Timers')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (defaultGroup) resolvedGroupIds = [defaultGroup.id]
  }

  const { data: member, error } = await admin
    .from('members')
    .insert({
      church_id: church.id,
      name:      name.trim(),
      phone:     phone?.trim() || null,
      address:   address?.trim() || null,
      birthday:  birthday ? normBirthday(birthday) : null,
      groupIds:  resolvedGroupIds,
      status:    status ?? 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/members]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, member })
})

/**
 * PATCH /api/members
 * Body: { id, ...fields }
 */
export const PATCH = withAuth(async (request, { church, admin }) => {
  const { id, ...fields } = await request.json()
  if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 })

  if (fields.birthday) fields.birthday = normBirthday(fields.birthday)

  const { data: member, error } = await admin
    .from('members')
    .update(fields)
    .eq('id', id)
    .eq('church_id', church.id)   // scope to this church — security fence
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/members]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, member })
})

/**
 * DELETE /api/members?id=xxx
 */
export const DELETE = withAuth(async (request, { church, admin }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 })

  const { error } = await admin
    .from('members')
    .delete()
    .eq('id', id)
    .eq('church_id', church.id)   // scope to this church — security fence

  if (error) {
    console.error('[DELETE /api/members]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
