'use client'
// CHURCHTRAKR-SIGNUP-V4 — if you see this in browser source, the correct file is deployed

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Users, Building2, ArrowRight, CheckCircle } from 'lucide-react'

// ── Step 0: Account type selector ─────────────────────────────────────────────
function TypeSelector({ onSelect }) {
  const [selected, setSelected] = useState(null)
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest">Get started</h1>
        <p className="text-sm text-forest-muted mt-1">What are you setting up?</p>
      </div>
      <div className="space-y-3">
        <button type="button" onClick={() => setSelected('group')}
          className="w-full text-left rounded-2xl border-2 transition-all p-4"
          style={{ borderColor: selected==='group'?'#1a3a2a':'rgba(26,58,42,0.15)', background: selected==='group'?'rgba(26,58,42,0.04)':'#fff' }}>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: selected==='group'?'rgba(26,58,42,0.1)':'rgba(26,58,42,0.06)' }}>
              <Users size={20} strokeWidth={1.75} className="text-forest" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-forest text-[15px]">I'm setting up a Group</p>
                {selected==='group' && <CheckCircle size={15} className="text-forest shrink-0" />}
              </div>
              <p className="text-xs text-mist mt-1 leading-relaxed">
                Youth, Women, Men, Children, etc. Track attendance and follow up on absentees.
              </p>
            </div>
          </div>
        </button>

        <button type="button" onClick={() => setSelected('church')}
          className="w-full text-left rounded-2xl border-2 transition-all p-4"
          style={{ borderColor: selected==='church'?'#a8862e':'rgba(201,168,76,0.3)', background: selected==='church'?'rgba(201,168,76,0.06)':'#fff' }}>
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: selected==='church'?'rgba(201,168,76,0.2)':'rgba(201,168,76,0.1)' }}>
              <Building2 size={20} strokeWidth={1.75} style={{ color:'#a8862e' }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-forest text-[15px]">I'm setting up a Church Dashboard</p>
                {selected==='church' && <CheckCircle size={15} style={{ color:'#a8862e', flexShrink:0 }} />}
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shrink-0"
                  style={{ background:'rgba(201,168,76,0.15)', color:'#a8862e' }}>ADMIN</span>
              </div>
              <p className="text-xs text-mist mt-1 leading-relaxed">
                Connect all sub-groups, see attendance across every department, and generate church-wide reports.
              </p>
            </div>
          </div>
        </button>
      </div>

      <button type="button" disabled={!selected} onClick={() => onSelect(selected)}
        className="btn btn-primary w-full btn-lg gap-2" style={{ opacity: selected?1:0.4 }}>
        Continue <ArrowRight size={16} />
      </button>

      <p className="text-center text-sm text-forest-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-forest font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  )
}

