'use client'
// CHURCHTRAKR-SIGNUP-V5 — layered onboarding

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Users, Building2, ArrowRight, CheckCircle, Check,
} from 'lucide-react'

// ── Nigerian states ───────────────────────────────────────────────────────────
const NIGERIA_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT — Abuja','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
  'Taraba','Yobe','Zamfara',
]

const CHURCH_SIZES = [
  'Under 50 members',
  '50 – 100 members',
  '101 – 300 members',
  '300 – 1,000 members',
  'Over 1,000 members',
]

const USE_CASE_OPTIONS = [
  'Tracking Sunday attendance',
  'Following up on absentees',
  'Sending SMS to members',
  'Generating attendance reports',
  'Managing member records',
  'Church leadership oversight',
]

// ── Progress indicator ────────────────────────────────────────────────────────
function Progress({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 2,
          background: i < step ? '#1a3a2a' : 'rgba(26,58,42,0.15)',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  )
}

function BackBtn({ onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#8a9e90', marginBottom: 16, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
      ← Back
    </button>
  )
}

// ── Step 1 — Account type ─────────────────────────────────────────────────────
function Step1Type({ onNext }) {
  const [selected, setSelected] = useState(null)
  return (
    <div className="space-y-5 animate-fade-in">
      <Progress step={1} total={5} />
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest">Get started</h1>
        <p className="text-sm text-mist mt-1">What are you setting up?</p>
      </div>
      <div className="space-y-3">
        <TypeCard
          type="group"
          selected={selected}
          onSelect={setSelected}
          icon={<Users size={20} strokeWidth={1.75} className="text-forest" />}
          label="Group Account"
          desc="Youth, Women, Men, Children, etc. Track attendance and follow up on absentees."
          iconBg="rgba(26,58,42,0.06)"
        />
        <TypeCard
          type="church"
          selected={selected}
          onSelect={setSelected}
          icon={<Building2 size={20} strokeWidth={1.75} style={{ color: '#a8862e' }} />}
          label="Church Dashboard"
          desc="Connect all sub-groups, see attendance across every department."
          iconBg="rgba(201,168,76,0.1)"
          badge="ADMIN"
          badgeColor="#a8862e"
          borderColor={selected === 'church' ? '#a8862e' : 'rgba(201,168,76,0.3)'}
          selectedBg="rgba(201,168,76,0.06)"
          checkColor="#a8862e"
        />
      </div>
      <button disabled={!selected} onClick={() => onNext(selected)}
        className="btn btn-primary w-full btn-lg gap-2" style={{ opacity: selected ? 1 : 0.4 }}>
        Continue <ArrowRight size={16} />
      </button>
      <p className="text-center text-sm text-mist">
        Already have an account?{' '}
        <Link href="/login" className="text-forest font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  )
}

function TypeCard({ type, selected, onSelect, icon, label, desc, iconBg, badge, badgeColor, borderColor, selectedBg, checkColor }) {
  const isSelected = selected === type
  return (
    <button type="button" onClick={() => onSelect(type)}
      className="w-full text-left rounded-2xl border-2 transition-all p-4"
      style={{
        borderColor: isSelected ? (borderColor ?? '#1a3a2a') : (borderColor ?? 'rgba(26,58,42,0.15)'),
        background:  isSelected ? (selectedBg ?? 'rgba(26,58,42,0.04)') : '#fff',
      }}>
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: isSelected ? (iconBg) : (iconBg) }}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-forest text-[15px]">{label}</p>
            {isSelected && <CheckCircle size={15} style={{ color: checkColor ?? '#1a3a2a', flexShrink: 0 }} />}
            {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shrink-0"
              style={{ background: `${badgeColor}22`, color: badgeColor }}>{badge}</span>}
          </div>
          <p className="text-xs text-mist mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
    </button>
  )
}

// ── Step 2 — Credentials ──────────────────────────────────────────────────────
function Step2Credentials({ accountType, onNext, onBack }) {
  const [email,    setEmail]    = useState('')
  const [pw,       setPw]       = useState('')
  const [pw2,      setPw2]      = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!email.trim()) return setError('Email is required')
    if (pw.length < 8) return setError('Password must be at least 8 characters')
    if (pw !== pw2)    return setError('Passwords do not match')

    setLoading(true); setError('')
    const supabase = createClient()
    const { data, error: authErr } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: pw,
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    setLoading(false)
    if (authErr) {
      setError(authErr.message.includes('already registered')
        ? 'An account with this email already exists. Try signing in.'
        : authErr.message)
      return
    }
    if (!data?.user?.id) return setError('Signup failed — please try again.')
    onNext({ userId: data.user.id, email: email.trim().toLowerCase() })
  }

  return (
    <form onSubmit={submit} className="space-y-4 animate-fade-in">
      <Progress step={2} total={5} />
      <BackBtn onClick={onBack} />
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest">Create your account</h1>
        <p className="text-sm text-mist mt-1">Step 1 of 4 — your login details</p>
      </div>
      <div>
        <label className="input-label">Email address</label>
        <input className="input" type="email" autoComplete="email" placeholder="you@example.com"
          value={email} onChange={e => setEmail(e.target.value)} autoFocus />
      </div>
      <div>
        <label className="input-label">Password</label>
        <input className="input" type="password" autoComplete="new-password" placeholder="Min. 8 characters"
          value={pw} onChange={e => setPw(e.target.value)} />
      </div>
      <div>
        <label className="input-label">Confirm password</label>
        <input className="input" type="password" autoComplete="new-password" placeholder="Repeat password"
          value={pw2} onChange={e => setPw2(e.target.value)} />
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full btn-lg gap-2">
        {loading ? 'Creating account…' : <>Continue <ArrowRight size={16} /></>}
      </button>
    </form>
  )
}

