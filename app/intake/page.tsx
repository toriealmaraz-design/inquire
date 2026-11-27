'use client'

import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, Check, Code2, FileText } from 'lucide-react'
import { IntakeShell } from '@/components/intake/intake-shell'
import { ProofSamples } from '@/components/intake/proof-samples'
import { QuickScopePresets } from '@/components/intake/quick-scope-presets'
import { activeQuickScope } from '@/components/intake/quick-scope'
import { QuoteEstimator } from '@/components/quote-estimator'
import { useIntake, type Track } from './provider'

const tracks = [
  { id: 'academic' as Track, title: 'Research and Learning', subtitle: 'Methods coaching, editing, citation guidance', icon: BookOpen },
  { id: 'media' as Track, title: 'Presentations and Visuals', subtitle: 'Presentation coaching, infographics, media', icon: FileText },
  { id: 'systems' as Track, title: 'Software and Technical Consulting', subtitle: 'Code reviews, debugging, database guidance', icon: Code2 },
]

export default function IntakeScopePage() {
  const router = useRouter()
  const { track, setTrack, quote, urgency, setUrgency, updateQuote, applyQuickScope, deliverables } = useIntake()

  return (
    <IntakeShell current={1} title="Track and scope" subtitle="Pick a quick scope or choose your track, then shape a guided GHS estimate. You can change everything before you submit.">
      <QuickScopePresets activeId={activeQuickScope(quote)} onSelect={applyQuickScope} />

      <p className="mt-8 text-sm font-semibold text-[#F8FAFC]">Choose a service track</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {tracks.map((item) => {
          const Icon = item.icon
          const selected = item.id === track
          return (
            <button key={item.id} type="button" onClick={() => setTrack(item.id)} aria-pressed={selected} className={`portal-glass portal-glass-hover rounded-2xl p-4 text-left ${selected ? 'border-[#00F0FF]/70 ring-1 ring-[#00F0FF]/40' : ''}`}>
              <span className="flex size-10 items-center justify-center rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#00F0FF]/10 text-[#00F0FF]"><Icon className="size-5" /></span>
              <strong className="mt-4 block text-sm text-[#F8FAFC]">{item.title}</strong>
              <span className="mt-1 block text-xs leading-5 text-[#94A3B8]">{item.subtitle}</span>
              {selected && <span className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#00F0FF]"><Check className="size-3" /> Selected</span>}
            </button>
          )
        })}
      </div>

      <QuoteEstimator urgency={urgency} setUrgency={setUrgency} onChange={updateQuote} initial={quote} deliverables={deliverables} />
      <ProofSamples />

      <button onClick={() => router.push('/intake/brief')} className="portal-focus mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#00F0FF] font-bold text-[#060B14] transition hover:bg-[#F8FAFC]">
        Continue to brief <ArrowRight className="size-4" />
      </button>
    </IntakeShell>
  )
}
