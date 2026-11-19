'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { debounce } from '@/lib/utils'

const LOCAL_KEY = (churchId, type) => `ct_followup_${type}_${churchId}`
const SYNC_INTERVAL = 30_000 // 30s background sync

/**
 * Local-first follow-up sync hook.
 *
 * Loads from localStorage immediately, syncs from Supabase in background.
 * Debounces all writes so we don't hammer Supabase on every tap.
 *
 * @param {string} churchId
 * @param {object} initialData - server-fetched data (SSR hydration)
 * @param {string} type - 'absentee' | 'attendee'
 * @param {string} field - Supabase column name
 */
export function useFollowUpSync(churchId, initialData, type, field) {
  const localKey = LOCAL_KEY(churchId, type)
  const [data, setData] = useState(() => {
    // Merge localStorage (most recent) with server data on init
    if (typeof window === 'undefined') return initialData
    try {
      const local = JSON.parse(localStorage.getItem(localKey) ?? '{}')
      return mergeFollowUpData(initialData, local)
    } catch {
      return initialData
    }
  })

  const dataRef = useRef(data)
  dataRef.current = data

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(localKey, JSON.stringify(data))
    } catch {}
  }, [data, localKey])

  // Entries changed locally but not yet confirmed saved. Only THESE are sent, so a
  // stale tab can never overwrite entries it did not touch.
  const dirtyRef = useRef(new Set())

  const flush = useCallback(
    debounce(async () => {
      const keys = [...dirtyRef.current]
      if (!keys.length) return
      const payload = {}
      for (const k of keys) if (dataRef.current[k]) payload[k] = dataRef.current[k]
      try {
        const res = await fetch('/api/followup/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ churchId, field, data: payload }),
        })
        // Only clear what we sent; anything edited meanwhile stays dirty
        if (res.ok) {
          for (const k of keys) {
            if (dataRef.current[k] === payload[k]) dirtyRef.current.delete(k)
          }
        }
      } catch (err) {
        console.warn('Follow-up sync failed (will retry)', err)
      }
    }, 1500),
    [churchId, field]
  )

  // On load: anything in localStorage that is newer than what the server gave us was
  // never saved (offline / closed tab) — queue it so it is not lost.
  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(localKey) ?? '{}')
      for (const [k, v] of Object.entries(local)) {
        if (k.startsWith('__') || !v || typeof v !== 'object') continue
        const localT  = new Date(v.updatedAt ?? 0).getTime()
        const serverT = new Date(initialData?.[k]?.updatedAt ?? 0).getTime()
        if (localT > serverT) dirtyRef.current.add(k)
      }
      if (dirtyRef.current.size) flush()
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch fresh data from server (background)
  const syncFromServer = useCallback(async () => {
    if (dirtyRef.current.size) flush()   // retry anything that failed to save
    try {
      const res = await fetch(`/api/followup/load?churchId=${churchId}&field=${field}`)
      if (!res.ok) return
      const { data: serverData } = await res.json()
      if (!serverData) return
      setData(prev => {
        const merged = mergeFollowUpData(serverData, prev)
        return merged
      })
    } catch {}
  }, [churchId, field, flush])

  // Background sync every 30s + on tab focus
  useEffect(() => {
    syncFromServer()
    const interval = setInterval(syncFromServer, SYNC_INTERVAL)
    const handleFocus = () => syncFromServer()
    window.addEventListener('focus', handleFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [syncFromServer])

  // Update a follow-up entry
  const update = useCallback((key, patch) => {
    setData(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {}),
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }))
    dirtyRef.current.add(key)
    // dataRef is refreshed on the next render; flush runs after the debounce delay
    flush()
  }, [flush])

  return { data, update }
}

// Merge: prefer entries with more recent updatedAt
function mergeFollowUpData(base, overlay) {
  const result = { ...base }
  for (const [key, val] of Object.entries(overlay)) {
    const existing = result[key]
    if (!existing) {
      result[key] = val
    } else {
      const baseTime = new Date(existing.updatedAt ?? 0).getTime()
      const overlayTime = new Date(val.updatedAt ?? 0).getTime()
      if (overlayTime >= baseTime) result[key] = val
    }
  }
  return result
}
