'use client'
import { AnimatedHeading } from '@/components/visual/animated-heading'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock3, FileText, Plus } from 'lucide-react'

type Track = 'academic' | 'media' | 'systems'
type CategoryId = 'proofreading' | 'code-debugging' | 'data-analysis' | 'slide-design' | 'study-guides'

export type QuoteSelection = {
  category: string
  track: Track
  academicLevel: string
  volume: number
  unit: string
  urgency: string
  citationAudit: boolean
  low: number
  high: number
}

const categories: {
  id: CategoryId
  title: string
  track: Track
  unit: string
  lowRate: number
  highRate: number
}[] = [
  { id: 'proofreading', title: 'Proofreading & Formatting', track: 'academic', unit: 'pages', lowRate: 8, highRate: 14 },
  { id: 'code-debugging', title: 'Code Debugging & Architecture Review', track: 'systems', unit: 'hours', lowRate: 35, highRate: 55 },
  { id: 'data-analysis', title: 'Data Analysis Walkthrough', track: 'systems', unit: 'hours', lowRate: 30, highRate: 48 },
  { id: 'slide-design', title: 'Slide Deck Design', track: 'media', unit: 'slides', lowRate: 12, highRate: 20 },
  { id: 'study-guides', title: 'Study Guide Prep', track: 'academic', unit: 'modules', lowRate: 18, highRate: 30 },
]

const levelMultipliers: Record<string, number> = {
  Diploma: 0.9,
  Undergraduate: 1,
  Masters: 1.2,
  Doctoral: 1.4,
}

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
  const [categoryId, setCategoryId] = useState<CategoryId>(() => categories.find((item) => item.title === initial?.category)?.id ?? 'proofreading')
  const [academicLevel, setAcademicLevel] = useState(initial?.academicLevel ?? 'Undergraduate')
  const [volume, setVolume] = useState(initial?.volume ?? 6)
  const [citationAudit, setCitationAudit] = useState(initial?.citationAudit ?? false)
  const selected = categories.find((item) => item.id === categoryId) ?? categories[0]

  const selection = useMemo(() => {
    const level = levelMultipliers[academicLevel] ?? 1
    const urgencyMultiplier = urgency === '24-Hour Priority' ? 1.25 : urgency === '48-Hour' ? 1.1 : 1
    const audit = citationAudit ? 15 : 0
    return {
      category: selected.title,
      track: selected.track,
      academicLevel,
      volume,
      unit: selected.unit,
      urgency,
      citationAudit,
      low: Math.round(selected.lowRate * volume * level * urgencyMultiplier + audit),
      high: Math.round(selected.highRate * volume * level * urgencyMultiplier + audit),
    }
  }, [academicLevel, citationAudit, selected, urgency, volume])

  useEffect(() => onChange(selection), [onChange, selection])

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
      <select id="consultation-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value as CategoryId)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0a1924] px-3 text-sm text-white outline-none focus:border-cyan-300/60">
        {categories.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
      </select>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="academic-level" className="block text-xs font-semibold text-slate-300">Academic level</label>
          <select id="academic-level" value={academicLevel} onChange={(event) => setAcademicLevel(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#0a1924] px-3 text-sm text-white outline-none focus:border-cyan-300/60">
            {Object.keys(levelMultipliers).map((level) => <option key={level}>{level}</option>)}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between"><label htmlFor="quote-volume" className="text-xs font-semibold text-slate-300">Volume</label><span className="text-xs font-bold text-cyan-200">{volume} {selected.unit}</span></div>
          <input id="quote-volume" aria-label={`Volume in ${selected.unit}`} type="range" min="1" max="20" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="mt-4 h-2 w-full accent-cyan-300" />
        </div>
      </div>

      <fieldset className="mt-5">
        <legend className="text-xs font-semibold text-slate-300">Turnaround</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            ['Standard', '3–5 days'],
            ['48-Hour', 'Priority'],
            ['24-Hour Priority', '+25%'],
          ].map(([value, description]) => (
            <button key={value} type="button" aria-pressed={urgency === value} onClick={() => setUrgency(value)} className={`rounded-xl border px-2 py-2.5 text-left transition ${urgency === value ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-white/20'}`}>
              <span className="block text-[11px] font-bold">{value === '24-Hour Priority' ? '24 hours' : value === '48-Hour' ? '48 hours' : 'Standard'}</span>
              <span className="mt-0.5 block text-[10px]">{description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-white/[.03] px-3 py-3 text-xs text-slate-300">
        <input type="checkbox" checked={citationAudit} onChange={(event) => setCitationAudit(event.target.checked)} className="size-4 accent-cyan-300" />
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
