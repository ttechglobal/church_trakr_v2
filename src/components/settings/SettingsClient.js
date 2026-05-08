'use client'

import BackButton from '@/components/ui/BackButton'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { usePWA } from '@/hooks/usePWA'
import {
  User, Bell, MessageSquare, Radio, ShieldAlert, Link2,
  Smartphone, CheckCircle, X, Plus, Trash2, ChevronRight,
  CreditCard,
} from 'lucide-react'

const NotificationSettings = dynamic(() => import('./NotificationSettings'), { ssr: false })

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'profile',       label: 'Profile',       Icon: User         },
  { id: 'church',        label: 'Church Link',   Icon: Link2        },
  { id: 'notifications', label: 'Notifications', Icon: Bell         },
  { id: 'templates',     label: 'SMS Templates', Icon: MessageSquare },
  { id: 'sender',        label: 'Sender ID',     Icon: Radio        },
  { id: 'account',       label: 'Account',       Icon: ShieldAlert  },
]

// ── SMS Templates ─────────────────────────────────────────────────────────────
const BUILT_IN_TEMPLATES = [
  { id: 'missed',      label: 'We missed you',       body: "Hi {name}, we missed you at service this week. We hope you're well. Please join us next Sunday! 🙏" },
  { id: 'welcome_ft',  label: 'First Timer Welcome', body: "Hi {name}, welcome to our church family! 🎉 God bless you!" },
  { id: 'reminder',    label: 'Service Reminder',    body: "Hi {name}, service is this Sunday! We look forward to seeing you. 🙏" },
  { id: 'sunday',      label: 'Sunday Reminder',     body: "Hi {name}, service is tomorrow! Come and be blessed. 🙏" },
  { id: 'thanks',      label: 'Thanks for Attending',body: "Hi {name}, thank you for joining us today! God bless you abundantly. 🙏" },
  { id: 'attendee_fu', label: 'Attendee Follow-up',  body: "Hi {name}, great seeing you at service! How are you doing? 🙏" },
  { id: 'event',       label: 'Upcoming Event',      body: "Hi {name}, we have an exciting program coming up! Stay tuned. 🙏" },
]

