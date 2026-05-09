'use client'

import { useState } from 'react'
import BackButton from '@/components/ui/BackButton'
import { MessageSquare, CheckCircle, AlertCircle, Zap, History, Copy, Check } from 'lucide-react'

// ── Pricing (spec) ─────────────────────────────────────────────────────────────
// Shown on selection screen: base price only (no platform charge shown)
// Platform charge (₦100 flat) revealed on the checkout / transfer screen
const PACKS = [
  { id: 'starter',  credits: 200,  baseNaira: 1000, label: 'Starter',  popular: false },
  { id: 'standard', credits: 400,  baseNaira: 2000, label: 'Standard', popular: true  },
  { id: 'growth',   credits: 600,  baseNaira: 3000, label: 'Growth',   popular: false },
  { id: 'pro',      credits: 1000, baseNaira: 5000, label: 'Pro',      popular: false },
]
const PLATFORM_CHARGE = 100  // ₦100 flat on every package
const CREDITS_PER_SMS = 5
const WHATSAPP_NUMBER = '2348050340350'

const fmtN = (n) => `₦${Number(n).toLocaleString('en-NG')}`

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ display:'inline-flex', alignItems:'center', gap:4, height:28, padding:'0 10px', borderRadius:7, border:'none', cursor:'pointer', background:'rgba(255,255,255,0.15)', color:'#e8d5a0', fontSize:12, fontWeight:700 }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

