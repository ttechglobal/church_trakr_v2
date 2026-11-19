/**
 * Local drafts for the attendance screen, so a locked phone, a dropped signal or an
 * accidental back-tap never loses the marks a volunteer has already made.
 *
 * Also keeps the last-loaded member list per group, so the screen can still open
 * when the phone has no signal.
 *
 * Pure functions over a Storage-like object (injected for tests).
 */

const DRAFT_PREFIX   = 'ct_att_draft:'
const MEMBERS_PREFIX = 'ct_att_members:'
const DAY = 24 * 60 * 60 * 1000

const draftKey   = (groupId, date) => `${DRAFT_PREFIX}${groupId}:${date}`
const membersKey = (groupId) => `${MEMBERS_PREFIX}${groupId}`

function readJSON(storage, key) {
  try { const v = JSON.parse(storage.getItem(key)); return v && typeof v === 'object' ? v : null } catch { return null }
}
function writeJSON(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); return true } catch { return false }
}

export function saveDraft(storage, groupId, date, marks, now = Date.now()) {
  return writeJSON(storage, draftKey(groupId, date), { marks, savedAt: now })
}

export function loadDraft(storage, groupId, date, now = Date.now()) {
  const d = readJSON(storage, draftKey(groupId, date))
  if (!d || typeof d.marks !== 'object' || !d.marks) return null
  if (now - (d.savedAt ?? 0) > 7 * DAY) { clearDraft(storage, groupId, date); return null }   // stale
  return d
}

export function clearDraft(storage, groupId, date) {
  try { storage.removeItem(draftKey(groupId, date)) } catch { /* ignore */ }
}

/**
 * Overlay a draft on the marks loaded from the server. Only members that still exist
 * are applied (someone may have been removed since). Returns { marks, applied } where
 * `applied` is how many marks actually differ from the server's.
 */
export function applyDraft(serverMarks, draftMarks) {
  const marks = { ...serverMarks }
  let applied = 0
  for (const [id, present] of Object.entries(draftMarks ?? {})) {
    if (!(id in serverMarks)) continue
    if (marks[id] !== !!present) { marks[id] = !!present; applied++ }
  }
  return { marks, applied }
}

// ── Member list cache (for opening the screen offline) ───────────────────────
export function cacheMembers(storage, groupId, members, now = Date.now()) {
  return writeJSON(storage, membersKey(groupId), { members, savedAt: now })
}

export function loadCachedMembers(storage, groupId) {
  const c = readJSON(storage, membersKey(groupId))
  return c && Array.isArray(c.members) ? c : null
}
