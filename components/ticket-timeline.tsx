'use client'

import { useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'

const STEPS = ['Received', 'Quoted', 'In progress', 'Review', 'Delivered']

function stageOf(status: string): number {
  const value = status.toLowerCase()
  if (value.includes('paid') || value.includes('complete') || value.includes('delivered')) return 4
  if (value.includes('review') || value.includes('quality') || value.includes('check')) return 3
  if (value.includes('progress') || value.includes('assigned') || value.includes('working')) return 2
  if (value.includes('quote') && !value.includes('pending')) return 1
  return 0
}

/** Animated five-stage status rail with ticket/share actions. */
export function TicketTimeline({ status, createdAt, ticketId }: { status: string; createdAt: string; ticketId: string }) {
  const stage = stageOf(status)
  const [copied, setCopied] = useState<'ticket' | 'link' | ''>('')

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

  const submitted = new Date(createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

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
    </div>
  )
}

export default TicketTimeline
