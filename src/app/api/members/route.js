import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/apiAuth'

// ── GET — fetch all members for this church ───────────────────────────────────

export const GET = withAuth(async (request, { church, admin }) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // optional filter

  let query = admin
    .from('members')
    .select('*')
    .eq('church_id', church.id)
    .order('name', { ascending: true })

  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ members: data ?? [] })
})

// ── POST — create a new member ────────────────────────────────────────────────

export const POST = withAuth(async (request, { church, admin }) => {
  const body = await request.json()

  const {
    name, phone, address, birthday,
    groupIds, status = 'active',
    away_since, away_contact,
  } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const insertData = {
    church_id: church.id,          // ← always set from verified auth context
    name:      name.trim(),
    phone:     phone?.trim()   || null,
    address:   address?.trim() || null,
    birthday:  birthday        || null,
    groupIds:  groupIds        ?? [],
    status,
  }

  if (away_since)   insertData.away_since   = away_since
  if (away_contact) insertData.away_contact = away_contact

  const { data, error } = await admin
    .from('members')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('[POST /api/members]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ member: data }, { status: 201 })
})

// ── PATCH — update an existing member ────────────────────────────────────────

export const PATCH = withAuth(async (request, { church, admin }) => {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) {
    return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
  }

  // Verify the member belongs to this church before updating
  const { data: existing } = await admin
    .from('members')
    .select('id')
    .eq('id', id)
    .eq('church_id', church.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Whitelist updatable fields — never allow church_id to be changed
  const allowed = [
    'name', 'phone', 'address', 'birthday',
    'groupIds', 'status', 'away_since', 'away_contact',
  ]
  const updateData = {}
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      updateData[key] = updates[key]
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('members')
    .update(updateData)
    .eq('id', id)
    .eq('church_id', church.id)  // double-check ownership in the update itself
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/members]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ member: data })
})

// ── DELETE — remove a member ──────────────────────────────────────────────────

export const DELETE = withAuth(async (request, { church, admin }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
  }

  // Verify ownership
  const { data: existing } = await admin
    .from('members')
    .select('id')
    .eq('id', id)
    .eq('church_id', church.id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const { error } = await admin
    .from('members')
    .delete()
    .eq('id', id)
    .eq('church_id', church.id)

  if (error) {
    console.error('[DELETE /api/members]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})