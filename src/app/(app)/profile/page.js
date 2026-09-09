import { getUser, getChurch }   from '@/lib/auth'
import SettingsClient            from '@/components/settings/SettingsClient'

export const metadata  = { title: 'Settings' }
export const revalidate = 120  // settings rarely change mid-session

export default async function ProfilePage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  // Settings displays all church fields (name, location, sender_id, etc.) — full select is correct
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  return <SettingsClient church={church} user={user} />
}
