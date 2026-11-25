'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Send } from 'lucide-react'
import { IntakeShell } from '@/components/intake/intake-shell'
import { useIntake } from '../provider'

export default function IntakeDispatchPage() {
  const router = useRouter()
  const { contact, setContact, quote, file, error, setError, submitting, dispatch, sent } = useIntake()

  useEffect(() => {
    if (sent) router.push('/intake/complete')
  }, [sent, router])

  const submit = async () => {
    if (!contact.trim()) {
      setError('Add a phone number or email so we can send your GHS quote.')
      return
    }
    await dispatch()
  }

  return (
    <IntakeShell current={3} title="Dispatch details" subtitle="Last step. We include your selected scope and estimate with the brief, then a specialist confirms the final quote. No deposit is required.">
      <label htmlFor="intake-contact" className="text-sm font-semibold text-slate-200">Your phone number or email (so we can reach you)</label>
      <input id="intake-contact" value={contact} onChange={(event) => setContact(event.target.value)} placeholder="e.g. 024 000 0000 or you@email.com" aria-invalid={Boolean(error) && !contact.trim()} className="portal-input mt-3 h-12 w-full px-4 text-sm" />

      <div className="portal-glass mt-6 rounded-2xl p-5">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Ready to send</p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Service</dt><dd className="mt-1 font-semibold text-white">{quote.category}</dd></div>
          <div><dt className="text-xs text-slate-500">Scope</dt><dd className="mt-1 font-semibold text-white">{quote.volume} {quote.unit}</dd></div>
          <div><dt className="text-xs text-slate-500">Indicative estimate</dt><dd className="mt-1 font-semibold text-cyan-200">GHS {quote.low}–{quote.high}</dd></div>
        </dl>
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Check className="size-3.5 text-emerald-300" /> {file ? `${file.name} will be uploaded securely.` : 'No file attached.'} Final quote confirmed after review.</p>
      </div>

      {error && <p role="alert" className="mt-6 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

      <p className="mb-3 mt-8 text-center text-xs text-slate-500">{submitting ? 'Sending your brief…' : 'Custom GHS quote in Live Chat · Zero deposit required'}</p>
      <button disabled={submitting} onClick={submit} className="portal-focus flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 font-bold text-slate-950 transition hover:from-cyan-300 hover:to-blue-400 disabled:cursor-wait disabled:opacity-50">
        <Send className="size-4" /> {submitting ? 'Sending…' : 'Submit brief'}
      </button>
    </IntakeShell>
  )
}
