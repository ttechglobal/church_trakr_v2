import { getUser, getChurchLean }  from '@/lib/auth'
import { createAdminClient }        from '@/lib/supabase/admin'
import { unstable_cache }           from 'next/cache'
import BirthdaysClient              from '@/components/members/BirthdaysClient'

export const metadata  = { title: 'Birthdays' }
export const revalidate = 120  // birthdays don't change often

function getCachedBirthdayMembers(churchId) {
  const admin = createAdminClient()
  return unstable_cache(
    async () => {
      const { data } = await admin
        .from('members')
        .select('id, name, phone, birthday, groupIds, status')
        .eq('church_id', churchId)
        .neq('status', 'away')
        .not('birthday', 'is', null)
        .order('name')
      return data ?? []
    },
    [`birthdays:${churchId}`],
    { revalidate: 120, tags: [`members:${churchId}`] }
  )()
}

export default async function BirthdaysPage() {
  const user = await getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const church = await getChurchLean(user.id)
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  const members = await getCachedBirthdayMembers(church.id)

  return (
    <BirthdaysClient
      members={members}
      churchName={church.name}
      churchId={church.id}
    />
  )
}
