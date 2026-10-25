'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  Code2,
  FileText,
  KeyRound,
  LockKeyhole,
  Menu,
  MessageCircle,
  Paperclip,
  Pencil,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Track = 'academic' | 'media' | 'systems'

const logoUrl = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Gemini_Generated_Image_%20%283%29-PQcynfUuZ8MCE6lPljaeCegmfntVMi.png'
const tracks = [
  { id: 'academic' as Track, title: 'Academic & Research', subtitle: 'Essays, case studies, literature reviews', icon: BookOpen, color: 'from-cyan-400/20 to-blue-500/10' },
  { id: 'media' as Track, title: 'Presentations & Visuals', subtitle: 'Defense decks, infographics, media', icon: FileText, color: 'from-violet-400/20 to-fuchsia-500/10' },
  { id: 'systems' as Track, title: 'Software, IT & Hands-on', subtitle: 'Coding, web systems, databases', icon: Code2, color: 'from-emerald-400/20 to-teal-500/10' },
]
const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const MAX_FILE_BYTES = 50 * 1024 * 1024
const REF_KEY = 'inquire_ref'
const REF_DAYS = 30

// Remember which agent's link brought the client here (30 days)
function readReferral(): string {
  try {
    const saved = JSON.parse(localStorage.getItem(REF_KEY) || 'null')
    if (saved?.code && Date.now() - saved.at < REF_DAYS * 86_400_000) return saved.code
  } catch {}
  return ''
}

export default function Page() {
  const [mobileNav, setMobileNav] = useState(false)
  const [step, setStep] = useState(0)
  const [track, setTrack] = useState<Track>('academic')
  const [scope, setScope] = useState(6)
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
      localStorage.setItem(REF_KEY, JSON.stringify({ code: ref.toUpperCase(), at: Date.now() }))
    }
  }, [])

  const selectedTrack = tracks.find((item) => item.id === track) ?? tracks[0]
  const scopeText = track === 'academic' ? `${scope}${scope === 20 ? '+' : ''} pages` : `Level ${scope}/20`
  const selectFile = (next: File | null) => {
    setError('')
    if (next && next.size > MAX_FILE_BYTES) {
      setError('That file is over 50 MB. Zip it, compress it, or send it through Live Chat.')
      setFile(null)
      return
    }
    setFile(next)
  }

  const dispatch = async () => {
    if (submitting) return
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
        body: JSON.stringify({ category: track, serviceType: selectedTrack.title, title, scope: scopeText, urgency, clientContact: contact, briefDetails: brief, fileUrls, ref: readReferral() }),
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

  return <main className="min-h-screen overflow-x-hidden bg-[#06121d] text-slate-100 selection:bg-cyan-300 selection:text-slate-950">
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden"><div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" /><div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" /><div className="absolute bottom-0 left-1/2 size-80 rounded-full bg-violet-500/10 blur-[130px]" /></div>
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06121d]/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
        <a href="/" className="flex items-center gap-3 text-left"><img src={logoUrl} alt="Gemini Nexus" width={40} height={40} className="size-10 rounded-xl object-cover" /><span><strong className="block text-sm tracking-tight">Gemini Nexus</strong><small className="block text-[10px] uppercase tracking-[.2em] text-slate-500">Digital operations network</small></span></a>
        <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
          <a href="/" className="hover:text-white">Intake portal</a>
          <a href="/workflow" className="hover:text-white">How it works</a>
          <a href="/chat" className="hover:text-white">Live chat</a>
          <span className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-300" /> Intake line active</span>
        </nav>
        <div className="flex items-center gap-2">
          <a href="/auth/signin" aria-label="Staff sign in" title="Staff sign in" className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:border-cyan-300/40 hover:text-cyan-300"><KeyRound className="size-4" /></a>
          <button aria-label={mobileNav ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)} className="rounded-xl border border-white/10 p-2 md:hidden">{mobileNav ? <X className="size-4" /> : <Menu className="size-4" />}</button>
        </div>
      </div>
      {mobileNav && <nav className="flex flex-col gap-1 border-t border-white/10 px-5 py-3 text-sm text-slate-300 md:hidden">
        <a href="/" className="rounded-lg px-2 py-2 hover:bg-white/5">Intake portal</a>
        <a href="/workflow" className="rounded-lg px-2 py-2 hover:bg-white/5">How it works</a>
        <a href="/chat" className="rounded-lg px-2 py-2 hover:bg-white/5">Live chat</a>
        <a href="/auth/signin" className="rounded-lg px-2 py-2 hover:bg-white/5">Staff sign in</a>
      </nav>}
    </header>
    <ClientPortal title={title} setTitle={setTitle} step={step} setStep={setStep} track={track} setTrack={setTrack} scope={scope} setScope={setScope} scopeText={scopeText} brief={brief} setBrief={setBrief} contact={contact} setContact={setContact} urgency={urgency} setUrgency={setUrgency} file={file} setFile={selectFile} sent={sent} dispatch={dispatch} reset={reset} submitting={submitting} error={error} ticketId={ticketId} />
  </main>
}

