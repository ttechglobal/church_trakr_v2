import { getUser, getChurchLean }  from '@/lib/auth'
import { createAdminClient }        from '@/lib/supabase/admin'
import { unstable_cache }           from 'next/cache'
import MessagingHub                 from '@/components/messaging/MessagingHub'

export const metadata  = { title: 'Messaging' }
export const revalidate = 60

function getCachedRecentLogs(churchId) {
  const admin = createAdminClient()
  return unstable_cache(
    async () => {
      const { data } = await admin
        .from('sms_logs')
        .select('id, type, recipient_count, success_count, credits_used, sent_at')
        .eq('church_id', churchId)
        .order('sent_at', { ascending: false })
        .limit(3)
      return data ?? []
    },
    [`sms-logs:${churchId}`],
    { revalidate: 60, tags: [`sms-logs:${churchId}`] }
  )()
}

export default async function MessagingPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  // Messaging needs sms_credits, sms_sender_id — lean query covers these
  const church = await getChurchLean(user.id)
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  const recentLogs = await getCachedRecentLogs(church.id)

  return <MessagingHub church={church} recentLogs={recentLogs} />
}
