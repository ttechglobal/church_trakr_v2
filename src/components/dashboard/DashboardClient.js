'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckSquare, UserPlus, ChevronRight,
  Phone, X, User, MapPin, Gift, ClipboardList,
} from 'lucide-react'
import { getGreeting, getAv } from '@/lib/utils'

// ── Add Member Modal — unchanged, just preserved ──────────────────────────────
function AddMemberModal({ onClose, onAdded }) {
  const [form,   setForm]   = useState({ name: '', phone: '', address: '', birthday: '' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'active' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to add member')
      onAdded(data.member)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'flex-end', justifyContent:'center', background:'rgba(0,0,0,0.45)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', maxWidth:480, background:'#fff', borderRadius:'20px 20px 0 0', padding:'1.5rem 1.25rem 2rem', boxShadow:'0 -8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ width:36, height:4, borderRadius:2, background:'#e0dbd0', margin:'0 auto 1.25rem' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
          <h2 style={{ fontFamily:'var(--font-playfair),Georgia,serif', fontSize:20, fontWeight:700, color:'#1a3a2a', margin:0 }}>Add Member</h2>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', border:'none', background:'rgba(26,58,42,0.07)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <X size={15} color="#1a3a2a" />
          </button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {[
            { key:'name',     Icon:User,   placeholder:'Full name *',                  type:'text' },
            { key:'phone',    Icon:Phone,  placeholder:'Phone number',                 type:'tel'  },
            { key:'address',  Icon:MapPin, placeholder:'Address (optional)',            type:'text' },
            { key:'birthday', Icon:Gift,   placeholder:'Birthday (DD/MM or DD/MM/YYYY)',type:'text' },
          ].map(({ key, Icon, placeholder, type }) => (
            <div key={key} style={{ position:'relative' }}>
              <Icon size={14} color="#8a9e90" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
              <input value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} type={type} autoFocus={key==='name'}
                style={{ width:'100%', height:48, borderRadius:12, border:'1.5px solid rgba(26,58,42,0.15)', paddingLeft:36, paddingRight:14, fontSize:14, outline:'none', boxSizing:'border-box', fontFamily:'inherit', color:'#1a3a2a', background:'#fafaf9' }} />
            </div>
          ))}
        </div>
        {error && <p style={{ fontSize:13, color:'#dc2626', margin:'10px 0 0', fontWeight:500 }}>{error}</p>}
        <div style={{ display:'flex', gap:10, marginTop:18 }}>
          <button onClick={onClose} style={{ flex:1, height:50, borderRadius:13, border:'1.5px solid rgba(26,58,42,0.15)', background:'none', cursor:'pointer', fontSize:14, fontWeight:600, color:'#8a9e90', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="btn btn-primary" style={{ flex:2, height:50, borderRadius:13, fontSize:15, opacity:(saving||!form.name.trim())?0.6:1 }}>
            {saving ? 'Adding…' : 'Add Member'}
          </button>
        </div>
        <p style={{ textAlign:'center', fontSize:12, color:'#8a9e90', marginTop:10 }}>You can add them to groups on the Members page</p>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DashboardClient({
  church, members, sessions, firstTimers,
  pendingFollowUps, pendingCount,
  lastSundayRate, lastSundayColor,
  consecutiveAbsent, lowAttendance,
}) {
  const router = useRouter()
  const [showAddMember, setShowAddMember] = useState(false)
  const [memberCount,   setMemberCount]   = useState(members.length)
  const [addSuccess,    setAddSuccess]    = useState(null)

  const lastSession = sessions[0] ?? null
  const lastPresent = lastSession?.attendance_records?.filter(r => r.present).length ?? 0
  const lastTotal   = lastSession?.attendance_records?.length ?? 0
  const lastAbsent  = lastTotal - lastPresent

  const avgRate = sessions.length > 0
    ? Math.round(
        sessions.slice(0, 4).reduce((sum, s) => {
          const t = s.attendance_records?.length ?? 0
          const p = s.attendance_records?.filter(r => r.present).length ?? 0
          return sum + (t > 0 ? (p / t) * 100 : 0)
        }, 0) / Math.min(sessions.length, 4)
      )
    : null

  const handleMemberAdded = useCallback((member) => {
    setShowAddMember(false)
    setMemberCount(c => c + 1)
    setAddSuccess({ name: member.name.split(' ')[0] })
    setTimeout(() => setAddSuccess(null), 3500)
    router.refresh()
  }, [router])

  // Urgency items — consecutive absences only, capped at 3 on dashboard
  const urgentItems = consecutiveAbsent.slice(0, 3)

  return (
    <>
      <style>{`
        .d-cta:hover   { background: #2d5a42 !important; }
        .d-act:hover   { background: rgba(26,58,42,0.05) !important; }
        .d-row:hover   { background: #fafaf9 !important; }
        .d-stat        { transition: none; }
      `}</style>

      {showAddMember && <AddMemberModal onClose={() => setShowAddMember(false)} onAdded={handleMemberAdded} />}

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1.25rem 5rem' }}>

        {/* ── Greeting ── */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'1.75rem', gap:12 }}>
          <div>
            <p style={{ fontSize:13, color:'#8a9e90', margin:'0 0 3px' }}>{getGreeting()}</p>
            <h1 style={{ fontFamily:'var(--font-playfair),Georgia,serif', fontSize:22, fontWeight:700, color:'#1a3a2a', margin:0, letterSpacing:'-0.02em' }}>
              {church.admin_name || church.name}
            </h1>
          </div>
          <button
            onClick={() => setShowAddMember(true)}
            style={{ display:'flex', alignItems:'center', gap:6, height:36, padding:'0 12px', borderRadius:10, border:'1px solid rgba(26,58,42,0.15)', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#1a3a2a', fontFamily:'inherit', flexShrink:0, marginTop:4 }}
          >
            <UserPlus size={14} /> Add member
          </button>
        </div>

        {/* ── Success toast ── */}
        {addSuccess && (
          <div style={{ background:'#f0fdf4', border:'1px solid rgba(22,163,74,0.2)', borderRadius:12, padding:'11px 14px', marginBottom:'1rem', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:15 }}>✅</span>
            <p style={{ fontSize:13, fontWeight:600, color:'#16a34a', margin:0 }}>{addSuccess.name} added</p>
            <Link href="/members" style={{ fontSize:12, color:'#16a34a', fontWeight:700, textDecoration:'none', marginLeft:'auto' }}>View →</Link>
          </div>
        )}

        {/* ── Last Sunday stats — three clean numbers ── */}
        {lastTotal > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:'1.5rem' }}>
            {[
              { label:'Present',  value: lastPresent,                            color:'#16a34a' },
              { label:'Absent',   value: lastAbsent,                             color:'#dc2626' },
              { label:'Rate',     value: lastSundayRate !== null ? `${lastSundayRate}%` : '—', color: lastSundayColor },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background:'#fff', borderRadius:14, padding:'14px 12px', border:'1px solid rgba(26,58,42,0.07)', textAlign:'center' }}>
                <p style={{ fontFamily:'var(--font-playfair),Georgia,serif', fontSize:24, fontWeight:700, color, margin:'0 0 3px', lineHeight:1 }}>{value}</p>
                <p style={{ fontSize:11, color:'#8a9e90', margin:0, textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Take Attendance CTA ── */}
        <Link href="/attendance" className="d-cta" style={{ display:'flex', alignItems:'center', gap:14, padding:'1rem 1.25rem', background:'#1a3a2a', borderRadius:16, textDecoration:'none', marginBottom:'1.5rem', transition:'background 0.15s' }}>
          <div style={{ width:42, height:42, borderRadius:11, background:'rgba(201,168,76,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <CheckSquare size={20} color="#c9a84c" strokeWidth={2} />
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:15, fontWeight:700, color:'#fff', margin:0 }}>Take Attendance</p>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:'2px 0 0' }}>
              {lastSession
                ? `Last: ${new Date(lastSession.date + 'T00:00:00').toLocaleDateString('en-NG', { weekday:'short', month:'short', day:'numeric' })}`
                : 'Mark who came today'}
            </p>
          </div>
          <ChevronRight size={17} color="rgba(255,255,255,0.35)" />
        </Link>

        {/* ── Assign Follow-ups — only show when there are pending ── */}
        {pendingCount > 0 && (
          <Link href="/absentees/assign"
            style={{ display:'flex', alignItems:'center', gap:12, padding:'0.75rem 1rem', background:'#fff', border:'1px solid rgba(26,58,42,0.08)', borderRadius:14, textDecoration:'none', marginBottom:'1.5rem' }}>
            <div style={{ width:36, height:36, borderRadius:9, background:'rgba(201,168,76,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <ClipboardList size={17} color="#a8862e" />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:600, color:'#1a3a2a', margin:0 }}>Assign follow-ups</p>
              <p style={{ fontSize:11, color:'#8a9e90', margin:'2px 0 0' }}>{pendingCount} people need to be reached</p>
            </div>
            <ChevronRight size={15} color="#d0d0d0" />
          </Link>
        )}

        {/* ── Follow-up needed — the most important list ── */}
        {pendingCount > 0 && (
          <div style={{ marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <h2 style={{ fontFamily:'var(--font-playfair),Georgia,serif', fontSize:15, fontWeight:700, color:'#1a3a2a', margin:0 }}>
                Follow-up needed
                <span style={{ marginLeft:8, fontSize:12, fontWeight:600, background:'rgba(220,38,38,0.1)', color:'#dc2626', padding:'2px 7px', borderRadius:20 }}>{pendingCount}</span>
              </h2>
              <Link href="/absentees" style={{ fontSize:13, color:'#4a8a65', fontWeight:600, textDecoration:'none' }}>See all →</Link>
            </div>
            <div style={{ background:'#fff', border:'1px solid rgba(26,58,42,0.08)', borderRadius:14, overflow:'hidden' }}>
              {pendingFollowUps.slice(0, 4).map((p, i) => {
                const av = getAv(p.name)
                return (
                  <Link key={p.key} href="/absentees" className="d-row"
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'0.75rem 1rem', borderBottom: i < Math.min(pendingFollowUps.length, 4) - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none', textDecoration:'none', transition:'background 0.1s' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:av.bg, color:av.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{av.initials}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'#1a3a2a', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</p>
                      <p style={{ fontSize:11, color:'#8a9e90', margin:'2px 0 0' }}>
                        Absent {p.date ? new Date(p.date + 'T00:00:00').toLocaleDateString('en-NG', { month:'short', day:'numeric' }) : ''}
                      </p>
                    </div>
                    <ChevronRight size={13} color="#d0d0d0" style={{ flexShrink:0 }} />
                  </Link>
                )
              })}
              {pendingCount > 4 && (
                <Link href="/absentees" style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0.6rem', borderTop:'1px solid rgba(26,58,42,0.06)', fontSize:13, fontWeight:600, color:'#4a8a65', textDecoration:'none', background:'rgba(26,58,42,0.02)' }}>
                  +{pendingCount - 4} more →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Needs attention — only show if there are urgent items ── */}
        {urgentItems.length > 0 && (
          <div style={{ marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <h2 style={{ fontFamily:'var(--font-playfair),Georgia,serif', fontSize:15, fontWeight:700, color:'#1a3a2a', margin:0 }}>Needs attention</h2>
              {consecutiveAbsent.length > 3 && (
                <Link href="/absentees" style={{ fontSize:13, color:'#4a8a65', fontWeight:600, textDecoration:'none' }}>See all →</Link>
              )}
            </div>
            <div style={{ background:'#fff', border:'1px solid rgba(217,119,6,0.12)', borderRadius:14, overflow:'hidden' }}>
              {urgentItems.map((item, i) => {
                const av = getAv(item.name)
                return (
                  <Link key={item.id} href={'/members/' + item.id} className="d-row"
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'0.75rem 1rem', borderBottom: i < urgentItems.length - 1 ? '1px solid rgba(26,58,42,0.06)' : 'none', textDecoration:'none', transition:'background 0.1s' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:av.bg, color:av.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{av.initials}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, fontWeight:600, color:'#1a3a2a', margin:0 }}>{item.name}</p>
                      <p style={{ fontSize:11, color:'#d97706', margin:'2px 0 0' }}>{item.streak} Sundays absent in a row</p>
                    </div>
                    {item.phone && (
                      <a href={`tel:${item.phone}`} onClick={e => e.stopPropagation()} style={{ width:30, height:30, borderRadius:8, background:'rgba(22,163,74,0.08)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <Phone size={13} color="#16a34a" />
                      </a>
                    )}
                    <ChevronRight size={13} color="#d0d0d0" style={{ flexShrink:0 }} />
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Quick links — 2 up, only the useful ones ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {[
            { label:'Members',    sub: `${memberCount} active`,   href:'/members',    emoji:'👥' },
            { label:'First Timers', sub:`${firstTimers?.length??0} recorded`, href:'/firsttimers', emoji:'⭐' },
            { label:'Reports',    sub:'Generate & share',         href:'/report',     emoji:'📄' },
            { label:'Analytics',  sub:'Trends & rates',           href:'/analytics',  emoji:'📊' },
          ].map(({ label, sub, href, emoji }) => (
            <Link key={label} href={href} className="d-act"
              style={{ display:'flex', alignItems:'center', gap:10, padding:'0.875rem 1rem', background:'#fff', border:'1px solid rgba(26,58,42,0.08)', borderRadius:14, textDecoration:'none', transition:'background 0.1s' }}>
              <span style={{ fontSize:18, lineHeight:1, flexShrink:0 }}>{emoji}</span>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:13, fontWeight:600, color:'#1a3a2a', margin:0 }}>{label}</p>
                <p style={{ fontSize:11, color:'#8a9e90', margin:'2px 0 0' }}>{sub}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </>
  )
}
