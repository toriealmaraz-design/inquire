'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { IntakeShell } from '@/components/intake/intake-shell'
import { BriefCopilot } from '@/components/intake/brief-copilot'
import { DeliverableChecklist } from '@/components/intake/deliverables'
import { FileManifest } from '@/components/intake/file-manifest'
import { useIntake } from '../provider'

export default function IntakeBriefPage() {
  const router = useRouter()
  const {
    title, setTitle, brief, setBrief, error, setError,
    clientName, setClientName, whatsapp, setWhatsapp,
    university, setUniversity, department, setDepartment,
    returningClient,
  } = useIntake()

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

      <div className="mt-5 rounded-2xl border border-[rgba(0,240,255,0.16)] bg-[#060b14]/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-cyan-300">Your details</p>
          {returningClient && <p className="text-[10px] font-semibold text-emerald-300">Saved locally on this device</p>}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><label htmlFor="client-name" className="block text-[11px] font-semibold text-slate-400">Full name</label><input id="client-name" value={clientName} onChange={(event) => setClientName(event.target.value)} maxLength={80} placeholder="Your name" autoComplete="name" className="portal-input mt-1.5 h-11 w-full px-3 text-sm" /></div>
          <div><label htmlFor="client-whatsapp" className="block text-[11px] font-semibold text-slate-400">WhatsApp number</label><input id="client-whatsapp" type="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} maxLength={40} placeholder="e.g. 024 000 0000" className="portal-input mt-1.5 h-11 w-full px-3 text-sm" /></div>
          <div><label htmlFor="client-university" className="block text-[11px] font-semibold text-slate-400">University</label><input id="client-university" value={university} onChange={(event) => setUniversity(event.target.value)} maxLength={100} placeholder="e.g. University of Ghana" className="portal-input mt-1.5 h-11 w-full px-3 text-sm" /></div>
          <div><label htmlFor="client-department" className="block text-[11px] font-semibold text-slate-400">Department</label><input id="client-department" value={department} onChange={(event) => setDepartment(event.target.value)} maxLength={100} placeholder="e.g. Computer Science" className="portal-input mt-1.5 h-11 w-full px-3 text-sm" /></div>
        </div>
        <p className="mt-3 text-[10px] text-slate-600">Prefilled for returning clients from this browser only. Edit freely — we include these with your brief.</p>
      </div>

      <label htmlFor="intake-brief" className="mt-6 block text-sm font-semibold text-slate-200">Consultation goals and context</label>
      <textarea id="intake-brief" value={brief} onChange={(event) => setBrief(event.target.value)} maxLength={1600} placeholder="Describe your goals, what you have tried, and what you would like to understand or improve..." aria-invalid={Boolean(error) && !brief.trim()} className="portal-input mt-3 min-h-56 w-full resize-y p-4 text-sm leading-6" />

      <DeliverableChecklist />
      <FileManifest />
      <BriefCopilot />
      {error && <p role="alert" className="mt-6 rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{error}</p>}

      <button onClick={next} className="portal-focus mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200">
        Continue to dispatch <ArrowRight className="size-4" />
      </button>
    </IntakeShell>
  )
}
