'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { Send, AlertCircle, CheckCircle, ArrowLeft, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'

// ── Default templates — plain GSM-7, no emojis ────────────────────────────────
const BUILT_IN_TEMPLATES = [
  { id: 'missed',    label: 'We missed you',       body: 'Hi {name}, we missed you at service this week. We hope you are doing well and we look forward to seeing you again soon.' },
  { id: 'welcome',   label: 'First Timer Welcome',  body: 'Hi {name}, welcome. We are glad you joined us today. We hope to see you again next Sunday.' },
  { id: 'reminder',  label: 'Service Reminder',     body: 'Hi {name}, this is a reminder that service is tomorrow. We look forward to seeing you.' },
  { id: 'thanks',    label: 'Thanks for Attending', body: 'Hi {name}, thank you for joining us at service today. It was great having you with us. See you next week.' },
  { id: 'followup',  label: 'Absentee Follow-up',   body: 'Hi {name}, we noticed you were not at service this Sunday. We hope you are well. Please let us know if there is anything we can do for you.' },
  { id: 'sunday',    label: 'Sunday Reminder',       body: 'Hi {name}, service is this Sunday. We hope to see you there.' },
]

const CREDITS_PER_PAGE = 5
const SAFE_LIMIT       = 140  // 157 minus 17 buffer for name substitution
const UNICODE_LIMIT    = 60   // 70 minus 10 buffer
const MAX_CHARS        = 280  // 2 pages max
const WARN_AT          = 130  // soft warning

// Unicode trigger characters — does NOT include [ ] (template placeholders)
const UNICODE_TRIGGERS = ['^','{','}','\\','~','|','€','\u2018','\u2019','\u201C','\u201D']

// Sample values for preview/analysis
const SAMPLE_NAME  = 'Oluwaseun Adeyemi'
const SAMPLE_GROUP = 'Youth Fellowship'

function resolvePlaceholders(text, name = SAMPLE_NAME, group = SAMPLE_GROUP) {
  return text
    .replace(/\{name\}/gi,       name.split(' ')[0])
    .replace(/\[Name\]/gi,       name.split(' ')[0])
    .replace(/\[Group Name\]/gi, group)
    .replace(/\[Date\]/gi,       'Sunday')
}

function analyseMessage(text, previewName = SAMPLE_NAME, previewGroup = SAMPLE_GROUP) {
  if (!text) return { isUnicode: false, pages: 1, pageSize: SAFE_LIMIT, charsUsed: 0, creditsPerSms: CREDITS_PER_PAGE, resolved: '', triggerChar: null }

  const resolved = resolvePlaceholders(text, previewName, previewGroup)

  let triggerChar = null
  for (const c of UNICODE_TRIGGERS) {
    if (resolved.includes(c)) { triggerChar = c; break }
  }
  const hasEmoji  = /\p{Emoji_Presentation}/u.test(resolved)
  const isUnicode = !!triggerChar || hasEmoji
  const pageSize  = isUnicode ? UNICODE_LIMIT : SAFE_LIMIT
  const pages     = Math.max(1, Math.ceil(resolved.length / pageSize))

  return {
    isUnicode, pages, pageSize,
    charsUsed:     text.length,       // raw body chars (for counter)
    resolvedChars: resolved.length,   // post-substitution length
    creditsPerSms: pages * CREDITS_PER_PAGE,
    resolved,
    triggerChar,
    hasEmoji,
  }
}

// Per-recipient credit calculation factoring in actual name lengths
function calcBulkCredits(template, recipients, groupName = '') {
  let total       = 0
  const pageBreakers = []
  for (const r of recipients) {
    const resolved = resolvePlaceholders(template, r.name, groupName)
    const hasUnicode = UNICODE_TRIGGERS.some(c => resolved.includes(c)) || /\p{Emoji_Presentation}/u.test(resolved)
    const limit  = hasUnicode ? 70 : 157
    const pages  = Math.max(1, Math.ceil(resolved.length / limit))
    total += pages * CREDITS_PER_PAGE
    if (pages > 1) pageBreakers.push({ name: r.name, length: resolved.length })
  }
  return { total, pageBreakers }
}

