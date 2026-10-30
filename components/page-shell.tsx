import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { BrandLogo } from '@/components/branding'

/** Shared shell for info & legal pages: header with logo, back link, and footer. */
export function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-[#06121d] text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06121d]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="/" className="flex items-center gap-3 text-left">
            <BrandLogo width={40} height={40} className="size-10 rounded-xl object-cover" />
            <span>
              <strong className="block text-sm tracking-tight">Gemini Nexus</strong>
              <small className="block text-[10px] uppercase tracking-[.2em] text-slate-500">Digital operations network</small>
            </span>
          </a>
          <a href="/" className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:border-cyan-300/40 hover:text-cyan-300"><ArrowLeft className="size-4" /> Home</a>
        </div>
      </header>
      <section className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-5 py-14 lg:px-8">
        <h1 className="text-4xl font-bold tracking-[-.04em] text-white sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">{subtitle}</p>}
        <div className="mt-10 space-y-8 text-sm leading-7 text-slate-300">{children}</div>
      </section>
      <SiteFooter />
    </main>
  )
}

/** A titled content block used inside PageShell. */
export function Block({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-white">{heading}</h2>
      <div className="mt-3 space-y-3 text-slate-400">{children}</div>
    </div>
  )
}
