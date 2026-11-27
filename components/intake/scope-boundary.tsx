import { Check, Clock3, LockKeyhole } from 'lucide-react'
import { QA_BUFFER_LABEL, REVISION_LOCK_LABEL } from './trust-terms'

/** Shown before work begins on the estimate and again on the public ticket view. */
export function ScopeBoundary({
  items,
  completionWindow,
}: {
  items: string[]
  completionWindow?: string
}) {
  const included = items.length ? items : ['The specialist will confirm the included work before any payment.']

  return (
    <section aria-labelledby="scope-boundary-title" className="mt-6 rounded-2xl border border-[rgba(0,240,255,0.14)] bg-[#0A0F1C]/70 p-5">
      <p id="scope-boundary-title" className="text-[11px] font-bold uppercase tracking-[.16em] text-[#00F0FF]">Scope boundary and revision lock</p>
      <p className="mt-2 text-xs leading-5 text-[#94A3B8]">This is the work included before specialist confirmation. Anything outside this scope needs a new brief and quote.</p>

      <ul className="mt-4 grid gap-2 text-sm text-[#F8FAFC]">
        {included.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-[#00F0FF]" />
            <span className="break-words">{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-[rgba(0,240,255,0.14)] pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 py-1.5 text-[11px] font-bold text-[#F8FAFC]">
          <LockKeyhole className="size-3.5 shrink-0 text-[#00F0FF]" /> {REVISION_LOCK_LABEL}
        </span>
        {completionWindow && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 py-1.5 text-[11px] font-semibold text-[#F8FAFC]">
            <Clock3 className="size-3.5 shrink-0 text-[#00F0FF]" /> Estimated completion window: {completionWindow}
          </span>
        )}
        <span className="inline-flex items-center rounded-full border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 py-1.5 text-[11px] font-semibold text-[#94A3B8]">{QA_BUFFER_LABEL}</span>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#94A3B8]">The two rounds are the ceiling. Further changes after that need a fresh scope and quote.</p>
    </section>
  )
}
