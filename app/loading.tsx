// Branded loading screen shown during route transitions and while pages suspend.
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-[#06121d]">
      <div className="relative flex size-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400 border-r-cyan-400/40" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="Gemini Nexus" className="size-16 rounded-2xl object-cover" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-[.3em] text-slate-500">Loading…</p>
    </div>
  )
}
