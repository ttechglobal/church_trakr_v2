'use client'

import { useState } from 'react'
import { Building2, Copy, RefreshCw, Link2Off, Check, Clock, Wifi, WifiOff, User, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const C = {
  forest:'#1a3a2a', mid:'#2d5a42', muted:'#8a9e90',
  gold:'#c9a84c', goldDk:'#a8862e', ivory:'#f7f5f0',
  success:'#16a34a', error:'#dc2626', warning:'#d97706',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' })
}

function StatusBadge({ status }) {
  const map = {
    pending:      { label:'Pending',      bg:'rgba(201,168,76,0.12)', color:C.goldDk },
    approved:     { label:'Connected',    bg:'rgba(22,163,74,0.1)',  color:C.success  },
    disconnected: { label:'Disconnected', bg:'rgba(220,38,38,0.08)', color:C.error    },
  }
  const s = map[status] ?? map.disconnected
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:s.bg, color:s.color }}>
      {s.label}
    </span>
  )
}

export default function ChurchSettingsClient({ church, connections: initialConnections }) {
  const [code, setCode]           = useState(church.connection_code ?? '')
  const [connections, setConn]    = useState(initialConnections)
  const [codeLoading, setCodeLd]  = useState(false)
  const [copied, setCopied]       = useState(false)
  const [actionLoading, setActLd] = useState(null)

  // Profile
  const [profile, setProfile] = useState({ name: church.name ?? '', admin_name: church.admin_name ?? '' })
  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  async function saveProfile() {
    setSaving(true); setSaveMsg('')
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setSaving(false)
    setSaveMsg(res.ok ? '✓ Saved' : 'Save failed')
    setTimeout(() => setSaveMsg(''), 3000)
  }

  async function regenerateCode() {
    if (!confirm('Regenerate code? Existing approved connections will NOT be broken — only new requests use the new code.')) return
    setCodeLd(true)
    const res = await fetch('/api/church/code', { method:'POST' })
    const d = await res.json()
    if (d.code) setCode(d.code)
    setCodeLd(false)
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleAction(connectionId, action) {
    setActLd(connectionId)
    await fetch('/api/church/requests', {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ connectionId, action }),
    })
    // Refresh connections
    const res = await fetch('/api/church/requests')
    const d = await res.json()
    setConn(d.connections ?? [])
    setActLd(null)
  }

  const pending  = connections.filter(c => c.status === 'pending')
  const approved = connections.filter(c => c.status === 'approved')
  const history  = connections.filter(c => c.status === 'disconnected')

  return (
    <div className="page-content pb-16">
      <Link href="/church-dashboard"
        style={{ display:'inline-flex', alignItems:'center', gap:4, color:C.muted, textDecoration:'none', fontSize:13, marginBottom:12 }}>
        <ChevronLeft size={14} /> Dashboard
      </Link>

      <h1 className="font-display" style={{ fontSize:20, fontWeight:800, color:C.forest, margin:'0 0 2px' }}>Settings</h1>
      <p style={{ fontSize:13, color:C.muted, margin:'0 0 0' }}>Church Dashboard Configuration</p>

      {/* ── Church Profile ── */}
      <div className="card" style={{ marginTop:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <Building2 size={15} color={C.mid} />
          <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:15, fontWeight:700, color:C.forest, margin:0 }}>Church Profile</h2>
        </div>
        {[
          { key:'name',       label:'Church Name',  placeholder:'Your church name' },
          { key:'admin_name', label:'Admin Name',   placeholder:'Your name' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} style={{ marginBottom:12 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.forest, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</label>
            <input
              value={profile[key]}
              onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
              placeholder={placeholder}
              className="input"
              style={{ width:'100%', boxSizing:'border-box' }}
            />
          </div>
        ))}
        {saveMsg && <p style={{ fontSize:12, color:C.success, fontWeight:600, margin:'0 0 8px' }}>{saveMsg}</p>}
        <button onClick={saveProfile} disabled={saving} className="btn btn-primary" style={{ width:'100%' }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* ── Connection code ── */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:15, fontWeight:700, color:C.forest, margin:0 }}>Connection Code</h2>
        </div>
        <p style={{ fontSize:12, color:C.muted, margin:'0 0 14px', lineHeight:1.5 }}>
          Share this code with sub-group leaders so they can link to your dashboard. Regenerating does not break approved connections.
        </p>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ flex:1, background:C.ivory, borderRadius:10, padding:'10px 14px' }}>
            <p style={{ fontFamily:'monospace', fontSize:20, fontWeight:800, color:C.forest, margin:0, letterSpacing:'0.1em' }}>
              {code || '—'}
            </p>
          </div>
          <button onClick={copyCode} disabled={!code}
            className="btn btn-outline" style={{ height:44, width:44, padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
          </button>
          <button onClick={regenerateCode} disabled={codeLoading}
            className="btn btn-outline" style={{ height:44, width:44, padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={14} style={{ animation:codeLoading?'spin 1s linear infinite':undefined }} />
          </button>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>

      {/* ── Pending requests ── */}
      {pending.length > 0 && (
        <div className="card">
          <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:15, fontWeight:700, color:C.forest, margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
            <Clock size={14} color={C.goldDk} /> Pending Requests ({pending.length})
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {pending.map(c => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'0.75rem', background:'rgba(201,168,76,0.06)', borderRadius:12, border:'1px solid rgba(201,168,76,0.2)' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.subgroupName}</p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>{c.subgroupAdmin}</p>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button onClick={() => handleAction(c.id, 'approve')} disabled={actionLoading === c.id}
                    className="btn btn-sm" style={{ background:C.success, color:'#fff', border:'none' }}>
                    Approve
                  </button>
                  <button onClick={() => handleAction(c.id, 'reject')} disabled={actionLoading === c.id}
                    className="btn btn-sm btn-outline" style={{ color:C.error, borderColor:C.error }}>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Connected groups ── */}
      <div className="card">
        <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:15, fontWeight:700, color:C.forest, margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
          <Wifi size={14} color={C.success} /> Connected Groups ({approved.length})
        </h2>
        {approved.length === 0 ? (
          <p style={{ fontSize:13, color:C.muted, margin:0 }}>No groups connected yet. Share your connection code above.</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {approved.map((c, i) => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'0.75rem 0', borderBottom: i < approved.length-1 ? '1px solid rgba(26,58,42,0.06)' : 'none' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:C.forest, margin:'0 0 1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.subgroupName}</p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>Connected {fmtDate(c.connected_at)}</p>
                </div>
                <button
                  onClick={() => { if(confirm(`Disconnect ${c.subgroupName}? Their historical data will remain visible.`)) handleAction(c.id, 'disconnect') }}
                  disabled={actionLoading === c.id}
                  className="btn btn-sm btn-outline"
                  style={{ color:C.error, borderColor:'rgba(220,38,38,0.3)', flexShrink:0 }}
                >
                  <Link2Off size={12} /> Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="card">
          <h2 style={{ fontFamily:'var(--font-playfair,Georgia,serif)', fontSize:14, fontWeight:700, color:C.muted, margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
            <WifiOff size={13} /> Disconnected History
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {history.map((c, i) => (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'0.625rem 0', borderBottom: i < history.length-1 ? '1px solid rgba(26,58,42,0.06)' : 'none', opacity:0.6 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:C.forest, margin:'0 0 1px' }}>{c.subgroupName}</p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>Disconnected {fmtDate(c.disconnected_at)}</p>
                </div>
                <StatusBadge status="disconnected" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
