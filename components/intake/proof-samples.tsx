import { ChevronDown, ShieldCheck } from 'lucide-react'

/** Pure-CSS placeholder cards — no external images or client data. */
export function ProofSamples() {
  return (
    <details className="portal-glass mt-6 rounded-2xl">
      <summary className="portal-focus flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl p-5 text-sm font-semibold text-[#94A3B8] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#00F0FF]" /> Proof and samples <span className="rounded-full border border-[rgba(0,240,255,0.14)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-[#94A3B8]">Anonymized</span></span>
        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.14em] text-[#00F0FF]">View samples <ChevronDown className="size-3.5" /></span>
      </summary>
      <div className="grid gap-3 border-t border-[rgba(0,240,255,0.14)] p-5 sm:grid-cols-3">
        <article className="rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 p-4">
          <div role="img" aria-label="Stylized code architecture diagram" className="h-24 rounded-lg border border-[#00F0FF]/15 bg-[#0A0F1C] p-3">
            <div className="mx-auto h-4 w-16 rounded border border-[#00F0FF]/40 bg-[#00F0FF]/10" />
            <div className="mx-auto mt-1 h-px w-px bg-[#00F0FF]/50" />
            <div className="flex justify-center gap-3">
              <div className="h-6 w-10 rounded border border-[#00F0FF]/25 bg-[#00F0FF]/[.06]" />
              <div className="h-6 w-10 rounded border border-[#00F0FF]/25 bg-[#00F0FF]/[.06]" />
            </div>
            <div className="mt-2 space-y-1"><div className="h-1 w-3/4 rounded bg-[#00F0FF]/30" /><div className="h-1 w-1/2 rounded bg-[#94A3B8]/60" /></div>
          </div>
          <h3 className="mt-3 text-xs font-bold text-[#F8FAFC]">Code architecture</h3>
          <p className="mt-1 text-[10px] leading-4 text-[#94A3B8]">Module map, review notes, comments · client details removed</p>
        </article>
        <article className="rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 p-4">
          <div role="img" aria-label="Stylized research paper with citations" className="h-24 rounded-lg border border-[#00F0FF]/15 bg-[#0A0F1C] p-4">
            <div className="h-2 w-2/3 rounded bg-[#00F0FF]/40" />
            <div className="mt-3 space-y-1.5"><div className="h-1 w-full rounded bg-[#94A3B8]/60" /><div className="h-1 w-11/12 rounded bg-[#94A3B8]/60" /><div className="h-1 w-4/5 rounded bg-[#94A3B8]/60" /></div>
            <div className="mt-3 flex gap-1.5"><span className="h-3 w-8 rounded-sm border border-[#00F0FF]/25 bg-[#00F0FF]/10" /><span className="h-3 w-8 rounded-sm border border-[#00F0FF]/25 bg-[#00F0FF]/10" /></div>
          </div>
          <h3 className="mt-3 text-xs font-bold text-[#F8FAFC]">Research paper</h3>
          <p className="mt-1 text-[10px] leading-4 text-[#94A3B8]">Structure, citation styles, formatting · names removed</p>
        </article>
        <article className="rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 p-4">
          <div role="img" aria-label="Stylized slide deck preview" className="grid h-24 grid-cols-3 items-center gap-2 rounded-lg border border-[#00F0FF]/15 bg-[#0A0F1C] p-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className={`aspect-video rounded border border-[#00F0FF]/25 ${index === 1 ? 'bg-[#00F0FF]/[.12]' : 'bg-white/[.03]'}`}>
                <div className="m-1.5 h-1 w-2/3 rounded bg-[#00F0FF]/40" />
                <div className="m-1.5 h-1 w-1/2 rounded bg-[#94A3B8]/50" />
              </div>
            ))}
          </div>
          <h3 className="mt-3 text-xs font-bold text-[#F8FAFC]">Slide deck</h3>
          <p className="mt-1 text-[10px] leading-4 text-[#94A3B8]">Narrative flow, speaker notes, visual hierarchy · anonymized</p>
        </article>
      </div>
      <p className="border-t border-[rgba(0,240,255,0.14)] px-5 py-3 text-[10px] leading-4 text-[#94A3B8]">Illustrative placeholders only. Samples are anonymized and drawn in CSS — no third-party images or uploads.</p>
    </details>
  )
}
