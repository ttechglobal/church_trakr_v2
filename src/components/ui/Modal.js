'use client'

/**
 * Modal — the one dialog used across the app.
 * Bottom sheet on phones, centred dialog from 640px up.
 *
 *   <Modal title="Add member" onClose={close} footer={<Buttons/>}>…fields…</Modal>
 *
 * Accessibility (all handled here, so screens don't each re-implement it):
 *  - role="dialog" + aria-modal + aria-labelledby the title
 *  - Escape closes; clicking the dimmed backdrop closes (but not a text-selection drag that ends there)
 *  - Tab / Shift+Tab stay inside the dialog (focus trap)
 *  - focus moves into the dialog on open (unless a child already used autoFocus) and returns
 *    to the control that opened it on close
 *  - page scroll is locked, safely when dialogs are stacked
 *  - header, body and footer are separate regions: the footer (Save button) never scrolls away
 *  - rendered in a portal so no parent's transform/overflow can clip or mis-stack it
 *
 *  `dismissible={false}` disables Escape/backdrop closing (e.g. while saving).
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

let lockCount = 0
let savedOverflow = ''
function lockScroll() {
  if (lockCount++ === 0) { savedOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden' }
}
function unlockScroll() {
  if (--lockCount === 0) document.body.style.overflow = savedOverflow
}

export default function Modal({ title, onClose, children, footer, dismissible = true, size = 'md' }) {
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef(null)
  const downOnBackdrop = useRef(false)
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => setMounted(true), [])

  // Scroll lock + remember / restore focus
  useEffect(() => {
    const opener = document.activeElement
    lockScroll()
    return () => {
      unlockScroll()
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus()
    }
  }, [])

  // Move focus into the dialog once it exists (unless a child already took it via autoFocus).
  // Skip invisible elements (e.g. a hidden file input) and fall back to the dialog itself, so focus
  // is ALWAYS inside: otherwise Escape and the focus trap would never receive key presses.
  useEffect(() => {
    if (!mounted) return
    const d = dialogRef.current
    if (!d || d.contains(document.activeElement)) return
    const body = d.querySelector('[data-modal-body]')
    const candidates = [...(body ? body.querySelectorAll(FOCUSABLE) : []), ...d.querySelectorAll(FOCUSABLE)]
    for (const el of candidates) {
      if (el.getClientRects().length === 0) continue
      el.focus()
      if (document.activeElement === el) return
    }
    d.focus()
  }, [mounted])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && dismissible) { e.stopPropagation(); onCloseRef.current?.(); return }
    if (e.key !== 'Tab') return
    const d = dialogRef.current
    if (!d) return
    const items = [...d.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null || el === document.activeElement)
    if (!items.length) { e.preventDefault(); d.focus(); return }
    const first = items[0], last = items[items.length - 1]
    if (e.shiftKey && (document.activeElement === first || document.activeElement === d)) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }, [dismissible])

  if (!mounted) return null

  return createPortal(
    <div
      className="ct-modal-backdrop"
      onMouseDown={e => { downOnBackdrop.current = e.target === e.currentTarget }}
      onClick={e => { if (dismissible && downOnBackdrop.current && e.target === e.currentTarget) onClose?.() }}
    >
      <div
        ref={dialogRef}
        className={`ct-modal ct-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="ct-modal-head">
          <h2 id={titleId} className="ct-modal-title">{title}</h2>
          <button type="button" className="ct-modal-close" aria-label="Close dialog" onClick={onClose} disabled={!dismissible}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="ct-modal-body" data-modal-body>{children}</div>
        {footer && <div className="ct-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
