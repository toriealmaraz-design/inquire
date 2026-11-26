'use client'

import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const ghs = (n: number) => `GHS ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const clamp = (value: string) => Math.min(100, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0))

/** Client-only what-if. Referral % starts from the loaded Settings value when available. */
export function MarginSimulator({ commissionPercent }: { commissionPercent?: string | number | null }) {
  const configured = Number(commissionPercent)
  const [quote, setQuote] = useState('1000')
  const [specialist, setSpecialist] = useState('70')
  const [referral, setReferral] = useState(
    Number.isFinite(configured) && configured > 0 ? String(configured) : '10',
  )

  const price = Math.max(0, Number(quote) || 0)
  const specialistFee = (price * clamp(specialist)) / 100
  const referralFee = (price * clamp(referral)) / 100
  const net = Math.max(0, price - specialistFee - referralFee)
  const over = clamp(specialist) + clamp(referral) > 100

  const field = 'h-10 w-full rounded-xl border border-white/10 bg-[#0a0f1c]/80 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60'

  return (
    <section className={`${glass} rounded-3xl p-5 sm:p-6`} aria-labelledby="margin-simulator-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300"><Calculator className="size-3.5" /> Margin simulator</p>
          <AnimatedHeading as="h2" id="margin-simulator-title" className="mt-1 text-base font-bold">Quote → platform net</AnimatedHeading>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-400">Client-side only</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <label className="text-[11px] font-semibold text-slate-400">
          Client quote (GHS)
          <input type="number" min="0" step="1" inputMode="decimal" value={quote} onChange={(e) => setQuote(e.target.value)} className={`mt-1.5 ${field}`} />
        </label>
        <label className="text-[11px] font-semibold text-slate-400">
          Specialist fee (%)
          <input type="number" min="0" max="100" step="0.5" value={specialist} onChange={(e) => setSpecialist(e.target.value)} className={`mt-1.5 ${field}`} />
        </label>
        <label className="text-[11px] font-semibold text-slate-400">
          Referral commission (%)
          <input type="number" min="0" max="100" step="0.5" value={referral} onChange={(e) => setReferral(e.target.value)} className={`mt-1.5 ${field}`} />
        </label>
      </div>

      <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs">
        <div className="flex justify-between"><dt className="text-slate-400">Quote received</dt><dd className="font-semibold text-white">{ghs(price)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-400">Specialist fee ({clamp(specialist)}%)</dt><dd className="text-rose-200">− {ghs(specialistFee)}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-400">Referral commission ({clamp(referral)}%)</dt><dd className="text-amber-200">− {ghs(referralFee)}</dd></div>
        <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm"><dt className="font-bold text-slate-200">Platform net margin</dt><dd className={`font-bold ${net ? 'text-emerald-300' : 'text-slate-400'}`}>{ghs(net)}</dd></div>
      </dl>
      <p className="mt-3 text-[10px] text-slate-500">
        {configured ? 'Referral % prefilled from Settings.' : 'Using a 10% referral default — open Settings to load the saved rate.'}
        {over && <span className="ml-1 text-rose-300">Fees exceed the quote; net is floored at zero.</span>}
      </p>
    </section>
  )
}
