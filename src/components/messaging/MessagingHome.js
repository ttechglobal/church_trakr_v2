'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { smsCount, attendanceRate } from '@/lib/utils'

const TEMPLATES = [
  { id: 'missed',   label: 'We missed you',       body: "Hi {name}, we missed you at service this week. We hope you're well. 🙏" },
  { id: 'welcome',  label: 'First Timer Welcome',  body: 'Hi {name}, welcome to our church family! 🎉 So glad you joined us. God bless you!' },
  { id: 'reminder', label: 'Service Reminder',     body: 'Hi {name}, service is this Sunday! We look forward to seeing you there. 🙏' },
  { id: 'thanks',   label: 'Thanks for Attending', body: 'Hi {name}, thank you for joining us today! God bless you abundantly. 🙏' },
  { id: 'sunday',   label: 'Sunday Reminder',      body: "Hi {name}, join us this Sunday! Come and be blessed. 🙏" },
  { id: 'event',    label: 'Upcoming Event',        body: "Hi {name}, exciting event coming up at church! Stay tuned. 🙏" },
  { id: 'bday',     label: 'Birthday Greeting',    body: "Happy birthday {name}! 🎂 Wishing you God's abundant blessings today. 🙏" },
]

export default function MessagingHome({ church, groups, members, latestByGroup, phoneMap }) {
  const [recipientType, setType]    = useState('')
  const [groupId, setGroupId]       = useState('')
  const [customPhone, setPhone]     = useState('')
  const [customName, setName]       = useState('')
  const [message, setMsg]           = useState('')
  const [templateId, setTpl]        = useState('')
  const [customTpls, setCustomTpls] = useState([])
  const [showSaveTpl, setShowSave]  = useState(false)
  const [tplName, setTplName]       = useState('')
  const [sending, setSending]       = useState(false)
  const [result, setResult]         = useState(null)
  const [credits, setCredits]       = useState(church.sms_credits ?? 0)
  const [tab, setTab]               = useState('compose') // compose | history

  useEffect(() => {
    try { setCustomTpls(JSON.parse(localStorage.getItem('ct_sms_templates') ?? '[]')) } catch {}
  }, [])

  const allTpls = [...TEMPLATES, ...customTpls]

  const recipients = useMemo(() => {
    if (recipientType === 'custom') {
      return customPhone.trim() ? [{ name: customName.trim() || 'Friend', phone: customPhone.trim() }] : []
    }
    if (recipientType === 'all') return members.filter(m => m.phone).map(m => ({ name: m.name, phone: m.phone }))
    if (recipientType === 'group' && groupId) {
      return members.filter(m => m.phone && (m.groupIds ?? []).includes(groupId)).map(m => ({ name: m.name, phone: m.phone }))
    }
    if (recipientType === 'absentees' || recipientType === 'attendees') {
      const result = []
      for (const [, session] of Object.entries(latestByGroup)) {
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
  }, [recipientType, groupId, customPhone, customName, members, latestByGroup, phoneMap])

  const segments     = smsCount(message)
  const creditsNeeded = recipients.length * segments
  const canSend      = recipients.length > 0 && message.trim() && credits >= creditsNeeded

  function applyTpl(id) {
    const tpl = allTpls.find(t => t.id === id)
    if (tpl) { setMsg(tpl.body); setTpl(id) }
  }

  function saveTpl() {
    if (!tplName.trim() || !message.trim()) return
    const t = { id: `c_${Date.now()}`, label: tplName.trim(), body: message }
    const updated = [...customTpls, t]
    setCustomTpls(updated)
    localStorage.setItem('ct_sms_templates', JSON.stringify(updated))
    setTplName(''); setShowSave(false)
  }

  async function send() {
    if (!canSend) return
    setSending(true); setResult(null)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipients, message, type: recipientType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setCredits(data.new_balance)
      setResult(data)
    } catch (e) { setResult({ error: e.message }) }
    finally { setSending(false) }
  }

  if (result && !result.error) {
    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.25rem' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '3rem 2rem', textAlign: 'center', border: '1px solid rgba(26,58,42,0.08)', boxShadow: '0 2px 16px rgba(26,58,42,0.06)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(22,163,74,0.1)', margin: '0 auto 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
            ✅
          </div>
          <h2 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 24, fontWeight: 700, color: '#1a3a2a', margin: '0 0 8px' }}>Messages sent!</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', margin: '1.5rem 0' }}>
            {[
              { label: 'Sent',    value: result.sent,         color: '#16a34a' },
              { label: 'Credits', value: result.credits_used, color: '#1a3a2a' },
              { label: 'Balance', value: result.new_balance,  color: '#a8862e' },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 28, fontWeight: 800, color: s.color, margin: '0 0 4px', letterSpacing: '-0.03em' }}>{s.value}</p>
                <p style={{ fontSize: 12, color: '#8a9e90', margin: 0, fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>
          <button onClick={() => { setResult(null); setMsg(''); setType(''); setTpl('') }} style={{ ...primaryBtn, width: '100%', maxWidth: 280 }}>
            Send another
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.25rem 3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <BackLink href="/dashboard" />
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
            Messaging
          </h1>
          <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>
            {credits} SMS credit{credits !== 1 ? 's' : ''} available
            {credits < 20 && <span style={{ color: '#dc2626', marginLeft: 8 }}>⚠️ Running low</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/messaging/history" style={{ ...outlineBtn, height: 38, fontSize: 13, padding: '0 0.875rem', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>
            History
          </a>
          <a href="/messaging/credits" style={{ ...primaryBtn, height: 38, fontSize: 13, padding: '0 0.875rem', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', background: '#c9a84c', color: '#1a3a2a' }}>
            Buy credits
          </a>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Left: Recipients + message */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Recipient type */}
          <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#2d4a36', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Send to</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { val: 'absentees', label: 'Last Absentees',  icon: '😔' },
                { val: 'attendees', label: 'Last Attendees',  icon: '🙌' },
                { val: 'group',     label: 'A Group',         icon: '👥' },
                { val: 'all',       label: 'All Members',     icon: '📢' },
                { val: 'custom',    label: 'One Person',      icon: '📱' },
              ].map(opt => (
                <button key={opt.val} onClick={() => setType(opt.val)}
                  style={{
                    padding: '0.75rem', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    border: `1.5px solid ${recipientType === opt.val ? '#1a3a2a' : 'rgba(26,58,42,0.1)'}`,
                    background: recipientType === opt.val ? 'rgba(26,58,42,0.05)' : '#fafaf9',
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a3a2a', margin: 0, letterSpacing: '-0.01em' }}>{opt.label}</p>
                </button>
              ))}
            </div>

            {recipientType === 'group' && (
              <div style={{ marginTop: 12 }}>
                <select className="input" style={{ marginTop: 4 }} value={groupId} onChange={e => setGroupId(e.target.value)}>
                  <option value="">— select a group —</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}

            {recipientType === 'custom' && (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input className="input" placeholder="Name (optional)" value={customName} onChange={e => setName(e.target.value)} />
                <input className="input" type="tel" placeholder="Phone number" value={customPhone} onChange={e => setPhone(e.target.value)} />
              </div>
            )}

            {recipientType && (
              <div style={{ marginTop: 10, padding: '0.625rem 0.875rem', background: 'rgba(26,58,42,0.05)', borderRadius: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>
                  {recipients.length} recipient{recipients.length !== 1 ? 's' : ''}
                  {recipients.length === 0 && <span style={{ color: '#8a9e90', fontWeight: 500 }}> — no phone numbers on file</span>}
                </p>
              </div>
            )}
          </div>

          {/* Template picker */}
          <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#2d4a36', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Template</p>
            <select className="input" value={templateId} onChange={e => applyTpl(e.target.value)}>
              <option value="">— pick a template or write your own —</option>
              <optgroup label="Built-in">
                {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </optgroup>
              {customTpls.length > 0 && (
                <optgroup label="My templates">
                  {customTpls.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Right: Compose */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#2d4a36', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Message</p>
              <p style={{ fontSize: 12, color: '#8a9e90', margin: 0 }}>
                {message.length} chars · {segments} SMS segment{segments !== 1 ? 's' : ''}
              </p>
            </div>
            <textarea
              className="input"
              style={{ minHeight: 140, resize: 'none', fontSize: 15 }}
              placeholder="Type your message… Use {name} to personalise"
              value={message}
              onChange={e => setMsg(e.target.value)}
            />
            <p style={{ fontSize: 12, color: '#8a9e90', marginTop: 8 }}>
              💡 <code style={{ background: 'rgba(26,58,42,0.07)', padding: '1px 5px', borderRadius: 4 }}>{'{name}'}</code> will be replaced with the recipient's first name
            </p>
          </div>

          {/* Cost preview */}
          {message && recipients.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 16, padding: '1rem 1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              {[
                { label: 'Recipients',   value: recipients.length },
                { label: 'Credits needed', value: creditsNeeded },
                { label: 'Your balance',  value: credits },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(26,58,42,0.06)' }}>
                  <span style={{ fontSize: 14, color: '#8a9e90' }}>{r.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: credits < creditsNeeded && r.label === 'Credits needed' ? '#dc2626' : '#1a3a2a' }}>{r.value}</span>
                </div>
              ))}
              {credits < creditsNeeded && (
                <a href="/messaging/credits" style={{ display: 'block', marginTop: 10, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#c9a84c', textDecoration: 'none' }}>
                  Buy more credits →
                </a>
              )}
            </div>
          )}

          {result?.error && (
            <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12, padding: '0.75rem 1rem', fontSize: 14, color: '#dc2626' }}>
              {result.error}
            </div>
          )}

          <button onClick={send} disabled={!canSend || sending} style={{
            ...primaryBtn, height: 52, fontSize: 16, width: '100%',
            opacity: (!canSend || sending) ? 0.55 : 1,
          }}>
            {sending ? 'Sending…' : `Send to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
          </button>

          {message.trim() && (
            <div>
              {!showSaveTpl ? (
                <button onClick={() => setShowSave(true)} style={{ ...ghostBtn, fontSize: 13, height: 36, width: '100%' }}>
                  💾 Save as template
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="input" placeholder="Template name…" style={{ flex: 1 }}
                    value={tplName} onChange={e => setTplName(e.target.value)} />
                  <button onClick={saveTpl} style={{ ...primaryBtn, height: 44, padding: '0 1rem', fontSize: 14 }}>Save</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BackLink({ href }) {
  return (
    <a href={href} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#8a9e90', fontWeight: 600, textDecoration: 'none', marginBottom: 8 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      Dashboard
    </a>
  )
}

const primaryBtn = { background: '#1a3a2a', color: '#e8d5a0', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, letterSpacing: '-0.01em', transition: 'all 0.15s' }
const outlineBtn = { background: 'transparent', color: '#1a3a2a', border: '1.5px solid rgba(26,58,42,0.2)', borderRadius: 12, cursor: 'pointer', fontWeight: 700 }
const ghostBtn   = { background: 'transparent', color: '#4a8a65', border: '1.5px solid rgba(26,58,42,0.12)', borderRadius: 10, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }