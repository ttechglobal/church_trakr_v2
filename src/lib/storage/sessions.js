// lib/storage/sessions.js
// Session persistence for Next.js 14 + 15.
// Primary store: localStorage (always synchronously available in browser).
// Enhancement: IndexedDB via idb (loaded dynamically, optional).
// 
// IMPORTANT: No module-level state, no top-level await, no side effects.
// All exports are plain async functions — safe for Webpack static analysis.

const KEY = 'lep_sessions'
const MAX = 20

// ── localStorage helpers (always available in browser) ─────────
function lsRead() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
function lsWrite(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX))) } catch {}
}
function lsClear() {
  try { localStorage.removeItem(KEY) } catch {}
}

// ── IndexedDB (optional enhancement) ───────────────────────────
const DB_NAME = 'learniie_ep'
const STORE   = 'sessions'

async function getIDB() {
  const { openDB } = await import('idb')
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: 'shareToken' })
        s.createIndex('savedAt', 'savedAt')
      }
    },
  })
}

// ── Public API ──────────────────────────────────────────────────

export async function getSessions() {
  if (typeof window === 'undefined') return []
  try {
    const db  = await getIDB()
    const all = await db.getAllFromIndex(STORE, 'savedAt')
    return [...all].reverse()
  } catch {
    return [...lsRead()].reverse()
  }
}

export async function saveSession(session) {
  if (typeof window === 'undefined') return
  const entry = { ...session, savedAt: Date.now() }
  // Always write to localStorage first — instant, reliable
  const existing = lsRead()
  const filtered = existing.filter(s => s.shareToken !== session.shareToken)
  lsWrite([...filtered, entry])
  // Also write to IndexedDB if available
  try {
    const db = await getIDB()
    await db.put(STORE, entry)
    const all = await db.getAllFromIndex(STORE, 'savedAt')
    if (all.length > MAX) {
      for (const s of all.slice(0, all.length - MAX)) {
        await db.delete(STORE, s.shareToken)
      }
    }
  } catch { /* localStorage already written above */ }
}

export async function clearSessions() {
  if (typeof window === 'undefined') return
  lsClear()
  try {
    const db = await getIDB()
    await db.clear(STORE)
  } catch { /* localStorage already cleared above */ }
}