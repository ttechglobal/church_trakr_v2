'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { smsCount, attendanceRate } from '@/lib/utils'

const BUILT_IN_TEMPLATES = [
  { id: 'missed', label: 'We missed you', body: 'Hi {name}, we missed you at service this week. We hope you\'re well and look forward to seeing you soon. 🙏' },
  { id: 'welcome_ft', label: 'First Timer Welcome', body: 'Hi {name}, welcome to our church family! 🎉 We\'re so glad you joined us. We hope to see you again soon. God bless you!' },
  { id: 'reminder', label: 'Service Reminder', body: 'Hi {name}, just a reminder that service is tomorrow! We look forward to seeing you. God bless 🙏' },
  { id: 'thanks', label: 'Thanks for Attending', body: 'Hi {name}, thank you for joining us at service today! It was great having you. God bless you abundantly. 🙏' },
  { id: 'attendee_fu', label: 'Attendee Follow-up', body: 'Hi {name}, thank you for being at service! How are you doing? We always appreciate your presence. 🙏' },
  { id: 'sunday', label: 'Sunday Reminder', body: 'Hi {name}, service is this Sunday! Come and be blessed. We\'d love to see you there. 🙏' },
  { id: 'event', label: 'Upcoming Event', body: 'Hi {name}, we have an exciting event coming up at church! Stay tuned for details. God bless 🙏' },
]

