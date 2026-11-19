/**
 * CLIENT helper: send parsed rows to /api/members/import in chunks.
 * Returns an aggregated summary so the UI can tell the user exactly what happened
 * (instead of silently dropping rows that failed).
 */
const CHUNK = 500

export async function importMembers(rows, { groupId = null, onProgress } = {}) {
  const total = { created: 0, duplicates: 0, attached: 0, invalid: 0, failed: 0, members: [], error: null }

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    try {
      const res = await fetch('/api/members/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: chunk, groupId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        total.failed += chunk.length
        total.error = data.error || 'Some rows could not be imported'
      } else {
        total.created    += data.created    ?? 0
        total.duplicates += data.duplicates ?? 0
        total.attached   += data.attached   ?? 0
        total.invalid    += data.invalid    ?? 0
        total.members.push(...(data.members ?? []))
      }
    } catch {
      total.failed += chunk.length
      total.error = 'Network problem — some rows were not imported'
    }
    onProgress?.(Math.min(100, Math.round(((i + chunk.length) / rows.length) * 100)))
  }
  return total
}

/** One-line human summary of an import result. */
export function describeImport(s) {
  const parts = [`${s.created} added`]
  if (s.attached)   parts.push(`${s.attached} existing member${s.attached === 1 ? '' : 's'} added to this group`)
  if (s.duplicates) parts.push(`${s.duplicates} duplicate${s.duplicates === 1 ? '' : 's'} skipped`)
  if (s.invalid)    parts.push(`${s.invalid} row${s.invalid === 1 ? '' : 's'} without a name skipped`)
  if (s.failed)     parts.push(`${s.failed} failed`)
  return parts.join(' · ')
}
