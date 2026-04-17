'use client'

import { useState, useEffect } from 'react'

export default function DashboardGreeting({ fallbackName, greeting, churchName, date }) {
  const [name, setName] = useState(null)

  useEffect(() => {
    // Read device display name — set per-device in Settings
    const stored = localStorage.getItem('ct_display_name')
    setName(stored && stored.trim() ? stored.trim() : fallbackName)
  }, [fallbackName])

  const firstName = (name || '').split(' ')[0]

  return (
    <div>
      <p style={{ fontSize: 13, color: '#8a9e90', margin: '0 0 3px', fontWeight: 500 }}>
        {greeting}{firstName ? `, ${firstName}` : ''}
      </p>
      <h1 style={{
        fontFamily: 'var(--font-playfair),Georgia,serif',
        fontSize: 'clamp(1.4rem,3vw,1.875rem)',
        fontWeight: 700, color: '#1a3a2a',
        margin: 0, letterSpacing: '-0.025em',
      }}>
        {churchName}
      </h1>
      <p style={{ fontSize: 12, color: '#b0bec0', margin: '3px 0 0' }}>{date}</p>
    </div>
  )
}
