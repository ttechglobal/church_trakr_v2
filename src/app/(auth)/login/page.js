'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { validateSignupFields, sanitizeInput } from '@/lib/validation'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const message = searchParams.get('message') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setError('')

    const cleanEmail = sanitizeInput(email).toLowerCase()

    // Basic client-side validation
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    })

    if (authError || !data?.session) {
      setLoading(false)
      // Always generic — never reveal which field is wrong
      setError('Invalid email or password.')
      return
    }

    // Full page navigation — ensures cookies are committed before next page loads
    window.location.replace(next.startsWith('/') ? next : '/dashboard')
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-forest">Welcome back</h1>
        <p className="text-sm text-forest-muted mt-1">Sign in to your account</p>
      </div>

      {message && (
        <div style={{
          background: 'rgba(22,163,74,0.08)',
          border: '1px solid rgba(22,163,74,0.2)',
          borderRadius: 12, padding: '0.75rem 1rem',
          fontSize: '0.875rem', color: '#16a34a',
          marginBottom: '1rem',
        }}>
          {message}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4" noValidate>
        <div>
          <label className="input-label" htmlFor="email">Email</label>
          <input
            id="email" type="email" autoComplete="email" required
            className="input" placeholder="you@example.com"
            maxLength={254}
            value={email} onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
            <label className="input-label" style={{ margin: 0 }} htmlFor="password">
              Password
            </label>
            <Link href="/forgot" style={{ fontSize: '0.75rem', color: '#8a9e90', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
          <input
            id="password" type="password" autoComplete="current-password" required
            className="input" placeholder="••••••••"
            maxLength={72}
            value={password} onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.2)',
            borderRadius: 12, padding: '0.75rem 1rem',
            fontSize: '0.875rem', color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full btn-lg">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-forest-muted">
        Don't have an account?{' '}
        <Link href="/signup" className="text-forest font-medium">Sign up</Link>
      </p>
    </>
  )
}