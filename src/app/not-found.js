import Link from 'next/link'
import StatusScreen from '@/components/ui/StatusScreen'

export const metadata = { title: 'Page not found' }

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="We can't find that page"
      message="The link may be old or mistyped. Let's get you back on track."
    >
      <Link href="/dashboard" className="btn btn-primary">Go to dashboard</Link>
      <Link href="/" className="btn btn-outline">Back to home</Link>
    </StatusScreen>
  )
}
