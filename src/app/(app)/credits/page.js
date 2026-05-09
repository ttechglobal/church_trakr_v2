import { getUser, getChurch } from '@/lib/auth'
import { createAdminClient }  from '@/lib/supabase/admin'
import { redirect }           from 'next/navigation'
import CreditsClient          from '@/components/credits/CreditsClient'

export const metadata = { title: 'SMS Credits' }

export default async function CreditsPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const church = await getChurch(user.id, user.user_metadata)
  if (!church) redirect('/login')

  const admin = createAdminClient()

  const [txRes, mtrRes] = await Promise.all([
    admin.from('credit_transactions')
      .select('id,credits,amount_kobo,reference,status,gateway,created_at,completed_at')
      .eq('church_id', church.id)
      .order('created_at', { ascending: false })
      .limit(50),
    admin.from('manual_transfer_requests')
      .select('id,credits_requested,amount_paid,reference,status,created_at,package_name')
      .eq('church_id', church.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const txs  = txRes.data  ?? []
  const mtrs = (mtrRes.data ?? []).map(m => ({
    id:          m.id,
    credits:     m.credits_requested,
    amount_kobo: null,
    amount_paid: m.amount_paid,
    reference:   m.reference,
    status:      m.status,
    gateway:     'manual',
    notified_via_whatsapp: true,
    created_at:  m.created_at,
  }))

  const allHistory = [...txs, ...mtrs]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return (
    <CreditsClient
      church={{ ...church, email: user.email }}
      transactions={allHistory}
    />
  )
}
