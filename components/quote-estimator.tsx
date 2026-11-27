'use client'
import { AnimatedHeading } from '@/components/visual/animated-heading'

import { Check, Clock3, FileText, Plus } from 'lucide-react'
import { academicLevels, deadlineFor, deadlineOptions, defaultQuote, quoteCategories, quoteFor, type QuoteSelection } from '@/components/intake/pricing'
import { ScopeBoundary } from '@/components/intake/scope-boundary'
import { completionWindow, QA_BUFFER_LABEL } from '@/components/intake/trust-terms'

export type { QuoteSelection } from '@/components/intake/pricing'

/** Kept controlled by the intake provider so quick-scope presets and deep links update it instantly. */
export function QuoteEstimator({
  urgency,
  setUrgency,
  onChange,
  initial,
  deliverables = [],
}: {
  urgency: string
  setUrgency: (value: string) => void
  onChange: (selection: QuoteSelection) => void
  initial?: QuoteSelection
  deliverables?: string[]
}) {
  const selection = quoteFor({ ...defaultQuote, ...initial, urgency })
  const categoryId = quoteCategories.find((item) => item.title === selection.category)?.id ?? quoteCategories[0].id
  const selected = quoteCategories.find((item) => item.id === categoryId) ?? quoteCategories[0]
  const patch = (changes: Partial<QuoteSelection>) => onChange(quoteFor({ ...selection, ...changes }))
  const window = completionWindow(selection.urgency)
  const scopeItems = [
    selection.category,
    `${selection.volume} ${selection.unit}`,
    `${selection.academicLevel} level`,
    ...(selection.citationAudit ? ['Detailed citation and formatting audit'] : []),
    ...deliverables,
  ]

  return (
    <section aria-labelledby="quote-estimator-title" className="mt-7 rounded-2xl border border-[rgba(0,240,255,0.14)] bg-[#0A0F1C]/70 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#00F0FF]">Guided estimate</p>
          <AnimatedHeading as="h3" id="quote-estimator-title" className="mt-1 text-base font-bold text-[#F8FAFC]">Shape your consultation</AnimatedHeading>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-2.5 py-1 text-[11px] font-semibold text-[#94A3B8]"><Clock3 className="size-3.5" /> Ghana cedis</span>
      </div>

      <label htmlFor="consultation-category" className="mt-5 block text-xs font-semibold text-[#94A3B8]">Consultation category</label>
      <select id="consultation-category" value={categoryId} onChange={(event) => {
        const next = quoteCategories.find((item) => item.id === event.target.value)
        if (next) patch({ category: next.title })
      }} className="mt-2 h-11 w-full rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 text-sm text-[#F8FAFC] outline-none focus:border-[#00F0FF]/60">
        {quoteCategories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="academic-level" className="block text-xs font-semibold text-[#94A3B8]">Academic level</label>
          <select id="academic-level" value={selection.academicLevel} onChange={(event) => patch({ academicLevel: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 text-sm text-[#F8FAFC] outline-none focus:border-[#00F0FF]/60">
            {academicLevels.map((level) => <option key={level}>{level}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between"><label htmlFor="quote-volume" className="text-xs font-semibold text-[#94A3B8]">Volume</label><span className="text-xs font-bold text-[#00F0FF]">{selection.volume} {selection.unit}</span></div>
          <input id="quote-volume" aria-label={`Volume in ${selected.unit}`} type="range" min="1" max="20" value={selection.volume} onChange={(event) => patch({ volume: Number(event.target.value) })} className="mt-4 h-2 w-full accent-[#00F0FF]" />
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold text-[#94A3B8]">Deadline and turnaround</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {deadlineOptions.map((option) => (
            <button key={option.value} type="button" aria-pressed={urgency === option.value} onClick={() => { setUrgency(option.value); patch({ urgency: option.value }) }} className={`rounded-xl border px-2 py-2.5 text-center transition ${urgency === option.value ? 'border-[#00F0FF]/60 bg-[#00F0FF]/10 text-[#F8FAFC]' : 'border-[rgba(0,240,255,0.14)] bg-white/[.03] text-[#94A3B8] hover:border-[#00F0FF]/40'}`}>
              <span className="block text-[11px] font-bold leading-4">{option.short}</span>
              <span className="mt-0.5 block text-[10px] leading-4">{option.detail}</span>
            </button>
          ))}
        </div>
        {deadlineFor(urgency).badge && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#00F0FF]">
            <span className="rounded-full border border-[rgba(0,240,255,0.14)] bg-[#00F0FF]/10 px-2 py-0.5 font-bold">{deadlineFor(urgency).badge}</span>
            <span className="text-[#94A3B8]">applied to the range below</span>
          </p>
        )}
      </fieldset>

      <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/50 px-3 py-3 text-xs text-[#94A3B8]">
        <input type="checkbox" checked={selection.citationAudit} onChange={(event) => patch({ citationAudit: event.target.checked })} className="size-4 accent-[#00F0FF]" />
        <span className="flex-1">Detailed citation and formatting audit</span>
        <span className="flex items-center gap-1 font-semibold text-[#00F0FF]"><Plus className="size-3" /> GHS 15</span>
      </label>

      <div aria-live="polite" className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-[rgba(0,240,255,0.14)] pt-4">
        <div><p className="text-[11px] text-[#94A3B8]">Estimated range</p><p className="mt-1 text-2xl font-bold tracking-tight text-[#F8FAFC]">GHS {selection.low}–{selection.high}</p></div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F8FAFC]"><Check className="size-3.5 text-[#00F0FF]" /> No payment required yet</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 py-1.5 font-semibold text-[#F8FAFC]"><Clock3 className="size-3.5 text-[#00F0FF]" /> Estimated completion window: {window}</span>
        <span className="rounded-full border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 py-1.5 text-[#94A3B8]">{QA_BUFFER_LABEL}</span>
      </div>
      <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-[#94A3B8]"><FileText className="mt-0.5 size-3.5 shrink-0 text-[#00F0FF]" />For consulting, editing, walkthroughs, and guidance—not completed academic submissions. A specialist confirms the final scope and quote before any payment; no instant turnaround is promised.</p>

      <ScopeBoundary items={scopeItems} />
    </section>
  )
}
