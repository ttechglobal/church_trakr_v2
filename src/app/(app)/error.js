'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import StatusScreen from '@/components/ui/StatusScreen'

// Errors inside the signed-in app: the sidebar and navigation stay visible.
export default function AppError({ error, reset }) {
  useEffect(() => { console.error('[app error]', error?.digest || '', error?.message) }, [error])
  return (
    <StatusScreen
      inline
      title="Something went wrong"
      message="This page couldn't load. Anything you already saved is safe. Try again, or open another page from the menu."
    >
      <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
      <Link href="/dashboard" className="btn btn-outline">Go to dashboard</Link>
    </StatusScreen>
  )
}
