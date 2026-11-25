'use client'

import { useEffect, useState } from 'react'
import { Activity, ChevronDown, Clock3, MessageCircle, Radio } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PRESENCE_CHANNEL } from '@/components/support-presence'
import { openCommandBar } from '@/components/command-bar'

const ghanaTime = () =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Accra',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date())

/** Compact operations readout: Ghana time, live specialist status, command access. */
export function NexusHud() {
  const [time, setTime] = useState('')
  const [online, setOnline] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setTime(ghanaTime())
    const timer = window.setInterval(() => setTime(ghanaTime()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return
    const supabase = createClient()
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: `hud-${Math.random().toString(36).slice(2, 10)}` } },
    })
    channel.on('presence', { event: 'sync' }, () => {
      setOnline(Object.keys(channel.presenceState()).some((key) => key.startsWith('staff-')))
    })
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') channel.track({ hud: true, at: Date.now() })
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <div className="fixed bottom-4 left-4 z-40 flex flex-col items-start gap-2">
      {expanded && (
        <div className="hidden w-64 rounded-2xl border border-[rgba(0,240,255,0.18)] bg-[#0a0f1c]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl sm:block" style={{ animation: 'command-in 200ms ease-out both' }}>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300"><Activity className="size-3" /> Nexus signal</p>
          <div className="mt-3 space-y-2 text-xs">
            <p className="flex items-center justify-between gap-3 text-slate-400"><span className="flex items-center gap-1.5"><Clock3 className="size-3.5" /> Accra local</span><span className="font-mono font-bold text-white">{time || '--:--'}</span></p>
            <p className="flex items-center justify-between gap-3 text-slate-400">
              <span className="flex items-center gap-1.5"><Radio className="size-3.5" /> Team</span>
              <span className={online ? 'font-bold text-emerald-300' : 'font-bold text-slate-300'}>{online ? 'Specialist online' : 'On standby'}</span>
            </p>
          </div>
          <a href="/chat" className="portal-focus mt-3 flex items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20">
            <MessageCircle className="size-3.5" /> Open live chat
          </a>
          <p className="mt-3 text-[10px] text-slate-600">Press ⌘K / Ctrl+K anywhere for commands.</p>
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={openCommandBar}
          aria-label="Open Nexus command menu"
          title="Open command menu (⌘K)"
          className="portal-focus flex items-center gap-2 rounded-full border border-[rgba(0,240,255,0.22)] bg-[#0a0f1c]/90 px-3 py-2 text-[11px] font-bold text-slate-300 shadow-lg shadow-black/30 backdrop-blur-xl transition hover:border-cyan-300/50 hover:text-white"
        >
          <span className={`size-1.5 shrink-0 rounded-full ${online ? 'bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]' : 'bg-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.8)]'}`} />
          <span className="hidden sm:inline">NEXUS</span>
          <span className="font-mono text-cyan-200">{time || '--:--'}</span>
          <kbd className="hidden rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-label={expanded ? 'Hide Nexus signal details' : 'Show Nexus signal details'}
          aria-expanded={expanded}
          className="portal-focus hidden size-8 items-center justify-center rounded-full border border-[rgba(0,240,255,0.18)] bg-[#0a0f1c]/90 text-slate-400 backdrop-blur-xl transition hover:text-cyan-200 sm:flex"
        >
          <ChevronDown className={`size-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
    </div>
  )
}

export default NexusHud
