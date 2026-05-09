'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { smsCount } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────
const CREDITS_PER_PAGE = 5
const PAGE_SIZE        = 157   // single-page limit
const MAX_CHARS        = 314   // hard limit: 2 pages
const WARN_CHARS       = 140   // amber warning threshold

const BUILT_IN_TEMPLATES = [
  { id: 'missed',      label: 'We missed you',        body: "Hi {name}, we missed you at service this week. We hope you're well and look forward to seeing you soon. 🙏" },
  { id: 'welcome_ft',  label: 'First Timer Welcome',  body: "Hi {name}, welcome to our church family! 🎉 We're so glad you joined us. We hope to see you again soon. God bless you!" },
  { id: 'reminder',    label: 'Service Reminder',     body: "Hi {name}, just a reminder that service is tomorrow! We look forward to seeing you. God bless 🙏" },
  { id: 'thanks',      label: 'Thanks for Attending', body: "Hi {name}, thank you for joining us at service today! It was great having you. God bless you abundantly. 🙏" },
  { id: 'attendee_fu', label: 'Attendee Follow-up',   body: "Hi {name}, thank you for being at service! How are you doing? We always appreciate your presence. 🙏" },
  { id: 'sunday',      label: 'Sunday Reminder',      body: "Hi {name}, service is this Sunday! Come and be blessed. We'd love to see you there. 🙏" },
  { id: 'event',       label: 'Upcoming Event',        body: "Hi {name}, we have an exciting event coming up at church! Stay tuned for details. God bless 🙏" },
]

