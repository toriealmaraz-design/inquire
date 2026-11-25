'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, Paperclip } from 'lucide-react'
import { IntakeShell } from '@/components/intake/intake-shell'
import { BriefCopilot } from '@/components/intake/brief-copilot'
import { useIntake } from '../provider'

export default function IntakeBriefPage() {
  const router = useRouter()
  const { title, setTitle, brief, setBrief, file, selectFile, error, setError } = useIntake()

  const next = () => {
    if (!title.trim() || !brief.trim()) {
      setError('Add a short consultation title and describe what you need before continuing.')
      return
    }
    setError('')
    router.push('/intake/dispatch')
  }

  return (
    <IntakeShell current={2} title="Brief & files" subtitle="Tell us what good looks like. Attach source material if it helps — nothing is uploaded until the final dispatch.">
      <label htmlFor="intake-title" className="text-sm font-semibold text-slate-200">Consultation title</label>
      <input id="intake-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Review my market research methodology" aria-invalid={Boolean(error) && !title.trim()} className="portal-input mt-3 h-12 w-full px-4 text-sm" />

      <label htmlFor="intake-brief" className="mt-6 block text-sm font-semibold text-slate-200">Consultation goals and context</label>
      <textarea id="intake-brief" value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={1600} placeholder="Describe your goals, what you have tried, and what you would like to understand or improve..." aria-invalid={Boolean(error) && !brief.trim()} className="portal-input mt-3 min-h-56 w-full resize-y p-4 text-sm leading-6" />

      <label htmlFor="intake-attachment" className="mt-5 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[rgba(0,240,255,0.2)] bg-white/[.03] p-6 text-center text-sm text-slate-400 transition hover:border-cyan-300/50">
        <Paperclip className="size-5 text-cyan-300" />
        <span>{file ? file.name : 'Attach source material, dataset, or code files'}</span>
        <span className="text-xs text-slate-600">Up to 15 MB · PDF, DOCX, ZIP, images · uploaded securely when you submit</span>
        <input id="intake-attachment" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp,.txt" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
      </label>
      {file && <button type="button" onClick={() => selectFile(null)} className="mt-2 text-xs text-slate-500 hover:text-rose-300">Remove file</button>}
      <BriefCopilot />
      {error && <p role="alert" className="mt-6 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

      <button onClick={next} className="portal-focus mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200">
        Continue to dispatch <ArrowRight className="size-4" />
      </button>
    </IntakeShell>
  )
}
