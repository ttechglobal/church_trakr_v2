import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/apiAuth'

export const PATCH = withAuth(async (request, { church, admin }) => {
  const body = await request.json()

  const allowed = ['name', 'admin_name', 'phone', 'location']
  const updates = {}
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k]
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