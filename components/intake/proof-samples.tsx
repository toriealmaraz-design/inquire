import { ChevronDown, ShieldCheck } from 'lucide-react'

/** Pure-CSS placeholder cards — no external images or client data. */
export function ProofSamples() {
  return (
    <details className="portal-glass mt-6 rounded-2xl">
      <summary className="portal-focus flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl p-5 text-sm font-semibold text-slate-200 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-cyan-300" /> Proof &amp; Samples <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Anonymized</span></span>
        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-[.14em] text-cyan-300">View samples <ChevronDown className="size-3.5" /></span>
      </summary>
      <div className="grid gap-3 border-t border-[rgba(0,240,255,0.14)] p-5 sm:grid-cols-3">
        <article className="rounded-xl border border-white/10 bg-[#060b14]/70 p-4">
          <div role="img" aria-label="Stylized code architecture diagram" className="h-24 rounded-lg border border-cyan-300/15 bg-[#0a0f1c] p-3">
            <div className="mx-auto h-4 w-16 rounded border border-cyan-300/40 bg-cyan-300/10" />
            <div className="mx-auto mt-1 h-px w-px bg-cyan-300/50" />
            <div className="flex justify-center gap-3">
              <div className="h-6 w-10 rounded border border-cyan-300/25 bg-cyan-300/[.06]" />
              <div className="h-6 w-10 rounded border border-cyan-300/25 bg-cyan-300/[.06]" />
            </div>
            <div className="mt-2 space-y-1"><div className="h-1 w-3/4 rounded bg-cyan-300/30" /><div className="h-1 w-1/2 rounded bg-slate-600/60" /></div>
          </div>
          <h3 className="mt-3 text-xs font-bold text-white">Code architecture</h3>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Module map, review notes, comments · client details removed</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-[#060b14]/70 p-4">
          <div role="img" aria-label="Stylized research paper with citations" className="h-24 rounded-lg border border-cyan-300/15 bg-[#0a0f1c] p-4">
            <div className="h-2 w-2/3 rounded bg-cyan-300/40" />
            <div className="mt-3 space-y-1.5"><div className="h-1 w-full rounded bg-slate-600/60" /><div className="h-1 w-11/12 rounded bg-slate-600/60" /><div className="h-1 w-4/5 rounded bg-slate-600/60" /></div>
            <div className="mt-3 flex gap-1.5"><span className="h-3 w-8 rounded-sm border border-cyan-300/25 bg-cyan-300/10" /><span className="h-3 w-8 rounded-sm border border-cyan-300/25 bg-cyan-300/10" /></div>
          </div>
          <h3 className="mt-3 text-xs font-bold text-white">Research paper</h3>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Structure, APA/IEEE citations, formatting · names removed</p>
        </article>
        <article className="rounded-xl border border-white/10 bg-[#060b14]/70 p-4">
          <div role="img" aria-label="Stylized slide deck preview" className="grid h-24 grid-cols-3 items-center gap-2 rounded-lg border border-cyan-300/15 bg-[#0a0f1c] p-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className={`aspect-video rounded border border-cyan-300/25 ${index === 1 ? 'bg-cyan-300/[.12]' : 'bg-white/[.03]'}`}>
                <div className="m-1.5 h-1 w-2/3 rounded bg-cyan-300/40" />
                <div className="m-1.5 h-1 w-1/2 rounded bg-slate-600/50" />
              </div>
            ))}
          </div>
          <h3 className="mt-3 text-xs font-bold text-white">Slide deck</h3>
          <p className="mt-1 text-[10px] leading-4 text-slate-500">Narrative flow, speaker notes, visual hierarchy · anonymized</p>
        </article>
      </div>
      <p className="border-t border-white/10 px-5 py-3 text-[10px] leading-4 text-slate-600">Illustrative placeholders only. Samples are anonymized and drawn in CSS — no third-party images or uploads.</p>
    </details>
  )
}
