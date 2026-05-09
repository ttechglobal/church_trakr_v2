import { getUser, getChurch } from '@/lib/auth'
import { redirect } from 'next/navigation'
import CreditsClient from '@/components/credits/CreditsClient'

export const metadata = { title: 'SMS Credits' }

export default async function SMSCreditsPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) redirect('/login')

  return <CreditsClient church={church} />
}
