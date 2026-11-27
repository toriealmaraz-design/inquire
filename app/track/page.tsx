'use client'
import { AnimatedHeading } from '@/components/visual/animated-heading'

import { useState, useEffect } from 'react'
import { ArrowLeft, Search, Loader2, AlertCircle } from 'lucide-react'
import { BrandLogo } from '@/components/branding'
import { SiteFooter } from '@/components/site-footer'
import { TicketTimeline } from '@/components/ticket-timeline'
import { PostDeliveryRating } from '@/components/track/post-delivery-rating'
import { DeliveryManifest } from '@/components/track/delivery-manifest'
import { ScopeBoundary } from '@/components/intake/scope-boundary'
import { completionWindow } from '@/components/intake/trust-terms'

type Result =
  | {
      found: true
      ticketId: string
      serviceType: string
      title: string
      status: string
      createdAt: string
      revisionCount?: number
      maxRevisions?: number
      clientSignoffAt?: string | null
      commissionStatus?: 'PENDING' | 'AVAILABLE'
      delivered?: boolean
      scope?: string | null
      urgency?: string | null
      scopeSummary?: string[]
      fileUrls?: string | null
      completionWindow?: string
      handoffNote?: string | null
      handoffAt?: string | null
      qaSignedOffAt?: string | null
    }
  | { found: false; ticketId: string }

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

  const field = 'h-12 w-full rounded-2xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/50 px-4 text-sm text-[#F8FAFC] outline-none placeholder:text-[#94A3B8] focus:border-[#00F0FF]/60'

  return (
    <main className="portal-page flex min-h-screen flex-col overflow-x-hidden text-[#F8FAFC]">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-[#00F0FF]/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-[#00F0FF]/5 blur-[140px]" />
      </div>
      <header className="sticky top-0 z-30 border-b border-[rgba(0,240,255,0.14)] bg-[#060B14]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="/" className="flex items-center gap-3">
            <BrandLogo width={40} height={40} className="size-10 rounded-xl object-cover" />
            <span><strong className="block text-sm tracking-tight text-[#F8FAFC]">Gemini Nexus</strong><small className="block text-[10px] uppercase tracking-[.2em] text-[#94A3B8]">Track your order</small></span>
          </a>
          <a href="/" className="flex items-center gap-2 rounded-xl border border-[rgba(0,240,255,0.14)] px-3 py-2 text-xs text-[#94A3B8] transition hover:border-[#00F0FF]/40 hover:text-[#00F0FF]"><ArrowLeft className="size-4" /> Home</a>
        </div>
      </header>

      <section className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-5 py-14 lg:px-8">
        <AnimatedHeading as="h1" className="text-4xl font-bold tracking-[-.04em] text-[#F8FAFC] sm:text-5xl">Track your order</AnimatedHeading>
        <p className="mt-4 max-w-xl text-base leading-7 text-[#94A3B8]">Enter the ticket number from your brief confirmation (for example <span className="font-mono text-[#00F0FF]">AC-2610-001</span>) to see its current status.</p>

        <form onSubmit={lookup} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input value={ticket} onChange={(e) => setTicket(e.target.value.toUpperCase())} placeholder="Enter your ticket number" aria-label="Ticket number" className={`${field} font-mono sm:flex-1`} />
          <button type="submit" disabled={busy || !ticket.trim()} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#00F0FF] px-6 text-sm font-bold text-[#060B14] transition hover:bg-[#F8FAFC] disabled:opacity-50">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Track
          </button>
        </form>

        {error && <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-rose-300"><AlertCircle className="size-4" /> {error}</p>}

        {result && !result.found && (
          <div className="mt-8 rounded-3xl border border-[rgba(0,240,255,0.14)] bg-[rgba(15,23,42,0.72)] p-6 text-center backdrop-blur-2xl">
            <p className="text-sm text-[#94A3B8]">We couldn&rsquo;t find <span className="font-mono text-[#00F0FF]">{result.ticketId}</span>. Check the number, or <a href="/chat" className="text-[#00F0FF] underline">ask us in Live Chat</a>.</p>
          </div>
        )}

        {result && result.found && (
          <div className="mt-8 rounded-[2rem] border border-[rgba(0,240,255,0.14)] bg-[rgba(15,23,42,0.72)] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#00F0FF]">{result.ticketId}</p>
                <AnimatedHeading as="h2" className="mt-1 break-words text-lg font-semibold text-[#F8FAFC]">{result.title}</AnimatedHeading>
                <p className="text-sm text-[#94A3B8]">{result.serviceType}</p>
              </div>
              <span className="shrink-0 rounded-full border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 py-1 text-xs font-bold text-[#F8FAFC]">{result.status}</span>
            </div>

            <ScopeBoundary
              items={result.scopeSummary ?? []}
              completionWindow={result.completionWindow ?? completionWindow(result.urgency)}
            />

            <TicketTimeline
              key={result.ticketId}
              status={result.status}
              createdAt={result.createdAt}
              ticketId={result.ticketId}
              revisionCount={result.revisionCount}
              clientSignoffAt={result.clientSignoffAt}
              commissionStatus={result.commissionStatus}
            />

            <DeliveryManifest
              scopeSummary={result.scopeSummary ?? []}
              fileUrls={result.fileUrls ?? null}
              revisionCount={result.revisionCount ?? 0}
              maxRevisions={result.maxRevisions ?? 2}
              handoffNote={result.handoffNote ?? null}
              handoffAt={result.handoffAt ?? null}
              qaSignedOffAt={result.qaSignedOffAt ?? null}
              delivered={result.delivered ?? /delivered|complete|paid/i.test(result.status)}
            />

            {(result.delivered ?? /delivered|complete|paid/i.test(result.status)) && <PostDeliveryRating ticketId={result.ticketId} />}

            <p className="mt-6 border-t border-[rgba(0,240,255,0.14)] pt-4 text-xs text-[#94A3B8]">Submitted {new Date(result.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · For details or changes, <a href={`/chat?ticket=${encodeURIComponent(result.ticketId)}`} className="text-[#00F0FF] underline">continue in Live Chat</a>.</p>
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
