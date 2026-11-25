'use client'

import { ArrowUpRight, GraduationCap, Palette, Terminal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { Magnetic } from '@/components/visual/magnetic'
import { Reveal } from '@/components/visual/reveal'

type Lane = {
  id: 'academic' | 'media' | 'systems'
  name: string
  tagline: string
  icon: LucideIcon
  turnaround: string
  from: string
  bestFor: string[]
}

const lanes: Lane[] = [
  {
    id: 'academic',
    name: 'Academic & research',
    tagline: 'Stronger arguments, cleaner evidence, clearer writing.',
    icon: GraduationCap,
    turnaround: '3–5 days',
    from: 'GHS 8 / page',
    bestFor: ['Methodology reviews', 'Proofreading & formatting', 'Study guides'],
  },
  {
    id: 'media',
    name: 'Visual media',
    tagline: 'Decks and documents that make the work land.',
    icon: Palette,
    turnaround: '2–4 days',
    from: 'GHS 12 / slide',
    bestFor: ['Slide design', 'Report layout', 'Brand assets'],
  },
  {
    id: 'systems',
    name: 'Technical systems',
    tagline: 'Unblock the build, understand the data, ship the fix.',
    icon: Terminal,
    turnaround: '24–72 hours',
    from: 'GHS 30 / hour',
    bestFor: ['Code debugging', 'Architecture review', 'Data walkthroughs'],
  },
]

/** Interactive service lanes that feed the quote estimator and intake deep links. */
export function ServiceConstellation() {
  return (
    <section aria-labelledby="service-lanes" className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
      <Reveal>
        <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Three specialist lanes</p>
        <AnimatedHeading as="h2" id="service-lanes" style={{ justifyContent: 'flex-start' }} className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Pick your lane.</AnimatedHeading>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Each lane has a dedicated specialist and a clear starting range. Hover a card to see what belongs there — or open it to begin a brief.</p>
      </Reveal>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        {lanes.map((lane, index) => {
          const Icon = lane.icon
          return (
            <Reveal key={lane.id} delay={index * 90}>
              <Magnetic className="h-full w-full">
                <a
                  href={`/intake?track=${lane.id}`}
                  data-cursor-label="OPEN"
                  className="portal-glass group flex h-full flex-col rounded-[1.75rem] p-6 transition-colors hover:border-cyan-300/40 focus-visible:border-cyan-300/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex size-11 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-300"><Icon className="size-5" /></span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">0{index + 1}</span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold tracking-tight text-white">{lane.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{lane.tagline}</p>

                  <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
                    <span className="rounded-full border border-[rgba(0,240,255,0.14)] px-3 py-1.5">{lane.turnaround}</span>
                    <span className="rounded-full border border-[rgba(0,240,255,0.14)] px-3 py-1.5">{lane.from}</span>
                  </div>

                  <div className="grid grid-rows-[0fr] transition-all duration-300 ease-out group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
                    <div className="overflow-hidden">
                      <div className="mt-5 border-t border-white/10 pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300">Best for</p>
                        <ul className="mt-2 space-y-1 text-xs text-slate-300">
                          {lane.bestFor.map((item) => <li key={item}>· {item}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <span className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-bold text-cyan-200">
                    Open this lane <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </a>
              </Magnetic>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

export default ServiceConstellation
