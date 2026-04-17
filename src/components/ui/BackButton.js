'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function BackButton({ href, label = 'Back' }) {
  const router = useRouter()

  function handleBack() {
    if (href) {
      window.location.href = href
    } else {
      router.back()
    }
  }

  return (
    <button
      onClick={handleBack}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 600, color: '#8a9e90',
        padding: '4px 0', marginBottom: 16, letterSpacing: '-0.01em',
        transition: 'color 0.14s',
      }}
      onMouseEnter={e => e.currentTarget.style.color = '#1a3a2a'}
      onMouseLeave={e => e.currentTarget.style.color = '#8a9e90'}
    >
      <ArrowLeft size={14} strokeWidth={2.5} />
      {label}
    </button>
  )
}