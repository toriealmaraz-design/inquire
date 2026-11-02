'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Search, PackageCheck, Loader2, AlertCircle, CheckCircle2, Circle } from 'lucide-react'
import { BrandLogo } from '@/components/branding'
import { SiteFooter } from '@/components/site-footer'

type Result =
  | { found: true; ticketId: string; serviceType: string; title: string; status: string; createdAt: string }
  | { found: false; ticketId: string }

// Map a brief's status to a 4-step progress stage (0-3).
function stageOf(status: string): number {
  const s = status.toLowerCase()
  if (s.includes('paid') || s.includes('complete') || s.includes('delivered')) return 3
  if (s.includes('progress') || s.includes('assigned') || s.includes('working')) return 2
  if (s.includes('quote') && !s.includes('pending')) return 1
  return 0
}
const STEPS = ['Received', 'Quoted', 'In progress', 'Completed']

export default function TrackPage() {
  const [ticket, setTicket] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = ticket.trim()
    if (!id || busy) return
    await run(id)
  }
  const run = async (id: string) => {
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`/api/ticket?id=${encodeURIComponent(id)}`)
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Please enter a valid ticket number.')
      setResult(d)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  // Auto-look-up when arriving from a link like /track?id=AC-2610-001
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    if (id) { setTicket(id.toUpperCase()); run(id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stage = result?.found ? stageOf(result.status) : 0
  const field = 'h-12 w-full rounded-2xl border border-white/10 bg-black/15 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60'

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-[#06121d] text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06121d]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="/" className="flex items-center gap-3">
            <BrandLogo width={40} height={40} className="size-10 rounded-xl object-cover" />
            <span><strong className="block text-sm tracking-tight">Gemini Nexus</strong><small className="block text-[10px] uppercase tracking-[.2em] text-slate-500">Track your order</small></span>
          </a>
          <a href="/" className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:border-cyan-300/40 hover:text-cyan-300"><ArrowLeft className="size-4" /> Home</a>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-5 py-14 lg:px-8">
        <h1 className="text-4xl font-bold tracking-[-.04em] text-white sm:text-5xl">Track your order</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-400">Enter the ticket number from your brief confirmation (for example <span className="font-mono text-cyan-200">AC-2610-001</span>) to see its current status.</p>

        <form onSubmit={lookup} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input value={ticket} onChange={(e) => setTicket(e.target.value.toUpperCase())} placeholder="Enter your ticket number" aria-label="Ticket number" className={`${field} font-mono sm:flex-1`} />
          <button type="submit" disabled={busy || !ticket.trim()} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-6 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Track
          </button>
        </form>

        {error && <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-rose-300"><AlertCircle className="size-4" /> {error}</p>}

        {result && !result.found && (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
            <p className="text-sm text-slate-300">We couldn&rsquo;t find <span className="font-mono text-cyan-200">{result.ticketId}</span>. Check the number, or <a href="/chat" className="text-cyan-300 underline">ask us in Live Chat</a>.</p>
          </div>
        )}

        {result && result.found && (
          <div className="mt-8 rounded-3xl border border-white/15 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">{result.ticketId}</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-white">{result.title}</h2>
                <p className="text-sm text-slate-400">{result.serviceType}</p>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-200">{result.status}</span>
            </div>

            {/* Progress stepper */}
            <ol className="mt-8 space-y-4">
              {STEPS.map((label, i) => {
                const done = i < stage
                const current = i === stage
                return (
                  <li key={label} className="flex items-center gap-3">
                    {done ? <CheckCircle2 className="size-5 text-emerald-400" /> : current ? <PackageCheck className="size-5 text-cyan-300" /> : <Circle className="size-5 text-slate-600" />}
                    <span className={`text-sm ${done ? 'text-emerald-200' : current ? 'font-semibold text-white' : 'text-slate-500'}`}>{label}{current ? ' — current' : ''}</span>
                  </li>
                )
              })}
            </ol>

            <p className="mt-6 border-t border-white/10 pt-4 text-xs text-slate-500">Submitted {new Date(result.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · For details or changes, <a href={`/chat?ticket=${encodeURIComponent(result.ticketId)}`} className="text-cyan-300 underline">continue in Live Chat</a>.</p>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