// ── Step 3 — Group/church name ────────────────────────────────────────────────
function Step3Name({ accountType, onNext, onBack }) {
  const [name, setName] = useState('')
  const isChurch = accountType === 'church'
  return (
    <div className="space-y-4 animate-fade-in">
      <Progress step={3} total={5} />
      <BackBtn onClick={onBack} />
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest">
          What is your {isChurch ? 'church' : 'group'} called?
        </h1>
        <p className="text-sm text-mist mt-1">Step 2 of 4</p>
      </div>
      <div>
        <label className="input-label">{isChurch ? 'Church name' : 'Group name'}</label>
        <input className="input" autoFocus
          placeholder={isChurch ? 'e.g. Grace Assembly' : 'e.g. Grace Assembly — Youth Fellowship'}
          value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && onNext(name.trim())}
        />
        <p className="text-xs text-mist mt-1.5">
          {isChurch ? 'The name your sub-groups will see when connecting.' : 'e.g. Grace Community Church — Youth Fellowship'}
        </p>
      </div>
      <button disabled={!name.trim()} onClick={() => onNext(name.trim())}
        className="btn btn-primary w-full btn-lg gap-2" style={{ opacity: name.trim() ? 1 : 0.4 }}>
        Continue <ArrowRight size={16} />
      </button>
    </div>
  )
}

// ── Step 4 — Admin details ────────────────────────────────────────────────────
function Step4Admin({ onNext, onBack }) {
  const [adminName, setAdminName] = useState('')
  const [phone,     setPhone]     = useState('')
  return (
    <div className="space-y-4 animate-fade-in">
      <Progress step={4} total={5} />
      <BackBtn onClick={onBack} />
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest">About you</h1>
        <p className="text-sm text-mist mt-1">Step 3 of 4</p>
      </div>
      <div>
        <label className="input-label">Your name</label>
        <input className="input" autoFocus autoComplete="name" placeholder="Full name"
          value={adminName} onChange={e => setAdminName(e.target.value)} />
      </div>
      <div>
        <label className="input-label">Phone number <span className="text-mist font-normal">(optional)</span></label>
        <input className="input" type="tel" autoComplete="tel" placeholder="e.g. 08012345678"
          inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} />
      </div>
      <button disabled={!adminName.trim()} onClick={() => onNext({ adminName: adminName.trim(), phone: phone.trim() || null })}
        className="btn btn-primary w-full btn-lg gap-2" style={{ opacity: adminName.trim() ? 1 : 0.4 }}>
        Continue <ArrowRight size={16} />
      </button>
    </div>
  )
}

