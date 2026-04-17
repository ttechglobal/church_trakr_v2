import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/attendance/check?groupId=xxx&date=YYYY-MM-DD
 * Returns { sessionId: string | null }
 */
export async function GET(request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: church } = await supabase
      .from('churches')
      .select('id')
      .eq('admin_user_id', user.id)
      .single()

    if (!church) return NextResponse.json({ sessionId: null })

    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const date = searchParams.get('date')

    if (!groupId || !date) {
      return NextResponse.json({ sessionId: null })
    }

    const { data } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('church_id', church.id)
      .eq('group_id', groupId)
      .eq('date', date)
      .single()

    return NextResponse.json({ sessionId: data?.id ?? null })
  } catch (err) {
    return NextResponse.json({ sessionId: null })
  }
}
