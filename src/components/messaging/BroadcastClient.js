'use client'

import { useState } from 'react'
import BackButton from '@/components/ui/BackButton'
import {
  Calendar, Megaphone, Users, ChevronDown, Send,
  CheckCircle, AlertCircle, MessageSquare, Edit3
} from 'lucide-react'

// ── Default message templates ──────────────────────────────────────────────────
const SUNDAY_REMINDER = `Hi {name}, this is a reminder that Sunday service is tomorrow! We look forward to worshipping with you. God bless you. 🙏`

const SPECIAL_TEMPLATES = [
  { id: 'vigil',    label: 'Night Vigil',     body: `Hi {name}, we are having a Night Vigil this Friday! Come and be blessed. We'd love to see you there. 🙏` },
  { id: 'revival',  label: 'Revival Meeting', body: `Hi {name}, our Revival Meeting starts this week! Don't miss a powerful move of God. See you there! 🙏` },
  { id: 'anniversary', label: 'Church Anniversary', body: `Hi {name}, our Church Anniversary celebration is coming up! Join us for a special service. God bless you. 🎉` },
  { id: 'youth',    label: 'Youth Program',   body: `Hi {name}, we have an exciting Youth Program coming up! Tell a friend and come ready to be inspired. 🙏` },
  { id: 'custom',   label: 'Custom message',  body: '' },
]

const C = {
  forest:'#1a3a2a', mid:'#2d5a42', muted:'#8a9e90',
  gold:'#c9a84c', goldDk:'#a8862e', ivory:'#f7f5f0', ivoryDeep:'#e0dbd0',
  success:'#16a34a', error:'#dc2626',
}

function charCount(msg) {
  const len = msg.length
  const sms = Math.ceil(len / 160) || 1
  return `${len} chars · ~${sms} SMS per recipient`
}

