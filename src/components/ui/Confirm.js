'use client'

/**
 * Promise-based confirmation dialog — replaces the browser's confirm().
 *
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: 'Remove member?', message: 'This cannot be undone.', confirmLabel: 'Remove', danger: true }))) return
 *
 * Escape / backdrop / Cancel resolve false. For `danger`, focus starts on Cancel so an
 * accidental Enter does not delete anything.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Modal from '@/components/ui/Modal'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null)
  const resolver = useRef(null)

  const confirm = useCallback((opts = {}) => new Promise(resolve => {
    resolver.current?.(false)            // a second request cancels the first
    resolver.current = resolve
    setReq({ title: 'Are you sure?', confirmLabel: 'Confirm', cancelLabel: 'Cancel', danger: false, ...opts })
  }), [])

  const settle = useCallback((value) => {
    resolver.current?.(value)
    resolver.current = null
    setReq(null)
  }, [])

  const value = useMemo(() => confirm, [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {req && (
        <Modal
          title={req.title}
          size="sm"
          onClose={() => settle(false)}
          footer={
            <div className="ct-confirm-actions">
              <button type="button" className="btn btn-outline" autoFocus={req.danger} onClick={() => settle(false)}>{req.cancelLabel}</button>
              <button type="button" className={req.danger ? 'btn btn-danger-solid' : 'btn btn-primary'} autoFocus={!req.danger} onClick={() => settle(true)}>{req.confirmLabel}</button>
            </div>
          }
        >
          {req.message && <p className="ct-confirm-msg">{req.message}</p>}
        </Modal>
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  // Outside the provider, fall back to the native dialog instead of silently doing nothing
  return ctx ?? ((opts = {}) => Promise.resolve(typeof window !== 'undefined' && window.confirm(opts.message || opts.title || 'Are you sure?')))
}
