'use client'

import { useEffect, useState } from 'react'
import { ClipboardCheck, Save } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { QA_CHECK_KEYS, QA_CHECK_LABELS, parseQaChecklist, type QaChecklist } from './qa-checklist-keys'

type Props = {
  briefId: number
  checklist?: unknown
  signedOffAt?: string | null
  handoffNote?: string | null
  disabled?: boolean
  onSaved?: (data: Record<string, unknown>) => void
}

/** Admin-only pre-delivery gate. Progress can be saved without changing status. */
export function QaChecklist({ briefId, checklist, signedOffAt, handoffNote, disabled = false, onSaved }: Props) {
  const [checks, setChecks] = useState<QaChecklist>(() => parseQaChecklist(checklist))
  const [note, setNote] = useState(handoffNote || '')
  const [signed, setSigned] = useState<string | null>(signedOffAt || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setChecks(parseQaChecklist(checklist))
    setNote(handoffNote || '')
    setSigned(signedOffAt || null)
  }, [briefId, checklist, handoffNote, signedOffAt])

  const complete = QA_CHECK_KEYS.every((key) => checks[key] === true)

  const save = async (signOff: boolean) => {
    if (busy || disabled) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: briefId, action: 'qualityAssurance', qaChecklist: checks, signOff, handoffNote: note }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save the checklist.')
      setSigned(data.qaSignedOffAt ?? null)
      onSaved?.(data as Record<string, unknown>)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the checklist.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-3 rounded-2xl border border-[#00F0FF]/20 bg-[#0A0F1C]/70 p-3.5" aria-label={`Quality assurance checklist for ticket ${briefId}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#00F0FF]"><ClipboardCheck className="size-3.5" /> Before delivery</p>
          <AnimatedHeading as="h4" className="mt-1 text-xs font-bold text-[#F8FAFC]">Quality assurance checklist</AnimatedHeading>
        </div>
        {signed && <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] text-emerald-200">Signed off {new Date(signed).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</span>}
      </div>

      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {QA_CHECK_KEYS.map((key) => (
          <label key={key} className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
            <input
              type="checkbox"
              checked={checks[key] === true}
              disabled={disabled}
              onChange={(e) => setChecks((prev) => ({ ...prev, [key]: e.target.checked }))}
              className="size-3.5 accent-[#00F0FF]"
            />
            {QA_CHECK_LABELS[key]}
          </label>
        ))}
      </div>

      <label className="mt-3 block text-[11px] text-[#94A3B8]">
        Optional handoff note for the specialist
        <textarea
          value={note}
          disabled={disabled}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Structuring, debugging or formatting guidance"
          className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#0A0F1C]/80 px-2.5 py-2 text-xs text-[#F8FAFC] outline-none placeholder:text-[#94A3B8]/70 focus:border-[#00F0FF]/60"
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => save(false)} disabled={busy || disabled} className="flex h-8 items-center gap-1.5 rounded-lg border border-[#00F0FF]/30 px-2.5 text-[11px] font-semibold text-[#00F0FF] hover:bg-[#00F0FF]/10 disabled:opacity-50">
          <Save className="size-3" /> {busy ? 'Saving…' : 'Save checklist progress'}
        </button>
        <button type="button" onClick={() => save(true)} disabled={busy || disabled || !complete} className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-300 px-2.5 text-[11px] font-bold text-[#060B14] hover:bg-emerald-200 disabled:opacity-50">
          <ClipboardCheck className="size-3" /> Sign off quality assurance
        </button>
        {!complete && <span className="text-[10px] text-[#94A3B8]">All four checks are required before delivery.</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-[11px] text-rose-300">{error}</p>}
    </section>
  )
}
