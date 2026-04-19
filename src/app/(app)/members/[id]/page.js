import { getUser, getChurch } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { notFound } from "next/navigation"
import MemberDetailClient from "@/components/members/MemberDetailClient"

export const metadata = { title: "Member" }

export default async function MemberDetailPage({ params }) {
  const { id } = await params
  const user = await getUser()
  if (!user) return <div style={{padding:"2rem"}}><a href="/login">Sign in</a></div>
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div style={{padding:"2rem"}}><a href="/dashboard">Retry</a></div>

  const admin = createAdminClient()
  const { data: member } = await admin.from("members").select("*").eq("id", id).eq("church_id", church.id).single()
  if (!member) notFound()

  const { data: groups } = await admin.from("groups").select("id,name").eq("church_id", church.id).neq("name", "First Timers")

  // Attendance history for this member
  const { data: records } = await admin
    .from("attendance_records")
    .select("present, attendance_sessions(date, group_id, groups(name))")
    .eq("member_id", id)
    .order("id", { ascending: false })
    .limit(20)

  return <MemberDetailClient member={member} groups={groups ?? []} attendanceHistory={records ?? []} churchId={church.id} />
}
