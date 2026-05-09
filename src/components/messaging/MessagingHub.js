'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Send, Clock, FileText, Radio, Zap, ChevronRight, ArrowUpRight } from 'lucide-react'

const TYPE_LABELS = {
  absentee_followup: 'Absentees',
  attendee_thankyou: 'Attendees',
  absentees:         'Absentees',
  attendees:         'Attendees',
  broadcast:         'Broadcast',
  sunday_reminder:   'Sunday Reminder',
  custom:            'Custom',
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function MessagingHub({ church, recentLogs = [] }) {
  const [credits, setCredits] = useState(church.sms_credits ?? 0)

  const balanceColor  = credits >= 50 ? '#16a34a' : credits >= 20 ? '#d97706' : '#dc2626'
  const balanceBg     = credits >= 50 ? 'rgba(22,163,74,0.07)'  : credits >= 20 ? 'rgba(217,119,6,0.07)'  : 'rgba(220,38,38,0.07)'
  const balanceBorder = credits >= 50 ? 'rgba(22,163,74,0.18)'  : credits >= 20 ? 'rgba(217,119,6,0.2)'   : 'rgba(220,38,38,0.2)'
  const balanceWarn   = credits >= 50 ? null : credits >= 20
    ? 'Running low — top up to keep reaching your members'
    : 'Almost out of credits — top up now'

  const smsRemaining = Math.floor(credits / 5)

  // ── Sender ID status label ──────────────────────────────────────────────────
  let senderSub = 'ChurchTrakr (default)'
  if (church.sms_sender_id_status === 'approved' && church.sms_sender_id) {
    senderSub = church.sms_sender_id + ' ✓'
  } else if (church.sms_sender_id_status === 'pending') {
    senderSub = 'Pending approval'
  }

  const ACTIONS = [
    {
      href:  '/messaging/send',
      Icon:  Send,
      label: 'Send Message',
      sub:   'Bulk SMS',
      color: '#1a3a2a',
      bg:    'rgba(26,58,42,0.06)',
    },
    {
      href:  '/messaging/history',
      Icon:  Clock,
      label: 'Message History',
      sub:   `${recentLogs.length > 0 ? recentLogs.length + ' recent sends' : 'Past sends'}`,
      color: '#2d5a42',
      bg:    'rgba(45,90,66,0.06)',
    },
    {
      href:  '/messaging/templates',
      Icon:  FileText,
      label: 'My Templates',
      sub:   'Saved messages',
      color: '#4a8a65',
      bg:    'rgba(74,138,101,0.06)',
    },
    {
      href:  '/messaging/sender-id',   // ← dedicated page, not /profile?tab=senderid
      Icon:  Radio,
      label: 'Sender ID',
      sub:   senderSub,
      color: '#c9a84c',
      bg:    'rgba(201,168,76,0.08)',
    },
  ]

  return (
    <div className="page-content pb-10">
      <h1 className="font-display text-2xl font-bold text-forest mb-5">Messaging</h1>

      {/* ── Credit balance ── */}
      <div style={{
        background: balanceBg, border: `1.5px solid ${balanceBorder}`,
        borderRadius: 18, padding: '20px 20px 16px', marginBottom: 20,
      }}>
        <p className="text-xs font-bold text-mist uppercase tracking-widest mb-2">SMS Credits</p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:48, fontWeight:800, lineHeight:1, color:balanceColor, margin:0 }}>
              {credits.toLocaleString()}
            </p>
            <p className="text-sm text-mist mt-1.5">~{smsRemaining} SMS remaining</p>
            {balanceWarn && (
              <p className="text-xs font-semibold mt-2" style={{ color: balanceColor }}>
                {credits < 20 ? '🔴' : '🟡'} {balanceWarn}
              </p>
            )}
          </div>
          <Link href="/credits"
            style={{ background: balanceColor, color:'#fff', border:'none', height:40, padding:'0 16px', borderRadius:10, fontSize:13, fontWeight:700, display:'flex', alignItems:'center', gap:6, textDecoration:'none', flexShrink:0 }}>
            <Zap size={13} /> Top Up
          </Link>
        </div>
      </div>

      {/* ── Quick actions ── */}
      <p className="text-xs font-bold text-mist uppercase tracking-widest mb-3">Quick Actions</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
        {ACTIONS.map(({ href, Icon, label, sub, color, bg }) => (
          <Link key={href} href={href} style={{
            display:'flex', flexDirection:'column', gap:10, padding:16,
            borderRadius:16, background:'#fff',
            border:'1px solid rgba(26,58,42,0.08)',
            boxShadow:'0 1px 4px rgba(26,58,42,0.06)',
            textDecoration:'none', transition:'all 0.15s', minHeight:100,
          }}>
            <div style={{ width:38, height:38, borderRadius:10, background:bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon size={17} color={color} strokeWidth={1.75} />
            </div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#1a3a2a', margin:0, lineHeight:1.3 }}>{label}</p>
              <p style={{ fontSize:11, color:'#8a9e90', margin:'3px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Recent sends ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-mist uppercase tracking-widest">Recent Sends</p>
        {recentLogs.length > 0 && (
          <Link href="/messaging/history" className="text-xs font-semibold text-mid flex items-center gap-1">
            View all <ChevronRight size={12} />
          </Link>
        )}
      </div>

      {recentLogs.length === 0 ? (
        <div className="card text-center py-8">
          <Send size={28} className="text-mist mx-auto mb-3" strokeWidth={1.25} />
          <p className="font-semibold text-forest text-sm">No messages sent yet</p>
          <p className="text-xs text-mist mt-1">Send your first SMS to get started</p>
          <Link href="/messaging/send" className="btn btn-primary btn-sm mt-4 gap-1.5 inline-flex">
            <Send size={13} /> Send a message
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {recentLogs.map(log => (
            <div key={log.id} style={{ background:'#fff', borderRadius:14, padding:'12px 16px', border:'1px solid rgba(26,58,42,0.07)', boxShadow:'0 1px 4px rgba(26,58,42,0.05)', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:'rgba(26,58,42,0.06)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Send size={14} color="#2d5a42" strokeWidth={1.75} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#1a3a2a', margin:0 }}>
                  {TYPE_LABELS[log.type] ?? log.type ?? 'SMS'}
                </p>
                <p style={{ fontSize:11, color:'#8a9e90', margin:'2px 0 0' }}>{fmtDate(log.sent_at)}</p>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <p style={{ fontSize:13, fontWeight:700, color:'#1a3a2a', margin:0 }}>
                  {log.success_count ?? log.recipient_count} sent
                </p>
                <p style={{ fontSize:11, color:'#8a9e90', margin:'2px 0 0' }}>{log.credits_used} credits</p>
              </div>
            </div>
          ))}
          <Link href="/messaging/history" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, height:44, borderRadius:12, border:'1.5px solid rgba(26,58,42,0.15)', background:'none', color:'#1a3a2a', textDecoration:'none', fontSize:13, fontWeight:600 }}>
            View full history <ArrowUpRight size={14} />
          </Link>
        </div>
      )}
    </div>
  )
}
