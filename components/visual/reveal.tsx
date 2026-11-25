'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Scroll reveal that never hides content from reduced-motion users or bots.
 * The pending state is applied only after hydration, so SSR HTML stays readable.
 */
export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const node = ref.current
    if (!node || !('IntersectionObserver' in window)) return
    setPending(true)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPending(false)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`reveal ${pending ? 'reveal-pending' : ''} ${className}`.trim()}
      style={pending ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}

export default Reveal
