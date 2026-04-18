'use client'

import dynamic from 'next/dynamic'

// PWAPrompt uses browser APIs (localStorage, Notification, beforeinstallprompt)
// so it must be loaded client-side only. This wrapper is a Client Component,
// which is the only place next/dynamic with ssr:false is allowed.
const PWAPrompt = dynamic(() => import('./PWAPrompt'), { ssr: false })

export default function PWAPromptLoader() {
  return <PWAPrompt />
}
