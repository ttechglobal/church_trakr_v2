'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Simple in-memory + sessionStorage cache ───────────────────────────────────
// Data is cached for TTL ms. On cache hit, returns instantly.
// Falls back to fetch on miss or expiry.

const CACHE_TTL = {
  members: 5 * 60 * 1000,   // 5 minutes
  groups:  5 * 60 * 1000,   // 5 minutes
  church:  10 * 60 * 1000,  // 10 minutes
}

const memCache = new Map()

function getCached(key) {
  // Check memory first
  if (memCache.has(key)) {
    const { data, expiry } = memCache.get(key)
    if (Date.now() < expiry) return data
    memCache.delete(key)
  }
  // Check sessionStorage
  try {
    const raw = sessionStorage.getItem(`ct_cache_${key}`)
    if (raw) {
      const { data, expiry } = JSON.parse(raw)
      if (Date.now() < expiry) {
        memCache.set(key, { data, expiry })
        return data
      }
      sessionStorage.removeItem(`ct_cache_${key}`)
    }
  } catch {}
  return null
}

function setCached(key, data, ttl) {
  const expiry = Date.now() + ttl
  memCache.set(key, { data, expiry })
  try {
    sessionStorage.setItem(`ct_cache_${key}`, JSON.stringify({ data, expiry }))
  } catch {}
}

export function invalidateCache(key) {
  memCache.delete(key)
  try { sessionStorage.removeItem(`ct_cache_${key}`) } catch {}
}

export function invalidateAll() {
  memCache.clear()
  try {
    Object.keys(sessionStorage)
      .filter(k => k.startsWith('ct_cache_'))
      .forEach(k => sessionStorage.removeItem(k))
  } catch {}
}

// ── useMembers — cached member list ──────────────────────────────────────────

export function useMembers(churchId) {
  const [members, setMembers] = useState(() => getCached(`members_${churchId}`) ?? [])
  const [loading, setLoading] = useState(members.length === 0)
  const [error,   setError]   = useState(null)
  const fetchedRef            = useRef(false)

  const refresh = useCallback(async (force = false) => {
    if (!churchId) return
    const cached = getCached(`members_${churchId}`)
    if (cached && !force) {
      setMembers(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res  = await fetch(`/api/members`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const list = data.members ?? []
      setMembers(list)
      setCached(`members_${churchId}`, list, CACHE_TTL.members)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [churchId])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    if (members.length === 0) refresh()
    else setLoading(false)
  }, [refresh, members.length])

  function updateMember(updated) {
    setMembers(prev => {
      const next = prev.map(m => m.id === updated.id ? updated : m)
      setCached(`members_${churchId}`, next, CACHE_TTL.members)
      return next
    })
  }

  function addMember(member) {
    setMembers(prev => {
      const next = [...prev, member].sort((a, b) => a.name.localeCompare(b.name))
      setCached(`members_${churchId}`, next, CACHE_TTL.members)
      return next
    })
  }

  function removeMember(id) {
    setMembers(prev => {
      const next = prev.filter(m => m.id !== id)
      setCached(`members_${churchId}`, next, CACHE_TTL.members)
      return next
    })
  }

  return { members, loading, error, refresh, updateMember, addMember, removeMember }
}

// ── useGroups — cached group list ────────────────────────────────────────────

export function useGroups(churchId) {
  const [groups,  setGroups]  = useState(() => getCached(`groups_${churchId}`) ?? [])
  const [loading, setLoading] = useState(groups.length === 0)
  const [error,   setError]   = useState(null)
  const fetchedRef            = useRef(false)

  const refresh = useCallback(async (force = false) => {
    if (!churchId) return
    const cached = getCached(`groups_${churchId}`)
    if (cached && !force) {
      setGroups(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res  = await fetch(`/api/groups`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const list = data.groups ?? []
      setGroups(list)
      setCached(`groups_${churchId}`, list, CACHE_TTL.groups)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [churchId])

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    if (groups.length === 0) refresh()
    else setLoading(false)
  }, [refresh, groups.length])

  function updateGroup(updated) {
    setGroups(prev => {
      const next = prev.map(g => g.id === updated.id ? updated : g)
      setCached(`groups_${churchId}`, next, CACHE_TTL.groups)
      return next
    })
  }

  function addGroup(group) {
    setGroups(prev => {
      const next = [...prev, group]
      setCached(`groups_${churchId}`, next, CACHE_TTL.groups)
      return next
    })
  }

  function removeGroup(id) {
    setGroups(prev => {
      const next = prev.filter(g => g.id !== id)
      setCached(`groups_${churchId}`, next, CACHE_TTL.groups)
      return next
    })
  }

  return { groups, loading, error, refresh, updateGroup, addGroup, removeGroup }
}
