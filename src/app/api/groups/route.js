import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/apiAuth'

export const GET = withAuth(async (request, { church, admin }) => {
  const { data, error } = await admin
    .from('groups')
    .select('id, name, leader, created_at')
    .eq('church_id', church.id)
    .neq('name', 'First Timers')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ groups: data ?? [] })
})

export const POST = withAuth(async (request, { church, admin }) => {
  const { name, leader } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('groups')
    .insert({ church_id: church.id, name: name.trim(), leader: leader?.trim() || null })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/groups]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ group: data }, { status: 201 })
})