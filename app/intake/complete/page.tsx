'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Check, MessageCircle } from 'lucide-react'
import { IntakeShell } from '@/components/intake/intake-shell'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { useIntake } from '../provider'

export default function IntakeCompletePage() {
  const router = useRouter()
  const { ticketId, sent, reset } = useIntake()

  if (!sent && !ticketId) {
    return (
      <IntakeShell current={4} title="Nothing to show yet" subtitle="Start a brief to see your ticket here once it has been dispatched.">
        <a href="/intake" className="portal-focus inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-6 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">Start a brief <ArrowRight className="size-4" /></a>
      </IntakeShell>
    )
  }

  return (
    <IntakeShell current={4} title="Brief received" subtitle="Your request is in the queue. A specialist will review it and send a custom GHS quote — no deposit required.">
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-300/15 text-emerald-300"><Check className="size-8" /></div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-cyan-300">Brief received{ticketId ? ` · ${ticketId}` : ''}</p>
        <AnimatedHeading as="h2" style={{ justifyContent: 'center' }} className="mt-3 text-2xl font-bold text-white">Your brief is in the queue.</AnimatedHeading>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">Open Live Chat with your ticket number to speed things up, or track the status any time without signing in.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a href={`/chat?ticket=${encodeURIComponent(ticketId)}`} className="portal-focus flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"><MessageCircle className="size-4" /> Continue in Live Chat <ArrowRight className="size-4" /></a>
          {ticketId && <a href={`/track?id=${encodeURIComponent(ticketId)}`} className="portal-focus flex items-center justify-center gap-2 rounded-xl border border-[rgba(0,240,255,0.14)] px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5">Track this order</a>}
        </div>
        <button onClick={() => { reset(); router.push('/') }} className="portal-focus mt-6 text-xs font-semibold text-slate-500 hover:text-white">Submit another request</button>
      </div>
    </IntakeShell>
  )
}