function ClientPortal({ title, setTitle, step, setStep, track, setTrack, scope, setScope, scopeText, brief, setBrief, contact, setContact, urgency, setUrgency, file, setFile, sent, dispatch, reset, submitting, error, ticketId }: any) {
  if (sent) return <section className="mx-auto flex min-h-[calc(100vh-75px)] max-w-2xl items-center justify-center px-5 py-16"><div className={`${glass} w-full rounded-[2rem] p-10 text-center`}><div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-300"><Check className="size-8" /></div><p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Brief received{ticketId ? ` · ${ticketId}` : ''}</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Your brief is in the queue.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">A Gemini Nexus specialist will review it and send a custom GHS quote. No deposit required. Open Live Chat with your ticket number to speed things up.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><a href={`/chat?ticket=${encodeURIComponent(ticketId)}`} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200"><MessageCircle className="size-4" /> Continue in Live Chat <ArrowRight className="size-4" /></a></div><button onClick={reset} className="mt-6 text-xs font-semibold text-slate-500 hover:text-white">Submit another request</button></div></section>
  const steps = ['Track & scope', 'Brief & files', 'Dispatch details']
  return <><section aria-label="Live chat" className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-5 pt-5 lg:px-8"><span className="mr-2 text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Need help?</span><a href="/chat" className="flex items-center gap-1.5 rounded-full border border-cyan-300/50 bg-cyan-300/15 px-3 py-1.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/25"><span className="size-1.5 animate-pulse rounded-full bg-emerald-300" /> Live chat with an agent</a></section><section className="relative mx-auto max-w-7xl px-5 pb-16 pt-16 lg:px-8 lg:pb-24 lg:pt-24"><div className="max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-200"><Sparkles className="size-3.5" /> Ghana operational · custom GHS quotes</span><h1 className="mt-6 text-5xl font-bold leading-[.98] tracking-[-.06em] text-white sm:text-7xl">Serious work.<br /><span className="bg-gradient-to-r from-cyan-200 via-white to-indigo-300 bg-clip-text text-transparent">Right specialist.</span></h1><p className="mt-7 max-w-2xl text-base leading-7 text-slate-400">One secure intake line for academic research, visual media, and technical systems support. Tell us what needs moving forward.</p></div></section><section className="mx-auto grid max-w-7xl items-start gap-7 px-5 pb-20 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8"><aside className="flex flex-col gap-5 lg:sticky lg:top-24"><div className={`${glass} rounded-3xl p-5`}><p className="text-sm font-bold text-white">Why teams use Nexus</p>{[['Direct specialist routing', Zap], ['Confidential by default', LockKeyhole], ['Original, tailored work', Pencil], ['Progress updates included', MessageCircle]].map(([label, Icon]: any) => <div key={label} className="mt-5 flex items-center gap-3 text-sm text-slate-400"><span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-cyan-300"><Icon className="size-4" /></span>{label}</div>)}</div><div className={`${glass} rounded-3xl p-5`}><div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4 text-emerald-300" /> Private intake</div><p className="mt-2 text-xs leading-5 text-slate-500">Client identities stay hidden from delivery teams. Only our admins see your contact details and files.</p></div></aside><div id="intake" className={`${glass} scroll-mt-24 rounded-[2rem] p-5 sm:p-8`}><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">Request intake</p><h2 className="mt-2 text-xl font-bold">Start a new brief</h2></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-400">{step + 1} / 3</span></div><div className="mt-7 grid grid-cols-3 gap-2">{steps.map((item, index) => <button key={item} onClick={() => index <= step && setStep(index)} aria-current={index === step ? 'step' : undefined} aria-label={`Step ${index + 1}: ${item}`} className={`flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[11px] font-semibold leading-tight transition sm:justify-start sm:px-3 ${index <= step ? 'bg-cyan-300 text-slate-950' : 'bg-white/10 text-slate-500'}`}><span className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] ${index <= step ? 'bg-slate-950/15' : 'bg-white/10'}`}>{index < step ? '✓' : index + 1}</span><span className="hidden truncate sm:inline">{item}</span></button>)}</div><p className="mt-3 text-xs font-semibold text-cyan-200 sm:hidden">Step {step + 1}: {steps[step]}</p>{step === 0 && <TrackForm track={track} setTrack={setTrack} scope={scope} setScope={setScope} scopeText={scopeText} />}{step === 1 && <BriefForm title={title} setTitle={setTitle} brief={brief} setBrief={setBrief} file={file} setFile={setFile} />}{step === 2 && <DispatchForm contact={contact} setContact={setContact} urgency={urgency} setUrgency={setUrgency} />}{error && <p role="alert" className="mt-6 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</p>}{step < 2 ? <button onClick={() => setStep(step + 1)} className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200">Continue <ArrowRight className="size-4" /></button> : <div className="mt-8"><p className="mb-3 text-center text-xs text-slate-500">{submitting ? 'Sending your brief…' : 'Custom GHS quote in Live Chat · Zero deposit required'}</p><button disabled={submitting} onClick={() => dispatch()} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-slate-950 hover:from-cyan-300 hover:to-blue-400 disabled:cursor-wait disabled:opacity-50"><Send className="size-4" /> {submitting ? 'Sending…' : 'Submit brief'}</button></div>}</div></section></>
}

function TrackForm({ track, setTrack, scope, setScope, scopeText }: any) { return <div className="mt-8"><p className="text-sm font-semibold text-slate-300">Choose a service track</p><div className="mt-4 grid gap-3 md:grid-cols-3">{tracks.map((item) => { const Icon = item.icon; const selected = item.id === track; return <button key={item.id} onClick={() => setTrack(item.id)} aria-pressed={selected} className={`rounded-2xl border bg-gradient-to-br p-4 text-left transition hover:-translate-y-0.5 ${item.color} ${selected ? 'border-cyan-300/70 ring-1 ring-cyan-300/40' : 'border-white/10'}`}><span className="flex size-10 items-center justify-center rounded-xl bg-black/20 text-cyan-200"><Icon className="size-5" /></span><strong className="mt-4 block text-sm text-white">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-400">{item.subtitle}</span>{selected && <span className="mt-4 flex items-center gap-1 text-[11px] font-bold text-cyan-300"><Check className="size-3" /> Selected</span>}</button>})}</div><div className="mt-7 rounded-2xl border border-white/10 bg-black/15 p-5"><div className="flex items-center justify-between"><label htmlFor="scope" className="text-sm font-semibold">Scope or complexity</label><span className="rounded-lg bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-200">{scopeText}</span></div><input id="scope" type="range" min="1" max="20" value={scope} onChange={(event) => setScope(Number(event.target.value))} className="mt-5 h-2 w-full accent-cyan-300" /></div></div> }
function BriefForm({ title, setTitle, brief, setBrief, file, setFile }: any) { return <div className="mt-8"><label htmlFor="title" className="text-sm font-semibold text-slate-300">Assignment title</label><input id="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Impact of mobile money on rural SMEs in Ghana" className="mt-3 mb-6 h-12 w-full rounded-2xl border border-white/10 bg-black/15 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" /><label htmlFor="brief" className="text-sm font-semibold text-slate-300">Assignment brief or project requirements</label><textarea id="brief" value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={1600} placeholder="Paste the prompt, success criteria, links, or system requirements..." className="mt-3 min-h-48 w-full resize-y rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" /><label htmlFor="attachment" className="mt-5 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[.03] p-6 text-center text-sm text-slate-400 hover:border-cyan-300/50"><Paperclip className="size-5 text-cyan-300" /><span>{file ? file.name : 'Attach rubric, dataset, or code files'}</span><span className="text-xs text-slate-600">Up to 50 MB · PDF, DOCX, ZIP, images · uploaded securely when you submit</span><input id="attachment" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp,.txt" className="sr-only" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>{file && <button type="button" onClick={() => setFile(null)} className="mt-2 text-xs text-slate-500 hover:text-rose-300">Remove file</button>}</div> }
function DispatchForm({ contact, setContact, urgency, setUrgency }: any) { return <div className="mt-8"><label htmlFor="contact" className="text-sm font-semibold text-slate-300">Your phone number or email (so we can reach you)</label><input id="contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="e.g. 024 000 0000 or you@email.com" className="mt-3 h-12 w-full rounded-2xl border border-white/10 bg-black/15 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60" /><p className="mt-7 text-sm font-semibold text-slate-300">Response urgency</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{['Standard', 'Express', 'Emergency'].map((item) => <button key={item} onClick={() => setUrgency(item)} aria-pressed={urgency === item} className={`rounded-2xl border p-4 text-left ${urgency === item ? 'border-cyan-300/70 bg-cyan-300/10' : 'border-white/10 bg-white/[.03]'}`}><strong className="block text-sm">{item}</strong><span className="mt-1 block text-xs text-slate-500">{item === 'Standard' ? '3–5 business days' : item === 'Express' ? '24–48 hours' : 'Under 24 hours'}</span></button>)}</div></div> }
