import { getUser, getChurch }  from '@/lib/auth'
import { createAdminClient }    from '@/lib/supabase/admin'
import { unstable_cache }       from 'next/cache'
import AppShell                 from '@/components/layout/AppShell'
import PWAInit                  from '@/components/PWAInit'
import FollowUpBanner           from '@/components/FollowUpBanner'
import PWAPromptLoader          from '@/components/PWAPromptLoader'
import SupportButton            from '@/components/ui/SupportButton'

// ── Cached follow-up badge count ─────────────────────────────────────────────
// Revalidates every 60s. Tagged so attendance saves can bust it immediately.
// This replaces the raw admin query that was firing on every single navigation.
function getCachedPendingCount(churchId) {
  return unstable_cache(
    async () => {
      const admin = createAdminClient()
      const { data: sessions } = await admin
        .from('attendance_sessions')
        .select('id, attendance_records(member_id, present)')
        .eq('church_id', churchId)
        .order('date', { ascending: false })
        .limit(10)

      const realSession = (sessions ?? []).find(s =>
        (s.attendance_records ?? []).some(r => r.member_id !== null)
      )
      if (!realSession) return 0

      const absent = (realSession.attendance_records ?? []).filter(r => r.member_id && !r.present)
      if (!absent.length) return 0

      // Entries for this session that are marked reached (keys are "<sessionId>_<memberId>")
      const { data: reached } = await admin
        .from('follow_up_entries')
        .select('key')
        .eq('church_id', churchId).eq('kind', 'absentee')
        .like('key', `${realSession.id}_%`)
        .eq('data->>reached', 'true')
      const done = new Set((reached ?? []).map(r => r.key))

      return absent.filter(r => !done.has(`${realSession.id}_${r.member_id}`)).length
    },
    [`followup-badge:${churchId}`],
    { revalidate: 60, tags: [`sessions:${churchId}`, `followup-badge:${churchId}`] }
  )()
}

export default async function AppLayout({ children }) {
  const user = await getUser()

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#5b7062', marginBottom: 16 }}>Session expired.</p>
          <a href="/login" style={{ background: '#1a3a2a', color: '#e8d5a0', padding: '0.625rem 1.5rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>
            Sign in again
          </a>
        </div>
      </div>
    )
  }

  const church = await getChurch(user.id)

  if (!church) {
    const { redirect } = await import('next/navigation')
    redirect('/login')
  }

  // Use cached query — no raw DB hit on every navigation
  let pendingFollowUps = 0
  try {
    pendingFollowUps = await getCachedPendingCount(church.id)
  } catch {}

  return (
    <AppShell church={church} user={user} pendingFollowUps={pendingFollowUps}>
      <PWAInit pendingFollowUps={pendingFollowUps} />
      <FollowUpBanner pendingCount={pendingFollowUps} />
      <PWAPromptLoader />
      {children}
      <SupportButton />
    </AppShell>
  )
}
