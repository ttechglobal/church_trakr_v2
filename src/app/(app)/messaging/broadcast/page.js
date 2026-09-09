import { getUser, getChurch }    from '@/lib/auth'
import { getCachedGroups }        from '@/lib/cached-queries'
import { redirect }               from 'next/navigation'
import BroadcastClient            from '@/components/messaging/BroadcastClient'

export const metadata  = { title: 'Broadcast SMS' }
export const revalidate = 60

export default async function BroadcastPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  // Lean church — only needs id, name, sms_credits, sms_sender_id
  const church = await getChurch(user.id)
  if (!church) redirect('/dashboard')

  // Use cached groups — no raw admin query needed
  const groups = await getCachedGroups(church.id)

  return <BroadcastClient church={church} groups={groups} />
}
