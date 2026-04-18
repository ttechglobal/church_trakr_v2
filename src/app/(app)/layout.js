import { getUser, getChurch } from '@/lib/auth'
import AppShell from '@/components/layout/AppShell'
import PWAInit from '@/components/PWAInit'
import FollowUpBanner from '@/components/FollowUpBanner'
import PWAPromptLoader from '@/components/PWAPromptLoader'

export default async function AppLayout({ children }) {
  const user = await getUser()

  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#8a9e90', marginBottom: 16 }}>Session expired.</p>
          <a href="/login" style={{ background: '#1a3a2a', color: '#e8d5a0', padding: '0.625rem 1.5rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>
            Sign in again
          </a>
        </div>
      </div>
    )
  }

  const church = await getChurch(user.id, user.user_metadata)

  if (!church) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#8a9e90', marginBottom: 16 }}>Could not load account.</p>
          <a href="/dashboard" style={{ background: '#1a3a2a', color: '#e8d5a0', padding: '0.625rem 1.5rem', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>
            Retry
          </a>
        </div>
      </div>
    )
  }

  // Count pending follow-ups for banner + notifications
  let pendingFollowUps = 0
  try {
    pendingFollowUps = Object.values(church.follow_up_data ?? {})
      .filter(v => !v.reached).length
  } catch {}

  return (
    <AppShell church={church} user={user}>
      <PWAInit pendingFollowUps={pendingFollowUps} />
      <FollowUpBanner pendingCount={pendingFollowUps} />
      <PWAPromptLoader />
      {children}
    </AppShell>
  )
}
