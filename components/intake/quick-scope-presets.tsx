'use client'

import { BookOpen, Code2, FileText, Wrench, type LucideIcon } from 'lucide-react'
import { quickScopePresets, quoteForPreset, type QuickScopePreset } from './quick-scope'

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
        <p id="quick-scope-title" className="text-sm font-semibold text-slate-200">Start with a quick scope</p>
        <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500">4 presets · everything stays editable</span>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {quickScopePresets.map((preset) => {
          const Icon = icons[preset.id] ?? Code2
          const selected = preset.id === activeId
          return (
            <button key={preset.id} type="button" onClick={() => onSelect(preset)} aria-pressed={selected} className={`portal-glass portal-glass-hover rounded-2xl p-3.5 text-left transition ${selected ? 'border-cyan-300/70 ring-1 ring-cyan-300/40' : ''}`}>
              <span className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 text-cyan-200"><Icon className="size-4" /></span>
                <strong className="text-[13px] font-bold leading-tight text-white">{preset.label}</strong>
              </span>
              <span className="mt-2 block text-[11px] leading-4 text-slate-400">{preset.hint}</span>
              <span className="mt-2 block text-[10px] font-bold text-cyan-300">{quoteForPreset(preset).volume} {quoteForPreset(preset).unit} · {preset.urgency.replace(/\s*\(.*\)/, '')}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
