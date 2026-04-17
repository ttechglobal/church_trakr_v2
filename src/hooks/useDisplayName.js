'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ct_display_name'
const PROMPTED_KEY = 'ct_display_name_prompted'

export function useDisplayName(fallback = 'Team member') {
  const [displayName, setDisplayNameState] = useState(fallback)
  const [showPrompt, setShowPrompt]         = useState(false)
  const [loaded, setLoaded]                 = useState(false)

  useEffect(() => {
    const stored   = localStorage.getItem(STORAGE_KEY)
    const prompted = localStorage.getItem(PROMPTED_KEY)

    if (stored) {
      setDisplayNameState(stored)
      setLoaded(true)
    } else if (!prompted) {
      // First time on this device — show the prompt
      setShowPrompt(true)
      setLoaded(true)
    } else {
      // Was prompted before, dismissed without setting — use fallback
      setDisplayNameState(fallback)
      setLoaded(true)
    }
  }, [fallback])

  function setDisplayName(name) {
    const trimmed = name.trim()
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed)
      setDisplayNameState(trimmed)
    }
    localStorage.setItem(PROMPTED_KEY, 'true')
    setShowPrompt(false)
  }

  function dismissPrompt() {
    localStorage.setItem(PROMPTED_KEY, 'true')
    setShowPrompt(false)
  }

  function updateDisplayName(name) {
    const trimmed = name.trim()
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed)
      setDisplayNameState(trimmed)
    }
  }

  return { displayName, showPrompt, loaded, setDisplayName, dismissPrompt, updateDisplayName }
}