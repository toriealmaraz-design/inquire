'use client'

import { Check, ListChecks } from 'lucide-react'
import { useIntake } from '@/app/intake/provider'

const options = [
  'Source code + inline comments',
  'README & setup guide',
  'APA / IEEE references',
  'Speaker notes',
  'Annotated bibliography',
  'Editable slide master',
  'Data dictionary / codebook',
  'QA & test notes',
]

/** Saved with the draft and appended to the brief the specialist receives. */
export function DeliverableChecklist() {
  const { deliverables, setDeliverables } = useIntake()
  const toggle = (item: string) => setDeliverables(
    deliverables.includes(item) ? deliverables.filter((value) => value !== item) : [...deliverables, item],
  )

  return (
    <fieldset className="mt-6 rounded-2xl border border-[rgba(0,240,255,0.16)] bg-[#060b14]/50 p-5">
      <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[.16em] text-cyan-300"><ListChecks className="size-3.5" /> Deliverables checklist</legend>
      <p className="mt-2 text-xs leading-5 text-slate-400">Tick what should be included. Selections travel with your brief — nothing extra is charged until a specialist confirms scope.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((item) => {
          const selected = deliverables.includes(item)
          return (
            <button key={item} type="button" aria-pressed={selected} onClick={() => toggle(item)} className={`portal-focus flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${selected ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-cyan-300/30'}`}>
              <span className={`flex size-3.5 items-center justify-center rounded-full border ${selected ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-slate-600'}`}>{selected && <Check className="size-2.5" />}</span>
              {item}
            </button>
          )
        })}
      </div>
      <p aria-live="polite" className="mt-3 text-[11px] text-slate-500">{deliverables.length ? `${deliverables.length} selected · added to your brief automatically` : 'No extras selected yet — your brief still works as-is.'}</p>
    </fieldset>
  )
}