export default function MessagingHome({ church, groups, members, latestByGroup, phoneMap }) {
  const [recipientType,    setRecipientType]    = useState('')
  const [selectedGroupId,  setSelectedGroupId]  = useState('')
  const [customPhone,      setCustomPhone]       = useState('')
  const [customName,       setCustomName]        = useState('')
  const [message,          setMessage]           = useState('')
  const [templateId,       setTemplateId]        = useState('')
  const [customTemplates,  setCustomTemplates]   = useState([])
  const [newTemplateName,  setNewTemplateName]   = useState('')
  const [showSaveTemplate, setShowSaveTemplate]  = useState(false)
  const [sending,          setSending]           = useState(false)
  const [sendResult,       setSendResult]        = useState(null)
  const [credits,          setCredits]           = useState(church.sms_credits)

  useEffect(() => {
    try { setCustomTemplates(JSON.parse(localStorage.getItem('ct_sms_templates') ?? '[]')) } catch {}
  }, [])

  const allTemplates = [...BUILT_IN_TEMPLATES, ...customTemplates]

  // ── Recipients ──────────────────────────────────────────────────────────────
  const recipients = useMemo(() => {
    if (recipientType === 'custom') {
      if (!customPhone.trim()) return []
      return [{ name: customName.trim() || 'Friend', phone: customPhone.trim() }]
    }
    if (recipientType === 'all') {
      return members.filter(m => m.phone).map(m => ({ name: m.name, phone: m.phone }))
    }
    if (recipientType === 'group' && selectedGroupId) {
      return members
        .filter(m => m.phone && (m.groupIds ?? []).includes(selectedGroupId))
        .map(m => ({ name: m.name, phone: m.phone }))
    }
    if (recipientType === 'absentees' || recipientType === 'attendees') {
      const result = []
      for (const session of Object.values(latestByGroup)) {
        for (const r of (session.attendance_records ?? [])) {
          const isMatch = recipientType === 'absentees' ? !r.present : r.present
          if (!isMatch) continue
          const memberInfo = phoneMap[r.member_id]
          if (memberInfo?.phone) result.push({ name: r.name || memberInfo.name, phone: memberInfo.phone })
        }
      }
      return result
    }
    return []
  }, [recipientType, selectedGroupId, customPhone, customName, members, latestByGroup, phoneMap])

  // ── Credit calculation ──────────────────────────────────────────────────────
  const msgLength      = message.length
  const pages          = msgLength <= PAGE_SIZE ? 1 : Math.min(2, Math.ceil(msgLength / 153))
  const creditsPerSms  = pages * CREDITS_PER_PAGE
  const creditsNeeded  = recipients.length * creditsPerSms
  const hasEnoughCredits = credits >= creditsNeeded
  const overLimit      = msgLength > MAX_CHARS

  // ── Character counter colour ─────────────────────────────────────────────────
  const charCountColor = overLimit
    ? '#dc2626'              // red — over limit
    : msgLength > PAGE_SIZE
    ? '#d97706'              // amber — page 2
    : msgLength >= WARN_CHARS
    ? '#d97706'              // amber — approaching limit
    : '#16a34a'              // green — good

  const charCountLabel = overLimit
    ? `${msgLength} / ${MAX_CHARS} — over limit`
    : pages === 2
    ? `${msgLength} / ${MAX_CHARS} chars — 2 pages`
    : `${msgLength} / ${PAGE_SIZE} chars — 1 page`

  const costLabel = pages === 2
    ? `${creditsPerSms} credits per person (2 pages × 5)`
    : `${creditsPerSms} credits per person`

  // ── Sender ID ───────────────────────────────────────────────────────────────
  const senderId = church.sms_sender_id_status === 'approved' && church.sms_sender_id
    ? church.sms_sender_id
    : 'ChurchTrakr'

  function applyTemplate(id) {
    const tpl = allTemplates.find(t => t.id === id)
    if (tpl) { setMessage(tpl.body); setTemplateId(id) }
  }

  function saveCustomTemplate() {
    if (!newTemplateName.trim() || !message.trim()) return
    const tpl     = { id: `custom_${Date.now()}`, label: newTemplateName.trim(), body: message }
    const updated = [...customTemplates, tpl]
    setCustomTemplates(updated)
    localStorage.setItem('ct_sms_templates', JSON.stringify(updated))
    setShowSaveTemplate(false)
    setNewTemplateName('')
  }

  function deleteCustomTemplate(id) {
    const updated = customTemplates.filter(t => t.id !== id)
    setCustomTemplates(updated)
    localStorage.setItem('ct_sms_templates', JSON.stringify(updated))
  }

  async function handleSend() {
    if (!recipients.length || !message.trim() || !hasEnoughCredits || overLimit || sending) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/sms/send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, message, type: recipientType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      setCredits(data.new_balance ?? credits)
      setSendResult({ success: true, ...data })
    } catch (err) {
      setSendResult({ error: err.message })
    } finally {
      setSending(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="page-content pb-10">
      <BackButton />
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold text-forest">Send Message</h1>
        <p className="text-sm text-mist mt-0.5">
          Balance: <strong className="text-forest">{credits} credits</strong>
          <span className="mx-1.5 text-mist/40">·</span>
          <Link href="/messaging/credits" className="text-mid font-semibold text-xs">Top up →</Link>
        </p>
      </div>

      {/* Recipient type */}
      <div className="card space-y-3">
        <p className="text-sm font-semibold text-forest">Who are you messaging?</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'all',       label: '📋 All members'   },
            { id: 'absentees', label: '👋 Absentees'      },
            { id: 'attendees', label: '✅ Attendees'       },
            { id: 'group',     label: '👥 A specific group' },
            { id: 'custom',    label: '📱 One person'      },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setRecipientType(id)}
              className={`text-sm font-medium py-2.5 px-3 rounded-xl border transition-all text-left
                ${recipientType === id
                  ? 'bg-forest text-ivory border-forest'
                  : 'bg-white border-forest/15 text-forest hover:border-forest/40'
                }`}>
              {label}
            </button>
          ))}
        </div>

        {recipientType === 'group' && (
          <select className="input text-sm" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
            <option value="">— Select group —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}

        {recipientType === 'custom' && (
          <div className="space-y-2">
            <input className="input text-sm" placeholder="Phone number (e.g. 08012345678)"
              value={customPhone} onChange={e => setCustomPhone(e.target.value)} />
            <input className="input text-sm" placeholder="Name (optional)"
              value={customName} onChange={e => setCustomName(e.target.value)} />
          </div>
        )}

        {recipientType && recipientType !== 'custom' && (
          <p className="text-sm text-forest">
            <strong>{recipients.length}</strong> recipient{recipients.length !== 1 ? 's' : ''}
            {recipients.length === 0 && recipientType !== 'custom' && (
              <span className="text-mist font-normal ml-1">(no phone numbers on record)</span>
            )}
          </p>
        )}
      </div>

      {/* Template selector */}
      <div className="card">
        <p className="text-sm font-semibold text-forest mb-3">Templates</p>
        <select className="input text-sm mb-3" value={templateId} onChange={e => applyTemplate(e.target.value)}>
          <option value="">— choose a template or write your own —</option>
          <optgroup label="Built-in">
            {BUILT_IN_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </optgroup>
          {customTemplates.length > 0 && (
            <optgroup label="My templates">
              {customTemplates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </optgroup>
          )}
        </select>

        {customTemplates.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {customTemplates.map(t => (
              <span key={t.id} className="badge-muted gap-2">
                {t.label}
                <button onClick={() => deleteCustomTemplate(t.id)} className="text-error hover:text-error/80">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Message composer */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-forest">Message</p>
          {/* ── Character counter ── */}
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: charCountColor }}>
              {charCountLabel}
            </p>
            {message.length > 0 && (
              <p className="text-xs" style={{ color: charCountColor, opacity: 0.8 }}>
                {costLabel}
              </p>
            )}
          </div>
        </div>
        <textarea
          className="input resize-none text-sm"
          style={{ minHeight: 120, borderColor: overLimit ? '#dc2626' : undefined }}
          placeholder="Type your message… Use {name} to personalise"
          value={message}
          onChange={e => {
            // Enforce hard limit
            if (e.target.value.length <= MAX_CHARS) setMessage(e.target.value)
          }}
          maxLength={MAX_CHARS}
        />
        {overLimit && (
          <p className="text-xs text-error mt-1 font-semibold">
            Message is too long. Maximum {MAX_CHARS} characters ({MAX_CHARS / PAGE_SIZE} pages).
          </p>
        )}
        <p className="text-xs text-mist mt-2">
          💡 Use <code className="bg-ivory-dark px-1 rounded">{'{name}'}</code> to insert the recipient's first name
        </p>
      </div>

      {/* Credit preview */}
      {message && recipients.length > 0 && (
        <div className="card space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-mist">Sender ID</span>
            <span className="font-medium text-forest">{senderId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-mist">Recipients</span>
            <span className="font-medium text-forest">{recipients.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-mist">SMS pages</span>
            <span className="font-medium text-forest">{pages} page{pages > 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-forest/8 pt-2">
            <span className="text-mist font-semibold">Credits needed</span>
            <span className={`font-bold ${hasEnoughCredits ? 'text-forest' : 'text-error'}`}>
              {creditsNeeded}
              <span className="text-xs font-normal text-mist ml-1">
                ({recipients.length} × {pages} × 5)
              </span>
              {!hasEnoughCredits && <span className="text-xs font-semibold text-error ml-1">(insufficient)</span>}
            </span>
          </div>
          {!hasEnoughCredits && (
            <Link href="/messaging/credits" className="btn btn-outline btn-sm w-full text-center">
              Top up credits →
            </Link>
          )}
        </div>
      )}

      {/* Send result */}
      {sendResult?.error && (
        <div className="rounded-xl bg-error/8 border border-error/20 px-4 py-3 text-sm text-error">
          {sendResult.error}
        </div>
      )}
      {sendResult?.success && (
        <div className="rounded-xl bg-success/8 border border-success/20 px-4 py-3 text-sm text-success font-semibold">
          ✓ Sent to {sendResult.sent} recipient{sendResult.sent !== 1 ? 's' : ''} · {sendResult.credits_used} credits used
          {sendResult.skipped > 0 && (
            <span className="text-warning font-normal ml-2">· {sendResult.skipped} skipped (insufficient credits)</span>
          )}
        </div>
      )}

      {/* Send + save template */}
      <div className="space-y-2">
        <button
          onClick={handleSend}
          disabled={!recipients.length || !message.trim() || !hasEnoughCredits || overLimit || sending}
          className="btn btn-primary w-full btn-lg"
        >
          {sending ? (
            <span className="flex items-center gap-2"><Spinner /> Sending…</span>
          ) : `Send to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
        </button>

        {message.trim() && (
          <button onClick={() => setShowSaveTemplate(p => !p)} className="btn btn-outline w-full btn-sm text-xs">
            💾 Save as template
          </button>
        )}

        {showSaveTemplate && (
          <div className="flex gap-2">
            <input className="input text-sm flex-1" placeholder="Template name…"
              value={newTemplateName} onChange={e => setNewTemplateName(e.target.value)} />
            <button onClick={saveCustomTemplate} className="btn btn-primary btn-sm shrink-0">Save</button>
          </div>
        )}
      </div>

      <div className="h-6" />
    </div>
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