function normalisePhone(raw) {
  if (!raw) return null
  const c = String(raw).replace(/\D/g, '')
  if (c.startsWith('234') && c.length >= 13) return c
  if (c.startsWith('0')   && c.length === 11) return '234' + c.slice(1)
  if (c.length === 10     && /^[789]/.test(c)) return '234' + c
  return null
}

export default function MessagingComposer({ church, groups, members, latestByGroup, phoneMap }) {
  const [recipientType,   setRecipientType]   = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [customPhone,     setCustomPhone]     = useState('')
  const [customName,      setCustomName]      = useState('')
  const [message,         setMessage]         = useState('')
  const [templateId,      setTemplateId]      = useState('')
  const [customTemplates, setCustomTemplates] = useState([])
  const [newTplName,      setNewTplName]      = useState('')
  const [showSaveTpl,     setShowSaveTpl]     = useState(false)
  const [addSignature,    setAddSignature]    = useState(false)
  const [showPreview,     setShowPreview]     = useState(false)
  const [sending,         setSending]         = useState(false)
  const [sendResult,      setSendResult]      = useState(null)
  const [credits,         setCredits]         = useState(church.sms_credits ?? 0)
  const [showSentNames,   setShowSentNames]   = useState(false)
  const [showSkipNames,   setShowSkipNames]   = useState(false)

  useEffect(() => {
    try {
      setCustomTemplates(JSON.parse(localStorage.getItem('ct_sms_templates') ?? '[]'))
      setAddSignature(localStorage.getItem('ct_sms_add_signature') === 'true')
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('ct_sms_add_signature', String(addSignature))
  }, [addSignature])

  const signatureSuffix = addSignature ? `\n\n- ${church.name}` : ''
  const fullMessage     = message + signatureSuffix
  const allTemplates    = [...BUILT_IN_TEMPLATES, ...customTemplates]

  // Analyse with sample name
  const analysis = useMemo(() => analyseMessage(fullMessage), [fullMessage])

  // Detect any standalone [ or ] that are NOT part of a known placeholder
  const hasBareBracket = useMemo(() => {
    return /\[(?!Name\]|Group Name\]|Date\])[^\]]*\]?|\](?<!\[Name\]|\[Group Name\]|\[Date\])/.test(fullMessage)
  }, [fullMessage])

  // ── Recipients ──────────────────────────────────────────────────────────────
  const recipients = useMemo(() => {
    if (recipientType === 'custom') {
      if (!customPhone.trim()) return []
      return [{ name: customName.trim() || 'Friend', phone: customPhone.trim() }]
    }
    if (recipientType === 'all') return members.filter(m => m.phone).map(m => ({ name: m.name, phone: m.phone }))
    if (recipientType === 'group' && selectedGroupId) {
      return members.filter(m => m.phone && (m.groupIds ?? []).includes(selectedGroupId)).map(m => ({ name: m.name, phone: m.phone }))
    }
    if (recipientType === 'absentees' || recipientType === 'attendees') {
      const result = []
      for (const session of Object.values(latestByGroup)) {
        for (const r of (session.attendance_records ?? [])) {
          const match = recipientType === 'absentees' ? !r.present : r.present
          if (!match) continue
          const info = phoneMap[r.member_id]
          if (info?.phone) result.push({ name: r.name || info.name, phone: info.phone })
        }
      }
      return result
    }
    return []
  }, [recipientType, selectedGroupId, customPhone, customName, members, latestByGroup, phoneMap])

  // Per-recipient credit calculation
  const groupName = selectedGroupId ? (groups.find(g => g.id === selectedGroupId)?.name ?? church.name) : church.name
  const bulkCost  = useMemo(() => {
    if (!message.trim() || recipients.length === 0) return { total: 0, pageBreakers: [] }
    return calcBulkCredits(fullMessage, recipients, groupName)
  }, [fullMessage, recipients, groupName])

  const totalCost      = bulkCost.total
  const maxAffordCount = credits >= analysis.creditsPerSms ? Math.floor(credits / analysis.creditsPerSms) : 0
  const willSendCount  = Math.min(recipients.length, maxAffordCount)
  const willSkipCount  = Math.max(0, recipients.length - willSendCount)
  const balanceAfter   = Math.max(0, credits - totalCost)
  const canSend        = willSendCount > 0 && message.trim() && analysis.charsUsed <= MAX_CHARS

  const senderId = church.sms_sender_id_status === 'approved' && church.sms_sender_id
    ? church.sms_sender_id : 'ChurchTrakr'

  // Character counter display
  const safeLimit  = analysis.isUnicode ? UNICODE_LIMIT : SAFE_LIMIT
  const charColor  = analysis.charsUsed > MAX_CHARS ? '#dc2626'
    : analysis.isUnicode ? '#dc2626'
    : analysis.charsUsed >= WARN_AT ? '#d97706'
    : '#16a34a'

  function applyTemplate(id) {
    const tpl = allTemplates.find(t => t.id === id)
    if (tpl) { setMessage(tpl.body); setTemplateId(id) }
  }

  function saveCustomTemplate() {
    if (!newTplName.trim() || !message.trim()) return
    const tpl = { id: `custom_${Date.now()}`, label: newTplName.trim(), body: message }
    const updated = [...customTemplates, tpl]
    setCustomTemplates(updated)
    localStorage.setItem('ct_sms_templates', JSON.stringify(updated))
    setShowSaveTpl(false); setNewTplName('')
  }

  async function handleSend() {
    if (!canSend || sending) return
    setSending(true); setSendResult(null)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, message: fullMessage, type: recipientType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Send failed')
      setCredits(data.new_balance ?? credits)
      setSendResult(data)
    } catch (err) {
      setSendResult({ error: err.message })
    } finally { setSending(false) }
  }

  // ── Post-send result ────────────────────────────────────────────────────────
  if (sendResult && !sendResult.error) {
    const sentNames    = (sendResult.results ?? []).filter(r => r.status === 'sent').map(r => r.name)
    const notSentNames = [
      ...(sendResult.results ?? []).filter(r => r.status !== 'sent').map(r => r.name),
      ...(sendResult.skippedRecipients ?? []),
    ]
    return (
      <div className="page-content pb-10">
        <BackButton />
        <div className="card animate-fade-in">
          <div style={{ textAlign: 'center', paddingBottom: 20, borderBottom: '1px solid rgba(26,58,42,0.08)', marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <CheckCircle size={28} color="#16a34a" />
            </div>
            <h2 className="font-display text-xl font-bold text-forest">Messages Sent</h2>
            <p className="text-xs text-mist mt-1">{new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          <div style={{ background: '#f7f5f0', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            {[
              { label: 'Sent to',       value: `${sendResult.sent} members`,         color: '#16a34a' },
              ...(notSentNames.length > 0 ? [{ label: 'Not sent', value: `${notSentNames.length} members`, color: '#dc2626' }] : []),
              { label: 'Credits used',  value: String(sendResult.credits_used),       color: '#1a3a2a' },
              { label: 'Remaining',     value: `${sendResult.new_balance} credits`,   color: '#1a3a2a' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(26,58,42,0.07)' }}>
                <span style={{ fontSize: 13, color: '#8a9e90' }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
              </div>
            ))}
          </div>

          {sentNames.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <button onClick={() => setShowSentNames(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textAlign: 'left' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1a3a2a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reached ({sentNames.length})</p>
                {showSentNames ? <ChevronUp size={14} color="#8a9e90"/> : <ChevronDown size={14} color="#8a9e90"/>}
              </button>
              {showSentNames && (
                <div style={{ maxHeight: 200, overflowY: 'auto', paddingTop: 6 }}>
                  {sentNames.map(n => <p key={n} style={{ fontSize: 13, color: '#374151', padding: '4px 0', borderBottom: '1px solid rgba(26,58,42,0.05)' }}>• {n}</p>)}
                </div>
              )}
            </div>
          )}

          {notSentNames.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={() => setShowSkipNames(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0', textAlign: 'left' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Not reached ({notSentNames.length})</p>
                {showSkipNames ? <ChevronUp size={14} color="#dc2626"/> : <ChevronDown size={14} color="#dc2626"/>}
              </button>
              {showSkipNames && (
                <div style={{ maxHeight: 160, overflowY: 'auto', paddingTop: 6 }}>
                  {notSentNames.map(n => <p key={n} style={{ fontSize: 13, color: '#dc2626', padding: '4px 0', borderBottom: '1px solid rgba(220,38,38,0.08)' }}>• {n}</p>)}
                </div>
              )}
              <Link href="/credits" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, background: '#1a3a2a', color: '#e8d5a0', textDecoration: 'none', fontSize: 13, fontWeight: 700, marginTop: 10 }}>
                Top Up to Reach Remaining
              </Link>
            </div>
          )}

          <Link href="/messaging" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: 12, border: '1.5px solid rgba(26,58,42,0.2)', color: '#1a3a2a', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
            <ArrowLeft size={14} /> Back to Messaging
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content pb-10">
      <BackButton />
      <div className="mb-4">
        <h1 className="font-display text-2xl font-semibold text-forest">Send Message</h1>
        <p className="text-sm text-mist mt-0.5">
          Balance: <strong className="text-forest">{credits}</strong> credits
          <span className="mx-1.5 text-mist/40">·</span>
          <Link href="/credits" className="text-mid font-semibold text-xs">Top up →</Link>
        </p>
      </div>

      {sendResult?.error && (
        <div className="flex gap-2 items-start rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
          <AlertCircle size={14} className="text-error shrink-0 mt-0.5" />
          <p className="text-sm text-error">{sendResult.error}</p>
        </div>
      )}

      {/* Recipients */}
      <div className="card">
        <p className="text-sm font-semibold text-forest mb-3">Send to</p>
        <div className="grid grid-cols-2 gap-2">
          {[['absentees','Last Absentees'],['attendees','Last Attendees'],['group','A Group'],['all','All Members'],['custom','One Person']].map(([val, label]) => (
            <button key={val} onClick={() => setRecipientType(val)}
              className={`py-3 px-4 rounded-xl text-sm font-medium border transition-all text-left min-h-[48px]
                ${recipientType === val ? 'bg-forest text-ivory border-forest' : 'border-forest/15 text-forest hover:border-forest/40'}`}>
              {label}
            </button>
          ))}
        </div>
        {recipientType === 'group' && (
          <select className="input mt-3 text-sm" value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)}>
            <option value="">— select a group —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        {recipientType === 'custom' && (
          <div className="space-y-2 mt-3">
            <input className="input text-sm" placeholder="Name (optional)" value={customName} onChange={e => setCustomName(e.target.value)} />
            <input className="input text-sm" type="tel" placeholder="Phone number" value={customPhone} onChange={e => setCustomPhone(e.target.value)} />
          </div>
        )}
        {recipientType && (
          <p className="text-sm text-forest mt-3">
            <strong>{recipients.length}</strong> recipient{recipients.length !== 1 ? 's' : ''}
            {recipients.length === 0 && recipientType !== 'custom' && <span className="text-mist font-normal ml-1">(no phone numbers on record)</span>}
          </p>
        )}
      </div>

      {/* Template selector */}
      <div className="card">
        <p className="text-sm font-semibold text-forest mb-2">Templates</p>
        <select className="input text-sm" value={templateId} onChange={e => applyTemplate(e.target.value)}>
          <option value="">— choose a template —</option>
          <optgroup label="Built-in">
            {BUILT_IN_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </optgroup>
          {customTemplates.length > 0 && (
            <optgroup label="My templates">
              {customTemplates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </optgroup>
          )}
        </select>
      </div>

      {/* Message composer */}
      <div className="card">
        <div className="flex items-start justify-between mb-2 gap-2">
          <p className="text-sm font-semibold text-forest">Message</p>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold" style={{ color: charColor }}>
              {analysis.charsUsed} / {safeLimit} chars · {analysis.pages} page{analysis.pages > 1 ? 's' : ''}
            </p>
            <p className="text-xs" style={{ color: charColor }}>
              {analysis.creditsPerSms} credits/person
            </p>
          </div>
        </div>

        <textarea
          className="input resize-none text-sm"
          style={{ minHeight: 128, borderColor: analysis.charsUsed > MAX_CHARS ? 'rgba(220,38,38,0.4)' : analysis.isUnicode ? 'rgba(220,38,38,0.3)' : undefined }}
          placeholder="Type your message... Use {name} to personalise"
          value={message}
          onChange={e => { if (e.target.value.length + signatureSuffix.length <= MAX_CHARS) setMessage(e.target.value) }}
        />

        {/* Soft warning near limit */}
        {!analysis.isUnicode && analysis.charsUsed >= WARN_AT && analysis.charsUsed <= MAX_CHARS && (
          <div className="mt-2 text-xs" style={{ color: '#d97706' }}>
            Getting long — member names will be added to this message. Try to stay under {safeLimit} characters to avoid a 2-page message.
          </div>
        )}

        {/* Unicode / emoji warning */}
        {analysis.isUnicode && (
          <div style={{ marginTop: 10, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '10px 14px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', margin: '0 0 4px' }}>
              {analysis.hasEmoji ? 'Emoji detected' : `Special character detected: "${analysis.triggerChar}"`}
            </p>
            <p style={{ fontSize: 12, color: '#dc2626', margin: 0, lineHeight: 1.5 }}>
              This switches the message to Unicode encoding ({UNICODE_LIMIT} chars/page instead of {SAFE_LIMIT}).
              Each person costs <strong>{analysis.creditsPerSms} credits</strong> instead of 5.
              {analysis.hasEmoji ? ' Remove emojis to reduce cost.' : ' Remove this character to reduce cost.'}
            </p>
          </div>
        )}

        {/* Hard limit */}
        {analysis.charsUsed > MAX_CHARS && (
          <p className="text-xs text-error mt-2 font-semibold">Message too long. Please shorten to {MAX_CHARS} characters maximum.</p>
        )}

        {/* Multi-page non-unicode warning */}
        {!analysis.isUnicode && analysis.pages > 1 && analysis.charsUsed <= MAX_CHARS && (
          <div style={{ marginTop: 10, background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 12, padding: '10px 14px' }}>
            <p style={{ fontSize: 12, color: '#d97706', margin: 0, lineHeight: 1.5 }}>
              This is a 2-page message — each person costs <strong>{analysis.creditsPerSms} credits</strong> instead of 5.
              Shorten to under {SAFE_LIMIT} characters to save credits.
            </p>
          </div>
        )}

        {/* Preview toggle */}
        {message.trim() && (
          <div className="mt-3 pt-3 border-t border-forest/8">
            <button onClick={() => setShowPreview(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#2d5a42', fontSize: 12, fontWeight: 600 }}>
              {showPreview ? <EyeOff size={13}/> : <Eye size={13}/>}
              {showPreview ? 'Hide preview' : 'Preview with sample name'}
            </button>
            {showPreview && (
              <div style={{ marginTop: 10, background: '#f7f5f0', borderRadius: 10, padding: '10px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#8a9e90', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Preview — as sent to "{SAMPLE_NAME}"</p>
                <p style={{ fontSize: 13, color: '#1a3a2a', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{analysis.resolved}</p>
                <p style={{ fontSize: 11, color: analysis.resolvedChars > safeLimit * analysis.pages ? '#d97706' : '#16a34a', marginTop: 6 }}>
                  Resolved length: {analysis.resolvedChars} / {safeLimit} chars {analysis.resolvedChars <= safeLimit ? '✓' : '⚠ may wrap to page 2 for long names'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Signature toggle */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-forest/8">
          <div>
            <p className="text-sm font-semibold text-forest">Add group name</p>
            <p className="text-xs text-mist">Appends "- {church.name}"</p>
          </div>
          <button onClick={() => setAddSignature(v => !v)} role="switch" aria-checked={addSignature}
            style={{ width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: addSignature ? '#1a3a2a' : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
            <span style={{ position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', left: addSignature ? 21 : 3, transition: 'left 0.2s' }} />
          </button>
        </div>
      </div>

      {/* Long-name warning */}
      {bulkCost.pageBreakers.length > 0 && (
        <div style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.2)', borderRadius: 14, padding: '14px 16px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#d97706', margin: '0 0 6px' }}>
            {bulkCost.pageBreakers.length} member{bulkCost.pageBreakers.length > 1 ? 's have' : ' has'} a long name that pushes to 2 pages (10 credits each)
          </p>
          <div style={{ maxHeight: 80, overflowY: 'auto', marginBottom: 4 }}>
            {bulkCost.pageBreakers.map(({ name, length }) => (
              <p key={name} style={{ fontSize: 12, color: '#d97706', margin: '2px 0' }}>• {name} ({length} chars)</p>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#d97706', margin: 0 }}>
            Total cost: <strong>{bulkCost.total} credits</strong>
          </p>
        </div>
      )}

      {/* Credit summary */}
      {message.trim() && recipients.length > 0 && (
        <div className="card space-y-3">
          {[
            { label: 'Sending to',    value: `${willSendCount} people`,           color: '#1a3a2a' },
            { label: 'Cost',          value: `${bulkCost.total || willSendCount * analysis.creditsPerSms} credits`, color: credits >= (bulkCost.total || totalCost) ? '#1a3a2a' : '#dc2626' },
            { label: 'Balance after', value: `${balanceAfter} credits`,           color: '#1a3a2a' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-mist">{label}</span>
              <span className="font-bold" style={{ color }}>{value}</span>
            </div>
          ))}
          {willSkipCount > 0 && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.2)' }}>
              <AlertCircle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
              <p className="text-xs" style={{ color: '#d97706' }}>
                Not enough credits for all {recipients.length}. {willSkipCount} will be skipped.{' '}
                <Link href="/credits" className="font-bold underline">Top up →</Link>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Send button */}
      <div className="space-y-2">
        <button onClick={handleSend} disabled={!canSend || sending}
          className="btn btn-primary w-full gap-2"
          style={{ height: 52, fontSize: 15, opacity: (!canSend || sending) ? 0.5 : 1 }}>
          {sending ? (
            <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" opacity="0.75"/></svg> Sending…</>
          ) : (
            <><Send size={15} /> Send to {willSendCount} {willSendCount === 1 ? 'person' : 'people'}</>
          )}
        </button>
        {message.trim() && (
          <>
            <button onClick={() => setShowSaveTpl(v => !v)} className="btn btn-outline w-full btn-sm text-xs">
              Save as template
            </button>
            {showSaveTpl && (
              <div className="flex gap-2">
                <input className="input text-sm flex-1" placeholder="Template name…" value={newTplName} onChange={e => setNewTplName(e.target.value)} />
                <button onClick={saveCustomTemplate} className="btn btn-primary btn-sm shrink-0">Save</button>
              </div>
            )}
          </>
        )}
      </div>
      <div className="h-6" />
    </div>
  )
}
