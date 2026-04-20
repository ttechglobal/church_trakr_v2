'use client'

import BackButton from '@/components/ui/BackButton'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePWA } from '@/hooks/usePWA'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import {
  User, CalendarCheck, Bell, MessageSquare, Radio, ShieldAlert, ChevronRight, Smartphone, Link2
} from 'lucide-react'

const NotificationSettings = dynamic(() => import('./NotificationSettings'), { ssr: false })

const TABS = [
  { id: 'profile',       label: 'Profile',        Icon: User },
  { id: 'attendance',    label: 'Attendance',     Icon: CalendarCheck },
  { id: 'notifications', label: 'Notifications',  Icon: Bell },
  { id: 'templates',     label: 'SMS Templates',  Icon: MessageSquare },
  { id: 'sender',        label: 'Sender ID',      Icon: Radio },
  { id: 'church',        label: 'Church Link',    Icon: Link2 },
  { id: 'account',       label: 'Account',        Icon: ShieldAlert },
]

const BUILT_IN_TEMPLATES = [
  { id: 'missed',     label: 'We missed you',       body: "Hi {name}, we missed you at service this week. We hope you're well. 🙏" },
  { id: 'welcome_ft', label: 'First Timer Welcome',  body: 'Hi {name}, welcome to our church family! 🎉 God bless you!' },
  { id: 'reminder',   label: 'Service Reminder',     body: 'Hi {name}, service is this Sunday! We look forward to seeing you. 🙏' },
  { id: 'thanks',     label: 'Thanks for Attending', body: 'Hi {name}, thank you for joining us today! God bless you abundantly. 🙏' },
  { id: 'attendee_fu',label: 'Attendee Follow-up',   body: 'Hi {name}, great seeing you at service! How are you? 🙏' },
  { id: 'sunday',     label: 'Sunday Reminder',      body: "Hi {name}, service is tomorrow! Come and be blessed. 🙏" },
  { id: 'event',      label: 'Upcoming Event',       body: "Hi {name}, we have an exciting event coming up! Stay tuned. 🙏" },
]

