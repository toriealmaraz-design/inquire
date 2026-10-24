'use client'

import { useEffect, useRef } from 'react'

/**
 * Keeps a signed-in page in sync with the person's role. If the super admin
 * promotes, demotes, removes or reassigns them, the page reloads into the
 * right dashboard within ~15 seconds (or as soon as they come back to the tab).
 */
export function RoleWatcher({ role, status, field }: { role?: string | null; status?: string | null; field?: string | null }) {
  const initial = useRef(`${role ?? ''}|${status ?? 'active'}|${field ?? ''}`)

  useEffect(() => {
    let stopped = false
    const check = async () => {
      if (stopped || document.visibilityState !== 'visible') return
      try {
        const res = await fetch('/api/me', { cache: 'no-store' })
        if (!res.ok) return
        const me = await res.json()
        if (!me.signedIn) return window.location.assign('/auth/signin')
        const now = `${me.role ?? ''}|${me.status ?? 'active'}|${me.field ?? ''}`
        if (now !== initial.current) {
          stopped = true
          window.location.assign('/dashboard') // server routes them to the right place for the new role
        }
      } catch {}
    }
    const timer = setInterval(check, 15_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      stopped = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  return null
}
