'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BackButton from '@/components/ui/BackButton'

const TABS = [
  { id: 'profile',    label: 'Profile',      icon: '👤' },
  { id: 'attendance', label: 'Attendance',   icon: '✅' },
  { id: 'sender',     label: 'Sender ID',    icon: '📱' },
  { id: 'account',    label: 'Account',      icon: '🔐' },
  { id: 'templates',  label: 'SMS Templates', icon: '💬' },
]

const BUILT_IN_TEMPLATES = [
  { id: 'missed',   label: 'We missed you',       body: "Hi {name}, we missed you at service this week. We hope you're well. 🙏" },
  { id: 'welcome',  label: 'First Timer Welcome',  body: 'Hi {name}, welcome to our church family! 🎉 So glad you joined us.' },
  { id: 'reminder', label: 'Service Reminder',     body: 'Hi {name}, service is this Sunday! We look forward to seeing you. 🙏' },
  { id: 'thanks',   label: 'Thanks for Attending', body: 'Hi {name}, thank you for joining us today! God bless you. 🙏' },
  { id: 'bday',     label: 'Birthday Greeting',    body: "Happy birthday {name}! 🎂 Wishing you God's blessings today. 🙏" },
]

export default function SettingsClient({ church: initialChurch, user }) {
  const router  = useRouter()
  const [tab, setTab] = useState('profile')

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>
      <BackButton href="/dashboard" />

      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
          Settings
        </h1>
        <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>Manage your account and preferences</p>
      </div>

      {/* Tab grid — 3 columns so it fits on mobile without scrolling */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: '1.5rem' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '0.6rem 0.5rem', borderRadius: 10,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: tab === t.id ? 'none' : '1px solid rgba(26,58,42,0.1)',
            background: tab === t.id ? '#1a3a2a' : '#fff',
            color: tab === t.id ? '#e8d5a0' : '#4a5568',
            boxShadow: tab === t.id ? '0 2px 8px rgba(26,58,42,0.2)' : '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.15s', minHeight: 42,
          }}>
            <span style={{ fontSize: 15 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'profile'    && <ProfileTab    church={initialChurch} router={router} />}
      {tab === 'attendance' && <AttendanceTab />}
      {tab === 'sender'     && <SenderTab     church={initialChurch} />}
      {tab === 'account'    && <AccountTab    church={initialChurch} user={user} />}
      {tab === 'templates'  && <TemplatesTab />}
    </div>
  )
}

// ── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ church, router }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({
    name:       church.name       ?? '',
    admin_name: church.admin_name ?? '',
    location:   church.location   ?? '',
    phone:      church.phone      ?? '',
  })
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function save() {
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed')
      setMsg('Saved ✓')
      setEditing(false)
      router.refresh()
    } catch { setMsg('Failed to save') }
    finally { setSaving(false); setTimeout(() => setMsg(''), 3000) }
  }

  function cancel() {
    setForm({
      name:       church.name       ?? '',
      admin_name: church.admin_name ?? '',
      location:   church.location   ?? '',
      phone:      church.phone      ?? '',
    })
    setEditing(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Display name — prominent, shown first */}
      <div style={{ background: '#fff', border: '1.5px solid rgba(201,168,76,0.3)', borderRadius: 16, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(201,168,76,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
            👋
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: '0 0 3px' }}>Your Display Name</p>
            <p style={{ fontSize: 12, color: '#8a9e90', margin: 0, lineHeight: 1.4 }}>
              Shows when you mark follow-ups. Stored on this device only — each team member sets their own.
            </p>
          </div>
        </div>
        <DisplayNameSetting />
      </div>

      {/* Church / Group Profile — read-only with edit toggle */}
      <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: 0, letterSpacing: '-0.02em' }}>
            Church / Group Profile
          </h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', height: 34, borderRadius: 9, border: '1px solid rgba(26,58,42,0.15)', background: '#fff', color: '#1a3a2a', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={cancel} style={{ padding: '0 12px', height: 34, borderRadius: 9, border: '1px solid rgba(26,58,42,0.15)', background: '#fff', color: '#8a9e90', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={save} disabled={saving} style={{ padding: '0 14px', height: 34, borderRadius: 9, border: 'none', background: '#1a3a2a', color: '#e8d5a0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'name',       label: 'Church / Group name', placeholder: 'Your group name' },
            { key: 'admin_name', label: 'Admin Name',          placeholder: 'Leader / admin name' },
            { key: 'phone',      label: 'Phone',               placeholder: '+234…', type: 'tel' },
            { key: 'location',   label: 'Location',            placeholder: 'City or address' },
          ].map(({ key, label, placeholder, type = 'text' }) => (
            <div key={key}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#8a9e90', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
              {editing ? (
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={placeholder}
                  style={{ width: '100%', border: '1px solid rgba(26,58,42,0.2)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: 15, color: '#1a2e22', outline: 'none', background: '#fff', boxSizing: 'border-box', minHeight: 44 }}
                />
              ) : (
                <p style={{ fontSize: 15, color: form[key] ? '#1a3a2a' : '#c0c8c3', margin: 0, fontWeight: form[key] ? 500 : 400 }}>
                  {form[key] || `Not set`}
                </p>
              )}
            </div>
          ))}
        </div>

        {msg && (
          <p style={{ fontSize: 14, fontWeight: 600, color: msg.includes('✓') ? '#16a34a' : '#dc2626', marginTop: 12 }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Attendance Tab ───────────────────────────────────────────────────────────

function AttendanceTab() {
  const [markMode, setMarkMode] = useState('present')

  useEffect(() => {
    const s = localStorage.getItem('ct_mark_mode')
    if (s === 'present' || s === 'absent') setMarkMode(s)
  }, [])

  function saveMode(m) {
    setMarkMode(m)
    localStorage.setItem('ct_mark_mode', m)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        Default Marking Mode
      </h2>
      <p style={{ fontSize: 14, color: '#8a9e90', marginBottom: '1.125rem', lineHeight: 1.5 }}>
        Choose what state members start in when you open the attendance sheet.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { val: 'present', label: 'Start as Present', desc: 'Everyone starts present — tap to mark absent. Best for large groups.' },
          { val: 'absent',  label: 'Start as Absent',  desc: 'Everyone starts absent — tap to mark present. Best for smaller groups.' },
        ].map(opt => (
          <button key={opt.val} onClick={() => saveMode(opt.val)} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '0.875rem', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            border: `2px solid ${markMode === opt.val ? '#1a3a2a' : 'rgba(26,58,42,0.1)'}`,
            background: markMode === opt.val ? 'rgba(26,58,42,0.04)' : '#fafaf9',
            transition: 'all 0.15s', width: '100%',
          }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: 1, border: `2px solid ${markMode === opt.val ? '#1a3a2a' : '#d1d5db'}`, background: markMode === opt.val ? '#1a3a2a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {markMode === opt.val && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: '0 0 3px', letterSpacing: '-0.01em' }}>{opt.label}</p>
              <p style={{ fontSize: 13, color: '#8a9e90', margin: 0, lineHeight: 1.4 }}>{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Sender ID Tab ────────────────────────────────────────────────────────────

function SenderTab({ church }) {
  const [senderId, setSenderId]     = useState(church.sms_sender_id ?? '')
  const [status, setStatus]         = useState(church.sms_sender_id_status)
  const [msg, setMsg]               = useState('')
  const [saving, setSaving]         = useState(false)

  async function apply() {
    if (!senderId.trim()) return
    setSaving(true); setMsg('')
    try {
      const res = await fetch('/api/settings/sender-id', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: senderId.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setStatus('pending')
      setMsg('Application submitted. Approval takes 1–3 business days.')
    } catch { setMsg('Submission failed') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
        Custom Sender ID
      </h2>
      <p style={{ fontSize: 14, color: '#8a9e90', marginBottom: '1.125rem', lineHeight: 1.5 }}>
        By default messages show <strong>ChurchTrakr</strong> as sender. Apply for a custom name like your church name.
      </p>

      {status === 'approved' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem', background: 'rgba(22,163,74,0.07)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 11, marginBottom: 12 }}>
          <span>✅</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#15803d', margin: 0 }}>Approved: <strong>{church.sms_sender_id}</strong></p>
        </div>
      )}
      {status === 'pending' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem', background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 11, marginBottom: 12 }}>
          <span>⏳</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#d97706', margin: 0 }}>Pending: <strong>{church.sms_sender_id}</strong></p>
        </div>
      )}

      {status !== 'approved' && (
        <>
          <div style={{ marginBottom: '0.875rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#2d4a36', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Desired Sender ID (max 11 chars)</p>
            <input
              value={senderId} onChange={e => setSenderId(e.target.value.slice(0, 11))}
              placeholder="e.g. MyChurch"
              style={{ width: '100%', border: '1px solid rgba(26,58,42,0.2)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: 15, color: '#1a2e22', outline: 'none', boxSizing: 'border-box', minHeight: 44 }}
            />
            <p style={{ fontSize: 12, color: '#8a9e90', marginTop: 4 }}>{senderId.length}/11 characters</p>
          </div>
          {msg && <p style={{ fontSize: 14, color: msg.includes('submitted') ? '#16a34a' : '#dc2626', marginBottom: 10 }}>{msg}</p>}
          <button onClick={apply} disabled={saving || !senderId.trim()} style={{ width: '100%', height: 48, borderRadius: 12, border: 'none', background: senderId.trim() ? '#1a3a2a' : '#e0dbd0', color: senderId.trim() ? '#e8d5a0' : '#8a9e90', fontSize: 15, fontWeight: 700, cursor: senderId.trim() ? 'pointer' : 'not-allowed' }}>
            {saving ? 'Submitting…' : 'Apply for Sender ID'}
          </button>
        </>
      )}
    </div>
  )
}

// ── Account Tab ──────────────────────────────────────────────────────────────

function AccountTab({ church, user }) {
  const [delConfirm, setDelConfirm] = useState('')
  const [deleting, setDeleting]     = useState(false)

  async function signOut() {
    await createClient().auth.signOut()
    window.location.replace('/login')
  }

  async function deleteAccount() {
    if (delConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      await fetch('/api/settings/delete-account', { method: 'DELETE' })
      await createClient().auth.signOut()
      window.location.replace('/login')
    } catch { setDeleting(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
          Account Info
        </h2>
        {[
          { label: 'Email',   value: user.email },
          { label: 'Plan',    value: 'Free' },
          { label: 'Credits', value: `${church.sms_credits ?? 0} SMS credits` },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid rgba(26,58,42,0.06)' }}>
            <span style={{ fontSize: 14, color: '#8a9e90', fontWeight: 500 }}>{row.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a' }}>{row.value}</span>
          </div>
        ))}
        <button onClick={signOut} style={{ marginTop: '1rem', width: '100%', height: 44, borderRadius: 11, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.04)', color: '#dc2626', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(220,38,38,0.18)', borderRadius: 16, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', margin: '0 0 6px' }}>⚠️ Danger Zone</h3>
        <p style={{ fontSize: 13, color: '#8a9e90', marginBottom: '0.875rem', lineHeight: 1.4 }}>
          Permanently deletes your account and all data. Cannot be undone.
        </p>
        <div style={{ marginBottom: '0.875rem' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', margin: '0 0 5px' }}>Type DELETE to confirm</p>
          <input
            value={delConfirm} onChange={e => setDelConfirm(e.target.value)}
            placeholder="DELETE"
            style={{ width: '100%', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: 15, color: '#1a2e22', outline: 'none', boxSizing: 'border-box', minHeight: 44 }}
          />
        </div>
        <button onClick={deleteAccount} disabled={delConfirm !== 'DELETE' || deleting}
          style={{ width: '100%', height: 44, borderRadius: 11, border: 'none', background: delConfirm === 'DELETE' ? 'rgba(220,38,38,0.1)' : '#f5f5f5', color: delConfirm === 'DELETE' ? '#dc2626' : '#c0c0c0', fontSize: 14, fontWeight: 700, cursor: delConfirm === 'DELETE' ? 'pointer' : 'not-allowed' }}>
          {deleting ? 'Deleting…' : 'Delete account permanently'}
        </button>
      </div>
    </div>
  )
}

// ── Templates Tab ────────────────────────────────────────────────────────────

function TemplatesTab() {
  const [customTpls, setCustomTpls]   = useState([])
  const [showNew, setShowNew]         = useState(false)
  const [newName, setNewName]         = useState('')
  const [newBody, setNewBody]         = useState('')

  useEffect(() => {
    try { setCustomTpls(JSON.parse(localStorage.getItem('ct_sms_templates') ?? '[]')) } catch {}
  }, [])

  function addTemplate() {
    if (!newName.trim() || !newBody.trim()) return
    const t = { id: `c_${Date.now()}`, label: newName.trim(), body: newBody.trim() }
    const updated = [...customTpls, t]
    setCustomTpls(updated)
    localStorage.setItem('ct_sms_templates', JSON.stringify(updated))
    setNewName(''); setNewBody(''); setShowNew(false)
  }

  function deleteTemplate(id) {
    const updated = customTpls.filter(t => t.id !== id)
    setCustomTpls(updated)
    localStorage.setItem('ct_sms_templates', JSON.stringify(updated))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: '0 0 1rem', letterSpacing: '-0.02em' }}>
          Built-in Templates
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BUILT_IN_TEMPLATES.map(t => (
            <div key={t.id} style={{ paddingBottom: 10, borderBottom: '1px solid rgba(26,58,42,0.06)' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: '0 0 3px' }}>{t.label}</p>
              <p style={{ fontSize: 13, color: '#8a9e90', margin: 0, lineHeight: 1.4 }}>{t.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.125rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', margin: 0, letterSpacing: '-0.02em' }}>
            My Templates
          </h2>
          <button onClick={() => setShowNew(p => !p)} style={{ padding: '0 12px', height: 34, borderRadius: 9, border: 'none', background: '#1a3a2a', color: '#e8d5a0', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            + New
          </button>
        </div>

        {showNew && (
          <div style={{ background: 'rgba(26,58,42,0.03)', borderRadius: 12, padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(26,58,42,0.08)' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#2d4a36', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Template name</p>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Birthday greeting"
                style={{ width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: 14, color: '#1a2e22', outline: 'none', boxSizing: 'border-box', minHeight: 44 }} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#2d4a36', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message body</p>
              <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Use {name} for personalisation" rows={3}
                style={{ width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 10, padding: '0.625rem 0.875rem', fontSize: 14, color: '#1a2e22', outline: 'none', resize: 'vertical', background: '#fff', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, height: 40, borderRadius: 10, border: '1px solid rgba(26,58,42,0.15)', background: '#fff', color: '#8a9e90', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addTemplate} disabled={!newName.trim() || !newBody.trim()} style={{ flex: 1, height: 40, borderRadius: 10, border: 'none', background: newName.trim() && newBody.trim() ? '#1a3a2a' : '#e0dbd0', color: newName.trim() && newBody.trim() ? '#e8d5a0' : '#8a9e90', fontSize: 13, fontWeight: 700, cursor: newName.trim() && newBody.trim() ? 'pointer' : 'not-allowed' }}>Save template</button>
            </div>
          </div>
        )}

        {customTpls.length === 0 ? (
          <p style={{ fontSize: 14, color: '#8a9e90' }}>No custom templates yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {customTpls.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 10, borderBottom: '1px solid rgba(26,58,42,0.06)' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: '0 0 3px' }}>{t.label}</p>
                  <p style={{ fontSize: 13, color: '#8a9e90', margin: 0 }}>{t.body}</p>
                </div>
                <button onClick={() => deleteTemplate(t.id)} style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.05)', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shared: Display Name Setting ─────────────────────────────────────────────

function DisplayNameSetting() {
  const [stored, setStored]   = useState('')
  const [editing, setEditing] = useState(false)
  const [value, setValue]     = useState('')

  useEffect(() => {
    const n = localStorage.getItem('ct_display_name') || ''
    setStored(n); setValue(n)
  }, [])

  function save() {
    if (!value.trim()) return
    localStorage.setItem('ct_display_name', value.trim())
    localStorage.setItem('ct_display_name_prompted', 'true')
    setStored(value.trim()); setEditing(false)
  }

  if (!editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: 1, fontSize: 15, fontWeight: stored ? 700 : 400, color: stored ? '#1a3a2a' : '#b0bec0' }}>
          {stored || 'Not set — tap to set your name'}
        </span>
        <button onClick={() => { setEditing(true); setValue(stored) }}
          style={{ padding: '0 14px', height: 36, borderRadius: 9, border: '1px solid rgba(26,58,42,0.18)', background: '#fff', color: '#1a3a2a', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
          {stored ? 'Change' : 'Set name'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <input autoFocus value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()}
        placeholder="e.g. Pastor Tunde, Sister Grace"
        style={{ flex: 1, border: '1px solid rgba(26,58,42,0.22)', borderRadius: 10, padding: '0.55rem 0.875rem', fontSize: 15, color: '#1a2e22', outline: 'none', minHeight: 42 }}
      />
      <button onClick={save} disabled={!value.trim()}
        style={{ padding: '0 16px', height: 42, borderRadius: 10, border: 'none', background: value.trim() ? '#1a3a2a' : '#e0dbd0', color: value.trim() ? '#e8d5a0' : '#8a9e90', fontSize: 14, fontWeight: 700, cursor: value.trim() ? 'pointer' : 'not-allowed', flexShrink: 0 }}>
        Save
      </button>
      <button onClick={() => setEditing(false)}
        style={{ padding: '0 12px', height: 42, borderRadius: 10, border: '1px solid rgba(26,58,42,0.14)', background: '#fff', color: '#8a9e90', fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>
        ✕
      </button>
    </div>
  )
}