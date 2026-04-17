import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Routes anyone can access without being logged in
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot', '/auth']

// Routes that require authentication
const PROTECTED_PREFIXES = [
  '/dashboard',
  '/attendance',
  '/absentees',
  '/attendees',
  '/groups',
  '/members',
  '/firsttimers',
  '/analytics',
  '/report',
  '/messaging',
  '/profile',
  '/settings',
]

function isPublic(pathname) {
  return PUBLIC_ROUTES.some(r =>
    pathname === r || pathname.startsWith(r + '/')
  )
}

function isProtected(pathname) {
  return PROTECTED_PREFIXES.some(r =>
    pathname === r || pathname.startsWith(r + '/')
  )
}

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Skip static files and API routes entirely
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|css|js|woff2?)$/)
  ) {
    return NextResponse.next()
  }

  // Public routes — always allow through, no session check needed
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // For protected routes — verify session
  if (isProtected(pathname)) {
    let response = NextResponse.next({ request })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              })
            )
          },
        },
      }
    )

    // getUser() verifies the JWT with Supabase auth server
    // Never use getSession() here — it trusts the cookie without verification
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}