// ── Main component ────────────────────────────────────────────────────────────
export default function SettingsClient({ church: initialChurch, user }) {
  const router = useRouter()
  const [tab, setTab]     = useState('profile')
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
        method:  'PATCH',
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

  // ── SMS Templates ──────────────────────────────────────────────────────────
  const [customTemplates, setCustomTemplates] = useState([])
  const [newTplName,  setNewTplName]  = useState('')
  const [newTplBody,  setNewTplBody]  = useState('')
  const [showNewTpl,  setShowNewTpl]  = useState(false)

  useEffect(() => {
    try {
      setCustomTemplates(JSON.parse(localStorage.getItem('ct_sms_templates') ?? '[]'))
    } catch {}
  }, [])

  function saveCustomTemplate() {
    if (!newTplName.trim() || !newTplBody.trim()) return
    const tpl     = { id: `custom_${Date.now()}`, label: newTplName.trim(), body: newTplBody.trim() }
    const updated = [...customTemplates, tpl]
    setCustomTemplates(updated)
    localStorage.setItem('ct_sms_templates', JSON.stringify(updated))
    setNewTplName(''); setNewTplBody(''); setShowNewTpl(false)
  }

  function deleteCustomTemplate(id) {
    const updated = customTemplates.filter(t => t.id !== id)
    setCustomTemplates(updated)
    localStorage.setItem('ct_sms_templates', JSON.stringify(updated))
  }

  // ── Sender ID ──────────────────────────────────────────────────────────────
  const [senderId,          setSenderId]          = useState(initialChurch.sms_sender_id ?? '')
  const [senderIdStatus,    setSenderIdStatus]    = useState(initialChurch.sms_sender_id_status)
  const [submittingSenderId, setSubmittingSenderId] = useState(false)
  const [senderMsg,         setSenderMsg]         = useState('')

  async function handleApplySenderId() {
    if (!senderId.trim() || senderId.length > 11) {
      setSenderMsg('Sender ID must be 1–11 characters'); return
    }
    setSubmittingSenderId(true); setSenderMsg('')
    try {
      const res = await fetch('/api/settings/sender-id', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: senderId.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setSenderIdStatus('pending')
      setSenderMsg('Application submitted! Approval takes 1–3 business days.')
    } catch {
      setSenderMsg('Submission failed. Please try again.')
    } finally {
      setSubmittingSenderId(false)
    }
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [deleting,       setDeleting]       = useState(false)
  const [deleteConfirm,  setDeleteConfirm]  = useState('')

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      const res = await fetch('/api/settings/delete-account', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      await handleSignOut()
    } catch { setDeleting(false) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      <BackButton />
      <h1 className="font-display text-2xl font-semibold text-forest mb-4">Settings</h1>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4 mb-4">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5
              ${tab === t.id
                ? 'bg-forest text-ivory'
                : 'text-forest-muted hover:bg-ivory hover:text-forest'
              }`}>
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
                <input
                  className="input" type={type} placeholder={placeholder}
                  value={profile[key]}
                  onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
            {profileMsg && (
              <p className={`text-sm font-medium ${
                profileMsg.includes('✓') ? 'text-success' : 'text-error'
              }`}>
                {profileMsg}
              </p>
            )}
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="btn btn-primary w-full"
            >
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </div>

          {/* Install App card */}
          <InstallCard />

          {/* Buy Credits shortcut */}
          <button
            onClick={() => router.push('/credits')}
            className="card w-full text-left flex items-center gap-3 hover:shadow-md transition-shadow"
          >
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
        </div>
      )}

      {/* ── CHURCH LINK TAB ── */}
      {tab === 'church' && (
        <ChurchLinkTab />
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab === 'notifications' && (
        <div style={{ animation: 'var(--animate-fade-in)' }}>
          <NotificationSettings />
        </div>
      )}

      {/* ── SMS TEMPLATES TAB ── */}
      {tab === 'templates' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <h2 className="font-display text-lg font-semibold text-forest mb-3">
              Built-in templates
            </h2>
            <div className="space-y-3">
              {BUILT_IN_TEMPLATES.map(t => (
                <div key={t.id} className="border-b border-forest/8 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-forest">{t.label}</p>
                  <p className="text-xs text-mist mt-1">{t.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg font-semibold text-forest">My templates</h2>
              <button
                onClick={() => setShowNewTpl(p => !p)}
                className="btn btn-primary btn-sm gap-1.5"
              >
                <Plus size={13} /> New
              </button>
            </div>

            {showNewTpl && (
              <div className="space-y-3 mb-4 p-4 bg-ivory-dark rounded-2xl">
                <div>
                  <label className="input-label">Template name</label>
                  <input
                    className="input text-sm" placeholder="e.g. Birthday greeting"
                    value={newTplName} onChange={e => setNewTplName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label">Message</label>
                  <textarea
                    className="input text-sm resize-none" style={{ minHeight: 80 }}
                    placeholder="Use {name} for personalisation"
                    value={newTplBody} onChange={e => setNewTplBody(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowNewTpl(false)} className="btn btn-outline flex-1 btn-sm">
                    Cancel
                  </button>
                  <button onClick={saveCustomTemplate} className="btn btn-primary flex-1 btn-sm">
                    Save template
                  </button>
                </div>
              </div>
            )}

            {customTemplates.length === 0 && !showNewTpl ? (
              <p className="text-sm text-mist">No custom templates yet. Create one above.</p>
            ) : (
              <div className="space-y-3">
                {customTemplates.map(t => (
                  <div key={t.id} className="flex items-start gap-3 border-b border-forest/8 pb-3 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-forest">{t.label}</p>
                      <p className="text-xs text-mist mt-1 line-clamp-2">{t.body}</p>
                    </div>
                    <button
                      onClick={() => deleteCustomTemplate(t.id)}
                      className="p-1.5 rounded-lg text-mist hover:text-error hover:bg-error/8 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SENDER ID TAB ── */}
      {tab === 'sender' && (
        <div className="card space-y-4 animate-fade-in">
          <h2 className="font-display text-lg font-semibold text-forest">Custom Sender ID</h2>
          <p className="text-sm text-mist">
            By default, SMS messages are sent from <strong>ChurchTrakr</strong>. Apply for a
            custom sender ID (e.g. your church name) so recipients recognise who is messaging them.
          </p>

          {senderIdStatus === 'approved' && (
            <div className="flex items-center gap-2 p-3 bg-success/10 rounded-xl">
              <CheckCircle size={14} className="text-success" />
              <p className="text-sm font-medium text-success">
                Approved: <strong>{church.sms_sender_id}</strong>
              </p>
            </div>
          )}
          {senderIdStatus === 'pending' && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-xl">
              <span className="text-warning">⏳</span>
              <p className="text-sm font-medium text-warning">
                Pending approval for <strong>{church.sms_sender_id}</strong>
              </p>
            </div>
          )}

          {senderIdStatus !== 'approved' && (
            <>
              <div>
                <label className="input-label">Desired Sender ID (max 11 characters)</label>
                <input
                  className="input" maxLength={11} placeholder="e.g. GraceChurch"
                  value={senderId} onChange={e => setSenderId(e.target.value)}
                />
                <p className="text-xs text-mist mt-1">
                  {senderId.length}/11 characters · Letters and numbers only, no spaces
                </p>
              </div>
              {senderMsg && (
                <p className={`text-sm ${senderMsg.includes('submitted') ? 'text-success' : 'text-error'}`}>
                  {senderMsg}
                </p>
              )}
              <button
                onClick={handleApplySenderId}
                disabled={submittingSenderId || !senderId.trim()}
                className="btn btn-primary w-full"
              >
                {submittingSenderId ? 'Submitting…' : 'Apply for Sender ID'}
              </button>
            </>
          )}
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
            <button
              onClick={() => router.push('/credits')}
              className="btn btn-outline w-full gap-2"
              style={{ color: '#a8862e', borderColor: 'rgba(201,168,76,0.4)' }}
            >
              <CreditCard size={14} /> Buy SMS Credits
            </button>
            <div className="divider" />
            <button
              onClick={handleSignOut}
              className="btn btn-outline w-full text-error border-error/30 hover:bg-error/8"
            >
              Sign out
            </button>
          </div>

          <div className="card space-y-3" style={{ borderColor: 'rgba(220,38,38,0.2)' }}>
            <h3 className="font-semibold text-error">Danger zone</h3>
            <p className="text-sm text-mist">
              Permanently delete your account and all data. This cannot be undone.
            </p>
            <input
              className="input text-sm border-error/30"
              placeholder='Type "DELETE" to confirm'
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
            />
            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleting}
              className="btn btn-danger w-full"
            >
              {deleting ? 'Deleting…' : 'Delete account permanently'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Church Link Tab ───────────────────────────────────────────────────────────
function ChurchLinkTab() {
  const [code,     setCode]     = useState('')
  const [status,   setStatus]   = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [submitting, setSub]    = useState(false)
  const [msg,      setMsg]      = useState('')

  useEffect(() => {
    fetch('/api/church/connect')
      .then(r => r.json())
      .then(d => setStatus(d.connection ?? null))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
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
    const res  = await fetch('/api/church/connect', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    })
    const data = await res.json()
    setSub(false)
    if (data.success) {
      setStatus({ status: 'pending', churchName: preview.churchName })
      setPreview(null); setCode('')
    } else {
      setMsg(data.error ?? 'Request failed')
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect from this church dashboard? Your own data is unaffected.')) return
    setSub(true)
    await fetch('/api/church/connect', { method: 'DELETE' })
    setStatus(null)
    setSub(false)
  }

  if (loading) {
    return (
      <div className="card animate-fade-in">
        <div className="h-20 rounded-xl bg-forest/5 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-forest/8 flex items-center justify-center shrink-0">
            <Link2 size={16} strokeWidth={1.75} className="text-forest" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-forest">
              Church Dashboard
            </h2>
            <p className="text-xs text-mist mt-0.5">
              Link this group to a church-level dashboard
            </p>
          </div>
        </div>

        {status ? (
          <div className="space-y-3">
            {status.status === 'approved' && (
              <div style={{
                background: 'rgba(22,163,74,0.08)',
                border: '1px solid rgba(22,163,74,0.2)',
                borderRadius: 12, padding: '12px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0, marginTop: 4 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px' }}>
                    Connected to {status.churchName}
                  </p>
                  <p style={{ fontSize: 11, color: '#8a9e90', margin: 0 }}>
                    Your attendance data is visible to the church admin.
                  </p>
                </div>
              </div>
            )}
            {status.status === 'pending' && (
              <div style={{
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.25)',
                borderRadius: 12, padding: '12px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c9a84c', flexShrink: 0, marginTop: 4 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px' }}>
                    Request pending — {status.churchName}
                  </p>
                  <p style={{ fontSize: 11, color: '#8a9e90', margin: 0 }}>
                    Waiting for the church admin to approve.
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={disconnect}
              disabled={submitting}
              className="btn btn-outline btn-sm w-full"
              style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.3)' }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-mist">
              Not linked to any church dashboard. Ask your church admin for their connection code.
            </p>
            <div>
              <label className="input-label">Connection Code</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="e.g. ABCDE-1234"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setPreview(null); setMsg('') }}
                  onKeyDown={e => e.key === 'Enter' && lookupCode()}
                  style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'monospace', fontWeight: 700 }}
                />
                <button
                  onClick={lookupCode}
                  disabled={submitting || !code.trim()}
                  className="btn btn-outline"
                >
                  {submitting && !preview ? 'Looking…' : 'Look Up'}
                </button>
              </div>
            </div>

            {msg && <p className="text-sm text-error">{msg}</p>}

            {preview && (
              <div className="p-4 rounded-2xl bg-forest/4 border border-forest/12 space-y-3">
                <p className="text-sm font-semibold text-forest">
                  Connect to: {preview.churchName}
                </p>
                <p className="text-xs text-mist leading-relaxed">
                  The church admin will approve your request. Your attendance data
                  will be read-only on their dashboard.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { setPreview(null); setMsg('') }} className="btn btn-outline flex-1 btn-sm">
                    Cancel
                  </button>
                  <button onClick={sendRequest} disabled={submitting} className="btn btn-primary flex-1 btn-sm">
                    {submitting ? 'Sending…' : 'Send Request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Install Card ──────────────────────────────────────────────────────────────
// The install button is ALWAYS shown and ALWAYS tappable — never disabled,
// never replaced with static text.
// - If beforeinstallprompt is available → triggers native browser install UI
// - If event was dismissed/unavailable → opens step-by-step guide sheet
// - If already installed → shows confirmation state (button still visible)
function InstallCard() {
  const { installPrompt, promptInstall, isInstalled } = usePWA()
  const [showGuide, setShowGuide] = useState(false)
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)

  function handleInstallClick() {
    if (isInstalled) return
    if (installPrompt) {
      promptInstall()
    } else {
      setShowGuide(true)
    }
  }

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
            {isInstalled
              ? 'ChurchTrakr is installed on this device'
              : 'Add to your home screen for faster access'}
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
          {!installPrompt && (
            <p className="text-xs text-mist text-center">
              Tap above for step-by-step installation guide
            </p>
          )}
        </>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)' }}
          onClick={() => setShowGuide(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl"
            style={{ maxHeight: '85dvh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-forest">Install ChurchTrakr</h3>
              <button
                onClick={() => setShowGuide(false)}
                className="w-8 h-8 rounded-full bg-ivory flex items-center justify-center text-mist"
              >
                <X size={15} />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-forest">On iPhone / iPad (Safari only):</p>
                {[
                  'Make sure you are using Safari — not Chrome or Firefox',
                  'Tap the Share button at the bottom of the screen (square with arrow pointing up)',
                  'Scroll down and tap "Add to Home Screen"',
                  'Tap "Add" in the top-right corner',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-forest text-ivory text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-forest">{step}</p>
                  </div>
                ))}
                <div className="bg-ivory rounded-xl p-3">
                  <p className="text-xs text-mist leading-relaxed">
                    If you dismissed the install prompt before, iOS hides it automatically.
                    Use the Share button method above — it always works.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm font-semibold text-forest">On Android (Chrome):</p>
                {[
                  'Tap the three-dot menu (⋮) in the top-right of Chrome',
                  'Tap "Add to Home Screen" or "Install App"',
                  'Tap "Install" to confirm',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-forest text-ivory text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-forest">{step}</p>
                  </div>
                ))}
                <div className="bg-ivory rounded-xl p-3">
                  <p className="text-xs text-mist leading-relaxed">
                    If you dismissed the install prompt before, Chrome may not show it again
                    automatically. Use the browser menu method above instead.
                  </p>
                </div>
              </div>
            )}

            <button onClick={() => setShowGuide(false)} className="btn btn-primary w-full mt-5">
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
