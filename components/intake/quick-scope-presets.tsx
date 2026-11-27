'use client'

import { BookOpen, Code2, FileText, Wrench, type LucideIcon } from 'lucide-react'
import { quickScopePresets, quoteForPreset, type QuickScopePreset } from './quick-scope'
import { urgencyLabel } from './trust-terms'

const icons: Record<string, LucideIcon> = {
  'code-fix': Code2,
  research: BookOpen,
  slides: FileText,
  system: Wrench,
}

/** Four fast starting points layered on top of the full intake — never a replacement for it. */
export function QuickScopePresets({ activeId, onSelect }: { activeId: string; onSelect: (preset: QuickScopePreset) => void }) {
  return (
    <section aria-labelledby="quick-scope-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id="quick-scope-title" className="text-sm font-semibold text-[#F8FAFC]">Start with a quick scope</p>
        <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#94A3B8]">Four starting points · everything stays editable</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {quickScopePresets.map((preset) => {
          const Icon = icons[preset.id] ?? Code2
          const selected = preset.id === activeId
          return (
            <button key={preset.id} type="button" onClick={() => onSelect(preset)} aria-pressed={selected} className={`portal-glass portal-glass-hover rounded-2xl p-3.5 text-left transition ${selected ? 'border-[#00F0FF]/70 ring-1 ring-[#00F0FF]/40' : ''}`}>
              <span className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg border border-[rgba(0,240,255,0.14)] bg-[#00F0FF]/10 text-[#00F0FF]"><Icon className="size-4" /></span>
                <strong className="text-[13px] font-bold leading-tight text-[#F8FAFC]">{preset.label}</strong>
              </span>
              <span className="mt-2 block text-[11px] leading-4 text-[#94A3B8]">{preset.hint}</span>
              <span className="mt-2 block text-[10px] font-bold leading-4 text-[#00F0FF]">{quoteForPreset(preset).volume} {quoteForPreset(preset).unit} · {urgencyLabel(preset.urgency)}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
