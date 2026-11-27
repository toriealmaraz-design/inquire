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
import { QuickQuote } from '@/components/visual/quick-quote'
import { TestimonialStrip } from '@/components/testimonial-strip'
import { ServiceConstellation } from '@/components/service-constellation'
import { Reveal } from '@/components/visual/reveal'
import { Magnetic } from '@/components/visual/magnetic'
import { ConfidentialityBanner } from '@/components/intake/confidentiality-banner'

const reasons = [
  { title: 'Direct specialist routing', copy: 'Your brief goes straight to the person who knows the work — no call centre, no guessing.', icon: Zap },
  { title: 'Confidential by default', copy: 'Client identities stay hidden from delivery teams. Only admins see your contact details.', icon: LockKeyhole },
  { title: 'Original, tailored work', copy: 'Consultation, coaching and guidance built around your brief, never a recycled template.', icon: Pencil },
  { title: 'Progress updates included', copy: 'Follow every stage from received to delivered, with a human available in Live Chat.', icon: MessageCircle },
]

const REF_KEY = 'inquire_ref'
const UPLINE_KEY = 'inquire_upline'
const REF_DAYS = 30

// Remember which agent's link brought the client here (30 days)
function rememberReferral() {
  const ref = new URLSearchParams(window.location.search).get('ref')
  if (!ref || !/^[A-Za-z0-9]{4,20}$/.test(ref)) return
  const code = ref.toUpperCase()
  localStorage.setItem(REF_KEY, JSON.stringify({ code, at: Date.now() }))
  document.cookie = `${REF_KEY}=${encodeURIComponent(code)}; Max-Age=${REF_DAYS * 86_400}; Path=/; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
}

// Sub-agent invites use /?upline=CODE. Keep the code until the agent signs up;
// onboarding applies it after the profile is saved.
function rememberUpline() {
  const code = new URLSearchParams(window.location.search).get('upline')
  if (!code || !/^[A-Za-z0-9]{4,20}$/.test(code)) return
  const upper = code.toUpperCase()
  localStorage.setItem(UPLINE_KEY, JSON.stringify({ code: upper, at: Date.now() }))
  document.cookie = `${UPLINE_KEY}=${encodeURIComponent(upper)}; Max-Age=${REF_DAYS * 86_400}; Path=/; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
}

