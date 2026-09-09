import { getUser, getChurchLean }  from '@/lib/auth'
import { getCachedGroups }          from '@/lib/cached-queries'
import { createAdminClient }        from '@/lib/supabase/admin'
import { notFound }                 from 'next/navigation'
import MemberDetailClient           from '@/components/members/MemberDetailClient'

export const metadata  = { title: 'Member' }
export const revalidate = 60

export default async function MemberDetailPage({ params }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return <div style={{padding:'2rem'}}><a href="/login">Sign in</a></div>

  // Detail page only needs church.id — lean query
  const church = await getChurchLean(user.id)
  if (!church) return <div style={{padding:'2rem'}}><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()

  // Three queries in parallel — member + groups (cached) + attendance history
  const [memberRes, groups, recordsRes] = await Promise.all([
    admin
      .from('members')
      .select('*')
      .eq('id', id)
      .eq('church_id', church.id)   // scope check — prevents viewing other churches' members
      .single(),
    getCachedGroups(church.id),
    admin
      .from('attendance_records')
      .select('present, attendance_sessions(date, group_id, groups(name))')
      .eq('member_id', id)
      .order('id', { ascending: false })
      .limit(20),
  ])

  if (!memberRes.data) notFound()

  return (
    <MemberDetailClient
      member={memberRes.data}
      groups={groups}
      attendanceHistory={recordsRes.data ?? []}
      churchId={church.id}
    />
  )
}