export default function SettingsClient({ church: initialChurch, user }) {
  const router = useRouter()
  const [tab, setTab] = useState('profile')
  const [church, setChurch] = useState(initialChurch)

  // Profile form
  const [profile, setProfile] = useState({
    name: initialChurch.name ?? '',
    admin_name: initialChurch.admin_name ?? '',
    phone: initialChurch.phone ?? '',
    location: initialChurch.location ?? '',
  })
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Attendance mode
  const [markMode, setMarkMode] = useState('present')
  useEffect(() => {
    const saved = localStorage.getItem('ct_mark_mode')
    if (saved === 'present' || saved === 'absent') setMarkMode(saved)
  }, [])
  function saveMarkMode(mode) {
    setMarkMode(mode)
    localStorage.setItem('ct_mark_mode', mode)
  }

  // Custom templates
  const [customTemplates, setCustomTemplates] = useState([])
  const [newTplName, setNewTplName] = useState('')
  const [newTplBody, setNewTplBody] = useState('')
  const [showNewTpl, setShowNewTpl] = useState(false)
  useEffect(() => {
    try {
      setCustomTemplates(JSON.parse(localStorage.getItem('ct_sms_templates') ?? '[]'))
    } catch {}
  }, [])
  function saveCustomTemplate() {
    if (!newTplName.trim() || !newTplBody.trim()) return
    const tpl = { id: `custom_${Date.now()}`, label: newTplName.trim(), body: newTplBody.trim() }
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

  // Sender ID
  const [senderId, setSenderId] = useState(initialChurch.sms_sender_id ?? '')
  const [senderIdStatus, setSenderIdStatus] = useState(initialChurch.sms_sender_id_status)
  const [submittingSenderId, setSubmittingSenderId] = useState(false)
  const [senderMsg, setSenderMsg] = useState('')

  // Sign out / delete
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  async function handleSaveProfile() {
    setSavingProfile(true); setProfileMsg('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error('Failed')
      setChurch(prev => ({ ...prev, ...profile }))
      setProfileMsg('Saved ✓')
      router.refresh()
    } catch { setProfileMsg('Failed to save') }
    finally { setSavingProfile(false); setTimeout(() => setProfileMsg(''), 3000) }
  }

  async function handleApplySenderId() {
    if (!senderId.trim() || senderId.length > 11) {
      setSenderMsg('Sender ID must be 1–11 characters'); return
    }
    setSubmittingSenderId(true); setSenderMsg('')
    try {
      const res = await fetch('/api/settings/sender-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: senderId.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setSenderIdStatus('pending')
      setSenderMsg('Application submitted! Approval takes 1–3 business days.')
    } catch { setSenderMsg('Submission failed') }
    finally { setSubmittingSenderId(false) }
  }

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

  return (
    <div className="page-content">
      <BackButton />
        <h1 className="font-display text-2xl font-semibold text-forest mb-4">Settings</h1>

      {/* Tab bar — wraps to two rows on mobile */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5
              ${tab === t.id ? 'bg-forest text-ivory' : 'bg-ivory text-forest-muted hover:bg-ivory-dark hover:text-forest'}`}>
            {t.Icon && <t.Icon size={13} strokeWidth={tab === t.id ? 2.5 : 1.75} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === 'profile' && (
        <ProfileTab
          profile={profile}
          setProfile={setProfile}
          profileMsg={profileMsg}
          savingProfile={savingProfile}
          onSave={handleSaveProfile}
        />
      )}

      {/* ── Attendance tab ── */}
      {tab === 'attendance' && (
        <div className="card animate-fade-in space-y-4">
          <h2 className="font-display text-lg font-semibold text-forest">Attendance mode</h2>
          <p className="text-sm text-mist">Choose how members start when you open the attendance sheet.</p>
          <div className="space-y-3">
            {[
              { val: 'present', label: 'Mark Present mode', desc: 'Everyone starts absent — tap to mark present. Best for smaller groups.' },
              { val: 'absent', label: 'Mark Absent mode', desc: 'Everyone starts present — tap to mark absent. Best for large groups where most will attend.' },
            ].map(({ val, label, desc }) => (
              <button key={val} onClick={() => saveMarkMode(val)}
                className={`w-full text-left p-4 rounded-2xl border transition-all
                  ${markMode === val ? 'bg-forest/8 border-forest/40' : 'border-forest/15 hover:border-forest/30'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                    ${markMode === val ? 'border-forest bg-forest' : 'border-forest/30'}`}>
                    {markMode === val && <div className="w-2 h-2 rounded-full bg-ivory" />}
                  </div>
                  <div>
                    <p className="font-semibold text-forest text-[14px]">{label}</p>
                    <p className="text-xs text-mist mt-0.5">{desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── SMS Templates tab ── */}
      {tab === 'templates' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <h2 className="font-display text-lg font-semibold text-forest mb-3">Built-in templates</h2>
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
              <button onClick={() => setShowNewTpl(p => !p)} className="btn btn-primary btn-sm gap-1.5">
                <PlusIcon /> New
              </button>
            </div>

            {showNewTpl && (
              <div className="space-y-3 mb-4 p-4 bg-ivory-dark rounded-2xl">
                <div>
                  <label className="input-label">Template name</label>
                  <input className="input text-sm" placeholder="e.g. Birthday greeting"
                    value={newTplName} onChange={e => setNewTplName(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Message</label>
                  <textarea className="input text-sm resize-none" style={{ minHeight: 80 }}
                    placeholder="Use {name} for personalisation"
                    value={newTplBody} onChange={e => setNewTplBody(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowNewTpl(false)} className="btn btn-outline flex-1 btn-sm">Cancel</button>
                  <button onClick={saveCustomTemplate} className="btn btn-primary flex-1 btn-sm">Save template</button>
                </div>
              </div>
            )}

            {customTemplates.length === 0 && !showNewTpl ? (
              <p className="text-sm text-mist">No custom templates yet.</p>
            ) : (
              <div className="space-y-3">
                {customTemplates.map(t => (
                  <div key={t.id} className="flex items-start gap-3 border-b border-forest/8 pb-3 last:border-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-forest">{t.label}</p>
                      <p className="text-xs text-mist mt-1 line-clamp-2">{t.body}</p>
                    </div>
                    <button onClick={() => deleteCustomTemplate(t.id)}
                      className="p-1.5 rounded-lg text-mist hover:text-error hover:bg-error/8 shrink-0">
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sender ID tab ── */}
      {tab === 'sender' && (
        <div className="card space-y-4 animate-fade-in">
          <h2 className="font-display text-lg font-semibold text-forest">Custom Sender ID</h2>
          <p className="text-sm text-mist">
            By default, SMS messages are sent from <strong>ChurchTrakr</strong>. Apply for a custom sender ID (e.g. your church name).
          </p>

          {senderIdStatus === 'approved' && (
            <div className="flex items-center gap-2 p-3 bg-success/10 rounded-xl">
              <span className="text-success">✓</span>
              <p className="text-sm font-medium text-success">Approved: <strong>{church.sms_sender_id}</strong></p>
            </div>
          )}
          {senderIdStatus === 'pending' && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-xl">
              <span className="text-warning">⏳</span>
              <p className="text-sm font-medium text-warning">Application pending for <strong>{church.sms_sender_id}</strong></p>
            </div>
          )}

          {senderIdStatus !== 'approved' && (
            <>
              <div>
                <label className="input-label">Desired Sender ID (max 11 characters)</label>
                <input className="input" maxLength={11} placeholder="e.g. YouthFellowship"
                  value={senderId} onChange={e => setSenderId(e.target.value)} />
                <p className="text-xs text-mist mt-1">{senderId.length}/11 characters · Letters and numbers only</p>
              </div>
              {senderMsg && (
                <p className={`text-sm ${senderMsg.includes('submitted') ? 'text-success' : 'text-error'}`}>
                  {senderMsg}
                </p>
              )}
              <button onClick={handleApplySenderId} disabled={submittingSenderId || !senderId.trim()}
                className="btn btn-primary w-full">
                {submittingSenderId ? 'Submitting…' : 'Apply for Sender ID'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Notifications tab ── */}
      {tab === 'notifications' && (
        <div style={{ animation: 'var(--animate-fade-in)' }}>
          <NotificationSettings />
        </div>
      )}

      {/* ── Account tab ── */}
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
            <div className="divider" />
            <button onClick={handleSignOut} className="btn btn-outline w-full text-error border-error/30 hover:bg-error/8">
              Sign out
            </button>
          </div>

          <div className="card border-error/20 space-y-3">
            <h3 className="font-semibold text-error">Danger zone</h3>
            <p className="text-sm text-mist">Permanently delete your account and all data. This cannot be undone.</p>
            <input className="input text-sm border-error/30" placeholder='Type "DELETE" to confirm'
              value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
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

      <div className="h-6" />
    </div>
  )
}

// ── Profile tab component ─────────────────────────────────────────────────────
function ProfileTab({ profile, setProfile, profileMsg, savingProfile, onSave }) {
  const [editing,     setEditing]     = useState(false)
  const [displayName, setDisplayName] = useState('')

  // Read device display name from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('ct_display_name')
    if (stored) setDisplayName(stored)
  }, [])

  function saveDisplayName(val) {
    setDisplayName(val)
    localStorage.setItem('ct_display_name', val)
  }

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Display Name (device-only) ── */}
      <div className="card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-forest">Your Display Name</h2>
            <p className="text-xs text-mist mt-1">
              This device only — used when logging follow-ups and attendance.
            </p>
          </div>
        </div>
        {displayName.trim() ? (
          <div className="flex items-center justify-between gap-3 py-2 px-3 bg-ivory rounded-xl">
            <div>
              <p className="text-xs text-mist">Saved name</p>
              <p className="font-semibold text-forest">{displayName}</p>
            </div>
            <button onClick={() => saveDisplayName('')} className="btn btn-ghost btn-sm text-xs text-mist px-2">
              Clear
            </button>
          </div>
        ) : (
          <p className="text-sm text-mist italic">No display name set — tap below to add one.</p>
        )}
        <div>
          <label className="input-label">Your Display Name (this device only)</label>
          <input
            className="input"
            placeholder="e.g. Pastor Tunde, Sister Ada…"
            value={displayName}
            onChange={e => saveDisplayName(e.target.value)}
          />
        </div>
        {displayName.trim() && (
          <p className="text-xs text-success font-medium">✓ Saved to this device</p>
        )}
      </div>

      {/* ── Church Profile ── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-forest">Church Profile</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn btn-outline btn-sm gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <>
            {[
              { key: 'name',       label: 'Church / Group name', placeholder: 'Your group name' },
              { key: 'admin_name', label: 'Admin Name',          placeholder: 'Leader / admin name' },
              { key: 'phone',      label: 'Phone',               placeholder: '+234…', type: 'tel' },
              { key: 'location',   label: 'Location',            placeholder: 'City or address' },
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
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn btn-outline flex-1">Cancel</button>
              <button onClick={() => { onSave(); setEditing(false) }} disabled={savingProfile} className="btn btn-primary flex-1">
                {savingProfile ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'Church / Group name', value: profile.name },
              { label: 'Admin Name',          value: profile.admin_name },
              { label: 'Phone',               value: profile.phone },
              { label: 'Location',            value: profile.location },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-start gap-4 py-1 border-b border-forest/6 last:border-0">
                <span className="text-sm text-mist shrink-0">{label}</span>
                <span className="text-sm font-medium text-forest text-right">
                  {value || <span className="text-mist italic">Not set</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Install App ── */}
      <InstallCard />

    </div>
  )
}

// ── Install Card (inside Profile tab) ─────────────────────────────────────────
function InstallCard() {
  const { installPrompt, promptInstall, isInstalled } = usePWA()
  const [showGuide, setShowGuide] = useState(false)
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent)

  // The button is ALWAYS shown — never hidden, never disabled.
  // If the native prompt is available: trigger it.
  // If suppressed/dismissed: show the manual guide sheet.
  // If already installed: still show but with "installed" state.
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
          <p className="text-sm text-success font-medium">Installed on this device</p>
        </div>
      ) : (
        <button onClick={handleInstallClick} className="btn btn-primary w-full gap-2">
          <Smartphone size={15} />
          Install ChurchTrakr
        </button>
      )}

      {/* Manual installation guide sheet */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm p-4"
          onClick={() => setShowGuide(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-modal animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-semibold text-forest">Install ChurchTrakr</h3>
              <button onClick={() => setShowGuide(false)} className="btn btn-ghost btn-sm p-1.5">
                <X size={16} />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3">
                <p className="text-sm text-mist font-medium mb-3">On iPhone / iPad (Safari):</p>
                {[
                  { step: '1', text: 'Tap the Share button at the bottom of Safari (the box with an arrow)' },
                  { step: '2', text: 'Scroll down and tap "Add to Home Screen"' },
                  { step: '3', text: 'Tap "Add" in the top right corner' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-forest text-ivory text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step}
                    </span>
                    <p className="text-sm text-forest">{text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-mist font-medium mb-3">On Android (Chrome):</p>
                {[
                  { step: '1', text: 'Tap the three-dot menu (⋮) in the top-right of Chrome' },
                  { step: '2', text: 'Tap "Add to Home Screen" or "Install App"' },
                  { step: '3', text: 'Tap "Install" to confirm' },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-forest text-ivory text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {step}
                    </span>
                    <p className="text-sm text-forest">{text}</p>
                  </div>
                ))}
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

// ── Church Link Tab ──────────────────────────────────────────────────────────
function ChurchLinkTab() {
  const [code, setCode]       = useState('')
  const [status, setStatus]   = useState(null)  // null | { loading } | { connection } | { error }
  const [preview, setPreview] = useState(null)   // { churchName }
  const [loading, setLoading] = useState(true)
  const [submitting, setSub]  = useState(false)
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    // Load current connection status
    fetch('/api/church/connect')
      .then(r => r.json())
      .then(d => setStatus(d.connection ?? null))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  async function lookupCode() {
    if (!code.trim()) return
    setSub(true); setMsg(''); setPreview(null)
    const res = await fetch(`/api/church/lookup?code=${encodeURIComponent(code.trim().toUpperCase())}`)
    const d = await res.json()
    setSub(false)
    if (d.churchName) setPreview(d)
    else setMsg(d.error ?? 'No church found with that code')
  }

  async function sendRequest() {
    if (!preview) return
    setSub(true); setMsg('')
    const res = await fetch('/api/church/connect', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
    })
    const d = await res.json()
    setSub(false)
    if (d.success) {
      setStatus({ status:'pending', churchName: preview.churchName })
      setPreview(null); setCode('')
    } else {
      setMsg(d.error ?? 'Request failed')
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect from this church dashboard? Your own data is unaffected.')) return
    setSub(true)
    await fetch('/api/church/connect', { method:'DELETE' })
    setStatus(null)
    setSub(false)
  }

  if (loading) {
    return <div className="card" style={{ height:100, background:'rgba(26,58,42,0.04)', borderRadius:14 }} />
  }

  const C = { forest:'#1a3a2a', muted:'#8a9e90', success:'#16a34a', warning:'#d97706', error:'#dc2626', gold:'#c9a84c' }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-forest/8 flex items-center justify-center shrink-0">
            <Link2 size={16} strokeWidth={1.75} className="text-forest" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-forest">Church Dashboard</h2>
            <p className="text-xs text-mist mt-0.5">Link this group to a church-level dashboard</p>
          </div>
        </div>

        {/* Already connected / pending */}
        {status ? (
          <div>
            {status.status === 'approved' && (
              <div style={{ background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:12, padding:'0.875rem 1rem', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:C.success, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:'0 0 2px' }}>Connected to {status.churchName}</p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>Your attendance data is visible to the church admin.</p>
                </div>
              </div>
            )}
            {status.status === 'pending' && (
              <div style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.25)', borderRadius:12, padding:'0.875rem 1rem', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:C.gold, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:'0 0 2px' }}>Request pending — {status.churchName}</p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>Waiting for the church admin to approve your request.</p>
                </div>
              </div>
            )}
            <button onClick={disconnect} disabled={submitting} className="btn btn-outline btn-sm w-full mt-3"
              style={{ color:C.error, borderColor:'rgba(220,38,38,0.3)' }}>
              Disconnect
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-mist">Not linked to any church dashboard. Enter the connection code shared by your church admin.</p>

            {/* Code input */}
            <div>
              <label className="input-label">Connection Code</label>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="e.g. ABCD-1234"
                  value={code}
                  onChange={e => { setCode(e.target.value.toUpperCase()); setPreview(null); setMsg('') }}
                  onKeyDown={e => e.key === 'Enter' && lookupCode()}
                  style={{ textTransform:'uppercase', letterSpacing:'0.08em', fontFamily:'monospace', fontWeight:700 }}
                />
                <button onClick={lookupCode} disabled={submitting || !code.trim()} className="btn btn-outline">
                  {submitting && !preview ? 'Looking up…' : 'Look Up'}
                </button>
              </div>
            </div>

            {msg && <p style={{ fontSize:12, color:C.error, margin:0 }}>{msg}</p>}

            {/* Confirmation */}
            {preview && (
              <div style={{ background:'rgba(26,58,42,0.04)', border:'1px solid rgba(26,58,42,0.12)', borderRadius:12, padding:'0.875rem 1rem' }}>
                <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:'0 0 6px' }}>Connect to: {preview.churchName}</p>
                <p style={{ fontSize:12, color:C.muted, margin:'0 0 12px', lineHeight:1.5 }}>
                  The church admin will need to approve your request. Your data will be read-only on their dashboard.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => { setPreview(null); setMsg('') }} className="btn btn-outline flex-1">Cancel</button>
                  <button onClick={sendRequest} disabled={submitting} className="btn btn-primary flex-1">
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

function PlusIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> }
function TrashIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg> }
