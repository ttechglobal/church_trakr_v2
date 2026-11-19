/**
 * Member import helpers (pure functions — safe on server and in tests).
 */
import { normBirthday } from './utils'

export const MAX_IMPORT_ROWS = 500

/**
 * Convert anything the importer might hand us into a value a Postgres `date`
 * column accepts, or null. normBirthday() can return "MM-DD" (no year) — that is
 * not a valid date, so it is dropped rather than failing the whole insert.
 */
export function toDbDate(raw) {
  let s
  try { s = normBirthday(raw) } catch { return null }
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const real = dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  return real && y >= 1900 && y <= new Date().getUTCFullYear() ? s : null
}

/**
 * Comparable phone key: digits only, country code / leading zeros removed,
 * so 0803 123 4567, +234 803 123 4567 and 2348031234567 all match.
 * Returns '' when there are too few digits to identify anyone.
 */
export function phoneKey(raw) {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.startsWith('234') && d.length >= 13) d = d.slice(3)
  d = d.replace(/^0+/, '')
  if (d.length < 7) return ''
  return d.slice(-10)
}

const clip = (v, n) => {
  const s = String(v ?? '').trim().slice(0, n)
  return s || null
}

/** Clean one incoming row, or return null if it has no usable name. */
export function cleanMemberRow(r) {
  const name = String(r?.name ?? '').trim().replace(/\s+/g, ' ').slice(0, 120)
  if (!name) return null
  return {
    name,
    phone:    clip(r?.phone, 30),
    address:  clip(r?.address, 300),
    birthday: toDbDate(r?.birthday),
  }
}

// ── Duplicate detection ──────────────────────────────────────────────────────
// A phone number alone does NOT identify a person: families routinely share one
// number (parent's phone on a child's record). So a phone match only counts when
// the NAMES also agree. Wrongly skipping a real member is worse than keeping a
// duplicate, so every rule below errs on the side of creating the member.

const tokens = (name) =>
  String(name ?? '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)

const tokenKey = (toks) => [...new Set(toks)].sort().join(' ')

/** Same words in any order, or one name fully contained in the other (min 2 shared words). */
function namesCompatible(ta, tb) {
  const A = new Set(ta), B = new Set(tb)
  if (!A.size || !B.size) return false
  const [small, big] = A.size <= B.size ? [A, B] : [B, A]
  if (small.size === big.size) return [...small].every(t => big.has(t))   // equal sets
  return small.size >= 2 && [...small].every(t => big.has(t))              // subset
}

/** Index a list of people for fast "is this the same person?" lookups. */
function makeIndex(people) {
  const byPhone = new Map()   // phoneKey -> [{ person, toks }]
  const byName  = new Map()   // tokenKey -> [person]   (names with >= 2 words)
  const add = (person) => {
    const toks = tokens(person.name)
    const pk = phoneKey(person.phone)
    if (pk) { if (!byPhone.has(pk)) byPhone.set(pk, []); byPhone.get(pk).push({ person, toks }) }
    if (new Set(toks).size >= 2) {
      const nk = tokenKey(toks)
      if (!byName.has(nk)) byName.set(nk, [])
      byName.get(nk).push(person)
    }
  }
  people.forEach(add)

  const find = (row) => {
    const toks = tokens(row.name)
    const pk = phoneKey(row.phone)
    if (pk) {
      // 1) same phone AND compatible names
      for (const c of byPhone.get(pk) ?? []) if (namesCompatible(toks, c.toks)) return c.person
    }
    // 2) identical multi-word name where either side has no phone number
    if (new Set(toks).size >= 2) {
      for (const person of byName.get(tokenKey(toks)) ?? []) {
        if (!pk || !phoneKey(person.phone)) return person
      }
    }
    return null
  }
  return { add, find }
}

/**
 * Split cleaned rows into { create, duplicates, inFile } against existing members.
 * `duplicates` carry the matched existing member so the caller can attach it to a group.
 * Repeats inside the file itself are counted in `inFile` (first occurrence wins).
 */
export function planImport(rows, existing) {
  const existingIdx = makeIndex(existing)
  const fileIdx     = makeIndex([])
  const create = []
  const duplicates = []
  let inFile = 0

  for (const row of rows) {
    if (fileIdx.find(row)) { inFile++; continue }
    fileIdx.add(row)
    const match = existingIdx.find(row)
    if (match) duplicates.push({ row, existing: match })
    else create.push(row)
  }
  return { create, duplicates, inFile }
}
