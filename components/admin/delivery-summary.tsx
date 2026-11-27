'use client'

import { FileText, Printer } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { briefTitle } from '@/lib/fields'
import { isFileLink } from '@/lib/storage-link'

export type DeliveryTicket = {
  ticketId: string
  title?: string | null
  briefDetails?: string | null
  serviceType?: string | null
  scope?: string | null
  fileUrls?: string | null
  revisionCount?: number | null
  handoffNote?: string | null
  handoffAt?: string | null
  qaSignedOffAt?: string | null
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

function files(raw: string | null | undefined) {
  return (raw || '').split(/[\s,]+/).map((item) => item.trim()).filter((item) => isFileLink(item))
}

/** Clean, printable handoff summary built from an admin ticket — no extra requests. */
export function DeliverySummary({ brief }: { brief: DeliveryTicket }) {
  const attachments = files(brief.fileUrls)
  const revisions = Math.min(2, Math.max(0, Number(brief.revisionCount || 0)))

  return (
    <section className={`${glass} rounded-2xl p-4 print:border-white/20 print:shadow-none`} aria-label={`Handoff summary for ${brief.ticketId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#00F0FF]"><FileText className="size-3.5" /> Handoff summary</p>
          <AnimatedHeading as="h4" className="mt-1 text-sm font-bold text-[#F8FAFC]">{briefTitle(brief)}</AnimatedHeading>
          <p className="mt-0.5 font-mono text-[11px] text-[#94A3B8]">{brief.ticketId}{brief.serviceType ? ` · ${brief.serviceType}` : ''}</p>
        </div>
        <button type="button" onClick={() => window.print()} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#00F0FF]/30 px-2.5 text-[11px] font-semibold text-[#00F0FF] hover:bg-[#00F0FF]/10 print:hidden">
          <Printer className="size-3" /> Print summary
        </button>
      </div>

      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
          <dt className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Scope</dt>
          <dd className="mt-0.5 text-[#F8FAFC]">{brief.scope || 'Not specified'}</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
          <dt className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Revision round</dt>
          <dd className="mt-0.5 text-[#F8FAFC]">Revision {revisions} of 2</dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 sm:col-span-2">
          <dt className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Files</dt>
          <dd className="mt-1 space-y-1">
            {attachments.length ? attachments.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block truncate text-[#00F0FF] hover:underline">{url}</a>
            )) : <span className="text-[#94A3B8]">None attached</span>}
          </dd>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2.5 sm:col-span-2">
          <dt className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Handoff note</dt>
          <dd className="mt-0.5 whitespace-pre-wrap text-[#F8FAFC]">{brief.handoffNote || 'No handoff note recorded.'}</dd>
          {brief.handoffAt && <p className="mt-1 text-[10px] text-[#94A3B8]">Handed off {new Date(brief.handoffAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</p>}
        </div>
      </dl>
      {brief.qaSignedOffAt && (
        <p className="mt-2 text-[10px] text-emerald-200">Quality assurance signed off {new Date(brief.qaSignedOffAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</p>
      )}
    </section>
  )
}
