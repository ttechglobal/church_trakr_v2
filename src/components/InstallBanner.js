'use client'

import { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'
import { X, Smartphone } from 'lucide-react'

const DISMISSED_KEY = 'ct_install_dismissed'

export default function InstallBanner() {
  const { installPrompt, promptInstall, isInstalled } = usePWA()
  const [show,      setShow]      = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const wasDismissed = localStorage.getItem(DISMISSED_KEY)
    if (!wasDismissed) setShow(true)
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  async function install() {
    await promptInstall()
    dismiss()
  }

  // Only show if: installable, not yet installed, not dismissed, banner enabled
  if (!show || dismissed || isInstalled || !installPrompt) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 90,
      width: 'calc(100% - 2rem)',
      maxWidth: 480,
      background: '#1a3a2a',
      borderRadius: 16,
      padding: '0.875rem 1rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Smartphone size={18} color="#c9a84c" strokeWidth={1.75} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#e8d5a0', margin: '0 0 2px' }}>
          Add to Home Screen
        </p>
        <p style={{ fontSize: 12, color: 'rgba(232,213,160,0.6)', margin: 0 }}>
          Install ChurchTrakr for faster access
        </p>
      </div>
      <button onClick={install} style={{
        height: 34, padding: '0 12px', borderRadius: 9,
        border: 'none', background: '#c9a84c', color: '#1a3a2a',
        fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
      }}>
        Install
      </button>
      <button onClick={dismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'rgba(232,213,160,0.5)', padding: 4, flexShrink: 0,
        display: 'flex', alignItems: 'center',
      }}>
        <X size={16} />
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