export default function MessagingHome({ church, groups, members, latestByGroup, phoneMap }) {
  const [recipientType, setRecipientType] = useState('') // absentees|attendees|group|all|custom
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [customPhone, setCustomPhone] = useState('')
  const [customName, setCustomName] = useState('')
  const [message, setMessage] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [customTemplates, setCustomTemplates] = useState([])
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)
  const [credits, setCredits] = useState(church.sms_credits)

  // Load custom templates from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ct_sms_templates') ?? '[]')
      setCustomTemplates(saved)
    } catch {}
  }, [])

  const allTemplates = [...BUILT_IN_TEMPLATES, ...customTemplates]

  // Compute recipients
  const recipients = useMemo(() => {
    if (recipientType === 'custom') {
      if (!customPhone.trim()) return []
      return [{ name: customName.trim() || 'Friend', phone: customPhone.trim() }]
    }
    if (recipientType === 'all') {
      return members.filter(m => m.phone).map(m => ({ name: m.name, phone: m.phone }))
    }
    if (recipientType === 'group' && selectedGroupId) {
      return members.filter(m => m.phone && (m.groupIds ?? []).includes(selectedGroupId))
        .map(m => ({ name: m.name, phone: m.phone }))
    }
    if (recipientType === 'absentees' || recipientType === 'attendees') {
      const result = []
      for (const [gid, session] of Object.entries(latestByGroup)) {
        for (const r of (session.attendance_records ?? [])) {
          const isMatch = recipientType === 'absentees' ? !r.present : r.present
          if (!isMatch) continue
          const memberInfo = phoneMap[r.member_id]
          if (memberInfo?.phone) {
            result.push({ name: r.name || memberInfo.name, phone: memberInfo.phone })
          }
        }
      }
      return result
    }
    return []
  }, [recipientType, selectedGroupId, customPhone, customName, members, latestByGroup, phoneMap])

  const segments = smsCount(message)
  const creditsNeeded = recipients.length * segments
  const hasEnoughCredits = credits >= creditsNeeded

  const senderId = church.sms_sender_id_status === 'approved' && church.sms_sender_id
    ? church.sms_sender_id
    : 'ChurchTrakr'

  function applyTemplate(id) {
    const tpl = allTemplates.find(t => t.id === id)
    if (tpl) { setMessage(tpl.body); setTemplateId(id) }
  }

  function saveCustomTemplate() {
    if (!newTemplateName.trim() || !message.trim()) return
    const tpl = { id: `custom_${Date.now()}`, label: newTemplateName.trim(), body: message }
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
    if (!recipients.length || !message.trim() || !hasEnoughCredits) return
    setSending(true)
    setSendResult(null)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, message, type: recipientType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      setCredits(data.new_balance)
      setSendResult(data)
    } catch (err) {
      setSendResult({ error: err.message })
    } finally {
      setSending(false)
    }
  }

  if (sendResult && !sendResult.error) {
    return (
      <div className="page-content">
        <div className="card text-center py-10 animate-fade-in">
          <p className="text-4xl mb-3">✅</p>
          <h2 className="font-display text-2xl font-semibold text-forest">Messages sent!</h2>
          <div className="flex justify-center gap-6 mt-4">
            <div><p className="font-display text-2xl font-bold text-success">{sendResult.sent}</p><p className="text-xs text-mist">Sent</p></div>
            {sendResult.failed > 0 && <div><p className="font-display text-2xl font-bold text-error">{sendResult.failed}</p><p className="text-xs text-mist">Failed</p></div>}
            <div><p className="font-display text-2xl font-bold text-forest">{sendResult.credits_used}</p><p className="text-xs text-mist">Credits used</p></div>
          </div>
          <p className="text-sm text-mist mt-3">Remaining balance: {sendResult.new_balance} credits</p>
          <button onClick={() => { setSendResult(null); setMessage(''); setRecipientType(''); }}
            className="btn btn-primary mt-6">Send another message</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest">Messaging</h1>
          <p className="text-sm text-mist mt-0.5">
            {credits} credit{credits !== 1 ? 's' : ''} available
            {credits === 0 && <Link href="/messaging/credits" className="text-gold ml-2 font-medium">Buy credits →</Link>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/messaging/history" className="btn btn-outline btn-sm text-xs">History</Link>
          <Link href="/messaging/credits" className="btn btn-gold btn-sm text-xs">Credits</Link>
        </div>
      </div>

      {/* Recipient type */}
      <div className="card">
        <p className="text-sm font-semibold text-forest mb-3">Send to</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            ['absentees', '😔 Last Absentees'],
            ['attendees', '🙌 Last Attendees'],
            ['group', '👥 A Group'],
            ['all', '📢 All Members'],
            ['custom', '📱 Single Person'],
          ].map(([val, label]) => (
            <button key={val} onClick={() => setRecipientType(val)}
              className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all text-left
                ${recipientType === val ? 'bg-forest text-ivory border-forest' : 'border-forest/20 text-forest-muted hover:border-forest/40 hover:bg-ivory'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Group picker */}
        {recipientType === 'group' && (
          <select className="input mt-3" value={selectedGroupId}
            onChange={e => setSelectedGroupId(e.target.value)}>
            <option value="">— select a group —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}

        {/* Custom recipient */}
        {recipientType === 'custom' && (
          <div className="space-y-2 mt-3">
            <input className="input text-sm" placeholder="Name (optional)" value={customName}
              onChange={e => setCustomName(e.target.value)} />
            <input className="input text-sm" type="tel" placeholder="Phone number"
              value={customPhone} onChange={e => setCustomPhone(e.target.value)} />
          </div>
        )}

        {/* Recipient count */}
        {recipientType && (
          <div className="mt-3 px-3 py-2 bg-forest/6 rounded-xl">
            <p className="text-sm font-medium text-forest">
              {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
              {recipients.length === 0 && recipientType !== 'custom' && (
                <span className="text-mist font-normal ml-1">(no phone numbers on record)</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Template selector */}
      <div className="card">
        <p className="text-sm font-semibold text-forest mb-3">Templates</p>
        <select className="input text-sm mb-3" value={templateId}
          onChange={e => applyTemplate(e.target.value)}>
          <option value="">— choose a template or type your own —</option>
          <optgroup label="Built-in">
            {BUILT_IN_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </optgroup>
          {customTemplates.length > 0 && (
            <optgroup label="My templates">
              {customTemplates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </optgroup>
          )}
        </select>

        {/* Custom templates management */}
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
          <p className="text-xs text-mist">
            {message.length} chars · {segments} SMS segment{segments !== 1 ? 's' : ''}
          </p>
        </div>
        <textarea
          className="input resize-none text-sm"
          style={{ minHeight: 120 }}
          placeholder="Type your message… Use {name} to personalise"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
        <p className="text-xs text-mist mt-2">
          💡 Use <code className="bg-ivory-dark px-1 rounded">{'{name}'}</code> to insert the recipient's first name
        </p>
      </div>

      {/* Sender ID + credit preview */}
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
            <span className="text-mist">Credits needed</span>
            <span className={`font-semibold ${hasEnoughCredits ? 'text-forest' : 'text-error'}`}>
              {creditsNeeded} {!hasEnoughCredits && '(insufficient)'}
            </span>
          </div>
          {!hasEnoughCredits && (
            <Link href="/messaging/credits" className="btn btn-gold btn-sm w-full mt-1 text-center">
              Buy more credits →
            </Link>
          )}
        </div>
      )}

      {sendResult?.error && (
        <div className="rounded-xl bg-error/8 border border-error/20 px-4 py-3 text-sm text-error">
          {sendResult.error}
        </div>
      )}

      {/* Send + save template */}
      <div className="space-y-2">
        <button
          onClick={handleSend}
          disabled={!recipients.length || !message.trim() || !hasEnoughCredits || sending}
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

function Spinner() { return <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/></svg> }
