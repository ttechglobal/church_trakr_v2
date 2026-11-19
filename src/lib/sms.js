/**
 * SMS helpers shared by /api/sms/send and /api/sms/broadcast. SERVER ONLY.
 *
 * Credit safety model:
 *   1. Compute the exact cost up front (per recipient, using their real
 *      personalised message).
 *   2. Reserve it atomically with a compare-and-swap on churches.sms_credits
 *      (UPDATE … WHERE sms_credits = <value we read>). Two parallel sends can
 *      never both spend the same credits.
 *   3. Send, then refund the cost of any failures.
 */

export const CREDITS_PER_PAGE = 5
export const MAX_MESSAGE_LENGTH = 1000
export const MAX_RECIPIENTS_PER_REQUEST = 500

const GSM7_PAGE = 157
const UCS2_PAGE = 70
const TERMII_BULK_CHUNK = 100

// Unicode triggers — does NOT include [ ] (template placeholders)
const UNICODE_TRIGGERS = ['^', '{', '}', '\\', '~', '|', '€', '‘', '’', '“', '”']

export function normalisePhone(raw) {
  if (!raw) return null
  const c = String(raw).replace(/\D/g, '')
  if (c.startsWith('234') && c.length >= 13) return c
  if (c.startsWith('0')   && c.length === 11) return '234' + c.slice(1)
  if (c.length === 10     && /^[789]/.test(c)) return '234' + c
  if (c.startsWith('234') && c.length >= 12) return c
  return null
}

export function isPersonalised(message) {
  return /\{name\}|\[Name\]/i.test(message)
}

export function resolveMessage(message, fullName) {
  const first = String(fullName || '').trim().split(/\s+/)[0] || 'Friend'
  return message.replace(/\{name\}/gi, first).replace(/\[Name\]/gi, first)
}

export function countPages(text) {
  const isUnicode = UNICODE_TRIGGERS.some(c => text.includes(c)) || /\p{Emoji_Presentation}/u.test(text)
  const pageSize = isUnicode ? UCS2_PAGE : GSM7_PAGE
  return Math.max(1, Math.ceil(text.length / pageSize))
}

/**
 * Build the send plan. Items with an unusable phone get `to: null`, cost 0,
 * and are reported as failed without being charged.
 */
export function buildPlan(recipients, message) {
  return recipients.map(r => {
    const to  = normalisePhone(r.phone)
    const msg = resolveMessage(message, r.name)
    return { name: r.name ?? '', phone: r.phone ?? '', to, msg, cost: to ? countPages(msg) * CREDITS_PER_PAGE : 0 }
  })
}

/** Take items (in order) while the running cost fits within `balance`. */
export function fitToBalance(items, balance) {
  const toSend = []
  const skipped = []
  let spent = 0
  for (const it of items) {
    if (!it.to) continue
    if (spent + it.cost <= balance) { toSend.push(it); spent += it.cost }
    else skipped.push(it)
  }
  return { toSend, skipped, totalCost: spent }
}

// ── Atomic credit changes ────────────────────────────────────────────────────

export async function reserveCredits(admin, churchId, amount) {
  if (amount <= 0) return { ok: true, balance: null }
  for (let i = 0; i < 6; i++) {
    const { data: c } = await admin.from('churches').select('sms_credits').eq('id', churchId).single()
    const bal = c?.sms_credits ?? 0
    if (bal < amount) return { ok: false, balance: bal }
    const { data: upd } = await admin
      .from('churches')
      .update({ sms_credits: bal - amount })
      .eq('id', churchId)
      .eq('sms_credits', bal)      // compare-and-swap
      .select('sms_credits')
    if (upd?.length) return { ok: true, balance: bal - amount }
  }
  return { ok: false, balance: null, contention: true }
}

export async function refundCredits(admin, churchId, amount) {
  if (amount <= 0) return null
  for (let i = 0; i < 10; i++) {
    const { data: c } = await admin.from('churches').select('sms_credits').eq('id', churchId).single()
    const bal = c?.sms_credits ?? 0
    const { data: upd } = await admin
      .from('churches')
      .update({ sms_credits: bal + amount })
      .eq('id', churchId)
      .eq('sms_credits', bal)
      .select('sms_credits')
    if (upd?.length) return bal + amount
  }
  console.error(`[sms] CRITICAL: could not refund ${amount} credits to church ${churchId} — fix manually`)
  return null
}

// ── Termii ───────────────────────────────────────────────────────────────────

function termiiOk(res, data) {
  return res.ok && (
    data.message_id != null ||
    data.code === 'ok' ||
    (typeof data.message === 'string' && data.message.toLowerCase().includes('success'))
  )
}

async function termiiPost(path, payload) {
  try {
    const res  = await fetch(`https://api.ng.termii.com/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, type: 'plain', channel: 'generic' }),
    })
    const text = await res.text()
    let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
    return { success: termiiOk(res, data), data }
  } catch (err) {
    return { success: false, data: { message: 'Gateway unreachable' } }
  }
}

export function sendSingle({ to, message, senderId, apiKey }) {
  return termiiPost('sms/send', { api_key: apiKey, to, from: senderId, sms: message })
}

export async function sendBulk({ numbers, message, senderId, apiKey }) {
  // Termii limits recipients per bulk call — send in chunks
  const outcomes = []
  for (let i = 0; i < numbers.length; i += TERMII_BULK_CHUNK) {
    const chunk = numbers.slice(i, i + TERMII_BULK_CHUNK)
    const r = await termiiPost('sms/send/bulk', { api_key: apiKey, to: chunk, from: senderId, sms: message })
    outcomes.push({ numbers: chunk, success: r.success, error: r.success ? undefined : (r.data?.message ?? 'Failed') })
  }
  return outcomes
}

/** Send a personalised plan in small batches. Returns per-item results. */
export async function sendPersonalised(items, { senderId, apiKey }, batch = 5, delayMs = 250) {
  const results = []
  for (let i = 0; i < items.length; i += batch) {
    const slice = items.slice(i, i + batch)
    const out = await Promise.all(slice.map(async it => {
      const r = await sendSingle({ to: it.to, message: it.msg, senderId, apiKey })
      return { item: it, ok: r.success, error: r.success ? undefined : (r.data?.message ?? 'Failed') }
    }))
    results.push(...out)
    if (i + batch < items.length) await new Promise(r => setTimeout(r, delayMs))
  }
  return results
}

export function pickSenderId(church) {
  return (church.sms_sender_id_status === 'approved' && church.sms_sender_id)
    ? church.sms_sender_id
    : (process.env.TERMII_SENDER_ID ?? 'ChurchTrakr')
}
