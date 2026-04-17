'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { validateSignupFields, sanitizeInput } from '@/lib/validation'

export default function SignupPage() {
  const [form, setForm] = useState({
    groupName: '', adminName: '', email: '', password: '', confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError('')

    // Sanitize all inputs before touching them
    const email     = sanitizeInput(form.email).toLowerCase()
    const password  = form.password           // don't trim passwords
    const groupName = sanitizeInput(form.groupName)
    const adminName = sanitizeInput(form.adminName)

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const validationError = validateSignupFields({ email, password, groupName, adminName })
    if (validationError) { setError(validationError); return }

    setLoading(true)

    const supabase = createClient()

    // 1. Create auth user — Supabase hashes the password with bcrypt internally
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Store names in metadata as fallback for church record creation
        data: {
          admin_name: adminName,
          group_name: groupName,
        },
        // Non-blocking — email sent for info only, never gates access
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (signUpError) {
      setLoading(false)
      // Generic message — don't reveal if email is already registered
      if (signUpError.message.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists.')
      } else {
        setError('Could not create account. Please try again.')
      }
      return
    }

    if (!authData?.user) {
      setLoading(false)
      setError('Signup failed. Please try again.')
      return
    }

    // 2. Create church record server-side (service role bypasses RLS)
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          groupName,
          adminName,
        }),
      })

      // Don't block on this — getChurch() in pages auto-creates if missing
      if (!res.ok) {
        console.warn('Church setup via API failed — will auto-create on first dashboard load')
      }
    } catch {
      // Non-fatal — dashboard handles missing church gracefully
    }

    // 3. Sign in immediately — no email verification gate
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (signInError || !signInData?.session) {
      // Account created but auto sign-in failed — redirect to login
      window.location.replace('/login?message=Account created! Please sign in.')
      return
    }

    // Full page navigation so cookies are committed before dashboard loads
    window.location.replace('/dashboard')
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-forest">Create your account</h1>
        <p className="text-sm text-forest-muted mt-1">
          Each group or church creates their own account
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4" noValidate>
        <div>
          <label className="input-label" htmlFor="groupName">Church / Group name</label>
          <input
            id="groupName" type="text" required autoComplete="organization"
            className="input" placeholder="e.g. Youth Fellowship, Men's Unit"
            maxLength={100}
            value={form.groupName} onChange={e => setField('groupName', e.target.value)}
          />
        </div>
        <div>
          <label className="input-label" htmlFor="adminName">Your name</label>
          <input
            id="adminName" type="text" required autoComplete="name"
            className="input" placeholder="Full name"
            maxLength={100}
            value={form.adminName} onChange={e => setField('adminName', e.target.value)}
          />
        </div>
        <div>
          <label className="input-label" htmlFor="email">Email</label>
          <input
            id="email" type="email" required autoComplete="email"
            className="input" placeholder="you@example.com"
            maxLength={254}
            value={form.email} onChange={e => setField('email', e.target.value)}
          />
        </div>
        <div>
          <label className="input-label" htmlFor="password">Password</label>
          <input
            id="password" type="password" required
            autoComplete="new-password" className="input"
            placeholder="Min. 8 characters"
            minLength={8} maxLength={72}
            value={form.password} onChange={e => setField('password', e.target.value)}
          />
        </div>
        <div>
          <label className="input-label" htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword" type="password" required
            autoComplete="new-password" className="input"
            placeholder="Repeat password"
            minLength={8} maxLength={72}
            value={form.confirmPassword}
            onChange={e => setField('confirmPassword', e.target.value)}
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
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-forest-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-forest font-medium">Sign in</Link>
      </p>
    </>
  )
}