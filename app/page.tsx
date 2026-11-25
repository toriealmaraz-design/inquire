'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  Code2,
  FileCheck2,
  FileText,
  KeyRound,
  LockKeyhole,
  Menu,
  MessageCircle,
  Paperclip,
  Pencil,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SiteFooter } from '@/components/site-footer'
import { BrandLogo } from '@/components/branding'
import { QuoteEstimator, type QuoteSelection } from '@/components/quote-estimator'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { TICKET_RE } from '@/lib/fields'

type Track = 'academic' | 'media' | 'systems'
type PanelTab = 'brief' | 'status'

const tracks = [
  { id: 'academic' as Track, title: 'Research & Learning', subtitle: 'Methods coaching, editing, citation guidance', icon: BookOpen },
  { id: 'media' as Track, title: 'Presentations & Visuals', subtitle: 'Presentation coaching, infographics, media', icon: FileText },
  { id: 'systems' as Track, title: 'Software & Technical Consulting', subtitle: 'Code reviews, debugging, database guidance', icon: Code2 },
]

const reasons = [
  { title: 'Direct specialist routing', copy: 'Your brief goes straight to the person who knows the work — no call centre, no guessing.', icon: Zap },
  { title: 'Confidential by default', copy: 'Client identities stay hidden from delivery teams. Only admins see your contact details.', icon: LockKeyhole },
  { title: 'Original, tailored work', copy: 'Consultation, coaching and guidance built around your brief, never a recycled template.', icon: Pencil },
  { title: 'Progress updates included', copy: 'Follow every stage from received to delivered, with a human available in Live Chat.', icon: MessageCircle },
]

const steps = ['Track & scope', 'Brief & files', 'Dispatch details']
const MAX_FILE_BYTES = 15 * 1024 * 1024
const REF_KEY = 'inquire_ref'
const REF_DAYS = 30

// Remember which agent's link brought the client here (30 days)
function readReferral(): string {
  try {
    const cookie = document.cookie.split('; ').find((item) => item.startsWith(`${REF_KEY}=`))?.split('=').slice(1).join('=')
    if (cookie) return decodeURIComponent(cookie)
    const saved = JSON.parse(localStorage.getItem(REF_KEY) || 'null')
    if (saved?.code && Date.now() - saved.at < REF_DAYS * 86_400_000) return saved.code
  } catch {}
  return ''
}

function stageOf(status: string) {
  const s = status.toLowerCase()
  if (s.includes('paid') || s.includes('complete')) return 4
  if (s.includes('progress')) return 3
  if (s.includes('quoted')) return 2
  return 1
}

