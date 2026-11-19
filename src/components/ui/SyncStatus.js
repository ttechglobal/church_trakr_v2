'use client'

/**
 * Keeps the offline attendance queue moving and shows its state.
 *
 * - Uploads waiting saves on: first load, coming back online, returning to the tab,
 *   the service worker's "connectivity restored" message, and every 30 s while any wait.
 * - Shows a small pill while saves are waiting, so a volunteer can SEE that their
 *   Sunday's attendance is safe on the phone but not yet on the server.
 * - Reports saves the server permanently rejected, instead of retrying them forever.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { offlineQueue, onQueueChange } from '@/lib/offlineQueue'
import { useToast } from '@/components/ui/Toast'

export default function SyncStatus() {
  const { toast } = useToast()
  const [counts, setCounts] = useState({ pending: 0, failed: 0 })
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)

  const flush = useCallback(async (manual = false) => {
    const q = offlineQueue()
    if (!q || !q.counts().pending) return
    setBusy(true)
    try {
      const r = await q.flush()
      if (r.sent > 0) toast(`${r.sent} attendance save${r.sent === 1 ? '' : 's'} uploaded`, { type: 'success' })
      else if (manual && r.kept > 0) toast('Still no connection. Your attendance is safe on this phone.', { type: 'info' })
    } finally { setBusy(false) }
  }, [toast])

  useEffect(() => {
    const q = offlineQueue()
    if (!q) return
    setCounts(q.counts())
    const off = onQueueChange(setCounts)

    const run = () => flush(false)
    run()
    const onVisible = () => { if (document.visibilityState === 'visible') run() }
    window.addEventListener('online', run)
    document.addEventListener('visibilitychange', onVisible)
    const onSw = e => { if (e.data?.type === 'FLUSH_OFFLINE_QUEUE') run() }
    navigator.serviceWorker?.addEventListener('message', onSw)

    timer.current = setInterval(() => { if (q.counts().pending) run() }, 30_000)
    return () => {
      off()
      window.removeEventListener('online', run)
      document.removeEventListener('visibilitychange', onVisible)
      navigator.serviceWorker?.removeEventListener('message', onSw)
      clearInterval(timer.current)
    }
  }, [flush])

  if (!counts.pending && !counts.failed) return null

  const pill = {
    position: 'fixed', right: 12, zIndex: 120, display: 'flex', alignItems: 'center', gap: 8,
    padding: '6px 6px 6px 12px', borderRadius: 999, fontSize: 13, fontWeight: 600,
    boxShadow: '0 4px 16px rgba(15,26,19,0.18)',
  }
  const btn = { minHeight: 32, padding: '0 12px', borderRadius: 999, border: 'none', cursor: 'pointer', font: 'inherit', fontWeight: 700 }

  return (
    <div className="ct-sync" style={{ position: 'fixed', top: 0, right: 0, zIndex: 120, pointerEvents: 'none' }}>
      <style>{`.ct-sync > div { top: 64px } @media (min-width:1024px){ .ct-sync > div { top: 12px } }`}</style>
      {counts.pending > 0 && (
        <div role="status" style={{ ...pill, background: '#fef3c7', color: '#78350f', pointerEvents: 'auto' }}>
          <span>{counts.pending} save{counts.pending === 1 ? '' : 's'} waiting</span>
          <button type="button" disabled={busy} onClick={() => flush(true)} style={{ ...btn, background: '#78350f', color: '#fff' }}>
            {busy ? 'Uploading…' : 'Upload now'}
          </button>
        </div>
      )}
      {counts.pending === 0 && counts.failed > 0 && (
        <div role="alert" style={{ ...pill, background: '#fee2e2', color: '#7f1d1d', pointerEvents: 'auto' }}>
          <span>{counts.failed} save{counts.failed === 1 ? '' : 's'} failed. Please re-enter.</span>
          <button type="button" onClick={() => offlineQueue()?.dismissFailed()} style={{ ...btn, background: '#7f1d1d', color: '#fff' }}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}
