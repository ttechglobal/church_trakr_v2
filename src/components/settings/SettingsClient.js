'use client'

import BackButton from '@/components/ui/BackButton'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { usePWA } from '@/hooks/usePWA'
import {
  User, Bell, ShieldAlert, Link2,
  Smartphone, CheckCircle, ChevronRight,
  CreditCard,
} from 'lucide-react'

const NotificationSettings = dynamic(() => import('./NotificationSettings'), { ssr: false })

// ── Tabs — templates and sender ID moved to Messaging Hub ─────────────────────
const TABS = [
  { id: 'profile',       label: 'Profile',       Icon: User       },
  { id: 'church',        label: 'Church Link',   Icon: Link2      },
  { id: 'notifications', label: 'Notifications', Icon: Bell       },
  { id: 'account',       label: 'Account',       Icon: ShieldAlert },
]

export default function SettingsClient({ church: initialChurch, user }) {
  const router = useRouter()
  const [tab, setTab]       = useState('profile')
  const [church, setChurch] = useState(initialChurch)

  // ── Profile ────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState({
    name:       initialChurch.name       ?? '',
    admin_name: initialChurch.admin_name ?? '',
    phone:      initialChurch.phone      ?? '',
    location:   initialChurch.location   ?? '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg,    setProfileMsg]    = useState('')

  async function handleSaveProfile() {
    setSavingProfile(true); setProfileMsg('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:       profile.name,
          admin_name: profile.admin_name,
          phone:      profile.phone,
          location:   profile.location,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Save failed')
      }
      const { church: updated } = await res.json()
      if (updated) {
        setChurch(updated)
        setProfile({
          name:       updated.name       ?? '',
          admin_name: updated.admin_name ?? '',
          phone:      updated.phone      ?? '',
          location:   updated.location   ?? '',
        })
      }
      setProfileMsg('Profile updated ✓')
    } catch (err) {
      setProfileMsg(`Failed to save: ${err.message}`)
    } finally {
      setSavingProfile(false)
      setTimeout(() => setProfileMsg(''), 4000)
    }
  }

  // ── Account / sign out / delete ───────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting,      setDeleting]      = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE MY ACCOUNT') return
    setDeleting(true)
    try {
      const res = await fetch('/api/settings/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: 'DELETE MY ACCOUNT' }),
      })
      if (res.ok) {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
      }
    } catch {} finally { setDeleting(false) }
  }

  return (
    <div className="page-content pb-10">
      <BackButton />
      <h1 className="font-display text-2xl font-semibold text-forest mb-4">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide mb-4">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all
              ${tab === t.id ? 'bg-forest text-ivory' : 'text-forest-muted hover:bg-ivory hover:text-forest'}`}>
            {t.Icon && <t.Icon size={13} strokeWidth={tab === t.id ? 2.5 : 1.75} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {tab === 'profile' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <h2 className="font-display text-lg font-semibold text-forest">Profile</h2>
            {[
              { key: 'name',       label: 'Church / Group name', placeholder: 'Your group name'     },
              { key: 'admin_name', label: 'Your name',           placeholder: 'Leader / admin name' },
              { key: 'phone',      label: 'Phone',               placeholder: '+234…', type: 'tel'  },
              { key: 'location',   label: 'Location',            placeholder: 'City or address'     },
            ].map(({ key, label, placeholder, type = 'text' }) => (
              <div key={key}>
                <label className="input-label">{label}</label>
                <input className="input" type={type} placeholder={placeholder}
                  value={profile[key]}
                  onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))} />
              </div>
            ))}
            {profileMsg && (
              <p className={`text-sm font-medium ${profileMsg.includes('✓') ? 'text-success' : 'text-error'}`}>
                {profileMsg}
              </p>
            )}
            <button onClick={handleSaveProfile} disabled={savingProfile} className="btn btn-primary w-full">
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          {/* Install App */}
          <InstallCard />

          {/* Credits shortcut */}
          <button onClick={() => router.push('/credits')}
            className="card w-full text-left flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center shrink-0">
              <CreditCard size={16} style={{ color: '#a8862e' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-forest text-sm">SMS Credits</p>
              <p className="text-xs text-mist mt-0.5">
                {initialChurch.sms_credits} credits remaining · Tap to buy more
              </p>
            </div>
            <ChevronRight size={15} className="text-mist shrink-0" />
          </button>

          {/* Messaging shortcut */}
          <button onClick={() => router.push('/messaging')}
            className="card w-full text-left flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-forest/8 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#1a3a2a' }}>
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-forest text-sm">Messaging</p>
              <p className="text-xs text-mist mt-0.5">Templates, Sender ID, history</p>
            </div>
            <ChevronRight size={15} className="text-mist shrink-0" />
          </button>
        </div>
      )}

      {/* ── CHURCH LINK TAB ── */}
      {tab === 'church' && <ChurchLinkTab />}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab === 'notifications' && (
        <div style={{ animation: 'var(--animate-fade-in)' }}>
          <NotificationSettings />
        </div>
      )}

      {/* ── ACCOUNT TAB ── */}
      {tab === 'account' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-3">
            <h2 className="font-display text-lg font-semibold text-forest">Account</h2>
            <div className="flex justify-between text-sm">
              <span className="text-mist">Email</span>
              <span className="font-medium text-forest">{user.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-mist">Plan</span>
              <span className="badge-gold">Free</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-mist">SMS Credits</span>
              <span className="font-semibold text-forest">{initialChurch.sms_credits}</span>
            </div>
            <button onClick={() => router.push('/credits')} className="btn btn-outline w-full gap-2" style={{ color: '#a8862e', borderColor: 'rgba(201,168,76,0.4)' }}>
              <CreditCard size={14} /> Buy SMS Credits
            </button>
            <div className="divider" />
            <button onClick={handleSignOut} className="btn btn-outline w-full text-error border-error/30 hover:bg-error/8">
              Sign out
            </button>
          </div>

          <div className="card space-y-3" style={{ borderColor: 'rgba(220,38,38,0.2)' }}>
            {/* ── Data export ── */}
            <div className="card space-y-3" style={{ borderColor: 'rgba(26,58,42,0.15)' }}>
              <h3 className="font-semibold text-forest">Your data</h3>
              <p className="text-sm text-mist">Download a copy of all your church data — members, attendance records, follow-up notes, and SMS history — as a JSON file.</p>
              <a
                href="/api/settings/export-data"
                download
                className="btn btn-outline w-full text-center"
                style={{ display:'block', textAlign:'center', lineHeight:'2.5' }}
              >
                Download my data
              </a>
              <p className="text-xs text-mist">You can request a new export once every 10 minutes. Your privacy policy is available at{' '}
                <a href="/privacy" className="text-forest font-medium underline" target="_blank">churchtrakr.com/privacy</a>.
              </p>
            </div>

            <h3 className="font-semibold text-error">Danger zone</h3>
            <p className="text-sm text-mist">Permanently delete your account and all data. This cannot be undone.</p>
            <input className="input text-sm border-error/30" placeholder='Type "DELETE MY ACCOUNT" to confirm'
              value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
            <p className="text-xs text-mist">This will permanently erase all members, attendance records, follow-up data, and SMS logs. There is no undo.</p>
            <button onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE MY ACCOUNT' || deleting}
              className="btn btn-danger w-full">
              {deleting ? 'Deleting everything…' : 'Permanently delete my account and all data'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Church Link Tab ────────────────────────────────────────────────────────────
function ChurchLinkTab() {
  const [code,      setCode]      = useState('')
  const [status,    setStatus]    = useState(null)
  const [preview,   setPreview]   = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [submitting,setSub]       = useState(false)
  const [msg,       setMsg]       = useState('')

  useEffect(() => {
    fetch('/api/church/connect').then(r => r.json()).then(d => setStatus(d.connection ?? null)).catch(() => setStatus(null)).finally(() => setLoading(false))
  }, [])

  async function lookupCode() {
    if (!code.trim()) return
    setSub(true); setMsg(''); setPreview(null)
    const res  = await fetch(`/api/church/lookup?code=${encodeURIComponent(code.trim().toUpperCase())}`)
    const data = await res.json()
    setSub(false)
    if (data.churchName) setPreview(data)
    else setMsg(data.error ?? 'No church found with that code')
  }

  async function sendRequest() {
    if (!preview) return
    setSub(true); setMsg('')
    const res  = await fetch('/api/church/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim().toUpperCase() }) })
    const data = await res.json()
    setSub(false)
    if (data.success) { setStatus({ status: 'pending', churchName: preview.churchName }); setPreview(null); setCode('') }
    else setMsg(data.error ?? 'Request failed')
  }

  async function disconnect() {
    if (!confirm('Disconnect from this church dashboard? Your own data is unaffected.')) return
    setSub(true)
    await fetch('/api/church/connect', { method: 'DELETE' })
    setStatus(null); setSub(false)
  }

  if (loading) return <div className="card"><p className="text-sm text-mist">Loading…</p></div>

  return (
    <div className="card space-y-4 animate-fade-in">
      <h2 className="font-display text-lg font-semibold text-forest">Church Link</h2>
      {status ? (
        <div className="space-y-3">
          <div className={`flex items-center gap-2 p-3 rounded-xl ${status.status === 'approved' ? 'bg-success/10' : 'bg-warning/10'}`}>
            <span>{status.status === 'approved' ? '✅' : '⏳'}</span>
            <div>
              <p className={`text-sm font-medium ${status.status === 'approved' ? 'text-success' : 'text-warning'}`}>
                {status.status === 'approved' ? `Connected to ${status.churchName}` : `Pending approval — ${status.churchName}`}
              </p>
            </div>
          </div>
          <button onClick={disconnect} disabled={submitting} className="btn btn-outline btn-sm w-full" style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}>
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-mist">Not linked to any church dashboard. Ask your church admin for their connection code.</p>
          <div>
            <label className="input-label">Connection Code</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="e.g. ABCDE-1234"
                value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setPreview(null); setMsg('') }}
                onKeyDown={e => e.key === 'Enter' && lookupCode()}
                style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace', fontWeight: 700 }} />
              <button onClick={lookupCode} disabled={submitting || !code.trim()} className="btn btn-outline">
                {submitting && !preview ? 'Looking…' : 'Look Up'}
              </button>
            </div>
          </div>
          {msg && <p className="text-sm text-error">{msg}</p>}
          {preview && (
            <div className="p-4 rounded-2xl bg-forest/4 border border-forest/12 space-y-3">
              <p className="text-sm font-semibold text-forest">Connect to: {preview.churchName}</p>
              <p className="text-xs text-mist leading-relaxed">The church admin will approve your request. Your attendance data will be read-only on their dashboard.</p>
              <div className="flex gap-2">
                <button onClick={() => { setPreview(null); setMsg('') }} className="btn btn-outline flex-1 btn-sm">Cancel</button>
                <button onClick={sendRequest} disabled={submitting} className="btn btn-primary flex-1 btn-sm">{submitting ? 'Sending…' : 'Send Request'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Install Card ───────────────────────────────────────────────────────────────
function InstallCard() {
  const { installPrompt, promptInstall, isInstalled } = usePWA()
  const [showGuide, setShowGuide] = useState(false)
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)

  function handleInstallClick() {
    if (isInstalled) return
    if (installPrompt) { promptInstall() }
    else { setShowGuide(true) }
  }

  const steps = isIOS
    ? ['Open this page in Safari', 'Tap the Share button (box with arrow)', 'Scroll down and tap "Add to Home Screen"', 'Tap "Add" to confirm']
    : ['Tap the three-dot menu in Chrome', 'Tap "Add to Home screen" or "Install app"', 'Tap "Add" to confirm']

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-forest/8 flex items-center justify-center shrink-0">
          <Smartphone size={16} strokeWidth={1.75} className="text-forest" />
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-forest">
            {isInstalled ? 'App Installed ✓' : 'Install App'}
          </h2>
          <p className="text-xs text-mist mt-0.5">
            {isInstalled ? 'ChurchTrakr is installed on this device' : 'Add to your home screen for faster access'}
          </p>
        </div>
      </div>
      {isInstalled ? (
        <div className="flex items-center gap-2 p-3 bg-success/8 rounded-xl">
          <CheckCircle size={14} className="text-success shrink-0" />
          <p className="text-sm text-success font-medium">Already installed on this device</p>
        </div>
      ) : (
        <>
          <button onClick={handleInstallClick} className="btn btn-primary w-full gap-2">
            <Smartphone size={15} />
            {installPrompt ? 'Install ChurchTrakr' : 'How to Install'}
          </button>
          {showGuide && (
            <div className="rounded-2xl bg-forest/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-forest">{isIOS ? 'Install on iPhone/iPad' : 'Install on Android'}</p>
              {steps.map((s, i) => (
                <p key={i} className="text-sm text-forest flex gap-2">
                  <span className="font-bold text-gold shrink-0">{i + 1}.</span>{s}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
