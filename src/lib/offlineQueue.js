/**
 * Offline attendance queue — the ONE place that stores, uploads and reports on
 * attendance saves that could not reach the server.
 *
 * Replaces two separate flushers (AttendanceFlow + useNotifications) that could run
 * at the same time and retried failing items forever.
 *
 * Rules
 *  - One queued save per group+date (a newer save replaces an older one: it holds the
 *    latest marks).
 *  - Uploads are single-flight: overlapping flush() calls share one run.
 *  - network error / 5xx / 408 / 429 / 401  -> keep and retry later (attempts counted,
 *    except 401 which just means "sign in again").
 *  - any other 4xx (the server rejected this save for good) -> moved to a "failed"
 *    list the user can see, never retried automatically.
 *  - after MAX_ATTEMPTS failed uploads an item is also moved to "failed".
 *
 * `createQueue` takes its dependencies so it can be unit-tested without a browser.
 */

const QUEUE_KEY  = 'ct_offline_queue'   // same key as before, so existing queued saves still upload
const FAILED_KEY = 'ct_offline_failed'
export const MAX_ATTEMPTS = 15
const EVENT_NAME = 'ct-offline-queue'

export function createQueue({
  storage,
  fetchFn,
  now = () => Date.now(),
  emit = () => {},
  endpoint = '/api/attendance',
} = {}) {
  let running = null

  const read = (key) => {
    try { const v = JSON.parse(storage.getItem(key) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
  }
  const write = (key, list) => {
    try { storage.setItem(key, JSON.stringify(list)) } catch { /* storage full / unavailable */ }
  }
  const changed = () => emit({ pending: read(QUEUE_KEY).length, failed: read(FAILED_KEY).length })

  const sameSave = (a, b) => a.groupId === b.groupId && a.date === b.date

  function enqueue(payload) {
    const queue = read(QUEUE_KEY).filter(i => !sameSave(i, payload))
    queue.push({ ...payload, queuedAt: new Date(now()).toISOString(), attempts: 0 })
    write(QUEUE_KEY, queue)
    changed()
    return queue.length
  }

  const pending = () => read(QUEUE_KEY)
  const failed  = () => read(FAILED_KEY)
  const counts  = () => ({ pending: pending().length, failed: failed().length })

  function dismissFailed() { write(FAILED_KEY, []); changed() }

  async function runFlush() {
    const queue = read(QUEUE_KEY)
    if (!queue.length) return { sent: 0, kept: 0, failed: 0 }

    const keep = []
    const dead = read(FAILED_KEY)
    let sent = 0, newlyFailed = 0

    for (const item of queue) {
      const { attempts = 0, queuedAt, ...payload } = item
      let status = 0
      try {
        const res = await fetchFn(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        status = res.status
      } catch {
        status = 0                      // network error
      }

      if (status >= 200 && status < 300) { sent++; continue }

      const retryable = status === 0 || status >= 500 || status === 408 || status === 429 || status === 401
      const nextAttempts = status === 401 ? attempts : attempts + 1
      if (retryable && nextAttempts < MAX_ATTEMPTS) {
        keep.push({ ...payload, queuedAt, attempts: nextAttempts })
      } else {
        dead.push({ ...payload, queuedAt, failedAt: new Date(now()).toISOString(), status })
        newlyFailed++
      }
    }

    // Anything enqueued while we were uploading must not be lost: merge, don't overwrite.
    const arrivedMeanwhile = read(QUEUE_KEY).filter(i => !queue.some(q => sameSave(q, i) && q.queuedAt === i.queuedAt))
    for (const extra of arrivedMeanwhile) {
      const i = keep.findIndex(k => sameSave(k, extra))
      if (i >= 0) keep.splice(i, 1)
      keep.push(extra)
    }

    write(QUEUE_KEY, keep)
    write(FAILED_KEY, dead.slice(-20))
    changed()
    return { sent, kept: keep.length, failed: newlyFailed }
  }

  /** Upload everything waiting. Concurrent callers share one run. */
  function flush() {
    if (!running) running = runFlush().finally(() => { running = null })
    return running
  }

  return { enqueue, flush, pending, failed, counts, dismissFailed }
}

// ── Browser singleton ─────────────────────────────────────────────────────────
let instance = null
export function offlineQueue() {
  if (typeof window === 'undefined') return null
  if (!instance) {
    instance = createQueue({
      storage: window.localStorage,
      fetchFn: (...a) => window.fetch(...a),
      emit: detail => window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail })),
    })
  }
  return instance
}

/** Subscribe to queue changes. Returns an unsubscribe function. */
export function onQueueChange(cb) {
  if (typeof window === 'undefined') return () => {}
  const h = e => cb(e.detail)
  window.addEventListener(EVENT_NAME, h)
  return () => window.removeEventListener(EVENT_NAME, h)
}
