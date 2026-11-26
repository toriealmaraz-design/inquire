'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, Check, Code2, FileText } from 'lucide-react'
import { IntakeShell } from '@/components/intake/intake-shell'
import { ProofSamples } from '@/components/intake/proof-samples'
import { QuoteEstimator } from '@/components/quote-estimator'
import { useIntake, type Track } from './provider'

const tracks = [
  { id: 'academic' as Track, title: 'Research & Learning', subtitle: 'Methods coaching, editing, citation guidance', icon: BookOpen },
  { id: 'media' as Track, title: 'Presentations & Visuals', subtitle: 'Presentation coaching, infographics, media', icon: FileText },
  { id: 'systems' as Track, title: 'Software & Technical Consulting', subtitle: 'Code reviews, debugging, database guidance', icon: Code2 },
]

export default function IntakeScopePage() {
  const router = useRouter()
  const { track, setTrack, quote, urgency, setUrgency, updateQuote } = useIntake()

  return (
    <IntakeShell current={1} title="Track & scope" subtitle="Pick the service track and shape an instant GHS estimate. You can change everything before you submit.">
      <p className="text-sm font-semibold text-slate-200">Choose a service track</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {tracks.map((item) => {
          const Icon = item.icon
          const selected = item.id === track
          return (
            <button key={item.id} type="button" onClick={() => setTrack(item.id)} aria-pressed={selected} className={`portal-glass portal-glass-hover rounded-2xl p-4 text-left ${selected ? 'border-cyan-300/70 ring-1 ring-cyan-300/40' : ''}`}>
              <span className="flex size-10 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><Icon className="size-5" /></span>
              <strong className="mt-4 block text-sm text-white">{item.title}</strong>
              <span className="mt-1 block text-xs leading-5 text-slate-400">{item.subtitle}</span>
              {selected && <span className="mt-4 flex items-center gap-1 text-[11px] font-bold text-cyan-300"><Check className="size-3" /> Selected</span>}
            </button>
          )
        })}
      </div>

      <QuoteEstimator urgency={urgency} setUrgency={setUrgency} onChange={updateQuote} initial={quote} />
      <ProofSamples />

      <button onClick={() => router.push('/intake/brief')} className="portal-focus mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 font-bold text-slate-950 transition hover:bg-cyan-200">
        Continue to brief <ArrowRight className="size-4" />
      </button>
    </IntakeShell>
  )
}
