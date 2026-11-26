'use client'

import { useState } from 'react'
import { Check, Copy, Link2 } from 'lucide-react'

const PRESETS = [
  { cat: 'code', label: 'Code', hint: 'Programming & systems' },
  { cat: 'slides', label: 'Slides', hint: 'Presentations & decks' },
  { cat: 'research', label: 'Research', hint: 'Academic research' },
  { cat: 'general', label: 'General', hint: 'Everything else' },
] as const

/** One-tap copyable /intake deep links for each service category. */
export function PromoLinks({ code, origin }: { code: string; origin: string }) {
  const [copied, setCopied] = useState('')

  const copy = async (cat: string) => {
    if (!code) return
    const link = `${origin}/intake?ref=${encodeURIComponent(code)}&cat=${cat}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(cat)
      window.setTimeout(() => setCopied(''), 2000)
    } catch {
      window.prompt('Copy your promo link:', link)
    }
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Link2 className="size-3.5 text-cyan-300" /> Course-specific promo links</p>
      <p className="mt-1 text-[11px] text-slate-500">Each link carries your referral code {code || '—'} and pre-selects a category.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.cat}
            type="button"
            onClick={() => copy(preset.cat)}
            disabled={!code}
            title={`Copy /intake?ref=${code}&cat=${preset.cat}`}
            className="flex flex-col items-start rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-cyan-300/40 hover:bg-cyan-300/10 disabled:opacity-50"
          >
            <span className="flex w-full items-center justify-between gap-2 text-xs font-bold text-white">
              {preset.label}
              {copied === preset.cat ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5 text-slate-500" />}
            </span>
            <span className="mt-1 truncate font-mono text-[10px] text-cyan-300/70">cat={preset.cat}</span>
            <span className="mt-0.5 truncate text-[10px] text-slate-600">{copied === preset.cat ? 'Copied!' : preset.hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
