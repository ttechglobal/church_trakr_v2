import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // ── Super admin routes — handled separately ──────────────────────────────
  if (pathname.startsWith('/admin')) {
    // Admin routes have their own auth check built into the page
    // Just skip supabase auth middleware for them
    return NextResponse.next()
  }

  // ── Skip middleware entirely for static files and PWA assets ────────────
  // These must NEVER go through auth middleware or they 404 in production.
  if (
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/_next/') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.json')
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  // Guard against missing env vars (e.g. during Vercel preview builds)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — required by @supabase/ssr. Must not have code between
  // createServerClient and getUser() per Supabase docs.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user ?? null
  } catch {
    // If Supabase is unreachable, allow the request through.
    // The page/layout will handle the unauthenticated state.
    return supabaseResponse
  }

  // Auth pages — redirect to dashboard if already signed in
  const isAuthPage =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot')

  if (isAuthPage && user) {
    // Route to /dashboard — dashboard/page.js detects church accounts and redirects
    // to /church-dashboard. This avoids DB lookups in middleware.
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Protected app routes — redirect to login if not signed in
  const isAppRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/absentees') ||
    pathname.startsWith('/attendees') ||
    pathname.startsWith('/away') ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/members') ||
    pathname.startsWith('/firsttimers') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/report') ||
    pathname.startsWith('/messaging') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/church-dashboard')

  if (isAppRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Run middleware on all paths EXCEPT:
     * - _next/static  (Next.js build output)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - Static file extensions (images, fonts, json, xml, txt, etc.)
     *
     * NOTE: manifest.json and sw.js are also excluded at the top of the
     * middleware function itself as an extra safety guard.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|xml|txt|woff|woff2|ttf|otf)$).*)',
  ],
}
