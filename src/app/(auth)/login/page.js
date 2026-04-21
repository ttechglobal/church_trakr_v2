'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Users, Building2, ArrowRight, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}

// ── Route based on account type ────────────────────────────────────────────────
// Single source of truth for post-auth routing.
// Called after login, after signup, and on app load.
async function resolveDestination(defaultNext) {
  try {
    const res = await fetch('/api/me')
    if (!res.ok) return { dest: '/dashboard', complete: true }
    const data = await res.json()
    if (!data.complete) return { dest: null, complete: false }  // needs setup
    if (data.accountType === 'church') return { dest: '/church-dashboard', complete: true }
    return { dest: defaultNext || '/dashboard', complete: true }
  } catch {
    return { dest: defaultNext || '/dashboard', complete: true }
  }
}

// ── Complete Setup screen (recovery for broken accounts) ──────────────────────
function CompleteSetupScreen({ onComplete }) {
  const [accountType, setAccountType] = useState(null)
  const [name, setName]   = useState('')
  const [adminName, setAdminName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!accountType) { setError('Please select an account type.'); return }
    if (!name.trim()) { setError('Please enter a name.'); return }
    if (!adminName.trim()) { setError('Please enter your name.'); return }

    setLoading(true); setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Session expired — please sign in again.'); setLoading(false); return }

      const res = await fetch('/api/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId:      user.id,
          name:        name.trim(),
          adminName:   adminName.trim(),
          accountType,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Setup failed. Please try again.')
        setLoading(false); return
      }
      onComplete(accountType)
    } catch (err) {
      setError('Unexpected error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-semibold text-forest">Complete Your Setup</h2>
        <p className="text-sm text-forest-muted mt-1">
          Your login exists but your profile isn't set up yet. Let's finish that now.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account type */}
        <div>
          <p className="input-label">Account type</p>
          <div className="space-y-2">
            {[
              { val: 'group',  label: 'Group / Sub-Group',   Icon: Users,     desc: 'Youth, Women, Men, Children, etc.' },
              { val: 'church', label: 'Church Dashboard',    Icon: Building2, desc: 'See all groups in one place' },
            ].map(({ val, label, Icon, desc }) => (
              <button
                key={val} type="button"
                onClick={() => setAccountType(val)}
                className="w-full text-left p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3"
                style={{
                  borderColor: accountType === val ? '#1a3a2a' : 'rgba(26,58,42,0.15)',
                  background:  accountType === val ? 'rgba(26,58,42,0.04)' : '#fff',
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: accountType === val ? 'rgba(26,58,42,0.1)' : 'rgba(26,58,42,0.05)' }}>
                  <Icon size={16} className="text-forest" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-forest text-sm">{label}</p>
                  <p className="text-xs text-mist">{desc}</p>
                </div>
                {accountType === val && <CheckCircle size={15} className="text-forest shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="input-label">
            {accountType === 'church' ? 'Church name' : 'Group name'}
          </label>
          <input className="input" required
            placeholder={accountType === 'church' ? 'e.g. Grace Assembly' : 'e.g. Youth Fellowship'}
            value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div>
          <label className="input-label">Your name</label>
          <input className="input" required placeholder="Full name"
            value={adminName} onChange={e => setAdminName(e.target.value)} />
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || !accountType}
          className="btn btn-primary w-full btn-lg gap-2"
          style={{ opacity: !accountType ? 0.4 : 1 }}>
          {loading ? 'Saving…' : <><ArrowRight size={15} /> Complete Setup</>}
        </button>
      </form>
    </div>
  )
}

// ── Login form ─────────────────────────────────────────────────────────────────
function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [screen, setScreen]     = useState('login')  // 'login' | 'setup'

  // On mount: if already logged in, route them correctly
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      const { dest, complete } = await resolveDestination(next)
      if (!complete) { setScreen('setup'); return }
      router.replace(dest)
    })
  }, [])  // eslint-disable-line

  async function handleLogin(e) {
    e.preventDefault()
    setError(''); setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
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

    // Route based on account type
    const { dest, complete } = await resolveDestination(next)
    setLoading(false)

    if (!complete) {
      // Profile not set up — show recovery screen
      setScreen('setup')
      return
    }

    router.push(dest)
    router.refresh()
  }

  function handleSetupComplete(accountType) {
    const dest = accountType === 'church' ? '/church-dashboard' : '/dashboard'
    router.push(dest)
    router.refresh()
  }

  if (screen === 'setup') {
    return <CompleteSetupScreen onComplete={handleSetupComplete} />
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
          <input id="email" type="email" autoComplete="email" required
            className="input" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="input-label mb-0" htmlFor="password">Password</label>
            <Link href="/forgot" className="text-xs text-forest-muted hover:text-forest transition-colors">
              Forgot password?
            </Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" required
            className="input" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        {error && (
          <div className="rounded-xl bg-error/8 border border-error/20 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full btn-lg mt-2">
          {loading ? (
            <span className="flex items-center gap-2 justify-center">
              <LoadingSpinner /> Signing in…
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
