'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/api/auth/callback?next=/settings` }
    )

    setLoading(false)
    if (resetError) {
      setError(resetError.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="text-center space-y-4 animate-fade-in">
        <div
          className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
          style={{ background: 'rgba(201,168,76,0.12)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-forest">Email sent</h2>
          <p className="text-sm text-forest-muted mt-2">
            Check <strong className="text-forest">{email}</strong> for a password reset link.
            It expires in 1 hour.
          </p>
        </div>
        <Link href="/login" className="btn-ghost btn-sm mt-2">
          ← Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-forest">Reset password</h1>
        <p className="text-sm text-forest-muted mt-1">
          We'll send a reset link to your email
        </p>
      </div>

      <form onSubmit={handleReset} className="space-y-4">
        <div>
          <label className="input-label" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
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
          className="btn-primary w-full btn-lg"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center">
        <Link href="/login" className="text-sm text-forest-muted hover:text-forest transition-colors">
          ← Back to sign in
        </Link>
      </p>
    </>
  )
}