// ── Step 5 — Onboarding questions ─────────────────────────────────────────────
function Step5Questions({ onNext, onBack }) {
  const [country,    setCountry]    = useState('Nigeria')
  const [state,      setState_]     = useState('')
  const [size,       setSize]       = useState('')
  const [useCases,   setUseCases]   = useState([])
  const [submitting, setSubmitting] = useState(false)

  function toggleUseCase(u) {
    setUseCases(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u])
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Progress step={5} total={5} />
      <BackBtn onClick={onBack} />
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest">Help us serve you better</h1>
        <p className="text-sm text-mist mt-1">Step 4 of 4 — takes less than a minute</p>
      </div>

      {/* Location */}
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-forest">Where is your church located?</p>
        <div>
          <label className="input-label">Country</label>
          <select className="input" value={country} onChange={e => { setCountry(e.target.value); setState_('') }}>
            <option value="Nigeria">Nigeria</option>
            <option value="Ghana">Ghana</option>
            <option value="Kenya">Kenya</option>
            <option value="South Africa">South Africa</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="United States">United States</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="input-label">State / Region</label>
          {country === 'Nigeria' ? (
            <select className="input" value={state} onChange={e => setState_(e.target.value)}>
              <option value="">— Select state —</option>
              {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <input className="input" placeholder="State or region"
              value={state} onChange={e => setState_(e.target.value)} />
          )}
        </div>
      </div>

      {/* Church size */}
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-forest">How large is your group or church?</p>
        {CHURCH_SIZES.map(s => (
          <button key={s} type="button" onClick={() => setSize(s)}
            className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl border-2 transition-all text-left"
            style={{
              borderColor: size === s ? '#1a3a2a' : 'rgba(26,58,42,0.12)',
              background:  size === s ? 'rgba(26,58,42,0.04)' : 'transparent',
            }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${size === s ? '#1a3a2a' : '#d1d5db'}`, background: size === s ? '#1a3a2a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {size === s && <Check size={10} color="#fff" strokeWidth={3} />}
            </div>
            <span className="text-sm font-medium text-forest">{s}</span>
          </button>
        ))}
      </div>

      {/* Use cases */}
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-forest">What will you mainly use ChurchTrakr for?</p>
        <p className="text-xs text-mist">Select all that apply</p>
        {USE_CASE_OPTIONS.map(u => (
          <button key={u} type="button" onClick={() => toggleUseCase(u)}
            className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl border-2 transition-all text-left"
            style={{
              borderColor: useCases.includes(u) ? '#1a3a2a' : 'rgba(26,58,42,0.12)',
              background:  useCases.includes(u) ? 'rgba(26,58,42,0.04)' : 'transparent',
            }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${useCases.includes(u) ? '#1a3a2a' : '#d1d5db'}`, background: useCases.includes(u) ? '#1a3a2a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {useCases.includes(u) && <Check size={10} color="#fff" strokeWidth={3} />}
            </div>
            <span className="text-sm font-medium text-forest">{u}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => onNext({ country, state, churchSize: size, useCases })}
        disabled={submitting}
        className="btn btn-primary w-full btn-lg gap-2"
      >
        {submitting ? 'Finishing setup…' : 'Finish Setup →'}
      </button>
    </div>
  )
}

// ── Step 6 — Welcome ──────────────────────────────────────────────────────────
function Step6Welcome({ adminName, onDashboard, onAddMembers }) {
  return (
    <div className="text-center space-y-5 animate-fade-in">
      <div style={{ fontSize: 56 }}>🎉</div>
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest">
          You're all set{adminName ? `, ${adminName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-sm text-mist mt-2 leading-relaxed">
          Welcome to ChurchTrakr. Your account is ready.<br />
          Start by adding your members.
        </p>
      </div>
      <div className="space-y-3">
        <button onClick={onAddMembers} className="btn btn-primary w-full btn-lg">
          Add Members Now
        </button>
        <button onClick={onDashboard} className="btn btn-outline w-full">
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const router  = useRouter()
  const [step,         setStep]         = useState(1)
  const [accountType,  setAccountType]  = useState(null)
  const [userId,       setUserId]       = useState(null)
  const [email,        setEmail_]       = useState('')
  const [groupName,    setGroupName]    = useState('')
  const [adminName,    setAdminName]    = useState('')
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)

  async function writeChurchRecord({ phone, country, state, churchSize, useCases }) {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/complete-signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name:        groupName,
          adminName,
          phone:       phone ?? null,
          accountType: accountType === 'church' ? 'church' : 'group',
          country:     country ?? null,
          state:       state   ?? null,
          churchSize:  churchSize ?? null,
          useCases:    useCases ?? [],
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Setup failed')
      setStep(6)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return <Step1Type onNext={type => { setAccountType(type); setStep(2) }} />
  }

  if (step === 2) {
    return (
      <Step2Credentials
        accountType={accountType}
        onBack={() => setStep(1)}
        onNext={({ userId: uid, email: em }) => { setUserId(uid); setEmail_(em); setStep(3) }}
      />
    )
  }

  if (step === 3) {
    return (
      <Step3Name
        accountType={accountType}
        onBack={() => setStep(2)}
        onNext={name => { setGroupName(name); setStep(4) }}
      />
    )
  }

  if (step === 4) {
    return (
      <Step4Admin
        onBack={() => setStep(3)}
        onNext={({ adminName: an, phone }) => {
          setAdminName(an)
          setStep(5)
        }}
      />
    )
  }

  if (step === 5) {
    return (
      <div>
        {error && <p className="text-sm text-error mb-4 px-1">{error}</p>}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-forest border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-sm text-mist">Setting up your account…</p>
          </div>
        ) : (
          <Step5Questions
            onBack={() => setStep(4)}
            onNext={({ country, state, churchSize, useCases }) =>
              writeChurchRecord({ country, state, churchSize, useCases })
            }
          />
        )}
      </div>
    )
  }

  if (step === 6) {
    return (
      <Step6Welcome
        adminName={adminName}
        onDashboard={() => router.push(accountType === 'church' ? '/church-dashboard' : '/dashboard')}
        onAddMembers={() => router.push('/members')}
      />
    )
  }

  return null
}
