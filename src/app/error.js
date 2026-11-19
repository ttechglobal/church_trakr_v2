'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import StatusScreen from '@/components/ui/StatusScreen'

// Catches errors in any route outside the (app) group (marketing, auth, church dashboard).
export default function RootError({ error, reset }) {
  useEffect(() => { console.error('[route error]', error?.digest || '', error?.message) }, [error])
  return (
    <StatusScreen
      title="Something went wrong"
      message="That didn't work. Anything you already saved is safe. Please try again."
    >
      <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
      <Link href="/" className="btn btn-outline">Back to home</Link>
    </StatusScreen>
  )
}
