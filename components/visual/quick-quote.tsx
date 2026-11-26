'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Clock3, Sparkles } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { previewText } from '@/lib/text'
import { deadlineFor, deadlineOptions, quoteFor } from '@/components/intake/pricing'
import { quickScopePresets } from '@/components/intake/quick-scope'

/** Landing-page teaser for the same four quick scopes and GHS estimate used inside intake. */
export function QuickQuote() {
  const [optionId, setOptionId] = useState(quickScopePresets[0].id)
  const [volume, setVolume] = useState(quickScopePresets[0].volume)
  const [urgency, setUrgency] = useState(quickScopePresets[0].urgency)

  const option = quickScopePresets.find((item) => item.id === optionId) ?? quickScopePresets[0]
  const deadline = deadlineFor(urgency)
  const estimate = useMemo(() => quoteFor({ ...option, volume, urgency }), [option, volume, urgency])

  return (
    <section id="quick-estimate" aria-labelledby="quick-quote-title" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-16 lg:px-8">
      <div className="portal-glass rounded-[2rem] p-6 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-300"><Sparkles className="size-3.5" /> Know the range before you begin</p>
            <AnimatedHeading as="h2" id="quick-quote-title" style={{ justifyContent: 'flex-start' }} className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Get a quick GHS estimate.</AnimatedHeading>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Shape a rough scope here in seconds. The full intake saves it and a specialist confirms the final quote — there is no charge to ask.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-400">
              <span className="rounded-full border border-[rgba(0,240,255,0.14)] px-3 py-1.5">No deposit</span>
              <span className="rounded-full border border-[rgba(0,240,255,0.14)] px-3 py-1.5">Custom pricing</span>
              <span className="rounded-full border border-[rgba(0,240,255,0.14)] px-3 py-1.5">Live chat support</span>
            </div>
          </div>

          <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.04] p-5 sm:p-6">
            <label htmlFor="quick-category" className="text-xs font-semibold text-slate-300">What do you need?</label>
            <select id="quick-category" value={optionId} onChange={(event) => {
              const next = quickScopePresets.find((item) => item.id === event.target.value)
              if (!next) return
              setOptionId(next.id)
              setVolume(next.volume)
              setUrgency(next.urgency)
            }} className="portal-input mt-2 h-11 w-full px-3 text-sm">
              {quickScopePresets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>

            <div className="mt-5 flex items-center justify-between">
              <label htmlFor="quick-volume" className="text-xs font-semibold text-slate-300">Volume</label>
              <span className="text-xs font-bold text-cyan-200">{volume} {estimate.unit}</span>
            </div>
            <input id="quick-volume" type="range" min={1} max={20} value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label={`Volume in ${estimate.unit}`} className="mt-3 h-2 w-full accent-cyan-300" />

            <fieldset className="mt-5">
              <legend className="flex items-center gap-1.5 text-xs font-semibold text-slate-300"><Clock3 className="size-3.5" /> Deadline / turnaround</legend>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {deadlineOptions.map((item) => (
                  <button key={item.value} type="button" aria-pressed={urgency === item.value} onClick={() => setUrgency(item.value)} className={`rounded-xl border px-1 py-2 text-center transition ${urgency === item.value ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-cyan-300/30'}`}>
                    <span className="block text-[11px] font-bold">{item.short}</span>
                    <span className="mt-0.5 block text-[10px]">{item.detail}</span>
                  </button>
                ))}
              </div>
              {deadline.badge && <p className="mt-2 text-[11px] text-cyan-200"><span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2 py-0.5 font-bold">{deadline.badge}</span> · included in the range</p>}
            </fieldset>

            <div aria-live="polite" className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-5">
              <div>
                <p className="text-[11px] text-slate-500">Indicative range</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-white">GHS {estimate.low}–{estimate.high}</p>
                <p className="mt-1 text-[11px] text-slate-500">{previewText(option.label, 40)} · {volume} {estimate.unit}</p>
              </div>
              <a href={`/intake?track=${estimate.track}&cat=${option.cat}`} className="portal-focus inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">
                Start this brief <ArrowRight className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
