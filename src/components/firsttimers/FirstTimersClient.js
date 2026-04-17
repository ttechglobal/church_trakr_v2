'use client'

import { useState, useMemo } from 'react'
import { toWhatsAppNumber, getAv, toISODate, fmtDate } from '@/lib/utils'
import BackButton from '@/components/ui/BackButton'

const WELCOME = name =>
  `Hi ${name}, welcome to our service! We're so glad you joined us today. Hope to see you again soon! 🙏`

export default function FirstTimersClient({ churchId, firstTimers: init, groups, hasCredits }) {
  const [list, setList]           = useState(init)
  const [showAdd, setShowAdd]     = useState(false)
  const [editTarget, setEdit]     = useState(null)
  const [delTarget, setDel]       = useState(null)
  const [convertTarget, setConvert] = useState(null)
  const [selected, setSelected]   = useState(null)   // detail view
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const filtered = useMemo(() =>
    list.filter(ft =>
      ft.name.toLowerCase().includes(search.toLowerCase()) ||
      (ft.phone ?? '').includes(search)
    ), [list, search])

  const repeatCount = list.filter(ft => (ft.visits?.length ?? 0) > 1).length

  async function save(form, isNew) {
    setSaving(true); setError('')
    try {
      const url    = isNew ? '/api/firsttimers' : `/api/firsttimers/${editTarget.id}`
      const method = isNew ? 'POST' : 'PATCH'
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, churchId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      if (isNew) {
        setList(p => [data.firstTimer, ...p])
        setShowAdd(false)
      } else {
        setList(p => p.map(ft => ft.id === data.firstTimer.id ? data.firstTimer : ft))
        setEdit(null)
        setSelected(data.firstTimer)
      }
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function del() {
    if (!delTarget) return
    setSaving(true)
    try {
      await fetch(`/api/firsttimers/${delTarget.id}`, { method: 'DELETE' })
      setList(p => p.filter(ft => ft.id !== delTarget.id))
      setDel(null)
      setSelected(null)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function logVisit(ft) {
    const today  = toISODate(new Date())
    const visits = [...(ft.visits ?? []), today]
    try {
      const res  = await fetch(`/api/firsttimers/${ft.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visits, date: today, churchId }),
      })
      const data = await res.json()
      if (res.ok) {
        setList(p => p.map(f => f.id === ft.id ? data.firstTimer : f))
        setSelected(data.firstTimer)
      }
    } catch {}
  }

  async function convert(groupIds) {
    if (!convertTarget) return
    setSaving(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: convertTarget.name, phone: convertTarget.phone,
          address: convertTarget.address, groupIds, status: 'active',
        }),
      })
      if (!res.ok) throw new Error('Failed to convert')
      await fetch(`/api/firsttimers/${convertTarget.id}`, { method: 'DELETE' })
      setList(p => p.filter(ft => ft.id !== convertTarget.id))
      setConvert(null)
      setSelected(null)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  // ── Detail view (bottom sheet) ────────────────────────────────────────────
  if (selected) {
    const av     = getAv(selected.name)
    const waNum  = toWhatsAppNumber(selected.phone ?? '')
    const waMsg  = encodeURIComponent(WELCOME(selected.name.split(' ')[0]))
    const visits = selected.visits?.length ?? 1

    return (
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>
        <button onClick={() => setSelected(null)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: '#8a9e90',
          padding: '4px 0', marginBottom: 20,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to First Timers
        </button>

        {/* Profile card */}
        <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 20, padding: '1.75rem', marginBottom: 12, boxShadow: '0 2px 12px rgba(26,58,42,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: '1.25rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, flexShrink: 0 }}>
              {av.initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 22, fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                {selected.name}
              </h1>
              {visits > 1 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#a8862e', background: 'rgba(201,168,76,0.12)', borderRadius: 20, padding: '3px 10px' }}>
                  {visits}× visitor
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { icon: '📅', label: 'First visit', value: fmtDate(selected.date) },
              { icon: '🔄', label: 'Total visits', value: visits },
              selected.phone   ? { icon: '📞', label: 'Phone',   value: selected.phone }   : null,
              selected.address ? { icon: '📍', label: 'Address', value: selected.address } : null,
            ].filter(Boolean).map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{row.icon}</span>
                <div>
                  <p style={{ fontSize: 11, color: '#8a9e90', margin: '0 0 1px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</p>
                  <p style={{ fontSize: 14, color: '#1a3a2a', margin: 0, fontWeight: 500 }}>{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Primary actions — Call + WhatsApp only */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {selected.phone ? (
            <a href={`tel:${selected.phone}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              height: 52, borderRadius: 14, textDecoration: 'none',
              fontSize: 15, fontWeight: 700,
              background: '#fff', border: '1.5px solid rgba(26,58,42,0.15)', color: '#1a3a2a',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Call
            </a>
          ) : (
            <div style={{ height: 52, borderRadius: 14, background: 'rgba(26,58,42,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#b0bec0' }}>
              No phone
            </div>
          )}

          {waNum ? (
            <a href={`https://wa.me/${waNum}?text=${waMsg}`} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              height: 52, borderRadius: 14, textDecoration: 'none',
              fontSize: 15, fontWeight: 700,
              background: '#25D366', color: '#fff',
              boxShadow: '0 2px 8px rgba(37,211,102,0.3)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          ) : (
            <div style={{ height: 52, borderRadius: 14, background: 'rgba(26,58,42,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#b0bec0' }}>
              No phone
            </div>
          )}
        </div>

        {/* Secondary actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => logVisit(selected)} style={{
            height: 46, borderRadius: 12, border: '1px solid rgba(26,58,42,0.14)',
            background: '#fff', color: '#1a3a2a', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Log another visit
          </button>

          <button onClick={() => { setEdit(selected); setSelected(null) }} style={{
            height: 46, borderRadius: 12, border: '1px solid rgba(26,58,42,0.14)',
            background: '#fff', color: '#1a3a2a', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit information
          </button>

          <button onClick={() => { setConvert(selected); setError('') }} style={{
            height: 46, borderRadius: 12,
            background: '#1a3a2a', color: '#e8d5a0', border: 'none',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            boxShadow: '0 2px 8px rgba(26,58,42,0.2)',
          }}>
            Convert to full member →
          </button>

          <button onClick={() => setDel(selected)} style={{
            height: 40, borderRadius: 10,
            background: 'transparent', color: '#dc2626',
            border: '1px solid rgba(220,38,38,0.2)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            Remove visitor
          </button>
        </div>

        {/* Delete confirm */}
        {delTarget && (
          <Modal title="Remove visitor?" onClose={() => setDel(null)}>
            <p style={{ fontSize: 15, color: '#4a5568', marginBottom: '1.25rem' }}>
              Remove <strong>{delTarget.name}</strong>? This cannot be undone.
            </p>
            {error && <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 10 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDel(null)} style={{ ...outBtn }}>Cancel</button>
              <button onClick={del} disabled={saving} style={{ ...dangerBtn }}>
                {saving ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </Modal>
        )}

        {/* Convert modal */}
        {convertTarget && (
          <ConvertModal visitor={convertTarget} groups={groups} saving={saving} error={error}
            onConvert={convert} onClose={() => { setConvert(null); setError('') }} />
        )}
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>
      <BackButton href="/dashboard" />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 'clamp(1.4rem,3vw,1.875rem)', fontWeight: 700, color: '#1a3a2a', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
            First Timers
          </h1>
          <p style={{ fontSize: 14, color: '#8a9e90', margin: 0 }}>
            {list.length} visitor{list.length !== 1 ? 's' : ''} · {repeatCount} returning
          </p>
        </div>
        <button onClick={() => { setShowAdd(true); setError('') }} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '0 1rem', height: 40, background: '#1a3a2a', color: '#e8d5a0',
          border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700,
          boxShadow: '0 2px 8px rgba(26,58,42,0.22)', flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add visitor
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1.25rem' }}>
        {[
          { label: 'Total Visitors', value: list.length,    color: '#1a3a2a' },
          { label: 'Came Back',      value: repeatCount,    color: '#a8862e' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 14, padding: '1rem', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
            <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 28, fontWeight: 800, color: s.color, margin: '0 0 3px', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 12, color: '#8a9e90', margin: 0, fontWeight: 600 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      {list.length > 4 && (
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#b0bec0" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            style={{ width: '100%', border: '1px solid rgba(26,58,42,0.14)', borderRadius: 11, background: '#fff', padding: '0.65rem 0.875rem 0.65rem 2.25rem', fontSize: 14, color: '#1a2e22', outline: 'none', minHeight: 44, boxSizing: 'border-box' }}
            placeholder="Search visitors…" value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* List — clean cards, tap to view details */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid rgba(26,58,42,0.08)', borderRadius: 18, padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⭐</div>
          <p style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: '0 0 8px' }}>
            {list.length === 0 ? 'No visitors yet' : 'No results'}
          </p>
          <p style={{ fontSize: 14, color: '#8a9e90', margin: '0 0 20px' }}>
            {list.length === 0 ? 'Record your first visitor to start tracking new faces.' : `No visitors match "${search}"`}
          </p>
          {list.length === 0 && (
            <button onClick={() => setShowAdd(true)} style={{ padding: '0.625rem 1.5rem', background: '#1a3a2a', color: '#e8d5a0', border: 'none', borderRadius: 11, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
              Add first visitor
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(ft => {
            const av     = getAv(ft.name)
            const visits = ft.visits?.length ?? 1
            return (
              <button
                key={ft.id}
                onClick={() => setSelected(ft)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '0.875rem 1rem',
                  background: '#fff',
                  border: `1px solid ${visits > 1 ? 'rgba(201,168,76,0.2)' : 'rgba(26,58,42,0.08)'}`,
                  borderRadius: 14, cursor: 'pointer', textAlign: 'left', width: '100%',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: av.bg, color: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                    {av.initials}
                  </div>
                  {visits > 1 && (
                    <div style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: '#c9a84c', color: '#1a3a2a', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900 }}>
                      {visits}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1a3a2a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                    {ft.name}
                  </p>
                  <p style={{ fontSize: 12, color: '#8a9e90', margin: 0 }}>
                    {fmtDate(ft.date)}
                    {ft.phone ? ` · ${ft.phone}` : ''}
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9c9c9" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            )
          })}
        </div>
      )}

      {/* Add/Edit modal */}
      {(showAdd || editTarget) && (
        <FTModal
          initial={editTarget ?? { name: '', phone: '', address: '', date: toISODate(new Date()) }}
          isNew={!!showAdd} saving={saving} error={error}
          onSave={save}
          onClose={() => { setShowAdd(false); setEdit(null); setError('') }}
        />
      )}
    </div>
  )
}

function FTModal({ initial, isNew, saving, error, onSave, onClose }) {
  const [form, setForm] = useState({
    name: initial.name ?? '', phone: initial.phone ?? '',
    address: initial.address ?? '', date: initial.date ?? toISODate(new Date()),
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  return (
    <Modal title={isNew ? 'Add visitor' : 'Edit visitor'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field label="Name *">
          <input style={inputStyle} autoFocus placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Phone">
          <input style={inputStyle} type="tel" placeholder="+234…" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </Field>
        <Field label="Address">
          <input style={inputStyle} placeholder="Optional" value={form.address} onChange={e => set('address', e.target.value)} />
        </Field>
        <Field label="Date of visit">
          <input style={inputStyle} type="date" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        {error && <p style={{ fontSize: 14, color: '#dc2626' }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ ...outBtn, flex: 1 }}>Cancel</button>
          <button onClick={() => onSave(form, isNew)} disabled={saving || !form.name.trim()} style={{ ...primBtn, flex: 1 }}>
            {saving ? 'Saving…' : isNew ? 'Add visitor' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ConvertModal({ visitor, groups, saving, error, onConvert, onClose }) {
  const [selected, setSelected] = useState([])
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  return (
    <Modal title="Convert to member" onClose={onClose}>
      <p style={{ fontSize: 15, color: '#4a5568', marginBottom: '1rem', lineHeight: 1.6 }}>
        <strong>{visitor.name}</strong> will be added as a full member and removed from First Timers.
      </p>
      {groups.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2d4a36', marginBottom: 10 }}>Assign to groups (optional)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {groups.map(g => (
              <button key={g.id} onClick={() => toggle(g.id)} style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${selected.includes(g.id) ? '#1a3a2a' : 'rgba(26,58,42,0.15)'}`,
                background: selected.includes(g.id) ? '#1a3a2a' : '#fff',
                color: selected.includes(g.id) ? '#e8d5a0' : '#4a5568',
              }}>
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 10 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ ...outBtn, flex: 1 }}>Cancel</button>
        <button onClick={() => onConvert(selected)} disabled={saving} style={{ ...primBtn, flex: 1 }}>
          {saving ? 'Converting…' : 'Convert to member'}
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2d4a36', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(15,26,19,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '1.5rem', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-playfair),Georgia,serif', fontSize: 18, fontWeight: 700, color: '#1a3a2a', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9e90', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputStyle = { width: '100%', border: '1px solid rgba(26,58,42,0.18)', borderRadius: 11, background: '#fff', padding: '0.65rem 0.875rem', fontSize: 15, color: '#1a2e22', outline: 'none', minHeight: 44, boxSizing: 'border-box' }
const primBtn   = { height: 48, background: '#1a3a2a', color: '#e8d5a0', border: 'none', borderRadius: 13, cursor: 'pointer', fontSize: 15, fontWeight: 700 }
const outBtn    = { height: 48, background: 'transparent', color: '#1a3a2a', border: '1.5px solid rgba(26,58,42,0.2)', borderRadius: 13, cursor: 'pointer', fontSize: 15, fontWeight: 700 }
const dangerBtn = { height: 48, flex: 1, background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1.5px solid rgba(220,38,38,0.2)', borderRadius: 13, cursor: 'pointer', fontSize: 15, fontWeight: 700 }