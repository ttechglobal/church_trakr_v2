'use client'

import { useState, useEffect } from 'react'
import BackButton from '@/components/ui/BackButton'
import { Plus, Trash2, Edit2, Check, RotateCcw } from 'lucide-react'

// ── The 6 built-in defaults ────────────────────────────────────────────────────
// Plain GSM-7 text — no emojis, no exclamation marks
const DEFAULTS = [
  {
    id:    'bt_miss',
    label: 'We Miss You',
    body:  'Hi {name}, we missed you at church this Sunday. We hope you are doing well and look forward to seeing you soon.',
  },
  {
    id:    'bt_absentee_fu',
    label: 'Absentee Follow-Up',
    body:  'Hi {name}, just checking in. We noticed you were not with us at church recently. We care about you and hope all is well.',
  },
  {
    id:    'bt_thanks',
    label: 'Thanks for Attending',
    body:  'Hi {name}, thank you for joining us at service this Sunday. It was great having you. We look forward to seeing you next week.',
  },
  {
    id:    'bt_firsttimer',
    label: 'First Timer Welcome',
    body:  'Hi {name}, welcome to our church. We are so glad you joined us this Sunday. We hope to see you again soon.',
  },
  {
    id:    'bt_sunday',
    label: 'Sunday Reminder',
    body:  'Hi {name}, just a reminder that service holds this Sunday. We look forward to worshipping with you. God bless you.',
  },
  {
    id:    'bt_service',
    label: 'Service Reminder',
    body:  'Hi {name}, our next service is coming up soon. We would love to have you with us. See you there.',
  },
]

const BUILTIN_STORAGE_KEY = 'ct_builtin_templates'
const CUSTOM_STORAGE_KEY  = 'ct_sms_templates'

