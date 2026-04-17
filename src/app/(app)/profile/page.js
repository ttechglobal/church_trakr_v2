import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import SettingsClient from '@/components/settings/SettingsClient'

export const metadata = { title: 'Settings' }

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <div className="page-content"><a href="/login">Sign in</a></div>

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: church } = await admin
    .from('churches').select('*').eq('admin_user_id', user.id).single()
  if (!church) return <div className="page-content"><p>No church found.</p></div>

  return <SettingsClient church={church} user={user} />
}