import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_FIELDS = ['follow_up_data', 'attendee_followup_data']

export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const field = searchParams.get('field')

    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    }

    const { data: church } = await supabase
      .from('churches')
      .select(`id, ${field}`)
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: church[field] ?? {} })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
