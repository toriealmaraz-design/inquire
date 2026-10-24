'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export const PRESENCE_CHANNEL = 'support-presence'

/**
 * Mount on admin pages: marks this admin as "online" for clients on /chat.
 * Goes offline automatically when the tab closes.
 */
export function SupportPresence({ userId }: { userId: string }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return
    const supabase = createClient()
    const channel = supabase.channel(PRESENCE_CHANNEL, { config: { presence: { key: `staff-${userId}` } } })
    // A presence listener must be bound before subscribing or tracking is ignored
    channel.on('presence', { event: 'sync' }, () => {}).subscribe((status) => {
      if (status === 'SUBSCRIBED') channel.track({ staff: true, at: Date.now() })
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])
  return null
}
