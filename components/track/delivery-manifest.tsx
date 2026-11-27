'use client'

import { ClipboardList, Download, FileText, ShieldCheck } from 'lucide-react'
import { fileNameFromLink, formatTimestamp, parseFileLinks } from '@/components/intake/trust-terms'

/** Public, no-login record of what was included and what has been recorded so far. */
export function DeliveryManifest({
  scopeSummary,
  fileUrls,
  revisionCount,
  maxRevisions,
  handoffNote,
  handoffAt,
  qaSignedOffAt,
  delivered,
}: {
  scopeSummary: string[]
  fileUrls: string | null
  revisionCount: number
  maxRevisions: number
  handoffNote: string | null
  handoffAt: string | null
  qaSignedOffAt: string | null
  delivered: boolean
}) {
  const files = parseFileLinks(fileUrls)
  const expired = (fileUrls || '').trim().toLowerCase() === 'expired'
  const handoffTime = formatTimestamp(handoffAt)
  const qaTime = formatTimestamp(qaSignedOffAt)
  const used = Math.min(Math.max(0, Math.floor(revisionCount || 0)), Math.max(1, maxRevisions))

  return (
    <section aria-labelledby="delivery-manifest-title" className="portal-glass mt-6 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p id="delivery-manifest-title" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#00F0FF]"><ClipboardList className="size-3.5" /> Delivery manifest and change log</p>
          <p className="mt-2 text-sm text-[#94A3B8]">A plain record of the scope, files and recorded handoff details for this ticket.</p>
        </div>
        <span className="rounded-full border border-[rgba(0,240,255,0.14)] bg-[#060B14]/70 px-3 py-1.5 text-[11px] font-bold text-[#F8FAFC]">{delivered ? 'Delivered' : 'Not delivered yet'}</span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#94A3B8]">Scope completed</p>
          <ul className="mt-3 grid gap-2 text-sm text-[#F8FAFC]">
            {(scopeSummary.length ? scopeSummary : ['The specialist has not recorded a scope summary for this ticket yet.']).map((item) => (
              <li key={item} className="flex items-start gap-2"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#00F0FF]" /><span className="break-words">{item}</span></li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#94A3B8]">Files included</p>
          {files.length ? (
            <ul className="mt-3 grid gap-2">
              {files.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-[#F8FAFC] underline decoration-[#00F0FF]/60 underline-offset-4 transition hover:text-[#00F0FF]">
                    <FileText className="mt-0.5 size-4 shrink-0 text-[#00F0FF]" />
                    <span className="break-all">{fileNameFromLink(url)}</span>
                    <Download className="mt-0.5 size-3.5 shrink-0 text-[#94A3B8]" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-6 text-[#94A3B8]">{expired ? 'Files were attached previously, but they are no longer available.' : 'No files were attached to this brief.'}</p>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-[rgba(0,240,255,0.14)] pt-5">
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#94A3B8]">Change log</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#0A0F1C]/70 px-3 py-2.5">
            <dt className="text-[11px] text-[#94A3B8]">Revision rounds used</dt>
            <dd className="mt-1 font-bold text-[#F8FAFC]">{used} of {maxRevisions} permitted</dd>
          </div>
          <div className="rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#0A0F1C]/70 px-3 py-2.5">
            <dt className="text-[11px] text-[#94A3B8]">Quality assurance sign-off</dt>
            <dd className="mt-1 font-bold text-[#F8FAFC]">{qaTime ? `Signed off ${qaTime}` : 'Not recorded yet'}</dd>
          </div>
        </dl>

        {handoffNote ? (
          <blockquote className="mt-4 rounded-2xl border border-[rgba(0,240,255,0.14)] bg-[#0A0F1C]/70 p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#F8FAFC]">{handoffNote}</p>
            <footer className="mt-3 flex items-center gap-2 text-[11px] text-[#94A3B8]">
              <ShieldCheck className="size-3.5 shrink-0 text-[#00F0FF]" />
              Handoff note recorded {handoffTime || 'at a time that has not been recorded'}
            </footer>
          </blockquote>
        ) : (
          <p role="status" className="mt-4 rounded-2xl border border-[rgba(0,240,255,0.14)] bg-[#0A0F1C]/70 p-4 text-sm leading-6 text-[#94A3B8]">
            No handoff note has been recorded yet. The specialist&apos;s note will appear here with its timestamp once it is added.
          </p>
        )}
      </div>
    </section>
  )
}

export default DeliveryManifest
