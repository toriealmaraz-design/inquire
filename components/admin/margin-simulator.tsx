'use client'

import { useState } from 'react'
import { Calculator } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'
import { OVERRIDE_RATE, netMargin, subAgentOverride } from '@/lib/commission'

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
  const [override, setOverride] = useState(String(OVERRIDE_RATE * 100))

  const price = Math.max(0, Number(quote) || 0)
  const specialistFee = (price * clamp(specialist)) / 100
  const directAgentCut = (price * clamp(referral)) / 100
  const net = netMargin(price, specialistFee, directAgentCut)
  const platformOverride = subAgentOverride(net)
  // The input is for planning; the stored platform rule is OVERRIDE_RATE.
  const overrideFee = clamp(override) === OVERRIDE_RATE * 100
    ? platformOverride
    : Math.round((net * clamp(override)) / 100 * 100) / 100
  const platformMargin = Math.max(0, Math.round((net - overrideFee) * 100) / 100)
  const required = Math.round(price * OVERRIDE_RATE * 100) / 100
  const healthy = platformMargin > 0 && platformMargin >= required
  const over = clamp(specialist) + clamp(referral) > 100

  const field = 'h-10 w-full rounded-xl border border-white/10 bg-[#0A0F1C]/80 px-3 text-sm text-[#F8FAFC] outline-none placeholder:text-[#94A3B8]/70 focus:border-[#00F0FF]/60'

  return (
    <section className={`${glass} rounded-3xl p-5 sm:p-6`} aria-labelledby="margin-simulator-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#00F0FF]"><Calculator className="size-3.5" /> Margin simulator</p>
          <AnimatedHeading as="h2" id="margin-simulator-title" className="mt-1 text-base font-bold">Quote to platform net margin</AnimatedHeading>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-[#94A3B8]">Client-side only</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-[11px] font-semibold text-[#94A3B8]">
          Client quote (GHS)
          <input type="number" min="0" step="1" inputMode="decimal" value={quote} onChange={(e) => setQuote(e.target.value)} className={`mt-1.5 ${field}`} />
        </label>
        <label className="text-[11px] font-semibold text-[#94A3B8]">
          Specialist fee (percent of quote)
          <input type="number" min="0" max="100" step="0.5" value={specialist} onChange={(e) => setSpecialist(e.target.value)} className={`mt-1.5 ${field}`} />
        </label>
        <label className="text-[11px] font-semibold text-[#94A3B8]">
          Direct agent cut (percent of quote)
          <input type="number" min="0" max="100" step="0.5" value={referral} onChange={(e) => setReferral(e.target.value)} className={`mt-1.5 ${field}`} />
        </label>
        <label className="text-[11px] font-semibold text-[#94A3B8]">
          Sub-agent override (percent of net margin)
          <input type="number" min="0" max="100" step="0.5" value={override} onChange={(e) => setOverride(e.target.value)} className={`mt-1.5 ${field}`} />
        </label>
      </div>

      <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs">
        <div className="flex justify-between"><dt className="text-[#94A3B8]">Quote received</dt><dd className="font-semibold text-[#F8FAFC]">{ghs(price)}</dd></div>
        <div className="flex justify-between"><dt className="text-[#94A3B8]">Specialist fee ({clamp(specialist)} percent)</dt><dd className="text-rose-200">− {ghs(specialistFee)}</dd></div>
        <div className="flex justify-between"><dt className="text-[#94A3B8]">Direct agent cut ({clamp(referral)} percent)</dt><dd className="text-amber-200">− {ghs(directAgentCut)}</dd></div>
        <div className="flex justify-between"><dt className="text-[#94A3B8]">Sub-agent override ({clamp(override)} percent of net margin)</dt><dd className="text-violet-200">− {ghs(overrideFee)}</dd></div>
        <div className="flex items-center justify-between border-t border-white/10 pt-2 text-sm"><dt className="font-bold text-[#F8FAFC]">Platform net margin</dt><dd className={`font-bold ${healthy ? 'text-emerald-300' : 'text-rose-300'}`}>{ghs(platformMargin)}</dd></div>
        <div className="flex justify-between text-[11px]"><dt className="text-[#94A3B8]">Required minimum ({Math.round(OVERRIDE_RATE * 100)} percent of the quote)</dt><dd className="text-[#94A3B8]">{ghs(required)}</dd></div>
      </dl>

      <p className="mt-3 text-[11px] leading-5 text-[#94A3B8]">
        Quote guardrail: the specialist fee, the direct agent cut and the sub-agent override must leave a positive platform margin of at least {Math.round(OVERRIDE_RATE * 100)} percent of the client quote.
        {configured ? ' The direct agent cut is prefilled from Settings.' : ' The direct agent cut uses a 10 percent default until Settings loads.'}
        {clamp(override) !== OVERRIDE_RATE * 100 && ' The override input above is for planning only; saved quotes always use the fixed platform rate.'}
        {over && <span className="ml-1 text-rose-300">Fees exceed the quote; the net margin is floored at zero.</span>}
        {!healthy && !over && <span className="ml-1 text-rose-300">This quote would be rejected.</span>}
      </p>
    </section>
  )
}
