import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, Coins, KeyRound, LockKeyhole, MessageCircle, Palette, ShieldCheck, Sparkles, Users, Wrench } from 'lucide-react'
import { BrandLogo } from '@/components/branding'
import { SiteFooter } from '@/components/site-footer'

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

const stages = [
  { title: 'You send a brief', description: 'Submit the intake form or start a Live Chat. Add the scope, deadline and any files (up to 50 MB).', icon: ClipboardList, tone: 'from-cyan-400/20 to-blue-500/10 text-cyan-200' },
  { title: 'It lands on one secure line', description: 'Every request gets a ticket number (like AC-2610-001) and goes into one private queue. Only our admins see your details and files.', icon: LockKeyhole, tone: 'from-indigo-400/20 to-violet-500/10 text-indigo-200' },
  { title: 'An admin reviews and quotes', description: 'The admin for your field checks the requirements and sends a custom GHS quote in Live Chat. No deposit is needed to get a quote.', icon: MessageCircle, tone: 'from-emerald-400/20 to-teal-500/10 text-emerald-200' },
  { title: 'The right specialist is assigned', description: 'Once you agree, the job is given to a vetted specialist in that field. They see the brief, never your contact details.', icon: Users, tone: 'from-violet-400/20 to-fuchsia-500/10 text-violet-200' },
  { title: 'Work is done with oversight', description: 'Your admin tracks progress and keeps you updated in Live Chat. Send your ticket number any time to check its status.', icon: CheckCircle2, tone: 'from-amber-300/20 to-orange-500/10 text-amber-200' },
  { title: 'Delivery and payment', description: 'The finished work is delivered to you, payment is confirmed, and the job is closed. Uploaded files are deleted after 7 days.', icon: Coins, tone: 'from-rose-400/20 to-pink-500/10 text-rose-200' },
]

const routing = [
  { title: 'Academic & Research', owner: 'Academic team', description: 'Essays, case studies, reports, literature reviews, editing and structured writing.', icon: BookOpen },
  { title: 'Presentations & Visuals', owner: 'Media team', description: 'Defense decks, infographics, graphic design and visual media.', icon: Palette },
  { title: 'Software, IT & Hands-on', owner: 'IT team', description: 'Coding, websites, databases, systems and other technical deliverables.', icon: Wrench },
]

export default function WorkflowPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06121d] text-slate-100 selection:bg-cyan-300 selection:text-slate-950">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 size-80 rounded-full bg-violet-500/10 blur-[130px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06121d]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <BrandLogo width={40} height={40} className="size-10 rounded-xl object-cover" />
            <span>
              <strong className="block text-sm tracking-tight">Gemini Nexus</strong>
              <small className="block text-[10px] uppercase tracking-[.2em] text-slate-500">Digital operations network</small>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
            <a href="/" className="hover:text-white">Intake portal</a>
            <a href="/workflow" aria-current="page" className="text-white">How it works</a>
            <a href="/chat" className="hover:text-white">Live chat</a>
          </nav>
          <a href="/auth/signin" aria-label="Staff sign in" title="Staff sign in" className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-300">
            <KeyRound className="size-4" />
          </a>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-12 pt-16 lg:px-8 lg:pt-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-200">
            <ShieldCheck className="size-3.5" /> One secure line from brief to delivery
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-[.98] tracking-[-.06em] text-white sm:text-6xl">
            How it works.
            <br />
            <span className="bg-gradient-to-r from-cyan-200 via-white to-indigo-300 bg-clip-text text-transparent">Clear at every step.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400">
            Every request is received, quoted, routed to the right specialist, completed with oversight and delivered, all through one accountable workflow.
          </p>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {stages.map(({ title, description, icon: Icon, tone }, i) => (
            <li key={title} className={`${glass} rounded-3xl p-6 transition hover:-translate-y-0.5`}>
              <div className="flex items-start justify-between">
                <span className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone}`}>
                  <Icon className="size-5" />
                </span>
                <span className="text-xs font-bold tracking-[.16em] text-slate-600">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h2 className="mt-5 text-base font-bold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <div className={`${glass} rounded-[2rem] p-6 sm:p-8`}>
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Specialist routing</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">The right team for the right kind of work.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">Admins route each request by its service track, the skills it needs and who is available.</p>
          </div>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {routing.map(({ title, owner, description, icon: Icon }) => (
              <article key={title} className="rounded-2xl border border-white/10 bg-black/15 p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-cyan-300"><Icon className="size-5" /></span>
                <p className="mt-5 text-sm font-bold text-white">{title}</p>
                <p className="mt-1 text-xs font-semibold text-cyan-200">{owner}</p>
                <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-5 pb-24 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[2rem] border border-cyan-300/20 bg-gradient-to-br from-cyan-400/10 to-indigo-500/10 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-300"><Sparkles className="size-3.5" /> Ready when you are</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Get a custom GHS quote. No deposit.</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="/#intake" className="flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200">
              Start a brief <ArrowRight className="size-4" />
            </a>
            <a href="/chat" className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold hover:border-cyan-300/50">
              <MessageCircle className="size-4" /> Live chat
            </a>
          </div>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
