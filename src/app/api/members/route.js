import { NextResponse }  from 'next/server'
import { withAuth }      from '@/lib/apiAuth'
import { toDbDate }      from '@/lib/memberImport'

/**
 * POST /api/members
 * Body: { name, phone?, address?, birthday?, groupIds?, status? }
 */
export const POST = withAuth(async (request, { church, admin }) => {
  const { name, phone, address, birthday, groupIds, status } = await request.json().catch(() => ({}))

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (status !== undefined && !['active', 'inactive', 'away'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Only accept groups that belong to this church
  let resolvedGroupIds = []
  if (Array.isArray(groupIds) && groupIds.length) {
    const { data: ok } = await admin.from('groups').select('id')
      .eq('church_id', church.id).in('id', [...new Set(groupIds.map(String))])
    resolvedGroupIds = (ok ?? []).map(g => g.id)
  }
  // If no groupIds, auto-assign to the first group so the member appears in attendance
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
      name:      name.trim().slice(0, 120),
      phone:     phone?.trim().slice(0, 30) || null,
      address:   address?.trim().slice(0, 300) || null,
      birthday:  birthday ? toDbDate(birthday) : null,
      groupIds:  resolvedGroupIds,
      status:    status ?? 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/members]', error)
    return NextResponse.json({ error: 'Could not save member' }, { status: 500 })
  }

  return NextResponse.json({ success: true, member })
})

/**
 * PATCH /api/members
 * Body: { id, ...fields }
 */
export const PATCH = withAuth(async (request, { church, admin }) => {
  const body = await request.json().catch(() => ({}))
  const { id } = body
  if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 })

  // Whitelist — never let the client touch church_id, id, created_at, etc.
  const fields = {}
  if (body.name !== undefined) {
    const n = String(body.name).trim().slice(0, 120)
    if (!n) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    fields.name = n
  }
  if (body.phone   !== undefined) fields.phone   = String(body.phone ?? '').trim().slice(0, 30) || null
  if (body.address !== undefined) fields.address = String(body.address ?? '').trim().slice(0, 300) || null
  if (body.birthday !== undefined) fields.birthday = body.birthday ? toDbDate(body.birthday) : null
  if (body.status !== undefined) {
    if (!['active', 'inactive', 'away'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    fields.status = body.status
  }
  if (body.groupIds !== undefined) {
    if (!Array.isArray(body.groupIds)) return NextResponse.json({ error: 'groupIds must be an array' }, { status: 400 })
    const ids = [...new Set(body.groupIds.map(String))]
    if (ids.length) {
      // Only groups that belong to this church
      const { data: ok } = await admin.from('groups').select('id').eq('church_id', church.id).in('id', ids)
      fields.groupIds = (ok ?? []).map(g => g.id)
    } else {
      fields.groupIds = []
    }
  }
  // Away-tracking fields used by the Away page
  if (body.away_since !== undefined) {
    fields.away_since = body.away_since && /^\d{4}-\d{2}-\d{2}/.test(String(body.away_since))
      ? String(body.away_since).slice(0, 10) : null
  }
  if (body.away_contact !== undefined) {
    const c = body.away_contact
    if (c !== null && (typeof c !== 'object' || Array.isArray(c) || JSON.stringify(c).length > 2000)) {
      return NextResponse.json({ error: 'Invalid away_contact' }, { status: 400 })
    }
    fields.away_contact = c
  }

  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data: member, error } = await admin
    .from('members')
    .update(fields)
    .eq('id', id)
    .eq('church_id', church.id)   // scope to this church — security fence
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/members]', error)
    return NextResponse.json({ error: 'Could not save member' }, { status: 500 })
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
    return NextResponse.json({ error: 'Could not save member' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
