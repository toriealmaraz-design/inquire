'use client'

import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export const PRESENCE_CHANNEL = 'support-presence'

/**
 * Mount on admin pages: marks this admin as "online" for clients on /chat
 * (goes offline when the tab closes). With showVisitors, also shows how many
 * possible clients currently have Live Chat open.
 */
export function SupportPresence({ userId, showVisitors = false }: { userId: string; showVisitors?: boolean }) {
  const [visitors, setVisitors] = useState(0)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return
    const supabase = createClient()
    const channel = supabase.channel(PRESENCE_CHANNEL, { config: { presence: { key: `staff-${userId}` } } })
    // A presence listener must be bound before subscribing or tracking is ignored
    channel
      .on('presence', { event: 'sync' }, () => setVisitors(Object.keys(channel.presenceState()).filter((k) => k.startsWith('visitor-')).length))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') channel.track({ staff: true, at: Date.now() })
      })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  if (!showVisitors) return null
  return (
    <div className={`mx-3 mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${visitors ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100' : 'border-white/10 text-slate-400'}`} aria-live="polite">
      <Eye className="size-4" />
      {visitors ? (
        <span><strong>{visitors}</strong> possible client{visitors === 1 ? '' : 's'} on Live Chat now</span>
      ) : (
        <span>No visitors on Live Chat right now</span>
      )}
      {visitors > 0 && <span className="ml-auto size-2 animate-pulse rounded-full bg-emerald-300" />}
    </div>
  )
}
