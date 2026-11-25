'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  KeyRound,
  LockKeyhole,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
  Pencil,
} from 'lucide-react'
import { SiteFooter } from '@/components/site-footer'
import { BrandLogo } from '@/components/branding'
import { AnimatedHeading } from '@/components/visual/animated-heading'

const reasons = [
  { title: 'Direct specialist routing', copy: 'Your brief goes straight to the person who knows the work — no call centre, no guessing.', icon: Zap },
  { title: 'Confidential by default', copy: 'Client identities stay hidden from delivery teams. Only admins see your contact details.', icon: LockKeyhole },
  { title: 'Original, tailored work', copy: 'Consultation, coaching and guidance built around your brief, never a recycled template.', icon: Pencil },
  { title: 'Progress updates included', copy: 'Follow every stage from received to delivered, with a human available in Live Chat.', icon: MessageCircle },
]

const REF_KEY = 'inquire_ref'
const REF_DAYS = 30

// Remember which agent's link brought the client here (30 days)
function rememberReferral() {
  const ref = new URLSearchParams(window.location.search).get('ref')
  if (!ref || !/^[A-Za-z0-9]{4,20}$/.test(ref)) return
  const code = ref.toUpperCase()
  localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() }))
  document.cookie = `${REF_KEY}=${encodeURIComponent(code)}; Max-Age=${REF_DAYS * 86_400}; Path=/; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
}

export default function Page() {
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(rememberReferral, [])

  return (
    <main className="portal-page min-h-screen overflow-x-hidden text-slate-100 selection:bg-cyan-300 selection:text-slate-950">
      <header className="sticky top-0 z-30 border-b border-[rgba(0,240,255,0.14)] bg-[#060b14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <a href="/" className="flex items-center gap-3 text-left">
            <span className="flex size-9 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_22px_rgba(0,240,255,0.25)]">
              <BrandLogo width={26} height={26} className="size-6 rounded-full object-cover" />
            </span>
            <span>
              <strong className="block text-sm font-bold tracking-tight text-white">Gemini Nexus</strong>
              <small className="block text-[9px] font-semibold uppercase tracking-[.22em] text-slate-400">Digital operations network</small>
            </span>
          </a>
          <span className="hidden items-center gap-2 rounded-full border border-[rgba(0,240,255,0.14)] bg-cyan-300/[.06] px-3 py-1.5 text-[11px] font-semibold text-slate-300 lg:flex">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
            Ghana operational · custom GHS quotes
          </span>
          <nav className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
            <a href="/workflow" className="transition hover:text-cyan-200">How it works</a>
            <a href="/about" className="transition hover:text-cyan-200">About</a>
            <a href="/chat" className="transition hover:text-cyan-200">Agent chat</a>
            <a href="/track" className="portal-focus rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20">Ticket lookup</a>
            <a href="/auth/signin" aria-label="Staff sign in" title="Staff sign in" className="portal-focus rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-300"><KeyRound className="size-4" /></a>
          </nav>
          <button aria-label={mobileNav ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)} className="portal-focus rounded-xl border border-[rgba(0,240,255,0.14)] p-2 text-slate-300 md:hidden">
            {mobileNav ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
        {mobileNav && (
          <nav className="flex flex-col gap-1 border-t border-[rgba(0,240,255,0.14)] px-5 py-3 text-sm text-slate-300 md:hidden">
            <a href="/intake" className="rounded-lg px-2 py-2 hover:bg-white/5">Start a brief</a>
            <a href="/track" className="rounded-lg px-2 py-2 hover:bg-white/5">Ticket lookup</a>
            <a href="/chat" className="rounded-lg px-2 py-2 hover:bg-white/5">Agent chat</a>
            <a href="/workflow" className="rounded-lg px-2 py-2 hover:bg-white/5">How it works</a>
            <a href="/about" className="rounded-lg px-2 py-2 hover:bg-white/5">About</a>
            <a href="/faq" className="rounded-lg px-2 py-2 hover:bg-white/5">FAQ</a>
            <a href="/auth/signin" className="rounded-lg px-2 py-2 hover:bg-white/5">Staff sign in</a>
          </nav>
        )}
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-10 pt-12 lg:px-8 lg:pt-16">
        <video className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-25" src="/assets/material-hills.mp4" autoPlay muted loop playsInline preload="none" aria-hidden="true" />
        <div className="hero-glow">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-200"><Sparkles className="size-3.5" /> Ghana operational · custom GHS quotes</span>
          <AnimatedHeading as="h1" style={{ justifyContent: 'flex-start' }} className="hero-title mt-6 text-[clamp(2rem,9vw,4.5rem)] font-bold leading-[1.05] tracking-[-.05em]">Serious work. Right specialist.</AnimatedHeading>
          <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400">One secure intake line for research coaching, visual media, and technical consulting. Work with a specialist to solve problems, strengthen your skills, and improve your own deliverables.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/intake" className="portal-focus inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(0,240,255,0.28)] transition hover:bg-cyan-200">Start a brief <ArrowRight className="size-4" /></a>
            <a href="/track" className="portal-focus inline-flex items-center gap-2 rounded-xl border border-[rgba(0,240,255,0.14)] bg-white/[.04] px-6 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/40"><Search className="size-4" /> Track a ticket</a>
          </div>
        </div>
      </section>

      <section aria-labelledby="why-nexus" className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <AnimatedHeading as="h2" id="why-nexus" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Why teams use Nexus</AnimatedHeading>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">A faster route from a rough idea to the right expert — with the safeguards academic and technical work needs.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map(({ title, copy, icon: Icon }) => (
            <article key={title} className="portal-glass portal-glass-hover rounded-2xl p-5">
              <span className="flex size-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300"><Icon className="size-5" /></span>
              <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">{copy}</p>
            </article>
          ))}
        </div>
        <div className="portal-glass mt-4 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4">
          <ShieldCheck className="size-5 shrink-0 text-emerald-300" />
          <p className="text-xs leading-5 text-slate-400"><strong className="text-white">Private intake.</strong> Client identities stay hidden from delivery teams. Only our admins see your contact details and files.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <div className="portal-glass flex flex-col items-start justify-between gap-5 rounded-3xl p-7 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Three focused steps</p>
            <AnimatedHeading as="h2" className="mt-2 text-xl font-bold text-white">Scope, brief, dispatch — each on its own page.</AnimatedHeading>
            <p className="mt-2 text-sm text-slate-400">Your progress is saved as you go. Nothing goes to payment before a specialist confirms the quote.</p>
          </div>
          <a href="/intake" className="portal-focus inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">Open intake <ArrowRight className="size-4" /></a>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}
