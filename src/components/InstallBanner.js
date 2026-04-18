'use client'

import { useState, useEffect } from 'react'

const DISMISSED_KEY = 'ct_install_dismissed_v2'

export default function InstallBanner() {
  const [show,         setShow]        = useState(false)
  const [isIOS,        setIsIOS]       = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    // Don't show if already dismissed or if already installed
    if (localStorage.getItem(DISMISSED_KEY)) return
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (window.navigator.standalone) return // iOS standalone

    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream
    setIsIOS(ios)

    if (ios) {
      // iOS: show manual install instructions after 3s
      setTimeout(() => setShow(true), 3000)
    } else {
      // Android/Chrome: wait for beforeinstallprompt
      const handler = (e) => {
        e.preventDefault()
        setInstallPrompt(e)
        setShow(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setShow(false)
  }

  async function install() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setShow(false)
    else dismiss()
    setInstallPrompt(null)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 90,
      width: 'calc(100% - 2rem)',
      maxWidth: 420,
      background: '#1a3a2a',
      borderRadius: 16,
      padding: '0.875rem 1rem',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      animation: 'ctBannerUp 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      {/* Icon */}
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(201,168,76,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M10 3v14M3 10h14" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#e8d5a0', margin: '0 0 3px' }}>
          {isIOS ? 'Install ChurchTrakr' : 'Add to Home Screen'}
        </p>
        <p style={{ fontSize: 12, color: 'rgba(232,213,160,0.6)', margin: 0, lineHeight: 1.4 }}>
          {isIOS
            ? 'Tap the Share button below, then "Add to Home Screen"'
            : 'Install for faster access — works offline too'
          }
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {!isIOS && installPrompt && (
          <button onClick={install} style={{ height: 32, padding: '0 12px', borderRadius: 9, border: 'none', background: '#c9a84c', color: '#1a3a2a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Install
          </button>
        )}
        <button onClick={dismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(232,213,160,0.5)', padding: '4px', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes ctBannerUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
