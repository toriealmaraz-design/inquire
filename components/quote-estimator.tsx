'use client'
import { AnimatedHeading } from '@/components/visual/animated-heading'

import { Check, Clock3, FileText, Plus } from 'lucide-react'
import { academicLevels, deadlineFor, deadlineOptions, defaultQuote, quoteCategories, quoteFor, type QuoteSelection } from '@/components/intake/pricing'

export type { QuoteSelection } from '@/components/intake/pricing'

/** Kept controlled by the intake provider so quick-scope presets and deep links update it instantly. */
export function QuoteEstimator({
  urgency,
  setUrgency,
  onChange,
  initial,
}: {
  urgency: string
  setUrgency: (value: string) => void
  onChange: (selection: QuoteSelection) => void
  initial?: QuoteSelection
}) {
  const selection = quoteFor({ ...defaultQuote, ...initial, urgency })
  const categoryId = quoteCategories.find((item) => item.title === selection.category)?.id ?? quoteCategories[0].id
  const selected = quoteCategories.find((item) => item.id === categoryId) ?? quoteCategories[0]
  const patch = (changes: Partial<QuoteSelection>) => onChange(quoteFor({ ...selection, ...changes }))

  return (
    <section aria-labelledby="quote-estimator-title" className="mt-7 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.04] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Instant estimate</p>
          <AnimatedHeading as="h3" id="quote-estimator-title" className="mt-1 text-base font-bold text-white">Shape your consultation</AnimatedHeading>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300"><Clock3 className="size-3.5" /> GHS</span>
      </div>

      <label htmlFor="consultation-category" className="mt-5 block text-xs font-semibold text-slate-300">Consultation category</label>
      <select id="consultation-category" value={categoryId} onChange={(event) => {
        const next = quoteCategories.find((item) => item.id === event.target.value)
        if (next) patch({ category: next.title })
      }} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0a1924] px-3 text-sm text-white outline-none focus:border-cyan-300/60">
        {quoteCategories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="academic-level" className="block text-xs font-semibold text-slate-300">Academic level</label>
          <select id="academic-level" value={selection.academicLevel} onChange={(event) => patch({ academicLevel: event.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0a1924] px-3 text-sm text-white outline-none focus:border-cyan-300/60">
            {academicLevels.map((level) => <option key={level}>{level}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between"><label htmlFor="quote-volume" className="text-xs font-semibold text-slate-300">Volume</label><span className="text-xs font-bold text-cyan-200">{selection.volume} {selection.unit}</span></div>
          <input id="quote-volume" aria-label={`Volume in ${selected.unit}`} type="range" min="1" max="20" value={selection.volume} onChange={(event) => patch({ volume: Number(event.target.value) })} className="mt-4 h-2 w-full accent-cyan-300" />
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold text-slate-300">Deadline / turnaround</legend>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {deadlineOptions.map((option) => (
            <button key={option.value} type="button" aria-pressed={urgency === option.value} onClick={() => { setUrgency(option.value); patch({ urgency: option.value }) }} className={`rounded-xl border px-1.5 py-2.5 text-left transition sm:px-2 ${urgency === option.value ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-white/20'}`}>
              <span className="block text-[11px] font-bold">{option.short}</span>
              <span className="mt-0.5 block text-[10px]">{option.detail}</span>
            </button>
          ))}
        </div>
        {deadlineFor(urgency).badge && (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-cyan-200">
            <span className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2 py-0.5 font-bold">{deadlineFor(urgency).badge}</span>
            <span className="text-slate-500">applied to the range below</span>
          </p>
        )}
      </fieldset>

      <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.03] px-3 py-3 text-xs text-slate-300">
        <input type="checkbox" checked={selection.citationAudit} onChange={(event) => patch({ citationAudit: event.target.checked })} className="size-4 accent-cyan-300" />
        <span className="flex-1">Detailed citation & formatting audit</span>
        <span className="flex items-center gap-1 font-semibold text-cyan-200"><Plus className="size-3" /> GHS 15</span>
      </label>

      <div aria-live="polite" className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-4">
        <div><p className="text-[11px] text-slate-500">Estimated range</p><p className="mt-1 text-2xl font-bold tracking-tight text-white">GHS {selection.low}–{selection.high}</p></div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300"><Check className="size-3.5" /> No payment required yet</span>
      </div>
      <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-slate-500"><FileText className="mt-0.5 size-3.5 shrink-0" />For consulting, editing, walkthroughs, and guidance—not completed academic submissions. A specialist confirms the final scope and quote before any payment.</p>
    </section>
  )
}
