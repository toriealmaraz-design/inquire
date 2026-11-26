'use client'

import { Eye } from 'lucide-react'
import { countVisitors, usePresence } from '@/lib/presence'

export { PRESENCE_CHANNEL } from '@/lib/presence'

/**
 * Mount on admin pages: marks this admin as "online" for clients on /chat
 * (goes offline when the tab closes). With showVisitors, also shows how many
 * possible clients currently have Live Chat open.
 */
export function SupportPresence({ showVisitors = false }: { userId: string; showVisitors?: boolean }) {
  const { state } = usePresence('staff')
  const visitors = countVisitors(state)

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
