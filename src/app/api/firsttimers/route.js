import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/apiAuth'

export const GET = withAuth(async (request, { church, admin }) => {
  const { data, error } = await admin
    .from('first_timers')
    .select('*')
    .eq('church_id', church.id)
    .order('date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ firstTimers: data ?? [] })
})

export const POST = withAuth(async (request, { church, admin }) => {
  const body = await request.json()
  const { name, phone, address, date } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('first_timers')
    .insert({
      church_id: church.id,
      name:      name.trim(),
      phone:     phone?.trim()   || null,
      address:   address?.trim() || null,
      date:      date            || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/firsttimers]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ firstTimer: data }, { status: 201 })
})