'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

/** A single cyan sweep on route change. Skips first paint and reduced motion. */
export function PageTransition() {
  const pathname = usePathname()
  const router = useRouter()
  const [run, setRun] = useState(0)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    setRun((current) => current + 1)
  }, [pathname])

  // Make ordinary same-origin links client-side so the veil actually plays.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as Element | null)?.closest?.('a')
      if (!anchor || anchor.hasAttribute('download') || anchor.target === '_blank') return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin || url.pathname.startsWith('/api/')) return
      if (/\.(png|jpe?g|svg|webp|gif|ico|mp4|pdf|zip|txt|webmanifest)$/i.test(url.pathname)) return
      if (url.pathname === window.location.pathname && url.hash) return
      event.preventDefault()
      router.push(`${url.pathname}${url.search}${url.hash}`)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [router])

  if (!run) return null
  return <div key={run} className="page-veil" aria-hidden="true" />
}

export default PageTransition