export default function Page() {
  const [mobileNav, setMobileNav] = useState(false)

  useEffect(() => {
    rememberReferral()
    rememberUpline()
  }, [])

  return (
    <main className="portal-page min-h-screen overflow-x-hidden text-[#F8FAFC] selection:bg-[#00F0FF] selection:text-[#060B14]">
      <header className="sticky top-0 z-30 border-b border-[rgba(0,240,255,0.14)] bg-[#060B14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 lg:px-8">
          <a href="/" className="flex items-center gap-3 text-left">
            <span className="flex size-9 items-center justify-center rounded-full border border-[rgba(0,240,255,0.14)] bg-[#00F0FF]/10 shadow-[0_0_22px_rgba(0,240,255,0.25)]">
              <BrandLogo width={26} height={26} className="size-6 rounded-full object-cover" />
            </span>
            <span>
              <strong className="block text-sm font-bold tracking-tight text-[#F8FAFC]">Gemini Nexus</strong>
              <small className="block text-[9px] font-semibold uppercase tracking-[.22em] text-[#94A3B8]">Digital operations network</small>
            </span>
          </a>
          <span className="hidden items-center gap-2 rounded-full border border-[rgba(0,240,255,0.14)] bg-[#00F0FF]/[.06] px-3 py-1.5 text-[11px] font-semibold text-[#94A3B8] lg:flex">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
            Ghana operational · custom GHS quotes
          </span>
          <nav className="hidden items-center gap-6 text-sm text-[#94A3B8] md:flex">
            <a href="/workflow" className="transition hover:text-[#00F0FF]">How it works</a>
            <a href="/about" className="transition hover:text-[#00F0FF]">About</a>
            <a href="/faq" className="transition hover:text-[#00F0FF]">Frequently asked questions</a>
            <a href="/chat" className="transition hover:text-[#00F0FF]">Agent chat</a>
            <a href="/intake" className="portal-focus rounded-full bg-[#00F0FF] px-3 py-1.5 text-xs font-bold text-[#060B14] transition hover:bg-[#F8FAFC]">Start a brief</a>
            <a href="/track" className="portal-focus rounded-full border border-[rgba(0,240,255,0.14)] bg-[#00F0FF]/10 px-3 py-1.5 text-xs font-bold text-[#F8FAFC] transition hover:bg-[#00F0FF]/20">Ticket lookup</a>
            <a href="/auth/signin" aria-label="Staff sign in" title="Staff sign in" className="portal-focus rounded-full border border-white/10 p-2 text-[#94A3B8] transition hover:border-[#00F0FF]/40 hover:text-[#00F0FF]"><KeyRound className="size-4" /></a>
          </nav>
          <button aria-label={mobileNav ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)} className="portal-focus rounded-xl border border-[rgba(0,240,255,0.14)] p-2 text-[#F8FAFC] md:hidden">
            {mobileNav ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
        {mobileNav && (
          <nav className="flex flex-col gap-1 border-t border-[rgba(0,240,255,0.14)] px-5 py-3 text-sm text-[#F8FAFC] md:hidden">
            <a href="/intake" className="rounded-lg px-2 py-2 hover:bg-white/5">Start a brief</a>
            <a href="/track" className="rounded-lg px-2 py-2 hover:bg-white/5">Ticket lookup</a>
            <a href="/chat" className="rounded-lg px-2 py-2 hover:bg-white/5">Agent chat</a>
            <a href="/workflow" className="rounded-lg px-2 py-2 hover:bg-white/5">How it works</a>
            <a href="/about" className="rounded-lg px-2 py-2 hover:bg-white/5">About</a>
            <a href="/faq" className="rounded-lg px-2 py-2 hover:bg-white/5">Frequently asked questions</a>
            <a href="/auth/signin" className="rounded-lg px-2 py-2 hover:bg-white/5">Staff sign in</a>
          </nav>
        )}
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-10 pt-12 lg:px-8 lg:pt-16">
        <video className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-25" src="/assets/material-hills.mp4" autoPlay muted loop playsInline preload="none" aria-hidden="true" />
        <div className="hero-glow">
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,240,255,0.14)] bg-[#00F0FF]/10 px-3 py-1.5 text-xs font-bold text-[#00F0FF]"><Sparkles className="size-3.5" /> Ghana operational · custom GHS quotes</span>
          <h1 className="hero-title mt-6 text-[clamp(2rem,9vw,4.5rem)] font-bold tracking-[-.05em]">
            <AnimatedHeading as="span" variant="words" className="hero-sentence" style={{ flexWrap: 'nowrap', columnGap: '0.25em', justifyContent: 'flex-start' }}>Serious work.</AnimatedHeading>{' '}
            <AnimatedHeading as="span" variant="words" className="hero-sentence" style={{ flexWrap: 'nowrap', columnGap: '0.25em', justifyContent: 'flex-start' }}>Right specialist.</AnimatedHeading>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-[#94A3B8]">One secure intake line for research coaching, visual media, and technical consulting. Work with a specialist to solve problems, strengthen your skills, and improve your own deliverables.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Magnetic><a href="/intake" data-cursor-label="START" className="portal-focus inline-flex items-center gap-2 rounded-xl bg-[#00F0FF] px-6 py-3 text-sm font-bold text-[#060B14] shadow-[0_0_28px_rgba(0,240,255,0.28)] transition hover:bg-[#F8FAFC]">Start a brief <ArrowRight className="size-4" /></a></Magnetic>
            <Magnetic><a href="/track" className="portal-focus inline-flex items-center gap-2 rounded-xl border border-[rgba(0,240,255,0.14)] bg-white/[.04] px-6 py-3 text-sm font-bold text-[#F8FAFC] transition hover:border-[#00F0FF]/40"><Search className="size-4" /> Track a ticket</a></Magnetic>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 lg:px-8">
        <ConfidentialityBanner />
      </section>

      <section aria-labelledby="why-nexus" className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <Reveal>
          <AnimatedHeading as="h2" id="why-nexus" className="text-2xl font-bold tracking-tight text-[#F8FAFC] sm:text-3xl">Why teams use Nexus</AnimatedHeading>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#94A3B8]">A faster route from a rough idea to the right expert — with the safeguards academic and technical work needs.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map(({ title, copy, icon: Icon }) => (
              <article key={title} className="portal-glass portal-glass-hover rounded-2xl p-5">
                <span className="flex size-10 items-center justify-center rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#00F0FF]/10 text-[#00F0FF]"><Icon className="size-5" /></span>
                <h3 className="mt-4 text-sm font-bold text-[#F8FAFC]">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#94A3B8]">{copy}</p>
              </article>
            ))}
          </div>
          <div className="portal-glass mt-4 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4">
            <ShieldCheck className="size-5 shrink-0 text-emerald-300" />
            <p className="text-xs leading-5 text-[#94A3B8]"><strong className="text-[#F8FAFC]">Private intake.</strong> Client identities stay hidden from delivery teams. Only our admins see your contact details and files.</p>
          </div>
        </Reveal>
      </section>

      <ServiceConstellation />
      <QuickQuote />
      <TestimonialStrip />

      <section className="mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <Reveal>
          <div className="portal-glass flex flex-col items-start justify-between gap-5 rounded-3xl p-7 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#00F0FF]">Three focused steps</p>
              <AnimatedHeading as="h2" className="mt-2 text-xl font-bold text-[#F8FAFC]">Scope, brief, dispatch — each on its own page.</AnimatedHeading>
              <p className="mt-2 text-sm text-[#94A3B8]">Your progress is saved as you go. Nothing goes to payment before a specialist confirms the quote.</p>
            </div>
            <Magnetic><a href="/intake" className="portal-focus inline-flex items-center gap-2 rounded-xl bg-[#00F0FF] px-6 py-3 text-sm font-bold text-[#060B14] transition hover:bg-[#F8FAFC]">Open intake <ArrowRight className="size-4" /></a></Magnetic>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </main>
  )
}
