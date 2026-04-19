'use client'

import { useState, useEffect } from 'react'
import { usePWA } from '@/hooks/usePWA'

// ── Storage keys ──────────────────────────────────────────────────────────────
const K = {
  notifDismissed:  'ct_notif_prompt_dismissed_at',
  notifGranted:    'ct_notif_granted',
  installDismissed:'ct_install_dismissed_at',
  installDone:     'ct_install_done',
}
const DAY = 24 * 60 * 60 * 1000

function shouldShow(key, days) {
  const at = localStorage.getItem(key)
  if (!at) return true
  return Date.now() - parseInt(at, 10) > days * DAY
}

// ── Notification bottom sheet (first visit) ───────────────────────────────────
function NotifSheet({ onAccept, onDismiss }) {
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:200,
      background:'rgba(15,26,19,0.5)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }}>
      <div style={{
        background:'#fff', borderRadius:'20px 20px 0 0',
        width:'100%', maxWidth:480,
        padding:'1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom,0))',
        boxShadow:'0 -8px 40px rgba(0,0,0,0.15)',
        animation:'ctSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{width:48,height:48,borderRadius:14,background:'rgba(26,58,42,0.08)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:14}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a3a2a" strokeWidth="1.75" strokeLinecap="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
        </div>
        <h2 style={{fontFamily:'var(--font-playfair),Georgia,serif',fontSize:20,fontWeight:700,color:'#1a3a2a',margin:'0 0 8px'}}>
          Stay on top of follow-ups
        </h2>
        <p style={{fontSize:14,color:'#8a9e90',margin:'0 0 1.5rem',lineHeight:1.5}}>
          Get Sunday reminders to take attendance and follow up with absent members.
        </p>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onDismiss} style={{flex:1,height:48,borderRadius:13,border:'1.5px solid rgba(26,58,42,0.18)',background:'#fff',color:'#8a9e90',fontSize:15,fontWeight:600,cursor:'pointer'}}>
            Not now
          </button>
          <button onClick={onAccept} style={{flex:1,height:48,borderRadius:13,border:'none',background:'#1a3a2a',color:'#e8d5a0',fontSize:15,fontWeight:700,cursor:'pointer',boxShadow:'0 4px 14px rgba(26,58,42,0.25)'}}>
            Enable
          </button>
        </div>
      </div>
      <style>{`@keyframes ctSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  )
}

// ── Small re-prompt banner ────────────────────────────────────────────────────
function NotifBanner({ onEnable, onDismiss }) {
  return (
    <div style={{position:'fixed',top:62,left:0,right:0,zIndex:80,padding:'0 0.75rem',pointerEvents:'none'}}>
      <div style={{maxWidth:860,margin:'0 auto',background:'rgba(26,58,42,0.95)',backdropFilter:'blur(8px)',borderRadius:12,padding:'0.625rem 0.875rem',display:'flex',alignItems:'center',gap:10,boxShadow:'0 4px 20px rgba(26,58,42,0.2)',pointerEvents:'auto',animation:'ctSlideDown 0.3s cubic-bezier(0.16,1,0.3,1)'}}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" style={{flexShrink:0}}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <p style={{flex:1,fontSize:13,fontWeight:600,color:'#e8d5a0',margin:0}}>Enable notifications for Sunday reminders</p>
        <button onClick={onEnable} style={{height:28,padding:'0 10px',borderRadius:8,border:'none',background:'#c9a84c',color:'#1a3a2a',fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0}}>Enable</button>
        <button onClick={onDismiss} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(232,213,160,0.4)',padding:2,flexShrink:0,display:'flex'}}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <style>{`@keyframes ctSlideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}

// ── Install banner ────────────────────────────────────────────────────────────
function InstallBanner({ isIOS, onInstall, onDismiss }) {
  if (!isIOS && !onInstall) return null
  return (
    <div style={{
      position:'fixed', bottom:72, left:'50%', transform:'translateX(-50%)',
      zIndex:90, width:'calc(100% - 2rem)', maxWidth:420,
      background:'#1a3a2a', borderRadius:16, padding:'0.75rem 1rem',
      boxShadow:'0 8px 28px rgba(0,0,0,0.25)',
      display:'flex', alignItems:'center', gap:12,
      animation:'ctBannerUp 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{width:34,height:34,borderRadius:10,background:'rgba(201,168,76,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round">
          <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <p style={{fontSize:13,fontWeight:700,color:'#e8d5a0',margin:0}}>Install ChurchTrakr</p>
        <p style={{fontSize:11,color:'rgba(232,213,160,0.55)',margin:'1px 0 0',lineHeight:1.3}}>
          {isIOS ? 'Tap Share → "Add to Home Screen"' : 'Add to home screen for faster access'}
        </p>
      </div>
      {onInstall && (
        <button onClick={onInstall} style={{height:32,padding:'0 12px',borderRadius:9,border:'none',background:'#c9a84c',color:'#1a3a2a',fontSize:12,fontWeight:700,cursor:'pointer',flexShrink:0}}>
          Install
        </button>
      )}
      <button onClick={onDismiss} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(232,213,160,0.45)',padding:3,flexShrink:0,display:'flex'}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <style>{`@keyframes ctBannerUp{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PWAPrompt() {
  const [mounted,     setMounted]     = useState(false)
  const [showNotif,   setShowNotif]   = useState(false)
  const [showBanner,  setShowBanner]  = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [isIOS,       setIsIOS]       = useState(false)
  const [requesting,  setRequesting]  = useState(false)

  // Use the singleton-backed hook — this shares the install prompt event globally
  const { installPrompt, promptInstall, isInstalled, permission } = usePWA()

  useEffect(() => {
    setMounted(true)
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream)

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         window.navigator.standalone

    setTimeout(() => {
      const notifPerm = 'Notification' in window ? Notification.permission : 'default'

      if (notifPerm === 'denied') return

      if (notifPerm === 'granted') {
        if (!localStorage.getItem(K.notifGranted)) localStorage.setItem(K.notifGranted, '1')
        // Show install banner if not installed and not dismissed
        if (!isStandalone && !localStorage.getItem(K.installDone)) {
          if (shouldShow(K.installDismissed, 7)) setShowInstall(true)
        }
        return
      }

      // permission === 'default'
      if (!localStorage.getItem(K.notifDismissed)) {
        setTimeout(() => setShowNotif(true), 2000)
      } else if (shouldShow(K.notifDismissed, 3)) {
        setShowBanner(true)
      }
    }, 500)
  }, [])

  // Show install banner whenever the install prompt becomes available
  useEffect(() => {
    if (!mounted) return
    if (!installPrompt) return
    if (isInstalled) return
    if (localStorage.getItem(K.installDone)) return
    if (!shouldShow(K.installDismissed, 7)) return
    // Delay so it doesn't appear simultaneously with notif prompt
    const t = setTimeout(() => setShowInstall(true), 3500)
    return () => clearTimeout(t)
  }, [installPrompt, isInstalled, mounted])

  async function handleNotifAccept() {
    setShowNotif(false)
    setRequesting(true)
    try {
      if ('Notification' in window) {
        const result = await Notification.requestPermission()
        if (result === 'granted') localStorage.setItem(K.notifGranted, '1')
      }
    } finally { setRequesting(false) }
  }

  function handleNotifDismiss() {
    setShowNotif(false)
    localStorage.setItem(K.notifDismissed, String(Date.now()))
  }

  function handleBannerDismiss() {
    setShowBanner(false)
    localStorage.setItem(K.notifDismissed, String(Date.now()))
  }

  async function handleInstall() {
    // Call promptInstall() FIRST — must happen synchronously in the click handler.
    // Calling setState before prompt() can break the user-gesture requirement in some browsers.
    const accepted = await promptInstall()
    setShowInstall(false)
    if (accepted) localStorage.setItem(K.installDone, '1')
  }

  function handleInstallDismiss() {
    setShowInstall(false)
    localStorage.setItem(K.installDismissed, String(Date.now()))
  }

  if (!mounted) return null

  return (
    <>
      {showNotif && (
        <NotifSheet onAccept={handleNotifAccept} onDismiss={handleNotifDismiss} />
      )}
      {showBanner && !showNotif && (
        <NotifBanner onEnable={handleNotifAccept} onDismiss={handleBannerDismiss} />
      )}
      {showInstall && !showNotif && (
        <InstallBanner
          isIOS={isIOS}
          onInstall={installPrompt ? handleInstall : null}
          onDismiss={handleInstallDismiss}
        />
      )}
    </>
  )
}
