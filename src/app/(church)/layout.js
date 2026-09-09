import { getUser, getChurch } from '@/lib/auth'
import { redirect }            from 'next/navigation'
import ChurchShell             from '@/components/church/ChurchShell'

export default async function ChurchLayout({ children }) {
  // getUser() de-duped by React cache() if middleware already ran
  const user = await getUser()
  if (!user) redirect('/login')

  // Lean church — the shell only needs name, admin_name, account_type, id
  const church = await getChurch(user.id)
  if (!church) redirect('/login')

  if (church.account_type !== 'church') redirect('/dashboard')

  return (
    <ChurchShell church={church} user={user}>
      {children}
    </ChurchShell>
  )
}
