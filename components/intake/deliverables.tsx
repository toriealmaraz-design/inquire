'use client'

import { Check, ListChecks } from 'lucide-react'
import { useIntake } from '@/app/intake/provider'

const options = [
  'Source code with inline comments',
  'Readme and setup guide',
  'References in your citation style',
  'Speaker notes',
  'Annotated bibliography',
  'Editable slide master',
  'Data dictionary and codebook',
  'Quality assurance and test notes',
]

/** Saved with the draft and appended to the brief the specialist receives. */
export function DeliverableChecklist() {
  const { deliverables, setDeliverables } = useIntake()
  const toggle = (item: string) => setDeliverables(
    deliverables.includes(item) ? deliverables.filter((value) => value !== item) : [...deliverables, item],
  )

  return (
    <fieldset className="mt-6 rounded-2xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/50 p-5">
      <legend className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-[.16em] text-[#00F0FF]"><ListChecks className="size-3.5" /> Deliverables checklist</legend>
      <p className="mt-2 text-xs leading-5 text-[#94A3B8]">Tick what should be included. Selections travel with your brief — nothing extra is charged until a specialist confirms scope.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((item) => {
          const selected = deliverables.includes(item)
          return (
            <button key={item} type="button" aria-pressed={selected} onClick={() => toggle(item)} className={`portal-focus flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${selected ? 'border-[#00F0FF]/60 bg-[#00F0FF]/10 text-[#F8FAFC]' : 'border-[rgba(0,240,255,0.14)] bg-white/[.03] text-[#94A3B8] hover:border-[#00F0FF]/40'}`}>
              <span className={`flex size-3.5 items-center justify-center rounded-full border ${selected ? 'border-[#00F0FF] bg-[#00F0FF] text-[#060B14]' : 'border-[#94A3B8]'}`}>{selected && <Check className="size-2.5" />}</span>
              {item}
            </button>
          )
        })}
      </div>
      <p aria-live="polite" className="mt-3 text-[11px] text-[#94A3B8]">{deliverables.length ? `${deliverables.length} selected · added to your brief automatically` : 'No extras selected yet — your brief still works as-is.'}</p>
    </fieldset>
  )
}
