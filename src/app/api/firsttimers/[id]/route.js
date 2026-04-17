import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/apiAuth'

export const PATCH = withAuth(async (request, { church, admin }, { params }) => {
  const { id } = await params
  const body   = await request.json()

  const allowed = ['name', 'phone', 'address', 'date', 'visits']
  const updates = {}
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k]
  }

  const { data, error } = await admin
    .from('first_timers')
    .update(updates)
    .eq('id', id)
    .eq('church_id', church.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ firstTimer: data })
})

export const DELETE = withAuth(async (request, { church, admin }, { params }) => {
  const { id } = await params

  const { error } = await admin
    .from('first_timers')
    .delete()
    .eq('id', id)
    .eq('church_id', church.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
})