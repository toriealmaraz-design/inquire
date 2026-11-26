'use client'

import { useEffect, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export const PRESENCE_CHANNEL = 'support-presence'

export type PresenceRole = 'staff' | 'visitor'

export type PresenceEntry = {
  staff?: boolean
  visitor?: boolean
  at?: number
}

export type PresenceState = Record<string, PresenceEntry[]>

export type PresenceSnapshot = {
  state: PresenceState
  synced: boolean
}

type PresenceListener = (snapshot: PresenceSnapshot) => void

const KEY = `browser-${Math.random().toString(36).slice(2, 10)}`

let client: ReturnType<typeof createClient> | null = null
let channel: RealtimeChannel | null = null
let started = false
let subscribed = false
let activeRole: PresenceRole | null = null
let snapshot: PresenceSnapshot = { state: {}, synced: false }
const listeners = new Set<PresenceListener>()

function publish(next: PresenceSnapshot) {
  snapshot = next
  listeners.forEach((listener) => listener(snapshot))
}

function start() {
  if (started || !process.env.NEXT_PUBLIC_SUPABASE_URL) return
  started = true

  client = createClient()
  channel = client.channel(PRESENCE_CHANNEL, {
    config: { presence: { key: KEY } },
  })

  // This is the ONLY place a presence callback is attached. Supabase throws if
  // a callback is added after subscribe(), which happened when the global HUD
  // and the dashboard both opened the same channel independently.
  channel.on('presence', { event: 'sync' }, () => {
    publish({
      state: (channel?.presenceState() ?? {}) as PresenceState,
      synced: true,
    })
  })

  channel.subscribe((status) => {
    subscribed = status === 'SUBSCRIBED'
    if (subscribed && activeRole) {
      void channel?.track({ [activeRole]: true, at: Date.now() }).catch(() => {})
    }
  })
}

function setPresenceRole(role: PresenceRole) {
  if (activeRole === role) return
  activeRole = role
  if (subscribed) void channel?.track({ [role]: true, at: Date.now() }).catch(() => {})
}

function clearPresenceRole(role: PresenceRole) {
  if (activeRole !== role) return
  activeRole = null
  if (subscribed) void channel?.untrack().catch(() => {})
}

function addListener(listener: PresenceListener) {
  listeners.add(listener)
  start()
  listener(snapshot)
  return () => {
    listeners.delete(listener)
  }
}

/** Shared presence state for staff, visitors and the global signal HUD. */
export function usePresence(role: PresenceRole | null = null): PresenceSnapshot {
  const [value, setValue] = useState<PresenceSnapshot>(snapshot)

  useEffect(() => {
    if (role) setPresenceRole(role)
    const unsubscribe = addListener(setValue)
    setValue(snapshot)
    return () => {
      unsubscribe()
      if (role) clearPresenceRole(role)
    }
  }, [role])

  return value
}

export function hasStaff(state: PresenceState): boolean {
  return Object.values(state).some((entries) => entries.some((entry) => entry.staff))
}

export function countVisitors(state: PresenceState): number {
  return Object.values(state).filter((entries) => entries.some((entry) => entry.visitor)).length
}