// ── Main signup ────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router = useRouter()
  const [step, setStep]             = useState('type')  // 'type' | 'form' | 'done'
  const [accountType, setAccountType] = useState(null)  // 'group' | 'church'
  const [form, setForm]             = useState({ groupName:'', adminName:'', email:'', password:'', confirmPassword:'' })
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [setupError, setSetupError] = useState(false)   // auth ok, church write failed
  const [retryUserId, setRetryUserId] = useState(null)  // stored for retry without re-auth

  function field(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function validate() {
    if (!form.groupName.trim()) return `Please enter your ${accountType==='church'?'church':'group'} name.`
    if (!form.adminName.trim()) return 'Please enter your name.'
    if (!form.email.trim())     return 'Please enter your email.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    return null
  }

  // ── Core: call /api/complete-signup ─────────────────────────────────────────
  async function writeChurchRecord(userId) {
    console.log('[signup] Calling /api/complete-signup with:', {
      userId,
      name:        form.groupName.trim(),
      adminName:   form.adminName.trim(),
      accountType,
    })

    let res, data
    try {
      res = await fetch('/api/complete-signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name:        form.groupName.trim(),
          adminName:   form.adminName.trim(),
          accountType: accountType === 'church' ? 'church' : 'group',
        }),
      })
      data = await res.json()
    } catch (networkErr) {
      console.error('[signup] Network error calling complete-signup:', networkErr)
      return { success: false, error: 'Network error — check your connection.' }
    }

    console.log('[signup] /api/complete-signup response:', res.status, data)

    if (res.ok && data.success) return { success: true }
    return { success: false, error: data.error ?? `Server error (${res.status})` }
  }

  // ── Retry: re-run the church write without re-creating the auth account ──────
  async function handleRetry() {
    const uid = retryUserId
    if (!uid) { setError('No user ID to retry with — please refresh and try again.'); return }
    setLoading(true); setError(''); setSetupError(false)
    const result = await writeChurchRecord(uid)
    setLoading(false)
    if (result.success) {
      setStep('done')
    } else {
      setSetupError(true)
      setError(`Retry failed: ${result.error}`)
    }
  }

  // ── Main submit ──────────────────────────────────────────────────────────────
  async function handleSignup(e) {
    e.preventDefault()
    const validErr = validate()
    if (validErr) { setError(validErr); return }

    setError(''); setLoading(true); setSetupError(false)

    const supabase = createClient()

    // Step 1: Create auth account
    console.log('[signup] Step 1: auth.signUp for', form.email.trim().toLowerCase())
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    form.email.trim().toLowerCase(),
      password: form.password,
      options:  { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })

    console.log('[signup] auth.signUp result:', { user: authData?.user?.id, error: authError?.message })

    if (authError) {
      setLoading(false)
      setError(authError.message.includes('already registered')
        ? 'An account with this email already exists. Try signing in.'
        : authError.message)
      return
    }
    if (!authData?.user?.id) {
      setLoading(false)
      setError('Signup failed — no user ID returned. Please try again.')
      return
    }

    const userId = authData.user.id
    setRetryUserId(userId)

    // Step 2: Write church record via server API
    console.log('[signup] Step 2: writing church record for userId:', userId, 'accountType:', accountType)
    const result = await writeChurchRecord(userId)

    setLoading(false)
    if (!result.success) {
      setSetupError(true)
      setError(`Your login was created (you won't need to sign up again), but the setup step failed: ${result.error}`)
      return
    }

    console.log('[signup] Success — moving to done screen')
    setStep('done')
  }

  // ── Done screen ──────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="text-center space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
          style={{ background:'rgba(22,163,74,0.1)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold text-forest">Check your email</h2>
          <p className="text-sm text-forest-muted mt-2">
            We sent a confirmation link to{' '}
            <strong className="text-forest">{form.email}</strong>.
            Click it to activate your account.
          </p>
        </div>
        <p className="text-xs text-forest-muted">
          Didn't receive it? Check spam or{' '}
          <button className="text-forest underline" onClick={() => setStep('form')}>
            try a different email
          </button>.
        </p>
      </div>
    )
  }

  // ── Type selector ────────────────────────────────────────────────────────────
  if (step === 'type') {
    return <TypeSelector onSelect={t => { setAccountType(t); setStep('form') }} />
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  const isChurch = accountType === 'church'
  return (
    <>
      <div className="mb-5">
        <button type="button" onClick={() => { setStep('type'); setError(''); setSetupError(false) }}
          className="text-xs text-mist hover:text-forest flex items-center gap-1 mb-3">
          ← Back
        </button>
        <div className="flex items-center gap-2 mb-1">
          {isChurch
            ? <Building2 size={16} style={{ color:'#a8862e' }} />
            : <Users size={16} className="text-forest" />}
          <span className="text-xs font-bold uppercase tracking-wide"
            style={{ color: isChurch?'#a8862e':'#1a3a2a' }}>
            {isChurch ? 'Church Dashboard' : 'Group Account'}
          </span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-forest">
          {isChurch ? 'Set up your Church Dashboard' : 'Create your account'}
        </h1>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="input-label">{isChurch ? 'Church name' : 'Group name'}</label>
          <input className="input" required type="text" autoComplete="organization"
            placeholder={isChurch ? 'e.g. Grace Assembly' : 'e.g. Youth Fellowship'}
            value={form.groupName} onChange={e => field('groupName', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Your name</label>
          <input className="input" required type="text" autoComplete="name"
            placeholder="Full name"
            value={form.adminName} onChange={e => field('adminName', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Email</label>
          <input className="input" required type="email" autoComplete="email"
            placeholder="you@example.com"
            value={form.email} onChange={e => field('email', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Password</label>
          <input className="input" required type="password" minLength={8}
            autoComplete="new-password" placeholder="Min. 8 characters"
            value={form.password} onChange={e => field('password', e.target.value)} />
        </div>
        <div>
          <label className="input-label">Confirm password</label>
          <input className="input" required type="password"
            autoComplete="new-password" placeholder="Repeat password"
            value={form.confirmPassword} onChange={e => field('confirmPassword', e.target.value)} />
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm space-y-2"
            style={{ background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)', color:'#dc2626' }}>
            <p>{error}</p>
            {setupError && (
              <button type="button" onClick={handleRetry} disabled={loading}
                className="font-bold underline block w-full text-center">
                {loading ? 'Retrying…' : '↻ Retry Setup (click here)'}
              </button>
            )}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg mt-2">
          {loading
            ? <span className="flex items-center gap-2 justify-center"><Spinner /> Creating account…</span>
            : 'Create account'
          }
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-forest-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-forest font-medium hover:underline">Sign in</Link>
      </p>
    </>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/>
    </svg>
  )
}
