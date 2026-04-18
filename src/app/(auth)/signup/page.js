'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    groupName: '',
    adminName: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function validate() {
    if (!form.groupName.trim()) return 'Please enter your group or church name.'
    if (!form.adminName.trim()) return 'Please enter your name.'
    if (!form.email.trim()) return 'Please enter your email.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    return null
  }

  async function handleSignup(e) {
    e.preventDefault()
    setError('')

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const supabase = createClient()

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (authError) {
      setLoading(false)
      if (authError.message.includes('already registered')) {
        setError('An account with this email already exists. Try signing in.')
      } else {
        setError(authError.message)
      }
      return
    }

    // 2. Create church record + default group in one sequence
    if (authData.user) {
      const { data: churchData, error: churchError } = await supabase
        .from('churches')
        .insert({
          admin_user_id: authData.user.id,
          name: form.groupName.trim(),
          admin_name: form.adminName.trim(),
          plan: 'free',
          sms_credits: 0,
        })
        .select('id')
        .single()

      if (churchError || !churchData) {
        setLoading(false)
        setError('Account created but setup failed. Please contact support.')
        return
      }

      // 3. Auto-create a default group using the church/group name
      // This means new users can take attendance immediately without creating a group first
      await supabase
        .from('groups')
        .insert({
          church_id: churchData.id,
          name: form.groupName.trim(),
          leader: form.adminName.trim(),
        })
      // Non-fatal if this fails — user can create groups manually
    }

    setLoading(false)
    setConfirmed(true)
  }

  // ── Success screen ──
  if (confirmed) {
    return (
      <div className="text-center space-y-4 animate-fade-in">
        <div
          className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
          style={{ background: 'rgba(22,163,74,0.1)' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-forest">Check your email</h2>
          <p className="text-sm text-forest-muted mt-2">
            We sent a confirmation link to <strong className="text-forest">{form.email}</strong>.
            Click it to activate your account.
          </p>
        </div>
        <p className="text-xs text-forest-muted">
          Didn't receive it? Check your spam folder or{' '}
          <button
            className="text-forest underline"
            onClick={() => setConfirmed(false)}
          >
            try a different email
          </button>.
        </p>
      </div>
    )
  }

  // ── Signup form ──
  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-forest">Create your account</h1>
        <p className="text-sm text-forest-muted mt-1">
          Each group or church creates their own account
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="input-label" htmlFor="groupName">
            Church / Group name
          </label>
          <input
            id="groupName"
            type="text"
            required
            autoComplete="organization"
            className="input"
            placeholder="e.g. Youth Fellowship, Men's Unit"
            value={form.groupName}
            onChange={e => setField('groupName', e.target.value)}
          />
        </div>

        <div>
          <label className="input-label" htmlFor="adminName">Your name (leader / admin)</label>
          <input
            id="adminName"
            type="text"
            required
            autoComplete="name"
            className="input"
            placeholder="Full name"
            value={form.adminName}
            onChange={e => setField('adminName', e.target.value)}
          />
        </div>

        <div>
          <label className="input-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setField('email', e.target.value)}
          />
        </div>

        <div>
          <label className="input-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="input"
            placeholder="Min. 8 characters"
            value={form.password}
            onChange={e => setField('password', e.target.value)}
          />
        </div>

        <div>
          <label className="input-label" htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="input"
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={e => setField('confirmPassword', e.target.value)}
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
              Creating account…
            </span>
          ) : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-forest-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-forest font-medium hover:text-forest-mid transition-colors">
          Sign in
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
