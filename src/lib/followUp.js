/**
 * SERVER ONLY — follow-up storage helpers.
 *
 * Follow-ups live in `follow_up_entries` (one row per entry) instead of two JSONB
 * blobs on `churches`. Readers get back the SAME object shape the UI always used:
 *   { "<sessionId>_<memberId>": { reached, note, ... }, "__team__": [...], "__assignments__": {...} }
 *
 * kind 'absentee' = old churches.follow_up_data
 * kind 'attendee' = old churches.attendee_followup_data
 */

const TABLE = 'follow_up_entries'
const PAGE  = 1000   // PostgREST caps responses at ~1000 rows, so page through

export const FIELD_TO_KIND = {
  follow_up_data:         'absentee',
  attendee_followup_data: 'attendee',
}

/** Load one church's entries as a { key: data } object. */
export async function loadFollowUp(admin, churchId, kind = 'absentee') {
  const out = {}
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from(TABLE).select('key, data')
      .eq('church_id', churchId).eq('kind', kind)
      .order('key')
      .range(from, from + PAGE - 1)
    if (error) throw error
    for (const r of data ?? []) out[r.key] = r.data
    if ((data?.length ?? 0) < PAGE) break
  }
  return out
}

/** Load many churches at once → { [churchId]: { key: data } } */
export async function loadFollowUpMany(admin, churchIds, kind = 'absentee') {
  const out = Object.fromEntries(churchIds.map(id => [id, {}]))
  if (!churchIds.length) return out
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from(TABLE).select('church_id, key, data')
      .in('church_id', churchIds).eq('kind', kind)
      .order('church_id').order('key')
      .range(from, from + PAGE - 1)
    if (error) throw error
    for (const r of data ?? []) out[r.church_id][r.key] = r.data
    if ((data?.length ?? 0) < PAGE) break
  }
  return out
}

/**
 * Optimistic read-modify-write of ONE entry (used for the reserved __team__ /
 * __assignments__ rows). Retries if another request changed the row in between,
 * so concurrent writers can never silently overwrite each other.
 */
export async function mutateEntry(admin, churchId, kind, key, fn, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const { data: row, error: readErr } = await admin
      .from(TABLE).select('data, updated_at')
      .eq('church_id', churchId).eq('kind', kind).eq('key', key)
      .maybeSingle()
    if (readErr) throw readErr

    const next = fn(row?.data)

    if (!row) {
      const { error } = await admin.from(TABLE).insert({ church_id: churchId, kind, key, data: next })
      if (!error) return next
      if (error.code !== '23505') throw error      // 23505 = someone inserted first → retry
      continue
    }

    const { data: updated, error } = await admin
      .from(TABLE)
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq('church_id', churchId).eq('kind', kind).eq('key', key)
      .eq('updated_at', row.updated_at)
      .select('key')
    if (error) throw error
    if (updated?.length) return next
  }
  throw new Error('follow-up entry is busy, please retry')
}

/** Validate + normalise a client-supplied map of entries before upserting. */
export function cleanEntries(input, { maxEntries = 5000, maxBytes = 8000 } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const out = {}
  let n = 0
  for (const [k, v] of Object.entries(input)) {
    if (k.startsWith('__')) continue                    // reserved keys have their own routes
    if (!k || k.length > 200) continue
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue
    if (JSON.stringify(v).length > maxBytes) continue
    out[k] = v
    if (++n > maxEntries) return null
  }
  return out
}
