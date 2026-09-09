import { getUser, getChurch }    from '@/lib/auth'
import { getCachedGroups,
         getCachedFirstTimers }   from '@/lib/cached-queries'
import FirstTimersClient          from '@/components/firsttimers/FirstTimersClient'

export const metadata  = { title: 'First Timers' }
export const revalidate = 60

export default async function FirstTimersPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  // Shares the layout's cached church — no extra DB round-trip.
  // We only need id and sms_credits from the church record.
  const church = await getChurch(user.id)
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  // Both cached: first_timers limited to 300, groups for 5 min
  const [firstTimers, groups] = await Promise.all([
    getCachedFirstTimers(church.id, 300),
    getCachedGroups(church.id),
  ])

  return (
    <FirstTimersClient
      churchId={church.id}
      firstTimers={firstTimers}
      groups={groups}
      hasCredits={(church.sms_credits ?? 0) > 0}
    />
  )
}
