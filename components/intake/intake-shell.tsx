import type { ReactNode } from 'react'
import { ArrowLeft, Check, KeyRound } from 'lucide-react'
import { BrandLogo } from '@/components/branding'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { SiteFooter } from '@/components/site-footer'

const steps = ['Track & scope', 'Brief & files', 'Dispatch details']

export function IntakeShell({
  current,
  title,
  subtitle,
  children,
}: {
  current: number
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="portal-page flex min-h-screen flex-col overflow-x-hidden text-slate-100">
      <header className="sticky top-0 z-30 border-b border-[rgba(0,240,255,0.14)] bg-[#060b14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <a href="/" className="flex items-center gap-3 text-left">
            <span className="flex size-9 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_22px_rgba(0,240,255,0.25)]">
              <BrandLogo width={26} height={26} className="size-6 rounded-full object-cover" />
            </span>
            <span>
              <strong className="block text-sm font-bold tracking-tight text-white">Gemini Nexus</strong>
              <small className="block text-[9px] font-semibold uppercase tracking-[.22em] text-slate-400">Digital operations network</small>
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a href="/track" className="portal-focus hidden rounded-full border border-[rgba(0,240,255,0.14)] px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-cyan-300/40 sm:block">Track a ticket</a>
            <a href="/auth/signin" aria-label="Staff sign in" className="portal-focus rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-300"><KeyRound className="size-4" /></a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 lg:px-8 lg:py-14">
        <a href={current >= 4 ? '/' : current === 1 ? '/' : current === 2 ? '/intake' : '/intake/brief'} className="portal-focus inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-cyan-200">
          <ArrowLeft className="size-3.5" /> {current === 1 || current >= 4 ? 'Back to home' : 'Previous step'}
        </a>
        <div className="mt-6 grid grid-cols-3 gap-2" aria-label="Intake progress">
          {steps.map((label, index) => {
            const number = index + 1
            const done = number < current
            const active = number === current
            return (
              <div key={label} className={`flex items-center gap-2 rounded-full border px-2 py-1.5 text-[11px] font-bold sm:px-3 ${active ? 'border-cyan-300/60 bg-cyan-300/10 text-cyan-100' : done ? 'border-cyan-300/25 bg-cyan-300/[.06] text-cyan-200' : 'border-[rgba(0,240,255,0.14)] text-slate-500'}`}>
                <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] ${done || active ? 'bg-cyan-300 text-slate-950' : 'bg-white/10'}`}>{done ? <Check className="size-3" /> : number}</span>
                <span className="hidden truncate sm:inline">{label}</span>
              </div>
            )
          })}
        </div>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Request intake · Step {current} of 3</p>
        <AnimatedHeading as="h1" style={{ justifyContent: 'flex-start' }} className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</AnimatedHeading>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{subtitle}</p>
        <p className="mt-2 text-[10px] text-slate-500">Draft stays in this tab; returning-client details stay on this device only.</p>
        <div className="portal-glass mt-8 rounded-[2rem] p-5 sm:p-8">{children}</div>
      </main>

      <SiteFooter />
    </div>
  )
}
