'use client'

import { useState } from 'react'

const PACKAGES = [
  { credits: 100,  price: 120  },
  { credits: 500,  price: 600  },
  { credits: 1000, price: 1200 },
  { credits: 2000, price: 2400 },
  { credits: 5000, price: 6000 },
]

const CREDITS_PER_SMS = 1
const NAIRA_PER_CREDIT = 1.20
const WHATSAPP_ADMIN = '2348050340350'

export default function CreditsClient({ churchId, balance: initialBalance }) {
  const [balance, setBalance] = useState(initialBalance)
  const [selected, setSelected] = useState(null)
  const [msgCount, setMsgCount] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const customCredits = msgCount ? parseInt(msgCount) * CREDITS_PER_SMS : 0
  const customPrice = Math.ceil(customCredits * NAIRA_PER_CREDIT)

  const activePackage = selected ?? (msgCount ? { credits: customCredits, price: customPrice } : null)

  async function handleConfirm() {
    if (!activePackage) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/credits/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package: activePackage.credits,
          amount: activePackage.price,
          reference: reference.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setConfirmed(true)
    } catch (err) {
      alert(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmed) {
    return (
      <div className="page-content">
        <div className="card text-center py-10 animate-fade-in">
          <p className="text-4xl mb-3">📬</p>
          <h2 className="font-display text-2xl font-semibold text-forest">Payment request sent!</h2>
          <p className="text-sm text-mist mt-2 max-w-xs mx-auto">
            Your request for <strong>{activePackage?.credits} credits</strong> has been logged.
            Credits will be added once payment is confirmed.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(`Hi, I just sent payment for ${activePackage?.credits} credits on ChurchTrakr. Reference: ${reference || 'N/A'}`)}`}
            target="_blank" rel="noreferrer"
            className="btn-sm mt-5 inline-flex gap-2 items-center"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <WhatsAppIcon /> Confirm via WhatsApp
          </a>
          <button onClick={() => setConfirmed(false)} className="btn-ghost btn-sm mt-3 block mx-auto">
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <h1 className="font-display text-2xl font-semibold text-forest mb-2">SMS Credits</h1>

      {/* Balance */}
      <div className="card text-center py-6">
        <p className="text-sm text-mist">Current balance</p>
        <p className="font-display text-5xl font-bold text-forest mt-1">{balance}</p>
        <p className="text-sm text-mist mt-1">credits</p>
        {balance < 20 && (
          <p className="text-xs text-error mt-2">⚠️ Running low — top up soon</p>
        )}
      </div>

      {/* How it works */}
      <div className="card bg-forest/5 border-forest/15 space-y-1.5">
        <p className="text-sm font-semibold text-forest">How credits work</p>
        <p className="text-xs text-forest-muted">• 1 credit = 1 SMS to 1 person</p>
        <p className="text-xs text-forest-muted">• Long messages use 2 credits per person</p>
        <p className="text-xs text-forest-muted">• Credits never expire</p>
      </div>

      {/* Calculator */}
      <div className="card">
        <p className="text-sm font-semibold text-forest mb-3">How many messages do you want to send?</p>
        <input
          className="input text-sm"
          type="number" min="1"
          placeholder="e.g. 50"
          value={msgCount}
          onChange={e => { setMsgCount(e.target.value); setSelected(null) }}
        />
        {msgCount && parseInt(msgCount) > 0 && (
          <div className="mt-3 p-3 bg-gold/10 rounded-xl text-sm space-y-1">
            <p className="text-forest"><span className="font-semibold">{customCredits}</span> credits needed</p>
            <p className="text-forest">≈ <span className="font-semibold">₦{customPrice.toLocaleString()}</span></p>
          </div>
        )}
      </div>

      {/* Packages */}
      <div>
        <p className="text-sm font-semibold text-forest-muted uppercase tracking-wider mb-3">Credit packages</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PACKAGES.map(pkg => (
            <button key={pkg.credits} onClick={() => { setSelected(pkg); setMsgCount('') }}
              className={`card text-center py-4 transition-all active:scale-95
                ${selected?.credits === pkg.credits ? 'border-forest shadow-card-hover bg-forest/5' : 'hover:shadow-card-hover'}`}>
              <p className="font-display text-2xl font-bold text-forest">{pkg.credits.toLocaleString()}</p>
              <p className="text-xs text-mist mt-0.5">credits</p>
              <p className="text-sm font-semibold text-gold-dark mt-2">₦{pkg.price.toLocaleString()}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Payment details */}
      {activePackage && (
        <div className="card border-forest/30 space-y-3 animate-slide-up">
          <p className="font-semibold text-forest">Pay via bank transfer</p>
          <div className="bg-ivory-dark rounded-xl p-4 space-y-2 text-sm">
            <InfoRow label="Bank" value="OPay" />
            <InfoRow label="Account number" value="8050340350" copyable />
            <InfoRow label="Account name" value="Golden Iroka" />
            <InfoRow label="Amount" value={`₦${activePackage.price.toLocaleString()}`} highlight />
          </div>
          <div>
            <label className="input-label">Transfer reference (optional)</label>
            <input className="input text-sm" placeholder="e.g. last 4 digits of transfer"
              value={reference} onChange={e => setReference(e.target.value)} />
          </div>
          <button onClick={handleConfirm} disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Submitting…' : `I've paid ₦${activePackage.price.toLocaleString()} — request ${activePackage.credits} credits`}
          </button>
          <a
            href={`https://wa.me/${WHATSAPP_ADMIN}`}
            target="_blank" rel="noreferrer"
            className="btn-sm w-full flex items-center justify-center gap-2 text-sm"
            style={{ background: '#25D366', color: '#fff' }}
          >
            <WhatsAppIcon /> Contact admin on WhatsApp
          </a>
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}

function InfoRow({ label, value, copyable, highlight }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex justify-between items-center">
      <span className="text-mist">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-semibold ${highlight ? 'text-forest text-base' : 'text-forest'}`}>{value}</span>
        {copyable && (
          <button onClick={copy} className="text-xs text-gold hover:text-gold-dark transition-colors">
            {copied ? '✓' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  )
}

function WhatsAppIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> }