export default function Page() {
  const [mobileNav, setMobileNav] = useState(false)
  const [panelTab, setPanelTab] = useState<PanelTab>('brief')
  const [step, setStep] = useState(0)
  const [track, setTrack] = useState<Track>('academic')
  const [quote, setQuote] = useState<QuoteSelection>({ category: 'Proofreading & Formatting', track: 'academic', academicLevel: 'Undergraduate', volume: 6, unit: 'pages', urgency: 'Standard', citationAudit: false, low: 48, high: 84 })
  const [brief, setBrief] = useState('')
  const [title, setTitle] = useState('')
  const [contact, setContact] = useState('')
  const [urgency, setUrgency] = useState('Standard')
  const [file, setFile] = useState<File | null>(null)
  const [ticketId, setTicketId] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref && /^[A-Za-z0-9]{4,20}$/.test(ref)) {
      const normalizedCode = ref.toUpperCase()
      localStorage.setItem(REF_KEY, JSON.stringify({ code: normalizedCode, at: Date.now() }))
      document.cookie = `${REF_KEY}=${encodeURIComponent(normalizedCode)}; Max-Age=${REF_DAYS * 86_400}; Path=/; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
    }
  }, [])

  const updateQuote = useCallback((selection: QuoteSelection) => {
    setQuote(selection)
    setTrack(selection.track)
    setUrgency(selection.urgency)
  }, [])

  const selectFile = (next: File | null) => {
    setError('')
    if (next && next.size > MAX_FILE_BYTES) {
      setError('That file is over 15 MB. Zip it, compress it, or send it through Live Chat.')
      setFile(null)
      return
    }
    setFile(next)
  }

  const openBrief = () => {
    setPanelTab('brief')
    window.requestAnimationFrame(() => document.getElementById('intake')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const openStatus = () => {
    setPanelTab('status')
    window.requestAnimationFrame(() => document.getElementById('intake')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const goNext = () => {
    if (step === 1 && (!title.trim() || !brief.trim())) {
      setError('Add a short consultation title and describe what you need before continuing.')
      return
    }
    if (step === 2 && !contact.trim()) {
      setError('Add a phone number or email so we can send your GHS quote.')
      return
    }
    setError('')
    setStep((current) => Math.min(2, current + 1))
  }

  const dispatch = async () => {
    if (submitting) return
    if (!title.trim() || !brief.trim() || !contact.trim()) {
      setError('A title, brief description and contact detail are required to dispatch your request.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      let fileUrls = ''
      if (file) {
        const supabase = createClient()
        const path = `intake/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: uploadError } = await supabase.storage.from('uploads').upload(path, file, { upsert: false })
        if (uploadError) throw new Error('Your file could not be uploaded. Try again, or remove it and send it through Live Chat.')
        fileUrls = supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl
      }
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: track, serviceType: quote.category, title, scope: `${quote.volume} ${quote.unit}`, urgency: quote.urgency, clientContact: contact, briefDetails: `${brief}\n\nConsultation estimate: GHS ${quote.low}–${quote.high}; ${quote.academicLevel}; ${quote.citationAudit ? 'citation audit included' : 'no citation audit'}. Final quote confirmed after review.`, fileUrls, ref: readReferral() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'We could not send your brief. Please try again.')
      setTicketId(data.ticketId || '')
      setSent(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setSent(false)
    setStep(0)
    setBrief('')
    setTitle('')
    setContact('')
    setFile(null)
    setTicketId('')
    setError('')
  }

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
            <button onClick={openStatus} className="portal-focus rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20">Ticket lookup</button>
            <a href="/auth/signin" aria-label="Staff sign in" title="Staff sign in" className="portal-focus rounded-full border border-white/10 p-2 text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-300"><KeyRound className="size-4" /></a>
          </nav>
          <button aria-label={mobileNav ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)} className="portal-focus rounded-xl border border-[rgba(0,240,255,0.14)] p-2 text-slate-300 md:hidden">
            {mobileNav ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
        {mobileNav && (
          <nav className="flex flex-col gap-1 border-t border-[rgba(0,240,255,0.14)] px-5 py-3 text-sm text-slate-300 md:hidden">
            <button onClick={() => { openStatus(); setMobileNav(false) }} className="rounded-lg px-2 py-2 text-left hover:bg-white/5">Ticket lookup</button>
            <a href="/chat" className="rounded-lg px-2 py-2 hover:bg-white/5">Agent chat</a>
            <a href="/workflow" className="rounded-lg px-2 py-2 hover:bg-white/5">How it works</a>
            <a href="/about" className="rounded-lg px-2 py-2 hover:bg-white/5">About</a>
            <a href="/faq" className="rounded-lg px-2 py-2 hover:bg-white/5">FAQ</a>
            <a href="/auth/signin" className="rounded-lg px-2 py-2 hover:bg-white/5">Staff sign in</a>
          </nav>
        )}
      </header>

      <ClientPortal
        title={title}
        setTitle={setTitle}
        step={step}
        setStep={setStep}
        panelTab={panelTab}
        setPanelTab={setPanelTab}
        track={track}
        setTrack={setTrack}
        updateQuote={updateQuote}
        brief={brief}
        setBrief={setBrief}
        contact={contact}
        setContact={setContact}
        urgency={urgency}
        setUrgency={setUrgency}
        file={file}
        setFile={selectFile}
        sent={sent}
        dispatch={dispatch}
        reset={reset}
        goNext={goNext}
        openBrief={openBrief}
        openStatus={openStatus}
        submitting={submitting}
        error={error}
        ticketId={ticketId}
        quote={quote}
      />
      <SiteFooter />
    </main>
  )
}

type PortalProps = {
  title: string
  setTitle: (value: string) => void
  step: number
  setStep: (value: number) => void
  panelTab: PanelTab
  setPanelTab: (value: PanelTab) => void
  track: Track
  setTrack: (value: Track) => void
  updateQuote: (selection: QuoteSelection) => void
  brief: string
  setBrief: (value: string) => void
  contact: string
  setContact: (value: string) => void
  urgency: string
  setUrgency: (value: string) => void
  file: File | null
  setFile: (file: File | null) => void
  sent: boolean
  dispatch: () => void
  reset: () => void
  goNext: () => void
  openBrief: () => void
  openStatus: () => void
  submitting: boolean
  error: string
  ticketId: string
  quote: QuoteSelection
}

