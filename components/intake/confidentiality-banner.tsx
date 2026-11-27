import { ShieldCheck } from 'lucide-react'

/** Plain-spoken guardrail shown on the landing page and on every intake step. */
export function ConfidentialityBanner() {
  return (
    <aside aria-label="Confidentiality and academic support notice" className="portal-glass mt-6 rounded-2xl px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70">
          <ShieldCheck className="size-5 text-[#00F0FF]" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#00F0FF]">Confidentiality and academic support</p>
          <p className="mt-1 text-xs leading-5 text-[#94A3B8]">
            Specialist briefs are anonymized: delivery teams see the work, not your contact details. Student files are not publicly shared. Support is framed around structuring, debugging, formatting and study guidance, not a finished submission to hand in as your own.
          </p>
        </div>
      </div>
    </aside>
  )
}
