import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_FIELDS = ['follow_up_data', 'attendee_followup_data']

export async function POST(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: church } = await supabase
      .from('churches').select('id').eq('admin_user_id', user.id).single()
    if (!church) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const { field, data } = body

    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    }

    const { error } = await supabase
      .from('churches')
      .update({ [field]: data })
      .eq('id', church.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/followup/save]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
