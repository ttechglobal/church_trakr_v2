import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import BirthdaysClient        from '@/components/members/BirthdaysClient'

export const metadata = { title: 'Birthdays' }

export default async function BirthdaysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient()
  const { data: church } = await admin
    .from('churches')
    .select('id, name')
    .eq('admin_user_id', user.id)
    .single()

  if (!church) return <div className="page-content"><p>No church found.</p></div>

  // Fetch all active members who have a birthday set
  const { data: members } = await admin
    .from('members')
    .select('id, name, phone, birthday, groupIds, status')
    .eq('church_id', church.id)
    .neq('status', 'away')
    .not('birthday', 'is', null)
    .order('name')

  return (
    <BirthdaysClient
      members={members ?? []}
      churchName={church.name}
      churchId={church.id}
    />
  )
}