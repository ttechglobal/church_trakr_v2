'use client'

/**
 * FixedModal — a bottom-sheet on mobile, centered dialog on desktop.
 *
 * Structure:
 *   - header:  flex-shrink 0 — always visible
 *   - body:    flex 1, overflow-y auto — scrolls independently
 *   - footer:  flex-shrink 0 — always visible (save button lives here)
 *
 * This ensures the save button is NEVER hidden behind the bottom navbar
 * or scrolled out of view, even on small phones with long forms.
 *
 * Usage:
 *   <FixedModal title="Add member" onClose={onClose} footer={<SaveButtons />}>
 *     <FormFields />
 *   </FixedModal>
 */

import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function FixedModal({ title, onClose, children, footer }) {
  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 50,
        }}
        aria-hidden
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position:        'fixed',
          zIndex:          51,
          display:         'flex',
          flexDirection:   'column',
          background:      '#fff',
          overflow:        'hidden',   // children manage their own scroll

          // Mobile — bottom sheet
          bottom:          0,
          left:            0,
          right:           0,
          maxHeight:       '92dvh',
          borderRadius:    '24px 24px 0 0',
          boxShadow:       '0 -8px 40px rgba(0,0,0,0.18)',
        }}
        // Prevent backdrop click from firing through the modal
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header — never scrolls away ── */}
        <div style={{
          flexShrink:    0,
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          padding:       '18px 20px 14px',
          borderBottom:  '1px solid rgba(26,58,42,0.08)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-playfair,Georgia,serif)',
            fontSize:   18, fontWeight: 700,
            color:      '#1a3a2a', margin: 0,
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(26,58,42,0.06)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#8a9e90', flexShrink: 0,
            }}
          >
            <X size={17} />
          </button>
        </div>

        {/* ── Body — scrollable ── */}
        <div style={{
          flex:        1,
          overflowY:   'auto',
          padding:     '18px 20px',
          display:     'flex',
          flexDirection:'column',
          gap:         14,
        }}>
          {children}
        </div>

        {/* ── Footer — never scrolls away, clears bottom nav + safe area ── */}
        {footer && (
          <div style={{
            flexShrink:    0,
            padding:       '14px 20px',
            paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
            borderTop:     '1px solid rgba(26,58,42,0.08)',
            background:    '#fff',
          }}>
            {footer}
          </div>
        )}
      </div>

      {/* Desktop override — centered dialog */}
      <style>{`
        @media (min-width: 640px) {
          [role="dialog"] {
            top:       50% !important;
            left:      50% !important;
            right:     auto !important;
            bottom:    auto !important;
            transform: translate(-50%, -50%) !important;
            width:     480px !important;
            max-height: 85dvh !important;
            border-radius: 20px !important;
          }
        }
      `}</style>
    </>
  )
}