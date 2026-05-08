'use client'

import { useState } from 'react'
import BackButton from '@/components/ui/BackButton'
import {
  MessageSquare, CheckCircle, Zap, AlertCircle, ExternalLink
} from 'lucide-react'

const C = {
  forest: '#1a3a2a', mid: '#2d5a42', muted: '#8a9e90',
  gold: '#c9a84c', goldDk: '#a8862e', ivory: '#f7f5f0', ivoryDeep: '#e0dbd0',
  success: '#16a34a', error: '#dc2626',
}

const PACKS = [
  { id: 'starter',     credits: 100,  price: 1500,  label: 'Starter',    popular: false, perSms: 15  },
  { id: 'basic',       credits: 300,  price: 4000,  label: 'Basic',      popular: false, perSms: 13  },
  { id: 'standard',   credits: 600,  price: 7500,  label: 'Standard',   popular: true,  perSms: 12  },
  { id: 'growth',     credits: 1200, price: 14000, label: 'Growth',     popular: false, perSms: 11  },
  { id: 'premium',    credits: 2500, price: 27500, label: 'Premium',    popular: false, perSms: 11  },
]

function formatNaira(koboAmount) {
  return `₦${(koboAmount / 100).toLocaleString('en-NG')}`
}

export default function CreditsClient({ church }) {
  const [selected,  setSelected]  = useState('standard')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(null)

  const pack = PACKS.find(p => p.id === selected)

  async function handlePurchase() {
    if (!pack) return
    setLoading(true); setError('')

    try {
      const res = await fetch('/api/credits/initiate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: selected }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to initiate payment. Please try again.')
        return
      }

      // Redirect to Paystack/Flutterwave payment page
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
        return
      }

      // If no payment gateway configured, show contact info
      if (data.manual) {
        setSuccess(data)
      }

    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="page-content pb-16">
        <BackButton />
        <div className="card text-center py-10 space-y-4">
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(22,163,74,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto',
          }}>
            <CheckCircle size={28} color={C.success} />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-forest">Order Received</h2>
            <p className="text-sm text-mist mt-2 leading-relaxed">
              Your request for <strong className="text-forest">{pack?.credits} SMS credits</strong> has
              been received. Credits will be added to your account within 24 hours after payment confirmation.
            </p>
          </div>
          {success.reference && (
            <div className="bg-ivory rounded-xl p-3">
              <p className="text-xs text-mist mb-1">Reference number</p>
              <p className="font-mono font-bold text-forest text-sm">{success.reference}</p>
            </div>
          )}
          {success.paymentDetails && (
            <div className="bg-ivory rounded-xl p-4 text-left space-y-2">
              <p className="text-sm font-bold text-forest">Payment Details</p>
              {Object.entries(success.paymentDetails).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-mist">{key}</span>
                  <span className="font-medium text-forest">{val}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setSuccess(null)} className="btn btn-outline w-full">
            Buy more credits
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content pb-20">
      <BackButton />
      <h1 className="font-display text-2xl font-bold text-forest mb-1">Buy SMS Credits</h1>
      <p className="text-sm text-mist mb-2">
        Current balance: <strong className="text-forest">{church.sms_credits} credits</strong>
      </p>
      <p className="text-xs text-mist mb-6">
        Each SMS to one member = 1 credit · Credits never expire
      </p>

      {/* Credit packs */}
      <div className="space-y-3 mb-6">
        {PACKS.map(p => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            style={{
              width: '100%', textAlign: 'left', padding: '14px 16px',
              borderRadius: 16, border: 'none', cursor: 'pointer',
              background: selected === p.id ? C.forest : '#fff',
              boxShadow: selected === p.id
                ? 'none'
                : '0 1px 4px rgba(26,58,42,0.08), 0 0 0 1px rgba(26,58,42,0.07)',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            {/* Icon */}
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: selected === p.id ? 'rgba(255,255,255,0.12)' : 'rgba(26,58,42,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquare size={18} color={selected === p.id ? '#e8d5a0' : C.mid} strokeWidth={1.75} />
            </div>

            {/* Label + credits */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: selected === p.id ? '#fff' : C.forest, margin: 0 }}>
                  {p.credits.toLocaleString()} Credits
                </p>
                {p.popular && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                    background: selected === p.id ? 'rgba(201,168,76,0.3)' : 'rgba(201,168,76,0.2)',
                    color: selected === p.id ? '#e8d5a0' : C.goldDk,
                  }}>
                    POPULAR
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: selected === p.id ? 'rgba(255,255,255,0.55)' : C.muted, margin: '2px 0 0' }}>
                ₦{p.perSms}/SMS
              </p>
            </div>

            {/* Price */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{
                fontFamily: 'var(--font-playfair,Georgia,serif)',
                fontSize: 18, fontWeight: 800,
                color: selected === p.id ? '#e8d5a0' : C.forest,
                margin: 0, lineHeight: 1,
              }}>
                ₦{(p.price / 100).toLocaleString()}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* What you get */}
      {pack && (
        <div style={{
          background: C.ivory, borderRadius: 16, padding: '1rem 1.25rem', marginBottom: 20,
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.forest, margin: '0 0 10px',
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            What you get
          </p>
          {[
            { label: 'Credits', value: `${pack.credits.toLocaleString()} SMS credits` },
            { label: 'Cost per SMS', value: `₦${pack.perSms}` },
            { label: 'Total price', value: `₦${(pack.price / 100).toLocaleString()}` },
            { label: 'Expiry', value: 'Never — credits roll over' },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.forest }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Features */}
      <div className="card space-y-2 mb-6">
        <p className="text-xs font-bold text-forest uppercase tracking-wide mb-2">Included with every pack</p>
        {[
          'Send to all members or specific groups',
          'Personalised messages with {name}',
          'Sunday reminders, event announcements, follow-ups',
          'Delivery tracking per send',
          'Credits never expire',
        ].map(f => (
          <div key={f} className="flex items-center gap-2">
            <CheckCircle size={13} className="text-success shrink-0" />
            <p className="text-sm text-forest">{f}</p>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', gap: 8, background: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.2)', borderRadius: 12,
          padding: '12px 14px', marginBottom: 12,
        }}>
          <AlertCircle size={15} color={C.error} style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: C.error, margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Buy button */}
      <button
        onClick={handlePurchase}
        disabled={loading || !pack}
        className="btn btn-primary w-full gap-2"
        style={{ height: 52, fontSize: 16 }}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z" opacity="0.75"/>
            </svg>
            Processing…
          </>
        ) : (
          <>
            <Zap size={16} />
            Buy {pack?.credits.toLocaleString()} Credits — ₦{pack ? (pack.price / 100).toLocaleString() : ''}
          </>
        )}
      </button>

      <p className="text-xs text-mist text-center mt-3">
        Secure payment · Credits added instantly after confirmation
      </p>

      {/* Need custom volume */}
      <div style={{
        marginTop: 20, padding: '12px 14px', borderRadius: 12,
        border: `1px dashed ${C.ivoryDeep}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Zap size={14} color={C.goldDk} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.forest, margin: '0 0 1px' }}>Need more than 2,500 credits?</p>
          <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>Contact us for bulk pricing and custom packages.</p>
        </div>
        <a
          href="mailto:hello@churchtrakr.com"
          style={{ fontSize: 11, fontWeight: 700, color: C.mid, display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none', flexShrink: 0 }}
        >
          Contact <ExternalLink size={10} />
        </a>
      </div>
    </div>
  )
}
