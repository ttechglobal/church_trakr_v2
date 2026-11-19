'use client'

/**
 * Tiny toast system — replaces blocking alert() popups.
 *
 *   const { toast } = useToast()
 *   toast('Saved')                                       // info
 *   toast('Could not save', { type: 'error' })
 *   toast('38 marked present', { action: { label: 'Undo', onClick: undo } })
 *
 * useToast() is safe outside the provider (does nothing), so components never crash.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ToastContext = createContext(null)
const MAX_VISIBLE = 3

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const timers = useRef(new Map())
  const nextId = useRef(1)

  const dismiss = useCallback((id) => {
    const t = timers.current.get(id)
    if (t) { clearTimeout(t); timers.current.delete(id) }
    setItems(list => list.filter(i => i.id !== id))
  }, [])

  const toast = useCallback((message, opts = {}) => {
    const { type = 'info', action = null } = opts
    const duration = opts.duration ?? (type === 'error' || action ? 8000 : 4500)
    const id = nextId.current++
    setItems(list => [...list, { id, message, type, action }].slice(-MAX_VISIBLE))
    if (duration > 0) timers.current.set(id, setTimeout(() => dismiss(id), duration))
    return id
  }, [dismiss])

  useEffect(() => () => { for (const t of timers.current.values()) clearTimeout(t) }, [])

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <style>{`
        .ct-toasts { position: fixed; left: 0; right: 0; bottom: calc(84px + env(safe-area-inset-bottom, 0px));
          display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 0 12px;
          z-index: 300; pointer-events: none; }
        @media (min-width: 1024px) { .ct-toasts { bottom: 24px; left: 260px; } }
        .ct-toast { pointer-events: auto; display: flex; align-items: center; gap: 12px; max-width: 440px; width: 100%;
          padding: 12px 14px; border-radius: 14px; color: #fff; font-size: 14px; line-height: 1.4;
          box-shadow: 0 8px 28px rgba(15,26,19,0.28); animation: ct-toast-in 0.2s ease-out; }
        .ct-toast-info, .ct-toast-success { background: #1a3a2a; }
        .ct-toast-error { background: #991b1b; }
        .ct-toast-msg { flex: 1; min-width: 0; }
        .ct-toast-btn { flex-shrink: 0; min-height: 36px; padding: 0 10px; border: none; border-radius: 8px; cursor: pointer;
          background: rgba(255,255,255,0.14); color: #fff; font: inherit; font-weight: 600; }
        .ct-toast-btn:hover { background: rgba(255,255,255,0.24); }
        @keyframes ct-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .ct-toast { animation: none; } }
      `}</style>
      <div className="ct-toasts" aria-live="polite" aria-atomic="false">
        {items.map(t => (
          <div key={t.id} className={`ct-toast ct-toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <span className="ct-toast-msg">{t.message}</span>
            {t.action && (
              <button type="button" className="ct-toast-btn"
                onClick={() => { try { t.action.onClick?.() } finally { dismiss(t.id) } }}>
                {t.action.label}
              </button>
            )}
            <button type="button" className="ct-toast-btn" aria-label="Dismiss notification" onClick={() => dismiss(t.id)}>✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const NOOP = { toast: () => 0, dismiss: () => {} }
export function useToast() {
  return useContext(ToastContext) ?? NOOP
}