export default function BroadcastClient({ church, groups }) {
  const [tab, setTab]               = useState('sunday')   // 'sunday' | 'special'
  const [recipients, setRecipients] = useState('all')
  const [message, setMessage]       = useState(SUNDAY_REMINDER)
  const [specialType, setSpecialType] = useState(SPECIAL_TEMPLATES[0].id)
  const [customMsg, setCustomMsg]   = useState('')
  const [programTitle, setProgramTitle] = useState('')
  const [sending, setSending]       = useState(false)
  const [result, setResult]         = useState(null)  // { sent, failed, total, creditsRemaining }
  const [error, setError]           = useState('')
  const [preview, setPreview]       = useState(false)

  const activeTemplate = SPECIAL_TEMPLATES.find(t => t.id === specialType)
  const isCustomSpecial = specialType === 'custom'

  function getEffectiveMessage() {
    if (tab === 'sunday') return message
    return isCustomSpecial ? customMsg : activeTemplate?.body ?? ''
  }

  const effectiveMsg = getEffectiveMessage()
  const previewMsg   = effectiveMsg.replace(/\{name\}/gi, 'John')

  async function handleSend() {
    const msg = effectiveMsg.trim()
    if (!msg) { setError('Please enter a message.'); return }

    setSending(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/sms/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:         tab === 'sunday' ? 'sunday_reminder' : (isCustomSpecial ? 'custom' : specialType),
          message:      msg,
          recipients,
          programTitle: tab === 'special' ? programTitle : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Send failed'); return }
      setResult(data)
    } catch { setError('Network error. Please try again.') }
    finally { setSending(false) }
  }

  // Reset after successful send
  function handleReset() {
    setResult(null)
    setError('')
    if (tab === 'sunday') setMessage(SUNDAY_REMINDER)
    else { setCustomMsg(''); setProgramTitle('') }
  }

  return (
    <div className="page-content pb-16">
      <BackButton />
      <h1 className="font-display text-2xl font-bold text-forest mb-1">Broadcast SMS</h1>
      <p className="text-sm text-mist mb-5">
        Send reminders to your members · {church.sms_credits} credits remaining
      </p>

      {/* ── Result screen ── */}
      {result && (
        <div style={{
          background: '#fff', borderRadius: 16,
          boxShadow: `0 1px 6px rgba(26,58,42,0.1), 0 0 0 1px rgba(26,58,42,0.07)`,
          padding: '1.5rem', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(22,163,74,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <CheckCircle size={26} color={C.success} />
          </div>
          <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:20, fontWeight:700, color:C.forest, margin:'0 0 6px' }}>
            Messages Sent
          </h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, margin:'16px 0' }}>
            {[
              { label:'Sent',    value:result.sent,    color:C.success },
              { label:'Failed',  value:result.failed,  color:result.failed>0?C.error:C.muted },
              { label:'Credits', value:result.creditsRemaining, color:C.forest },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background:C.ivory, borderRadius:12, padding:'12px 8px', textAlign:'center' }}>
                <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:26, fontWeight:800, color, margin:'0 0 3px', lineHeight:1 }}>{value}</p>
                <p style={{ fontSize:10, color:C.muted, margin:0, textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:600 }}>{label}</p>
              </div>
            ))}
          </div>
          <button onClick={handleReset} className="btn btn-outline w-full mt-2">Send another message</button>
        </div>
      )}

      {!result && (
        <>
          {/* ── Type tabs ── */}
          <div style={{ display:'flex', gap:8, marginBottom:16 }}>
            {[
              { value:'sunday',  label:'Sunday Reminder', Icon:Calendar  },
              { value:'special', label:'Special Program',  Icon:Megaphone },
            ].map(({ value, label, Icon }) => (
              <button key={value} onClick={() => { setTab(value); setError(''); setResult(null) }}
                style={{
                  flex:1, padding:'12px 10px', borderRadius:14, border:'none', cursor:'pointer',
                  background: tab===value ? C.forest : '#fff',
                  color: tab===value ? '#f5f0e8' : C.muted,
                  boxShadow: tab===value ? 'none' : `0 1px 4px rgba(26,58,42,0.08), 0 0 0 1px rgba(26,58,42,0.07)`,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'all 0.15s',
                }}>
                <Icon size={18} strokeWidth={1.75} />
                <span style={{ fontSize:12, fontWeight:700 }}>{label}</span>
              </button>
            ))}
          </div>

          {/* ── Sunday reminder ── */}
          {tab === 'sunday' && (
            <div style={{ background:'#fff', borderRadius:16, boxShadow:`0 1px 6px rgba(26,58,42,0.08), 0 0 0 1px rgba(26,58,42,0.07)`, padding:'1.25rem', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <Calendar size={16} color={C.mid} />
                <p style={{ fontSize:14, fontWeight:700, color:C.forest, margin:0 }}>Sunday Service Reminder</p>
              </div>
              <p style={{ fontSize:12, color:C.muted, margin:'0 0 12px', lineHeight:1.5 }}>
                Send this on <strong>Saturday</strong> to remind members about tomorrow's service.
              </p>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.forest, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
                Message
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={5}
                style={{
                  width:'100%', padding:'10px 12px', borderRadius:10, fontSize:14, lineHeight:1.6,
                  border:`1.5px solid rgba(26,58,42,0.15)`, background:C.ivory,
                  resize:'vertical', fontFamily:'inherit', boxSizing:'border-box',
                }}
              />
              <p style={{ fontSize:11, color:C.muted, margin:'5px 0 0', textAlign:'right' }}>{charCount(message)}</p>
            </div>
          )}

          {/* ── Special program ── */}
          {tab === 'special' && (
            <div style={{ background:'#fff', borderRadius:16, boxShadow:`0 1px 6px rgba(26,58,42,0.08), 0 0 0 1px rgba(26,58,42,0.07)`, padding:'1.25rem', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <Megaphone size={16} color={C.goldDk} />
                <p style={{ fontSize:14, fontWeight:700, color:C.forest, margin:0 }}>Special Program Reminder</p>
              </div>

              {/* Program type selector */}
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.forest, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
                Program Type
              </label>
              <div style={{ position:'relative', marginBottom:14 }}>
                <select
                  value={specialType}
                  onChange={e => setSpecialType(e.target.value)}
                  style={{
                    width:'100%', height:44, padding:'0 36px 0 12px', borderRadius:10, fontSize:14,
                    border:`1.5px solid rgba(26,58,42,0.15)`, background:C.ivory,
                    appearance:'none', fontFamily:'inherit', color:C.forest, cursor:'pointer',
                  }}
                >
                  {SPECIAL_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} color={C.muted} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              </div>

              {/* Optional program title */}
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.forest, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
                Program Title <span style={{ fontWeight:400, textTransform:'none', fontSize:11, color:C.muted }}>(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Shiloh 2025"
                value={programTitle}
                onChange={e => setProgramTitle(e.target.value)}
                style={{
                  width:'100%', height:44, padding:'0 12px', borderRadius:10, fontSize:14,
                  border:`1.5px solid rgba(26,58,42,0.15)`, background:C.ivory,
                  fontFamily:'inherit', boxSizing:'border-box', marginBottom:14,
                }}
              />

              {/* Message — show template or custom textarea */}
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.forest, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>
                Message
              </label>
              {!isCustomSpecial ? (
                <div style={{ background:C.ivory, borderRadius:10, padding:'10px 12px', fontSize:14, lineHeight:1.6, color:C.forest, marginBottom:6 }}>
                  {activeTemplate?.body}
                </div>
              ) : (
                <textarea
                  value={customMsg}
                  onChange={e => setCustomMsg(e.target.value)}
                  placeholder="Write your message here. Use {name} to personalise."
                  rows={5}
                  style={{
                    width:'100%', padding:'10px 12px', borderRadius:10, fontSize:14, lineHeight:1.6,
                    border:`1.5px solid rgba(26,58,42,0.15)`, background:C.ivory,
                    resize:'vertical', fontFamily:'inherit', boxSizing:'border-box',
                  }}
                />
              )}
              <p style={{ fontSize:11, color:C.muted, margin:'5px 0 0', textAlign:'right' }}>{charCount(effectiveMsg)}</p>
            </div>
          )}

          {/* ── Recipients ── */}
          <div style={{ background:'#fff', borderRadius:16, boxShadow:`0 1px 6px rgba(26,58,42,0.08), 0 0 0 1px rgba(26,58,42,0.07)`, padding:'1.25rem', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <Users size={16} color={C.mid} />
              <p style={{ fontSize:14, fontWeight:700, color:C.forest, margin:0 }}>Recipients</p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {/* All members */}
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'10px 12px', borderRadius:10, background: recipients==='all' ? 'rgba(26,58,42,0.04)' : 'transparent', border:`1.5px solid ${recipients==='all' ? C.forest : 'rgba(26,58,42,0.12)'}`, transition:'all 0.12s' }}>
                <input type="radio" name="recipients" value="all" checked={recipients==='all'} onChange={() => setRecipients('all')} style={{ accentColor:C.forest }} />
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:C.forest, margin:0 }}>All active members</p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>Everyone with a phone number</p>
                </div>
              </label>
              {/* By group */}
              {(groups ?? []).map(g => (
                <label key={g.id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'10px 12px', borderRadius:10, background: recipients===`group:${g.id}` ? 'rgba(26,58,42,0.04)' : 'transparent', border:`1.5px solid ${recipients===`group:${g.id}` ? C.forest : 'rgba(26,58,42,0.12)'}`, transition:'all 0.12s' }}>
                  <input type="radio" name="recipients" value={`group:${g.id}`} checked={recipients===`group:${g.id}`} onChange={() => setRecipients(`group:${g.id}`)} style={{ accentColor:C.forest }} />
                  <p style={{ fontSize:13, fontWeight:600, color:C.forest, margin:0 }}>{g.name}</p>
                </label>
              ))}
            </div>
          </div>

          {/* ── Preview toggle ── */}
          {effectiveMsg.trim() && (
            <button
              onClick={() => setPreview(p => !p)}
              style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:C.mid, fontSize:13, fontWeight:600, padding:0, marginBottom:8 }}
            >
              <MessageSquare size={14} />
              {preview ? 'Hide preview' : 'Preview message'}
            </button>
          )}

          {preview && effectiveMsg.trim() && (
            <div style={{ background:C.ivory, borderRadius:12, padding:'12px 14px', marginBottom:12, borderLeft:`3px solid ${C.gold}` }}>
              <p style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', margin:'0 0 6px' }}>Preview (as "John")</p>
              <p style={{ fontSize:13, color:C.forest, margin:0, lineHeight:1.6 }}>{previewMsg}</p>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{ display:'flex', alignItems:'flex-start', gap:8, background:'rgba(220,38,38,0.06)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:12, padding:'12px 14px', marginBottom:12 }}>
              <AlertCircle size={15} color={C.error} style={{ flexShrink:0, marginTop:1 }} />
              <p style={{ fontSize:13, color:C.error, margin:0 }}>{error}</p>
            </div>
          )}

          {/* ── Send button ── */}
          <button
            onClick={handleSend}
            disabled={sending || !effectiveMsg.trim()}
            className="btn btn-primary w-full gap-2"
            style={{ height:52, fontSize:16, opacity: (!effectiveMsg.trim() || sending) ? 0.5 : 1 }}
          >
            {sending ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" opacity="0.75"/>
                </svg>
                Sending messages…
              </>
            ) : (
              <>
                <Send size={16} />
                Send to {recipients === 'all' ? 'all members' : (groups?.find(g => `group:${g.id}` === recipients)?.name ?? 'group')}
              </>
            )}
          </button>

          <p style={{ fontSize:11, color:C.muted, textAlign:'center', margin:'8px 0 0' }}>
            Each SMS costs 1 credit · You have {church.sms_credits} credits
          </p>
        </>
      )}
    </div>
  )
}
