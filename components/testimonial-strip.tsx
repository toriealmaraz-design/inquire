'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { previewText } from '@/lib/text'

type Testimonial = { id: number; name: string; role: string | null; rating: number; body: string }

/** Public, approved client feedback from the existing testimonials API. */
export function TestimonialStrip() {
  const [items, setItems] = useState<Testimonial[]>([])

  useEffect(() => {
    let live = true
    fetch('/api/testimonials')
      .then((response) => (response.ok ? response.json() : []))
      .then((rows) => { if (live && Array.isArray(rows)) setItems(rows.slice(0, 3)) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  if (items.length === 0) return null

  return (
    <section aria-labelledby="client-words" className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">From our clients</p>
      <AnimatedHeading as="h2" id="client-words" style={{ justifyContent: 'flex-start' }} className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Good work, said plainly.</AnimatedHeading>
      <div className="mt-7 grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <figure key={item.id} className="portal-glass portal-glass-hover flex h-full flex-col rounded-2xl p-5">
            <div className="flex gap-0.5" aria-label={`${item.rating} out of 5 stars`}>
              {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`size-3.5 ${index < item.rating ? 'fill-cyan-300 text-cyan-300' : 'text-slate-600'}`} />)}
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-6 text-slate-300" title={item.body}>“{previewText(item.body, 220)}”</blockquote>
            <figcaption className="mt-5 border-t border-white/10 pt-4 text-xs text-slate-500">
              <strong className="block font-bold text-white">{item.name}</strong>
              {item.role && <span>{item.role}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
