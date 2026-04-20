import { getUser, getChurch } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ChurchShell from '@/components/church/ChurchShell'

export default async function ChurchLayout({ children }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const church = await getChurch(user.id)
  if (!church) redirect('/login')

  // Ensure this is a church account — redirect group accounts to their dashboard
  if (church.account_type !== 'church') redirect('/dashboard')

  return (
    <ChurchShell church={church} user={user}>
      {children}
    </ChurchShell>
  )
}