export default function TemplatesClient() {
  // Built-in templates — user can edit body, never delete; Reset restores default
  const [builtins,    setBuiltins]    = useState(DEFAULTS)
  const [editingId,   setEditingId]   = useState(null)
  const [editBody,    setEditBody]    = useState('')

  // Custom templates
  const [customs,     setCustoms]     = useState([])
  const [showNew,     setShowNew]     = useState(false)
  const [newLabel,    setNewLabel]    = useState('')
  const [newBody,     setNewBody]     = useState('')
  const [editingCid,  setEditingCid]  = useState(null)
  const [editCBody,   setEditCBody]   = useState('')

  const [savedMsg,    setSavedMsg]    = useState('')

  // ── Load from localStorage ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(BUILTIN_STORAGE_KEY) ?? '{}')
      // Merge saved edits into defaults (only body can change)
      setBuiltins(DEFAULTS.map(d => ({ ...d, body: saved[d.id] ?? d.body })))
    } catch {}
    try {
      setCustoms(JSON.parse(localStorage.getItem(CUSTOM_STORAGE_KEY) ?? '[]'))
    } catch {}
  }, [])

  function flash(msg = 'Saved') {
    setSavedMsg(msg)
    setTimeout(() => setSavedMsg(''), 2000)
  }

  // ── Built-in template actions ───────────────────────────────────────────────
  function startEdit(tpl) {
    setEditingId(tpl.id)
    setEditBody(tpl.body)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditBody('')
  }

  function saveEdit(id) {
    const updated = builtins.map(b => b.id === id ? { ...b, body: editBody } : b)
    setBuiltins(updated)
    // Persist just the overridden bodies
    const overrides = {}
    for (const b of updated) {
      const def = DEFAULTS.find(d => d.id === b.id)
      if (def && b.body !== def.body) overrides[b.id] = b.body
    }
    localStorage.setItem(BUILTIN_STORAGE_KEY, JSON.stringify(overrides))
    setEditingId(null)
    flash()
  }

  function resetToDefault(id) {
    const def     = DEFAULTS.find(d => d.id === id)
    if (!def) return
    const updated = builtins.map(b => b.id === id ? { ...b, body: def.body } : b)
    setBuiltins(updated)
    const overrides = JSON.parse(localStorage.getItem(BUILTIN_STORAGE_KEY) ?? '{}')
    delete overrides[id]
    localStorage.setItem(BUILTIN_STORAGE_KEY, JSON.stringify(overrides))
    if (editingId === id) setEditingId(null)
    flash('Reset to default')
  }

  // ── Custom template actions ─────────────────────────────────────────────────
  function addCustom() {
    if (!newLabel.trim() || !newBody.trim()) return
    const tpl     = { id: `c_${Date.now()}`, label: newLabel.trim(), body: newBody.trim() }
    const updated = [...customs, tpl]
    setCustoms(updated)
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated))
    setNewLabel(''); setNewBody(''); setShowNew(false)
    flash()
  }

  function deleteCustom(id) {
    const updated = customs.filter(t => t.id !== id)
    setCustoms(updated)
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated))
  }

  function startEditCustom(tpl) {
    setEditingCid(tpl.id)
    setEditCBody(tpl.body)
  }

  function saveEditCustom(id) {
    const updated = customs.map(t => t.id === id ? { ...t, body: editCBody } : t)
    setCustoms(updated)
    localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(updated))
    setEditingCid(null)
    flash()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="page-content pb-10">
      <BackButton />
      <div className="flex items-center justify-between mb-5">
        <h1 className="font-display text-2xl font-bold text-forest">SMS Templates</h1>
        {savedMsg && <span className="text-xs font-semibold text-success">{savedMsg} ✓</span>}
      </div>

      {/* ── Built-in templates ── */}
      <p className="text-xs font-bold text-mist uppercase tracking-widest mb-3">Built-in Templates</p>
      <div className="space-y-3 mb-6">
        {builtins.map(tpl => {
          const isEditing  = editingId === tpl.id
          const isModified = tpl.body !== DEFAULTS.find(d => d.id === tpl.id)?.body

          return (
            <div key={tpl.id} className="card">
              {/* Header row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-forest">{tpl.label}</p>
                <div className="flex gap-1.5 shrink-0">
                  {isModified && !isEditing && (
                    <button
                      onClick={() => resetToDefault(tpl.id)}
                      title="Reset to default"
                      style={{ height: 30, width: 30, borderRadius: 8, border: 'none', background: 'rgba(26,58,42,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a9e90' }}
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                  {!isEditing ? (
                    <button
                      onClick={() => startEdit(tpl)}
                      style={{ height: 30, padding: '0 10px', borderRadius: 8, border: '1.5px solid rgba(26,58,42,0.18)', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#1a3a2a', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Edit2 size={11} /> Edit
                    </button>
                  ) : (
                    <div className="flex gap-1.5">
                      <button
                        onClick={cancelEdit}
                        style={{ height: 30, width: 30, borderRadius: 8, border: 'none', background: 'rgba(220,38,38,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
                      >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>×</span>
                      </button>
                      <button
                        onClick={() => saveEdit(tpl.id)}
                        style={{ height: 30, padding: '0 10px', borderRadius: 8, border: 'none', background: '#1a3a2a', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#e8d5a0', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <Check size={11} /> Save
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isEditing ? (
                <>
                  <textarea
                    className="input resize-none text-sm w-full"
                    style={{ minHeight: 100 }}
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-mist">{editBody.length} chars · use {'{name}'} to personalise</p>
                    {isModified && (
                      <button onClick={() => resetToDefault(tpl.id)} className="text-xs text-mist underline">Reset to default</button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-mist leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{tpl.body}</p>
                  {isModified && <p className="text-xs text-mist/60 mt-1.5 italic">Edited · tap Reset to restore original</p>}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Custom templates ── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-mist uppercase tracking-widest">My Custom Templates</p>
        <button
          onClick={() => setShowNew(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 12px', borderRadius: 9, border: '1.5px solid rgba(26,58,42,0.18)', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#1a3a2a' }}
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {/* New template form */}
      {showNew && (
        <div className="card mb-3 space-y-3">
          <input
            className="input text-sm"
            placeholder="Template name (e.g. Birthday Greeting)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
          />
          <textarea
            className="input resize-none text-sm"
            style={{ minHeight: 90 }}
            placeholder="Message body... Use {name} to personalise each message"
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
          />
          <p className="text-xs text-mist">{newBody.length} chars</p>
          <div className="flex gap-2">
            <button onClick={() => { setShowNew(false); setNewLabel(''); setNewBody('') }} className="btn btn-outline flex-1 text-sm">Cancel</button>
            <button onClick={addCustom} disabled={!newLabel.trim() || !newBody.trim()} className="btn btn-primary flex-1 text-sm">Save template</button>
          </div>
        </div>
      )}

      {/* Custom template list */}
      {customs.length === 0 && !showNew ? (
        <div className="card text-center py-8">
          <p className="text-sm text-mist">No custom templates yet</p>
          <p className="text-xs text-mist mt-1">Tap "Add" to create one</p>
        </div>
      ) : (
        <div className="space-y-2">
          {customs.map(tpl => (
            <div key={tpl.id} className="card">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-bold text-forest">{tpl.label}</p>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => editingCid === tpl.id ? setEditingCid(null) : startEditCustom(tpl)}
                    style={{ height: 28, width: 28, borderRadius: 7, border: 'none', background: 'rgba(26,58,42,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a3a2a' }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => deleteCustom(tpl.id)}
                    style={{ height: 28, width: 28, borderRadius: 7, border: 'none', background: 'rgba(220,38,38,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {editingCid === tpl.id ? (
                <>
                  <textarea className="input resize-none text-sm w-full" style={{ minHeight: 80 }}
                    value={editCBody} onChange={e => setEditCBody(e.target.value)} autoFocus />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setEditingCid(null)} className="btn btn-outline flex-1 text-sm">Cancel</button>
                    <button onClick={() => saveEditCustom(tpl.id)} className="btn btn-primary flex-1 text-sm">Save</button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-mist leading-relaxed line-clamp-3" style={{ whiteSpace: 'pre-wrap' }}>{tpl.body}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}