export default function CreditsClient({ church, transactions = [] }) {
  const [balance,    setBalance]    = useState(church.sms_credits ?? 0)
  const [selected,   setSelected]   = useState('standard')
  const [customQty,  setCustomQty]  = useState('')
  const [tab,        setTab]        = useState('buy')      // 'buy' | 'history'
  const [step,       setStep]       = useState('select')   // 'select' | 'checkout' | 'sent'
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [orderData,  setOrderData]  = useState(null)       // returned from /api/credits/initiate

  const isCustom      = selected === 'custom'
  const customCredits = parseInt(customQty) || 0
  const customBase    = customCredits >= 10 ? customCredits * 5 : 0
  const customTotal   = customBase > 0 ? customBase + PLATFORM_CHARGE : 0

  const activePack = isCustom
    ? (customCredits >= 10 ? { id: 'custom', label: 'Custom', credits: customCredits, baseNaira: customBase, totalNaira: customTotal } : null)
    : PACKS.find(p => p.id === selected)

  // Step 1 — user clicks "Continue to payment"
  async function handleContinue() {
    if (!activePack || submitting) return
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/credits/initiate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId: activePack.id, customCredits: isCustom ? activePack.credits : undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong. Please try again.'); return }

      // If Paystack is live, redirect there
      if (data.paymentUrl) { window.location.href = data.paymentUrl; return }

      // Manual mode — show transfer screen
      setOrderData(data)
      setStep('checkout')
    } catch { setError('Network error. Please try again.') }
    finally   { setSubmitting(false) }
  }

  // Step 2 — user taps "I have paid"
  async function handleNotify() {
    if (!orderData || submitting) return
    setSubmitting(true)

    // Save to DB (non-blocking)
    fetch('/api/credits/notify-transfer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference:        orderData.reference,
        packageName:      activePack?.label ?? '',
        creditsRequested: orderData.credits,
        amountPaid:       orderData.totalNaira,
      }),
    }).catch(() => {})

    // Build WhatsApp message
    const now = new Date().toLocaleString('en-NG', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
    const msg = [
      'Hello ChurchTrakr Admin 👋',
      '',
      'New credit purchase notification:',
      '',
      `Name: ${church.admin_name || 'N/A'}`,
      `Email: ${church.email || 'N/A'}`,
      `Church/Group: ${church.name}`,
      `Package: ${activePack?.label} (${orderData.credits} credits)`,
      `Amount Paid: ${fmtN(orderData.totalNaira)}`,
      `Reference: ${orderData.reference}`,
      `Date: ${now}`,
      '',
      'Please credit their account. Thank you!',
    ].join('\n')

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank')
    setStep('sent')
    setSubmitting(false)
  }

  function statusStyle(s) {
    if (s === 'completed' || s === 'credited') return { bg:'rgba(22,163,74,.10)', color:'#16a34a', label:'PAID' }
    if (s === 'pending' || s === 'pending_manual') return { bg:'rgba(217,119,6,.10)', color:'#d97706', label:'PENDING' }
    return { bg:'rgba(220,38,38,.10)', color:'#dc2626', label:(s??'').toUpperCase() }
  }

  return (
    <div className="page-content pb-20">
      <BackButton />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-forest">SMS Credits</h1>
          <p className="text-sm text-mist mt-0.5">Each SMS costs {CREDITS_PER_SMS} credits (₦5)</p>
        </div>
        <div style={{ background:'#1a3a2a', borderRadius:14, padding:'10px 16px', textAlign:'center', flexShrink:0 }}>
          <p className="font-display" style={{ fontSize:26, fontWeight:800, color:'#e8d5a0', lineHeight:1, margin:0 }}>{balance}</p>
          <p style={{ fontSize:10, color:'rgba(232,213,160,.55)', fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', margin:'3px 0 0' }}>credits</p>
        </div>
      </div>

      {balance === 0 && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4" style={{ background:'rgba(220,38,38,.06)', border:'1px solid rgba(220,38,38,.15)' }}>
          <AlertCircle size={14} className="text-error shrink-0" />
          <p className="text-sm text-error font-semibold">No credits — SMS sending is paused. Top up below.</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, background:'#ede9e0', borderRadius:12, padding:3, marginBottom:20 }}>
        {[['buy','Buy Credits'],['history','History']].map(([t,label]) => (
          <button key={t} onClick={() => { setTab(t); setStep('select') }}
            style={{ flex:1, height:34, borderRadius:9, border:'none', cursor:'pointer', fontSize:13,
              fontWeight: tab===t ? 700 : 500, background: tab===t ? '#fff' : 'transparent',
              color: tab===t ? '#1a3a2a' : '#8a9e90', boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,.08)' : 'none', transition:'all .15s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── BUY TAB ─────────────────────────────────────────────────────────── */}
      {tab === 'buy' && (
        <>
          {/* SELECT STEP */}
          {step === 'select' && (
            <>
              <p className="text-xs font-bold text-mist uppercase tracking-widest mb-3">Choose a package</p>

              <div className="space-y-3 mb-4">
                {PACKS.map(p => {
                  const sel = selected === p.id
                  return (
                    <button key={p.id} onClick={() => { setSelected(p.id); setCustomQty('') }}
                      style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, border:'none', cursor:'pointer', width:'100%', textAlign:'left', position:'relative',
                        background: sel ? '#1a3a2a' : '#fff',
                        boxShadow: sel ? 'none' : '0 1px 4px rgba(26,58,42,.08), 0 0 0 1px rgba(26,58,42,.07)', transition:'all .15s' }}>
                      {p.popular && (
                        <span style={{ position:'absolute', top:-9, right:12, fontSize:10, fontWeight:800, padding:'3px 8px', borderRadius:8, background:'#c9a84c', color:'#1a3a2a' }}>POPULAR</span>
                      )}
                      <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background: sel ? 'rgba(255,255,255,.12)' : 'rgba(26,58,42,.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <MessageSquare size={18} color={sel ? '#e8d5a0' : '#2d5a42'} strokeWidth={1.75} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:15, fontWeight:700, color: sel ? '#fff' : '#1a3a2a', margin:0 }}>{p.label}</p>
                        <p style={{ fontSize:13, color: sel ? 'rgba(255,255,255,.6)' : '#8a9e90', margin:'2px 0 0' }}>{p.credits} SMS credits</p>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <p className="font-display" style={{ fontSize:18, fontWeight:800, color: sel ? '#e8d5a0' : '#1a3a2a', margin:0, lineHeight:1 }}>{fmtN(p.baseNaira)}</p>
                      </div>
                    </button>
                  )
                })}

                {/* Custom */}
                <button onClick={() => setSelected('custom')}
                  style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:16, border:'none', cursor:'pointer', width:'100%', textAlign:'left',
                    background: selected==='custom' ? '#1a3a2a' : '#fff',
                    boxShadow: selected==='custom' ? 'none' : '0 1px 4px rgba(26,58,42,.08), 0 0 0 1px rgba(26,58,42,.07)', transition:'all .15s' }}>
                  <div style={{ width:42, height:42, borderRadius:12, flexShrink:0, background: selected==='custom' ? 'rgba(255,255,255,.12)' : 'rgba(26,58,42,.06)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Zap size={18} color={selected==='custom' ? '#e8d5a0' : '#2d5a42'} strokeWidth={1.75} />
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:15, fontWeight:700, color: selected==='custom' ? '#fff' : '#1a3a2a', margin:0 }}>Custom Amount</p>
                    <p style={{ fontSize:13, color: selected==='custom' ? 'rgba(255,255,255,.6)' : '#8a9e90', margin:'2px 0 0' }}>Enter exactly how many you need</p>
                  </div>
                </button>
              </div>

              {selected === 'custom' && (
                <div className="card mb-4">
                  <p className="text-sm font-semibold text-forest mb-2">How many credits?</p>
                  <input type="number" min="10" max="100000" className="input" placeholder="e.g. 250"
                    value={customQty} onChange={e => setCustomQty(e.target.value)} />
                  {customCredits >= 10 && (
                    <div className="flex justify-between mt-3 text-sm">
                      <span className="text-mist">{customCredits} credits</span>
                      <span className="font-display font-bold text-forest text-base">{fmtN(customBase)}</span>
                    </div>
                  )}
                  {customQty && customCredits < 10 && <p className="text-xs text-error mt-2">Minimum 10 credits</p>}
                </div>
              )}

              {error && (
                <div className="flex gap-2 items-center rounded-xl px-4 py-3 mb-4" style={{ background:'rgba(220,38,38,.06)', border:'1px solid rgba(220,38,38,.15)' }}>
                  <AlertCircle size={14} className="text-error shrink-0" />
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              <button onClick={handleContinue} disabled={!activePack || submitting} className="btn btn-primary w-full gap-2" style={{ height:52, fontSize:15, opacity:(!activePack||submitting)?0.45:1 }}>
                {submitting ? 'Please wait…' : activePack ? `Continue — ${activePack.credits} credits` : 'Select a package'}
              </button>
              <p className="text-xs text-mist text-center mt-3">Pay via bank transfer · Credits added within minutes</p>
            </>
          )}

          {/* CHECKOUT STEP — order summary with platform charge */}
          {step === 'checkout' && orderData && activePack && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <h2 className="font-display text-xl font-bold text-forest">Order Summary</h2>
              </div>

              {/* Order breakdown */}
              <div className="card" style={{ background:'#f7f5f0' }}>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-mist">Package</span>
                    <span className="font-semibold text-forest">{activePack.label} — {activePack.credits} SMS credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mist">SMS Credits</span>
                    <span className="font-semibold text-forest">{activePack.credits} credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mist">Base Price</span>
                    <span className="font-semibold text-forest">{fmtN(activePack.baseNaira)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mist">Platform Charge</span>
                    <span className="font-semibold text-forest">{fmtN(PLATFORM_CHARGE)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-forest/10">
                    <span className="font-bold text-forest text-base">Total to Pay</span>
                    <span className="font-display font-bold text-forest text-xl">{fmtN(activePack.totalNaira ?? (activePack.baseNaira + PLATFORM_CHARGE))}</span>
                  </div>
                </div>
              </div>

              {/* Bank details */}
              <div style={{ background:'linear-gradient(135deg,#1a3a2a,#2d5a42)', borderRadius:18, padding:20 }}>
                <p style={{ fontSize:11, fontWeight:700, color:'rgba(232,213,160,.65)', textTransform:'uppercase', letterSpacing:'.07em', margin:'0 0 16px' }}>
                  Bank Transfer Details
                </p>
                {[
                  { label:'Bank',           value: orderData.paymentDetails?.bank          ?? process.env.NEXT_PUBLIC_BANK_NAME           ?? 'OPay' },
                  { label:'Account Name',   value: orderData.paymentDetails?.accountName   ?? process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME   ?? 'Golden Iroka' },
                  { label:'Account Number', value: orderData.paymentDetails?.accountNumber ?? process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? '8050340350', copy:true },
                ].map(({ label, value, copy }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                    <span style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>{label}</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{value}</span>
                      {copy && <CopyBtn value={value} />}
                    </div>
                  </div>
                ))}
                <div style={{ borderTop:'1px solid rgba(255,255,255,.1)', paddingTop:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>Amount to Transfer</span>
                  <span className="font-display" style={{ fontSize:22, fontWeight:800, color:'#e8d5a0' }}>{fmtN(activePack.totalNaira ?? (activePack.baseNaira + PLATFORM_CHARGE))}</span>
                </div>
              </div>

              <div style={{ background:'rgba(201,168,76,.08)', border:'1px solid rgba(201,168,76,.2)', borderRadius:14, padding:'14px 16px' }}>
                <p className="text-sm font-bold text-forest mb-1">After paying, tap the button below</p>
                <p className="text-sm text-mist leading-relaxed">We'll be notified and add your credits within a few minutes.</p>
              </div>

              <button onClick={handleNotify} disabled={submitting} className="btn btn-primary w-full gap-2" style={{ height:52, fontSize:15, background:'#25D366', borderColor:'#25D366' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                I Have Paid — Notify Admin
              </button>

              <button onClick={() => setStep('select')} className="btn btn-outline w-full" style={{ height:44 }}>← Change package</button>
            </div>
          )}

          {/* SENT STEP */}
          {step === 'sent' && (
            <div className="flex flex-col items-center text-center gap-4 py-8">
              <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(22,163,74,.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <CheckCircle size={34} className="text-success" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-bold text-forest">Message sent!</h2>
                <p className="text-sm text-mist mt-2 max-w-xs mx-auto leading-relaxed">Your credits will be added shortly. Contact us on WhatsApp if you need help.</p>
              </div>
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer"
                className="btn w-full gap-2" style={{ height:48, background:'#25D366', color:'#fff', fontSize:14, border:'none' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Contact us on WhatsApp
              </a>
              <button onClick={() => { setStep('select'); setError('') }} className="btn btn-outline w-full" style={{ height:44 }}>Back to credits</button>
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ─────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        transactions.length === 0 ? (
          <div className="card text-center py-12">
            <History size={32} className="text-mist mx-auto mb-3" strokeWidth={1.25} />
            <p className="font-semibold text-forest">No purchases yet</p>
            <p className="text-sm text-mist mt-1">Your top-up history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map(tx => {
              const s = statusStyle(tx.status)
              const naira = tx.amount_kobo ? Math.round(tx.amount_kobo / 100) : (tx.amount_paid ?? 0)
              const credits = tx.credits ?? tx.credits_requested ?? 0
              return (
                <div key={tx.id} className="card flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-forest text-sm">+{credits.toLocaleString()} credits</p>
                    <p className="text-xs text-mist mt-0.5">{fmtDate(tx.created_at)}</p>
                    {tx.reference && <p className="text-xs text-mist mt-0.5 font-mono truncate">{tx.reference}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-forest text-sm">{naira ? fmtN(naira) : '—'}</p>
                    <span style={{ display:'inline-block', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, marginTop:4, background:s.bg, color:s.color }}>{s.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}
