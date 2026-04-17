'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bell, X } from 'lucide-react'

const DISMISSED_KEY = 'ct_followup_banner_dismissed'

/**
 * Shows a sticky banner when there are pending follow-ups.
 * Dismissed per-session — reappears on next visit if still pending.
 */
export default function FollowUpBanner({ pendingCount = 0 }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (pendingCount <= 0) return

    // Check if dismissed this session
    const dismissed = sessionStorage.getItem(DISMISSED_KEY)
    if (!dismissed) setVisible(true)
  }, [pendingCount])

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  if (!visible || pendingCount <= 0) return null

  return (
    <div style={{
      position: 'fixed',
      top: 62,           // just below mobile topbar
      left: 0,
      right: 0,
      zIndex: 80,
      padding: '0 0.75rem',
      pointerEvents: 'none',
    }}>
      <div style={{
        maxWidth: 860,
        margin: '0 auto',
        background: 'rgba(220,38,38,0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: 12,
        padding: '0.625rem 0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 4px 20px rgba(220,38,38,0.25)',
        pointerEvents: 'auto',
        animation: 'slideDown 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <Bell size={15} color="#fff" strokeWidth={2} style={{ flexShrink: 0 }} />
        <p style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.3 }}>
          {pendingCount} absentee{pendingCount !== 1 ? 's' : ''} from last service need{pendingCount === 1 ? 's' : ''} follow-up
        </p>
        <Link href="/absentees" onClick={dismiss} style={{
          fontSize: 12, fontWeight: 700, color: '#fff',
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 8, padding: '4px 10px',
          textDecoration: 'none', flexShrink: 0,
          transition: 'background 0.14s',
        }}>
          View →
        </Link>
        <button onClick={dismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)', padding: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center',
        }}>
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 1024px) {
          /* On desktop, topbar is not shown — position from top of window */
          [data-followup-banner] { top: 8px; }
        }
      `}</style>
    </div>
  )
}
