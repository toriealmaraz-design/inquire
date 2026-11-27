'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Clock3, Sparkles } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { deadlineFor, deadlineOptions, quoteFor } from '@/components/intake/pricing'
import { quickScopePresets } from '@/components/intake/quick-scope'
import { completionWindow, QA_BUFFER_LABEL } from '@/components/intake/trust-terms'

/** Landing-page teaser for the same four quick scopes and GHS estimate used inside intake. */
export function QuickQuote() {
  const [optionId, setOptionId] = useState(quickScopePresets[0].id)
  const [volume, setVolume] = useState(quickScopePresets[0].volume)
  const [urgency, setUrgency] = useState(quickScopePresets[0].urgency)

  const option = quickScopePresets.find((item) => item.id === optionId) ?? quickScopePresets[0]
  const deadline = deadlineFor(urgency)
  const window = completionWindow(urgency)
  const estimate = useMemo(() => quoteFor({ ...option, volume, urgency }), [option, volume, urgency])

  return (
    <section id="quick-estimate" aria-labelledby="quick-quote-title" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-16 lg:px-8">
      <div className="portal-glass rounded-[2rem] p-6 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[#00F0FF]"><Sparkles className="size-3.5" /> Know the range before you begin</p>
            <AnimatedHeading as="h2" id="quick-quote-title" style={{ justifyContent: 'flex-start' }} className="mt-3 text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl">Get a quick GHS estimate.</AnimatedHeading>
            <p className="mt-3 max-w-md text-sm leading-6 text-[#94A3B8]">Shape a rough scope here in seconds. The full intake saves it and a specialist confirms the final quote — there is no charge to ask.</p>
            <div className="mt-6 flex flex-wrap gap-2 text-[11px] font-semibold text-[#94A3B8]">
              <span className="rounded-full border border-[rgba(0,240,255,0.14)] px-3 py-1.5">No deposit</span>
              <span className="rounded-full border border-[rgba(0,240,255,0.14)] px-3 py-1.5">Custom pricing</span>
              <span className="rounded-full border border-[rgba(0,240,255,0.14)] px-3 py-1.5">Live chat support</span>
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(0,240,255,0.14)] bg-[#0A0F1C]/70 p-5 sm:p-6">
            <label htmlFor="quick-category" className="text-xs font-semibold text-[#94A3B8]">What do you need?</label>
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
              <label htmlFor="quick-volume" className="text-xs font-semibold text-[#94A3B8]">Volume</label>
              <span className="text-xs font-bold text-[#00F0FF]">{volume} {estimate.unit}</span>
            </div>
            <input id="quick-volume" type="range" min={1} max={20} value={volume} onChange={(event) => setVolume(Number(event.target.value))} aria-label={`Volume in ${estimate.unit}`} className="mt-3 h-2 w-full accent-[#00F0FF]" />

            <fieldset className="mt-5">
              <legend className="flex items-center gap-1.5 text-xs font-semibold text-[#94A3B8]"><Clock3 className="size-3.5" /> Deadline and turnaround</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {deadlineOptions.map((item) => (
                  <button key={item.value} type="button" aria-pressed={urgency === item.value} onClick={() => setUrgency(item.value)} className={`rounded-xl border px-2 py-2 text-center transition ${urgency === item.value ? 'border-[#00F0FF]/60 bg-[#00F0FF]/10 text-[#F8FAFC]' : 'border-[rgba(0,240,255,0.14)] bg-white/[.03] text-[#94A3B8] hover:border-[#00F0FF]/40'}`}>
                    <span className="block text-[11px] font-bold leading-4">{item.short}</span>
                    <span className="mt-0.5 block text-[10px] leading-4">{item.detail}</span>
                  </button>
                ))}
              </div>
              {deadline.badge && <p className="mt-2 text-[11px] text-[#00F0FF]"><span className="rounded-full border border-[rgba(0,240,255,0.14)] bg-[#00F0FF]/10 px-2 py-0.5 font-bold">{deadline.badge}</span> · included in the range</p>}
            </fieldset>

            <div aria-live="polite" className="mt-6 flex flex-wrap items-end justify-between gap-3 border-t border-[rgba(0,240,255,0.14)] pt-5">
              <div>
                <p className="text-[11px] text-[#94A3B8]">Indicative range</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-[#F8FAFC]">GHS {estimate.low}–{estimate.high}</p>
                <p className="mt-1 text-[11px] text-[#94A3B8]">{option.label} · {volume} {estimate.unit}</p>
              </div>
              <a href={`/intake?track=${estimate.track}&cat=${option.cat}`} className="portal-focus inline-flex items-center gap-2 rounded-xl bg-[#00F0FF] px-5 py-3 text-sm font-bold text-[#060B14] transition hover:bg-[#F8FAFC]">
                Start this brief <ArrowRight className="size-4" />
              </a>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 py-1.5 font-semibold text-[#F8FAFC]"><Clock3 className="size-3.5 text-[#00F0FF]" /> Estimated completion window: {window}</span>
              <span className="rounded-full border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 py-1.5 text-[#94A3B8]">{QA_BUFFER_LABEL}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
