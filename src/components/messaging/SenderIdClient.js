'use client'

import { useState } from 'react'
import BackButton from '@/components/ui/BackButton'
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SenderIdClient({ churchId, currentSenderId, currentStatus, latestRequest }) {
  const [senderId,    setSenderId]    = useState('')
  const [useCase,     setUseCase]     = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)
  const [status,      setStatus]      = useState(currentStatus)
  const [requestedId, setRequestedId] = useState(currentSenderId ?? latestRequest?.requested_sender_id ?? '')
  const [cancelling,  setCancelling]  = useState(false)

  function validateSenderId(v) {
    if (!v) return 'Sender ID is required'
    if (v.length > 11) return 'Must be 11 characters or fewer'
    if (!/^[A-Za-z0-9]+$/.test(v)) return 'Letters and numbers only — no spaces or symbols'
    if (['sms','alert','info','news','update','notify','notification','message','promo'].includes(v.toLowerCase()))
      return `"${v}" is too generic. Use your church or group name instead.`
    return null
  }

  async function handleSubmit() {
    const err = validateSenderId(senderId.trim())
    if (err) { setError(err); return }
    if (!useCase.trim()) { setError('Please describe your use case'); return }

    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/settings/sender-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: senderId.trim(), useCase: useCase.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Submission failed'); return }
      setStatus('pending')
      setRequestedId(senderId.trim())
      setSuccess(true)
      setSenderId(''); setUseCase('')
    } catch { setError('Network error. Please try again.') }
    finally   { setSubmitting(false) }
  }

  async function handleCancel() {
    if (!confirm('Cancel your Sender ID request?')) return
    setCancelling(true)
    try {
      await fetch('/api/settings/sender-id', { method: 'DELETE' })
      setStatus(null)
      setRequestedId('')
      setSuccess(false)
    } catch {}
    finally { setCancelling(false) }
  }

  return (
    <div className="page-content pb-10">
      <BackButton />
      <h1 className="font-display text-2xl font-bold text-forest mb-1">Sender ID</h1>
      <p className="text-sm text-mist mb-6">The name shown on SMS messages sent from your account.</p>

      {/* ── Current sender ID ── */}
      <div className="card mb-4">
        <p className="text-xs font-bold text-mist uppercase tracking-widest mb-2">Current Sender ID</p>
        {status === 'approved' ? (
          <div className="flex items-center gap-3">
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(22,163,74,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle size={20} color="#16a34a" />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-forest">{requestedId}</p>
              <p className="text-xs text-success font-semibold mt-0.5">Active — your messages send with this name</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(26,58,42,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18 }}>💬</span>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-forest">ChurchTrakr</p>
              <p className="text-xs text-mist mt-0.5">Default — all accounts use this until a custom ID is approved</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Pending state ── */}
      {status === 'pending' && (
        <div className="card mb-4" style={{ border: '1px solid rgba(217,119,6,0.25)', background: 'rgba(217,119,6,0.04)' }}>
          <div className="flex items-center gap-3 mb-3">
            <Clock size={18} style={{ color: '#d97706', flexShrink: 0 }} />
            <div>
              <p className="text-sm font-bold" style={{ color: '#d97706' }}>Pending approval</p>
              <p className="text-xs text-mist mt-0.5">Expected within 48 hours</p>
            </div>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-mist">Requested ID</span>
              <span className="font-bold text-forest">{requestedId}</span>
            </div>
            {latestRequest?.requested_at && (
              <div className="flex justify-between">
                <span className="text-mist">Submitted</span>
                <span className="font-medium text-forest">{fmtDate(latestRequest.requested_at)}</span>
              </div>
            )}
          </div>
          <button onClick={handleCancel} disabled={cancelling}
            className="btn btn-outline w-full mt-4 text-sm"
            style={{ color: '#dc2626', borderColor: 'rgba(220,38,38,0.25)', minHeight: 44 }}>
            {cancelling ? 'Cancelling…' : 'Cancel Request'}
          </button>
        </div>
      )}

      {/* ── Approved state ── */}
      {status === 'approved' && (
        <div className="card mb-4" style={{ border: '1px solid rgba(22,163,74,0.2)', background: 'rgba(22,163,74,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} color="#16a34a" />
            <p className="text-sm font-bold text-success">Your custom Sender ID is live</p>
          </div>
          <p className="text-sm text-mist mb-4">All SMS messages now show <strong className="text-forest">{requestedId}</strong> as the sender.</p>
          <button onClick={() => { setStatus(null); setRequestedId(''); setSenderId(''); setSuccess(false) }}
            className="btn btn-outline w-full text-sm" style={{ minHeight: 44 }}>
            Request a Different ID
          </button>
        </div>
      )}

      {/* ── Rejected state ── */}
      {(status === 'rejected' || (latestRequest?.status === 'rejected' && !status)) && (
        <div className="card mb-4" style={{ border: '1px solid rgba(220,38,38,0.2)', background: 'rgba(220,38,38,0.04)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} color="#dc2626" />
            <p className="text-sm font-bold text-error">Request not approved</p>
          </div>
          <p className="text-sm text-mist mb-1">Requested ID: <strong className="text-forest">{latestRequest?.requested_sender_id ?? requestedId}</strong></p>
          {latestRequest?.rejection_reason && (
            <p className="text-sm text-mist mb-3">Reason: {latestRequest.rejection_reason}</p>
          )}
          <button onClick={() => { setStatus(null); setSuccess(false) }}
            className="btn btn-outline w-full text-sm" style={{ minHeight: 44 }}>
            Submit a New Request
          </button>
        </div>
      )}

      {/* ── Request form — shown when no active/pending request ── */}
      {!status && !success && (
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-forest mb-1">Request a Custom Sender ID</h2>
          <p className="text-sm text-mist mb-4">Want your messages to show your church name? Request a custom sender ID below.</p>

          <div className="space-y-4">
            <div>
              <label className="input-label">Sender ID <span className="text-mist font-normal">(max 11 characters)</span></label>
              <input
                className="input"
                placeholder="e.g. GraceYouth"
                maxLength={11}
                value={senderId}
                onChange={e => { setSenderId(e.target.value.replace(/[^A-Za-z0-9]/g, '')); setError('') }}
              />
              <p className="text-xs text-mist mt-1">{senderId.length}/11 characters · letters and numbers only</p>
            </div>

            <div>
              <label className="input-label">Reason / Use case</label>
              <textarea
                className="input resize-none text-sm"
                style={{ minHeight: 72 }}
                placeholder="e.g. Youth Ministry at Grace Church, used for Sunday attendance follow-ups"
                value={useCase}
                onChange={e => setUseCase(e.target.value)}
              />
            </div>

            {/* Rules */}
            <div className="rounded-xl bg-forest/4 px-4 py-3">
              <p className="text-xs font-bold text-forest mb-1.5">Rules</p>
              {[
                'Maximum 11 characters',
                'Letters and numbers only — no spaces or symbols',
                'Must be your church or group name',
                'Generic words like "SMS", "Alert", "Info" are rejected',
                'Approval takes up to 48 hours',
              ].map(r => <p key={r} className="text-xs text-mist mb-0.5">· {r}</p>)}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                <AlertCircle size={13} color="#dc2626" />
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !senderId.trim()}
              className="btn btn-primary w-full"
              style={{ height: 52, fontSize: 15, opacity: (submitting || !senderId.trim()) ? 0.5 : 1 }}
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
