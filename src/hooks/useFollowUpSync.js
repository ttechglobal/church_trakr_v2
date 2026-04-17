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

  // Debounced Supabase write
  const syncToServer = useCallback(
    debounce(async (latestData) => {
      try {
        await fetch('/api/followup/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ churchId, field, data: latestData }),
        })
      } catch (err) {
        console.warn('Follow-up sync failed (will retry)', err)
      }
    }, 1500),
    [churchId, field]
  )

  // Fetch fresh data from server (background)
  const syncFromServer = useCallback(async () => {
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
  }, [churchId, field])

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
    setData(prev => {
      const updated = {
        ...prev,
        [key]: {
          ...(prev[key] ?? {}),
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      }
      syncToServer(updated)
      return updated
    })
  }, [syncToServer])

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
