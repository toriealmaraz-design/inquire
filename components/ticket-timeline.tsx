'use client'

import { useState } from 'react'
import { Check, Copy, Link2, MessageCircle, RotateCcw, ShieldCheck } from 'lucide-react'

const STEPS = ['Received', 'Quoted', 'In progress', 'Review', 'Delivered']
const MAX_REVISIONS = 2
const DISPATCH_NUMBER = '233206478727'

function stageOf(status: string): number {
  const value = status.toLowerCase()
  if (value.includes('paid') || value.includes('complete') || value.includes('delivered')) return 4
  if (value.includes('review') || value.includes('quality') || value.includes('check')) return 3
  if (value.includes('progress') || value.includes('assigned') || value.includes('working')) return 2
  if (value.includes('quote') && !value.includes('pending')) return 1
  return 0
}

/** Animated five-stage status rail with ticket/share actions and the client delivery gate. */
export function TicketTimeline({
  status,
  createdAt,
  ticketId,
  revisionCount = 0,
  clientSignoffAt = null,
  commissionStatus = 'PENDING',
}: {
  status: string
  createdAt: string
  ticketId: string
  revisionCount?: number
  clientSignoffAt?: string | null
  commissionStatus?: 'PENDING' | 'AVAILABLE'
}) {
  const stage = stageOf(status)
  const [copied, setCopied] = useState<'ticket' | 'link' | ''>('')
  const [contact, setContact] = useState('')
  const [revisions, setRevisions] = useState(Math.min(MAX_REVISIONS, Math.max(0, revisionCount)))
  const [signedAt, setSignedAt] = useState<string | null>(clientSignoffAt ? String(clientSignoffAt) : null)
  const [commission, setCommission] = useState<'PENDING' | 'AVAILABLE'>(commissionStatus === 'AVAILABLE' ? 'AVAILABLE' : 'PENDING')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const delivered = /delivered|complete|paid/i.test(status)
  const signedOff = Boolean(signedAt) || commission === 'AVAILABLE'
  const whatsappHref = `https://wa.me/${DISPATCH_NUMBER}?text=${encodeURIComponent(`Hi Gemini Nexus, I need help with ticket ${ticketId}.`)}`

  const copy = async (kind: 'ticket' | 'link') => {
    const text = kind === 'ticket' ? ticketId : `${window.location.origin}/track?id=${encodeURIComponent(ticketId)}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      window.setTimeout(() => setCopied(''), 1800)
    } catch {
      setCopied('')
    }
  }

  const post = async (action: 'signoff' | 'revision') => {
    if (busy) return
    if (!contact.trim()) {
      setError('Enter the phone number or email you used when you submitted this brief.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/ticket/signoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, contact: contact.trim(), action }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not update this ticket.')
      if (action === 'revision') {
        setRevisions(Math.min(MAX_REVISIONS, Math.max(0, Number(data.revisionCount ?? revisions))))
      } else {
        setSignedAt(data.clientSignoffAt || new Date().toISOString())
        setCommission(data.commissionStatus === 'AVAILABLE' ? 'AVAILABLE' : 'PENDING')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this ticket.')
    } finally {
      setBusy(false)
    }
  }

  const submitted = new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const confirmed = signedAt ? new Date(signedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => copy('ticket')} className="portal-focus flex items-center gap-1.5 rounded-full border border-[rgba(0,240,255,0.18)] bg-white/[.03] px-3 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100">
          {copied === 'ticket' ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
          {copied === 'ticket' ? 'Ticket copied' : 'Copy ticket'}
        </button>
        <button type="button" onClick={() => copy('link')} className="portal-focus flex items-center gap-1.5 rounded-full border border-[rgba(0,240,255,0.18)] bg-white/[.03] px-3 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-cyan-300/40 hover:text-cyan-100">
          {copied === 'link' ? <Check className="size-3.5 text-emerald-300" /> : <Link2 className="size-3.5" />}
          {copied === 'link' ? 'Link copied' : 'Copy tracking link'}
        </button>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="portal-focus flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-bold text-emerald-200 transition hover:border-emerald-300/60">
          <MessageCircle className="size-3.5" /> Chat on WhatsApp
        </a>
        <span className="text-[11px] text-slate-600" aria-live="polite">{copied ? 'Ready to paste anywhere.' : ''}</span>
      </div>

      <ol className="relative mt-7 space-y-4 before:absolute before:bottom-4 before:left-[11px] before:top-3 before:w-px before:bg-white/10">
        {STEPS.map((label, index) => {
          const done = index < stage
          const current = index === stage
          return (
            <li key={label} className="relative flex items-start gap-4">
              <span className={`relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${done ? 'border-emerald-300/50 bg-emerald-300/15 text-emerald-200' : current ? 'border-cyan-300/70 bg-cyan-300/15 text-cyan-100 shadow-[0_0_18px_rgba(0,240,255,0.35)]' : 'border-white/10 bg-[#0a0f1c] text-slate-600'}`}>
                {done ? <Check className="size-3" /> : index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-sm ${done ? 'text-emerald-200' : current ? 'font-bold text-white' : 'text-slate-500'}`}>
                  {label}
                  {current && <span className="ml-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200">Current</span>}
                </p>
                {index === 0 && <p className="mt-0.5 text-[11px] text-slate-600">Submitted {submitted}</p>}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-7 grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Revisions</p>
          <p className="mt-1 text-sm font-bold text-white">{revisions} of {MAX_REVISIONS} used</p>
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {Array.from({ length: MAX_REVISIONS }, (_, index) => <span key={index} className={`h-1 w-6 rounded-full ${index < revisions ? 'bg-cyan-300 shadow-[0_0_8px_rgba(0,240,255,0.4)]' : 'bg-white/10'}`} />)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.03] p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Commission</p>
          <p className={`mt-1 text-sm font-bold ${signedOff ? 'text-emerald-200' : 'text-amber-200'}`}>{signedOff ? 'Available' : 'Pending sign-off'}</p>
          <p className="mt-1 text-[10px] text-slate-500">{signedOff ? `Confirmed ${confirmed}` : 'Confirm delivery to release payment'}</p>
        </div>
      </div>

      {delivered && (
        <section className="mt-4 rounded-2xl border border-cyan-300/20 bg-cyan-300/[.04] p-4">
          {signedOff ? (
            <p role="status" className="flex items-start gap-2 text-xs leading-5 text-emerald-100">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              Delivery confirmed{confirmed ? ` on ${confirmed}` : ''}. The commission is now AVAILABLE. Need anything else? <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="font-bold text-cyan-300 underline">Message us on WhatsApp</a>.
            </p>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Confirm delivery & release commission</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-400">Use the phone number or email from your brief. You can request up to {MAX_REVISIONS} scoped revisions before signing off.</p>
              <label htmlFor="signoff-contact" className="mt-3 block text-[11px] font-semibold text-slate-300">Your contact from the brief</label>
              <input id="signoff-contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="e.g. 024 000 0000 or you@email.com" className="portal-input mt-1.5 h-11 w-full px-3 text-sm" />
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy || !contact.trim()} onClick={() => post('signoff')} className="portal-focus flex items-center gap-1.5 rounded-xl bg-cyan-300 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50">
                  <Check className="size-3.5" /> {busy ? 'Updating…' : 'Confirm delivery & release commission'}
                </button>
                <button type="button" disabled={busy || !contact.trim() || revisions >= MAX_REVISIONS} onClick={() => post('revision')} className="portal-focus flex items-center gap-1.5 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2.5 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/60 disabled:opacity-40">
                  <RotateCcw className="size-3.5" /> Request a revision ({revisions}/{MAX_REVISIONS})
                </button>
              </div>
              {revisions >= MAX_REVISIONS && <p className="mt-2 text-[11px] text-amber-200">Revision limit reached (2 of 2). Continue in WhatsApp for anything else.</p>}
              {error && <p role="alert" className="mt-2 text-[11px] text-rose-300">{error}</p>}
            </>
          )}
        </section>
      )}
    </div>
  )
}

export default TicketTimeline
