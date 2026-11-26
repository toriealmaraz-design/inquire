'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

/** Offline edit queue status. Draft edits stay in sessionStorage via IntakeProvider. */
export function ConnectionBanner() {
  const [online, setOnline] = useState(true)
  const [backAt, setBackAt] = useState(0)

  useEffect(() => {
    const wentOffline = () => { setOnline(false); setBackAt(0) }
    const cameBack = () => { setOnline(true); setBackAt(Date.now()) }
    setOnline(navigator.onLine)
    window.addEventListener('offline', wentOffline)
    window.addEventListener('online', cameBack)
    return () => {
      window.removeEventListener('offline', wentOffline)
      window.removeEventListener('online', cameBack)
    }
  }, [])

  useEffect(() => {
    if (!backAt) return
    const timer = window.setTimeout(() => setBackAt(0), 5000)
    return () => window.clearTimeout(timer)
  }, [backAt])

  if (online && !backAt) return null

  return (
    <div role="status" aria-live="polite" className={`fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 border-t px-5 py-2.5 text-center text-[11px] font-bold uppercase tracking-[.14em] shadow-[0_0_28px_rgba(0,240,255,0.18)] backdrop-blur-xl ${online ? 'border-cyan-300/40 bg-[#060b14]/95 text-cyan-200' : 'border-rose-300/40 bg-[#060b14]/95 text-rose-200'}`}>
      {online ? <span className="size-1.5 rounded-full bg-cyan-300" /> : <WifiOff className="size-3.5 animate-pulse" />}
      {online ? 'Back online — draft ready' : 'Offline — Queued — will sync when connected'}
    </div>
  )
}
