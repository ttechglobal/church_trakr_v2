'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      setLoading(false)
      if (authError.message.includes('Email not confirmed')) {
        setError('Please confirm your email before signing in. Check your inbox.')
      } else if (authError.message.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.')
      } else {
        setError(authError.message)
      }
      return
    }

    router.push(next)
    router.refresh()
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-forest">Welcome back</h1>
        <p className="text-sm text-forest-muted mt-1">Sign in to your account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="input-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="input-label mb-0" htmlFor="password">Password</label>
            <Link
              href="/forgot"
              className="text-xs text-forest-muted hover:text-forest transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-xl bg-error/8 border border-error/20 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full btn-lg mt-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner />
              Signing in…
            </span>
          ) : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-forest-muted">
        Don't have an account?{' '}
        <Link href="/signup" className="text-forest font-medium hover:text-forest-mid transition-colors">
          Sign up
        </Link>
      </p>
    </>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" />
    </svg>
  )
}