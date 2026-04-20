import { getUser, getChurch } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ChurchDashboardClient from '@/components/church/ChurchDashboardClient'

export const metadata = { title: 'Church Dashboard' }

export default async function ChurchDashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const church = await getChurch(user.id)
  if (!church || church.account_type !== 'church') redirect('/dashboard')

  return <ChurchDashboardClient church={church} />
}