function ClientPortal(props: PortalProps) {
  const {
    title, setTitle, step, setStep, panelTab, setPanelTab, track, setTrack, updateQuote,
    brief, setBrief, contact, setContact, urgency, setUrgency, file, setFile, sent,
    dispatch, reset, goNext, openBrief, openStatus, submitting, error, ticketId, quote,
  } = props

  if (sent) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-72px)] max-w-2xl items-center justify-center px-5 py-16">
        <div className="portal-glass w-full rounded-[2rem] p-10 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-300"><Check className="size-8" /></div>
          <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Brief received{ticketId ? ` · ${ticketId}` : ''}</p>
          <AnimatedHeading as="h1" className="mt-3 text-3xl font-bold tracking-tight text-white">Your brief is in the queue.</AnimatedHeading>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">A Gemini Nexus specialist will review it and send a custom GHS quote. No deposit required. Open Live Chat with your ticket number to speed things up.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={`/chat?ticket=${encodeURIComponent(ticketId)}`} className="portal-focus flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"><MessageCircle className="size-4" /> Continue in Live Chat <ArrowRight className="size-4" /></a>
            {ticketId && <a href={`/track?id=${encodeURIComponent(ticketId)}`} className="portal-focus flex items-center justify-center gap-2 rounded-xl border border-[rgba(0,240,255,0.14)] px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5">Track this order</a>}
          </div>
          <button onClick={reset} className="portal-focus mt-6 text-xs font-semibold text-slate-500 hover:text-white">Submit another request</button>
        </div>
      </section>
    )
  }

  return (
    <>
      <section className="relative mx-auto max-w-7xl px-5 pb-10 pt-12 lg:px-8 lg:pt-16">
        {/* Reserved hero video slot: drop material-hills.mp4 into /public/assets/. */}
        <video className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-25" src="/assets/material-hills.mp4" autoPlay muted loop playsInline preload="none" aria-hidden="true" />
        <div className="hero-glow max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-200"><Sparkles className="size-3.5" /> Ghana operational · custom GHS quotes</span>
          <h1 className="mt-6 text-[clamp(2rem,9vw,4.5rem)] font-bold leading-[.98] tracking-[-.06em] text-white">
            <AnimatedHeading as="span" className="hero-line" style={{ justifyContent: 'flex-start', flexWrap: 'nowrap' }}>Serious work.</AnimatedHeading>
            <AnimatedHeading as="span" className="hero-line hero-title-accent" style={{ justifyContent: 'flex-start', flexWrap: 'nowrap' }}>Right specialist.</AnimatedHeading>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-slate-400">One secure intake line for research coaching, visual media, and technical consulting. Work with a specialist to solve problems, strengthen your skills, and improve your own deliverables.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={openBrief} className="portal-focus inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 shadow-[0_0_28px_rgba(0,240,255,0.28)] transition hover:bg-cyan-200">Start a brief <ArrowRight className="size-4" /></button>
            <button onClick={openStatus} className="portal-focus inline-flex items-center gap-2 rounded-xl border border-[rgba(0,240,255,0.14)] bg-white/[.04] px-6 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/40"><Search className="size-4" /> Track a ticket</button>
          </div>
        </div>
      </section>

      <section aria-labelledby="why-nexus" className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <AnimatedHeading as="h2" id="why-nexus" className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Why teams use Nexus</AnimatedHeading>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">A faster route from a rough idea to the right expert — with the safeguards academic and technical work needs.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map(({ title: label, copy, icon: Icon }) => (
            <article key={label} className="portal-glass portal-glass-hover rounded-2xl p-5">
              <span className="flex size-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300"><Icon className="size-5" /></span>
              <h3 className="mt-4 text-sm font-bold text-white">{label}</h3>
              <p className="mt-2 text-xs leading-5 text-slate-400">{copy}</p>
            </article>
          ))}
        </div>
        <div className="portal-glass mt-4 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-4">
          <ShieldCheck className="size-5 shrink-0 text-emerald-300" />
          <p className="text-xs leading-5 text-slate-400"><strong className="text-white">Private intake.</strong> Client identities stay hidden from delivery teams. Only our admins see your contact details and files.</p>
        </div>
      </section>

      <section id="intake" className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-24 lg:px-8">
        <div className="portal-glass overflow-hidden rounded-[2rem]">
          <div role="tablist" aria-label="Client portal" className="flex border-b border-[rgba(0,240,255,0.14)]">
            <button role="tab" aria-selected={panelTab === 'brief'} onClick={() => setPanelTab('brief')} className={`portal-focus flex-1 px-5 py-4 text-sm font-bold transition ${panelTab === 'brief' ? 'border-b-2 border-cyan-300 bg-cyan-300/[.08] text-cyan-100' : 'text-slate-400 hover:text-white'}`}>New brief</button>
            <button role="tab" aria-selected={panelTab === 'status'} onClick={() => setPanelTab('status')} className={`portal-focus flex-1 px-5 py-4 text-sm font-bold transition ${panelTab === 'status' ? 'border-b-2 border-cyan-300 bg-cyan-300/[.08] text-cyan-100' : 'text-slate-400 hover:text-white'}`}>Ticket status</button>
          </div>

          {panelTab === 'status' ? (
            <TicketStatus />
          ) : (
            <div className="p-5 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Request intake</p>
                  <AnimatedHeading as="h2" className="mt-2 text-xl font-bold text-white">Start a new brief</AnimatedHeading>
                </div>
                <span className="rounded-full border border-[rgba(0,240,255,0.14)] bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">{step + 1} / 3</span>
              </div>
              <div className="mt-7 grid grid-cols-3 gap-2">
                {steps.map((item, index) => (
                  <button key={item} onClick={() => index <= step && setStep(index)} aria-current={index === step ? 'step' : undefined} aria-label={`Step ${index + 1}: ${item}`} className={`portal-focus flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-semibold leading-tight transition sm:justify-start sm:px-3 ${index <= step ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-slate-500'}`}>
                    <span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] ${index <= step ? 'bg-slate-950/15' : 'bg-white/10'}`}>{index < step ? '✓' : index + 1}</span>
                    <span className="hidden truncate sm:inline">{item}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold text-cyan-200 sm:hidden">Step {step + 1}: {steps[step]}</p>

              {step === 0 && <><TrackForm track={track} setTrack={setTrack} /><QuoteEstimator urgency={urgency} setUrgency={setUrgency} onChange={updateQuote} /></>}
              {step === 1 && <BriefForm title={title} setTitle={setTitle} brief={brief} setBrief={setBrief} file={file} setFile={setFile} />}
              {step === 2 && <DispatchForm contact={contact} setContact={setContact} />}
              {error && <p role="alert" className="mt-6 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

              {step < 2 ? (
                <button onClick={goNext} className="portal-focus mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200">Continue <ArrowRight className="size-4" /></button>
              ) : (
                <div className="mt-8">
                  <p className="mb-3 text-center text-xs text-slate-500">{submitting ? 'Sending your brief…' : `Indicative range: GHS ${quote.low}–${quote.high} · final quote after review · zero deposit required`}</p>
                  <button disabled={submitting} onClick={dispatch} className="portal-focus flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-slate-950 transition hover:from-cyan-300 hover:to-blue-400 disabled:cursor-wait disabled:opacity-50"><Send className="size-4" /> {submitting ? 'Sending…' : 'Submit brief'}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  )
}

function TicketStatus() {
  const [ticket, setTicket] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ found: boolean; ticketId: string; title?: string; status?: string; serviceType?: string } | null>(null)

  const lookup = async () => {
    const match = ticket.trim().match(TICKET_RE)
    if (!match || busy) {
      setError('Enter a ticket number like AC-2610-001.')
      return
    }
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const response = await fetch(`/api/ticket?id=${encodeURIComponent(match[0])}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'We could not look up that ticket.')
      setResult(data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'We could not look up that ticket.')
    } finally {
      setBusy(false)
    }
  }

  const stage = result?.found ? stageOf(result.status || '') : 0
  const stages = ['Received', 'Quoted', 'In progress', 'Completed']

  return (
    <div className="p-5 sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Ticket lookup</p>
      <AnimatedHeading as="h2" className="mt-2 text-xl font-bold text-white">Check your order status</AnimatedHeading>
      <p className="mt-2 text-sm text-slate-400">Use the ticket number from your confirmation message. No sign-in required.</p>
      <label htmlFor="ticket-lookup" className="mt-6 block text-xs font-semibold text-slate-300">Ticket number</label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input id="ticket-lookup" value={ticket} onChange={(event) => { setTicket(event.target.value.toUpperCase()); setError('') }} onKeyDown={(event) => event.key === 'Enter' && lookup()} placeholder="AC-2610-001" aria-invalid={Boolean(error)} className="portal-input h-12 flex-1 px-4 text-sm tracking-wide" />
        <button onClick={lookup} disabled={busy} className="portal-focus flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"><Search className="size-4" /> {busy ? 'Checking…' : 'Check status'}</button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</p>}
      {result && (
        <div className="portal-glass mt-6 rounded-2xl p-5">
          {result.found ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[.16em] text-cyan-300">{result.ticketId}</p>
                  <h3 className="mt-1 truncate text-lg font-bold text-white">{result.title}</h3>
                  <p className="mt-1 text-xs text-slate-400">{result.serviceType}</p>
                </div>
                <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100">{result.status}</span>
              </div>
              <ol className="mt-6 grid grid-cols-4 gap-2">
                {stages.map((label, index) => (
                  <li key={label} className="text-center">
                    <span className={`mx-auto flex size-8 items-center justify-center rounded-full border text-xs font-bold ${index < stage ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-[rgba(0,240,255,0.14)] text-slate-500'}`}>{index < stage ? <Check className="size-4" /> : index + 1}</span>
                    <span className={`mt-2 block text-[10px] font-semibold ${index < stage ? 'text-cyan-200' : 'text-slate-500'}`}>{label}</span>
                  </li>
                ))}
              </ol>
              <a href={`/chat?ticket=${encodeURIComponent(result.ticketId)}`} className="portal-focus mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">Continue in Live Chat <ArrowRight className="size-4" /></a>
            </>
          ) : (
            <div className="text-center">
              <FileCheck2 className="mx-auto size-8 text-slate-500" />
              <h3 className="mt-3 text-sm font-bold text-white">No brief found for {result.ticketId}</h3>
              <p className="mt-2 text-xs text-slate-400">Double-check the number, or ask an agent in Live Chat.</p>
              <a href="/chat" className="portal-focus mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 px-4 py-2 text-xs font-bold text-cyan-100 hover:bg-cyan-300/10">Ask an agent <MessageCircle className="size-3.5" /></a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TrackForm({ track, setTrack }: { track: Track; setTrack: (value: Track) => void }) {
  return (
    <div className="mt-8">
      <p className="text-sm font-semibold text-slate-200">Choose a service track</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {tracks.map((item) => {
          const Icon = item.icon
          const selected = item.id === track
          return (
            <button key={item.id} type="button" onClick={() => setTrack(item.id)} aria-pressed={selected} className={`portal-glass portal-glass-hover rounded-2xl p-4 text-left ${selected ? 'border-cyan-300/70 ring-1 ring-cyan-300/40' : ''}`}>
              <span className="flex size-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><Icon className="size-5" /></span>
              <strong className="mt-4 block text-sm text-white">{item.title}</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{item.subtitle}</span>
              {selected && <span className="mt-4 flex items-center gap-1 text-[11px] font-bold text-cyan-300"><Check className="size-3" /> Selected</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BriefForm({ title, setTitle, brief, setBrief, file, setFile }: { title: string; setTitle: (v: string) => void; brief: string; setBrief: (v: string) => void; file: File | null; setFile: (f: File | null) => void }) {
  return (
    <div className="mt-8">
      <label htmlFor="title" className="text-sm font-semibold text-slate-200">Consultation title</label>
      <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Review my market research methodology" aria-invalid={!title.trim()} className="portal-input mt-3 mb-6 h-12 w-full px-4 text-sm" />
      <label htmlFor="brief" className="text-sm font-semibold text-slate-200">Consultation goals and context</label>
      <textarea id="brief" value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={1600} placeholder="Describe your goals, what you have tried, and what you would like to understand or improve..." aria-invalid={!brief.trim()} className="portal-input mt-3 min-h-48 w-full resize-y p-4 text-sm leading-6" />
      <label htmlFor="attachment" className="mt-5 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(0,240,255,0.2)] bg-white/[.03] p-6 text-center text-sm text-slate-400 transition hover:border-cyan-300/50">
        <Paperclip className="size-5 text-cyan-300" />
        <span>{file ? file.name : 'Attach source material, dataset, or code files'}</span>
        <span className="text-xs text-slate-600">Up to 15 MB · PDF, DOCX, ZIP, images · uploaded securely when you submit</span>
        <input id="attachment" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp,.txt" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </label>
      {file && <button type="button" onClick={() => setFile(null)} className="mt-2 text-xs text-slate-500 hover:text-rose-300">Remove file</button>}
    </div>
  )
}

function DispatchForm({ contact, setContact }: { contact: string; setContact: (v: string) => void }) {
  return (
    <div className="mt-8">
      <label htmlFor="contact" className="text-sm font-semibold text-slate-200">Your phone number or email (so we can reach you)</label>
      <input id="contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="e.g. 024 000 0000 or you@email.com" aria-invalid={!contact.trim()} className="portal-input mt-3 h-12 w-full px-4 text-sm" />
      <p className="mt-4 text-xs text-slate-500">Your selected turnaround and estimate will be included with the brief.</p>
    </div>
  )
}
