import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/apiAuth'

export const PATCH = withAuth(async (request, { church, admin }) => {
  const body = await request.json().catch(() => ({}))

  const limits  = { name: 120, admin_name: 120, phone: 30, location: 200 }
  const updates = {}
  for (const [k, max] of Object.entries(limits)) {
    if (body[k] === undefined) continue
    if (body[k] !== null && typeof body[k] !== 'string') {
      return NextResponse.json({ error: `Invalid ${k}` }, { status: 400 })
    }
    const v = (body[k] ?? '').trim().slice(0, max)
    if ((k === 'name' || k === 'admin_name') && !v) {
      return NextResponse.json({ error: `${k === 'name' ? 'Name' : 'Your name'} cannot be empty` }, { status: 400 })
    }
    updates[k] = v || null
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('churches')
    .update(updates)
    .eq('id', church.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ church: data })
})