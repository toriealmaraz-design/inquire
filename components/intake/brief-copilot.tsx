'use client'

import { useEffect, useState } from 'react'
import { Check, Circle, Clock3, FileText, Paperclip, Sparkles } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { useIntake } from '@/app/intake/provider'

const MAX_BRIEF = 1600

/** Live scope guidance inside the brief step. Deterministic — no backend calls. */
export function BriefCopilot() {
  const { title, brief, contact, file, quote, hydrated, setBrief } = useIntake()
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    if (!hydrated) return
    setSaved(false)
    const timer = window.setTimeout(() => setSaved(true), 450)
    return () => window.clearTimeout(timer)
  }, [title, brief, file, hydrated])

  const checks = [
    { label: 'Clear title', done: title.trim().length >= 8, hint: 'Name the work in a few words' },
    { label: 'Real context', done: brief.trim().length >= 60, hint: 'Goals, background and constraints' },
    { label: 'Source material', done: Boolean(file), hint: 'Attach files if they help' },
    { label: 'Contact detail', done: contact.trim().length > 0, hint: 'Added on the next step' },
  ]
  const score = Math.round((checks.filter((check) => check.done).length / checks.length) * 100)

  const append = (snippet: string) => {
    const next = `${brief.trim()} ${snippet}`.trim()
    if (next.length > MAX_BRIEF) return
    setBrief(next)
    document.getElementById('intake-brief')?.focus()
  }

  return (
    <section aria-label="Brief guidance" className="mt-6 rounded-2xl border border-[rgba(0,240,255,0.16)] bg-[#060b14]/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-cyan-300"><Sparkles className="size-3.5" /> Brief co-pilot</p>
          <p className="mt-2 text-xs text-slate-400">A sharper brief gets a sharper quote. Your draft saves as you type.</p>
        </div>
        <p aria-live="polite" className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <Check className={`size-3.5 ${saved ? 'text-emerald-300' : 'text-slate-600'}`} />
          {!hydrated ? 'Draft ready' : saved ? 'Saved locally' : 'Saving…'}
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-300">Scope confidence</span>
            <span className="font-mono font-bold text-cyan-200">{score}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Scope confidence" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score}>
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-200 transition-[width] duration-500" style={{ width: `${score}%` }} />
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {checks.map((check) => (
              <li key={check.label} className="flex items-center gap-2 text-[11px]">
                {check.done ? <Check className="size-3.5 shrink-0 text-emerald-300" /> : <Circle className="size-3.5 shrink-0 text-slate-600" />}
                <span className={check.done ? 'text-slate-300' : 'text-slate-500'}>{check.label}</span>
                {!check.done && <span className="hidden text-slate-600 sm:inline">· {check.hint}</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[.04] p-4 lg:min-w-52">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500"><Clock3 className="size-3" /> Current estimate</p>
          <AnimatedHeading key={`${quote.low}-${quote.high}`} as="span" variant="words" style={{ justifyContent: 'flex-start' }} className="mt-1 block whitespace-nowrap text-xl font-bold tracking-tight text-white">
            GHS {quote.low}–{quote.high}
          </AnimatedHeading>
          <p className="mt-1 text-[10px] text-slate-500">Confirmed by a specialist after review</p>
        </div>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"><FileText className="size-3.5" /> Quick prompts</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => append('Deadline: I need this by [date].')} className="portal-focus rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100">Add a deadline</button>
          <button type="button" onClick={() => append('The deliverable I want is [format and length].')} className="portal-focus rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100">Name the deliverable</button>
          <button type="button" onClick={() => append('Success looks like [specific outcome].')} className="portal-focus rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100">Define success</button>
          <button type="button" onClick={() => document.getElementById('intake-attachment')?.click()} className="portal-focus flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100"><Paperclip className="size-3" /> Attach material</button>
        </div>
      </div>
    </section>
  )
}

export default BriefCopilot
