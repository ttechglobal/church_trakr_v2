// ─── Birthday Normalization ────────────────────────────────────────────────────

/**
 * Normalize any birthday format found in church Excel imports.
 * Handles: YYYY-MM-DD, D/M/YYYY, D-Mon-YYYY, D-Mon-YY,
 *          Excel serial numbers, MM-DD, M/D, and empty values.
 *
 * @param {string|number|null} raw
 * @returns {'YYYY-MM-DD'|'MM-DD'|''}
 */
export function normBirthday(raw) {
  if (raw === null || raw === undefined || raw === '') return ''

  // Excel serial number (e.g. 44927)
  if (typeof raw === 'number' || /^\d{5}$/.test(String(raw))) {
    const serial = Number(raw)
    if (serial > 1000) {
      // Excel epoch: Dec 30, 1899 (with leap-year-1900 bug)
      const d = new Date((serial - 25569) * 86400 * 1000)
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10) // YYYY-MM-DD
      }
    }
  }

  const s = String(raw).trim()

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // Already MM-DD (no year)
  if (/^\d{2}-\d{2}$/.test(s)) return s

  // D/M/YYYY or M/D/YYYY (assume D/M for Nigerian church files)
  const slashFull = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashFull) {
    const [, d, m, y] = slashFull
    const month = m.padStart(2, '0')
    const day = d.padStart(2, '0')
    return `${y}-${month}-${day}`
  }

  // D/M (no year)
  const slashShort = s.match(/^(\d{1,2})\/(\d{1,2})$/)
  if (slashShort) {
    const [, d, m] = slashShort
    return `${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  // D-Mon-YYYY or D-Mon-YY (e.g. "5-Jan-1990" or "5-Jan-90")
  const MONTHS = {
    jan:  '01', feb: '02', mar: '03', apr: '04',
    may:  '05', jun: '06', jul: '07', aug: '08',
    sep:  '09', oct: '10', nov: '11', dec: '12',
  }
  const textDate = s.match(/^(\d{1,2})[-\s]([a-zA-Z]{3})[-\s](\d{2,4})$/)
  if (textDate) {
    const [, d, mon, y] = textDate
    const monthNum = MONTHS[mon.toLowerCase()]
    if (monthNum) {
      const year = y.length === 2
        ? (parseInt(y) > 30 ? `19${y}` : `20${y}`)
        : y
      return `${year}-${monthNum}-${d.padStart(2, '0')}`
    }
  }

  // D Mon (no year, e.g. "5 Jan" or "5-Jan")
  const textShort = s.match(/^(\d{1,2})[-\s]([a-zA-Z]{3})$/)
  if (textShort) {
    const [, d, mon] = textShort
    const monthNum = MONTHS[mon.toLowerCase()]
    if (monthNum) return `${monthNum}-${d.padStart(2, '0')}`
  }

  // YYYY/MM/DD
  const isoSlash = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (isoSlash) {
    const [, y, m, d] = isoSlash
    return `${y}-${m}-${d}`
  }

  return ''
}

/**
 * Format a normalized birthday for display.
 * @param {string} d — 'YYYY-MM-DD' or 'MM-DD'
 * @returns {string} e.g. 'May 14' | 'Nov 3' | ''
 */
export function fmtBday(d) {
  if (!d) return ''
  const parts = d.split('-')
  const monthNames = [
    '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  if (parts.length === 3) {
    // YYYY-MM-DD
    const month = parseInt(parts[1], 10)
    const day = parseInt(parts[2], 10)
    return `${monthNames[month]} ${day}`
  }

  if (parts.length === 2) {
    // MM-DD
    const month = parseInt(parts[0], 10)
    const day = parseInt(parts[1], 10)
    return `${monthNames[month]} ${day}`
  }

  return ''
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

/**
 * Format a date string for international display.
 * @param {string|Date} d
 * @returns {string} e.g. 'Dec 25, 2024'
 */
export function fmtDate(d) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Format just month + year.
 * @param {Date} d
 * @returns {string} e.g. 'December 2024'
 */
export function fmtMonthYear(d) {
  if (!d) return ''
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/**
 * Get the most recent Sunday (or today if Sunday).
 * @returns {Date}
 */
export function getLastSunday() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d
}

/**
 * Get the Sunday before last.
 * @returns {Date}
 */
export function getPrevSunday() {
  const d = getLastSunday()
  d.setDate(d.getDate() - 7)
  return d
}

/**
 * Format a date to YYYY-MM-DD for Supabase queries.
 * @param {Date} d
 * @returns {string}
 */
export function toISODate(d) {
  return d.toISOString().slice(0, 10)
}

// ─── Avatar Generation ────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  { bg: '#1a3a2a', color: '#e8d5a0' },
  { bg: '#2d5a42', color: '#f7f5f0' },
  { bg: '#c9a84c', color: '#1a3a2a' },
  { bg: '#3d7a58', color: '#f7f5f0' },
  { bg: '#a8862e', color: '#f7f5f0' },
  { bg: '#4a8a65', color: '#1a3a2a' },
  { bg: '#1a3a2a', color: '#c9a84c' },
  { bg: '#0f2a1a', color: '#e8d5a0' },
]

/**
 * Generate a deterministic avatar from a name.
 * @param {string} name
 * @returns {{ bg: string, color: string, initials: string }}
 */
export function getAv(name) {
  if (!name) return { bg: '#1a3a2a', color: '#e8d5a0', initials: '?' }
  const words = name.trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : words[0].slice(0, 2).toUpperCase()

  // Deterministic index from char codes
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff
  const palette = AVATAR_PALETTES[hash % AVATAR_PALETTES.length]

  return { ...palette, initials }
}

// ─── SMS Utilities ────────────────────────────────────────────────────────────

/**
 * Count SMS segments for a message.
 * GSM-7 = 160 chars/segment (153 for multi-part)
 * Unicode = 70 chars/segment (67 for multi-part)
 *
 * @param {string} text
 * @returns {number}
 */
export function smsCount(text) {
  if (!text) return 1
  // Check for non-GSM-7 characters
  const gsm7 = /^[\x00-\x7F\u00C0-\u00FF£¥€]*$/
  const isGsm = gsm7.test(text)
  const charLimit = isGsm ? 160 : 70
  const multiCharLimit = isGsm ? 153 : 67
  const len = text.length
  if (len <= charLimit) return 1
  return Math.ceil(len / multiCharLimit)
}

/**
 * Format a phone number for WhatsApp deep links.
 * Handles Nigerian numbers (08xx, 07xx, +234xx) and international numbers.
 * Returns digits only, with country code prefix where detectable.
 *
 * @param {string} phone
 * @returns {string} e.g. '2348012345678'
 */
export function toWhatsAppNumber(phone) {
  if (!phone) return ''
  // Strip everything except digits and leading +
  const stripped = phone.replace(/[^\d+]/g, '')

  // Already has + country code
  if (stripped.startsWith('+')) {
    return stripped.slice(1) // remove +
  }

  // International format without +: starts with country code (not 0)
  // 11+ digits starting with non-zero — treat as already international
  if (stripped.length >= 11 && !stripped.startsWith('0')) {
    return stripped
  }

  // Nigerian mobile: 0xxx (11 digits) → 234xxx
  if (stripped.startsWith('0') && stripped.length === 11) {
    return '234' + stripped.slice(1)
  }

  // Nigerian short (no leading 0, 10 digits)
  if (!stripped.startsWith('0') && stripped.length === 10) {
    return '234' + stripped
  }

  // Fallback: return as-is (stripped of non-digits)
  return stripped
}

// ─── Attendance ───────────────────────────────────────────────────────────────

/**
 * Calculate attendance rate as a percentage.
 * @param {number} present
 * @param {number} total
 * @returns {number} 0–100
 */
export function attendanceRate(present, total) {
  if (!total || total === 0) return 0
  return Math.round((present / total) * 100)
}

/**
 * Get a color class based on attendance rate.
 * @param {number} rate 0–100
 * @returns {'text-success'|'text-warning'|'text-error'}
 */
export function rateColor(rate) {
  if (rate >= 75) return 'text-success'
  if (rate >= 50) return 'text-warning'
  return 'text-error'
}

/**
 * Get a trend indicator comparing two rates.
 * @param {number} current
 * @param {number} previous
 * @returns {{ symbol: '↑'|'↓'|'→', color: string, delta: number }}
 */
export function getTrend(current, previous) {
  const delta = current - previous
  if (delta > 2)  return { symbol: '↑', color: 'text-success', delta }
  if (delta < -2) return { symbol: '↓', color: 'text-error', delta }
  return { symbol: '→', color: 'text-warning', delta }
}

// ─── Misc ──────────────────────────────────────────────────────────────────────

/**
 * Capitalize first letter of each word.
 * @param {string} str
 * @returns {string}
 */
export function titleCase(str) {
  if (!str) return ''
  return str.replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Get time-of-day greeting.
 * @returns {'Good morning'|'Good afternoon'|'Good evening'}
 */
export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Pluralize a word.
 * @param {number} count
 * @param {string} singular
 * @param {string} [plural]
 * @returns {string}
 */
export function plural(count, singular, pluralForm) {
  return count === 1 ? `${count} ${singular}` : `${count} ${pluralForm ?? singular + 's'}`
}

/**
 * Debounce a function.
 * @param {Function} fn
 * @param {number} delay ms
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Deep merge two objects (shallow merge of top-level keys).
 */
export function shallowMerge(target, source) {
  return { ...target, ...source }
}
