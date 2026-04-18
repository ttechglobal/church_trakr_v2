// Route handler that serves manifest.json
// Using a route handler guarantees this works on Vercel even if
// the public/ static file serving has issues with the middleware matcher.
import { NextResponse } from 'next/server'

export function GET() {
  const manifest = {
    name: 'ChurchTrakr',
    short_name: 'ChurchTrakr',
    description: 'Attendance & member management for church groups',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#1a3a2a',
    theme_color: '#1a3a2a',
    categories: ['productivity', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Take Attendance',
        short_name: 'Attendance',
        url: '/attendance',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Follow-Up',
        short_name: 'Follow-Up',
        url: '/absentees',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
