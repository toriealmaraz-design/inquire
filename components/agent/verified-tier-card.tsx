'use client'

import { AnimatedHeading } from '@/components/visual/animated-heading'
import { ShieldCheck } from 'lucide-react'
import { agentTier } from '@/lib/commission'

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

/** Paid referrals only: sign-ups never move an agent up the campus ladder. */
export function VerifiedTierCard({ paidReferralCount, paidReferralGhs, loading, error = '' }: { paidReferralCount: number; paidReferralGhs: number; loading: boolean; error?: string }) {
  const tier = agentTier(paidReferralCount)

  return (
    <section className={`${glass} mt-6 rounded-3xl p-5 sm:p-6`} aria-label="Verified campus badge and rank">
      <AnimatedHeading as="h2" className="flex items-center gap-2 font-bold"><ShieldCheck className="size-4 text-emerald-300" /> Verified campus badge</AnimatedHeading>
      <p className="mt-1 text-xs text-slate-500">Rank comes only from referrals that were completed and paid.</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold text-emerald-200"><ShieldCheck className="size-3.5" /> Verified campus agent</span>
        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-bold text-cyan-200">{tier.rank}</span>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading paid referrals…</p>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-rose-300">Paid referral counts are unavailable right now. The rank shown is not confirmed.</p>
      ) : (
        <>
          {tier.paidReferrals === 0 && (
            <p className="mt-4 text-sm text-slate-400">No paid referrals yet. Your rank starts at Scout and changes only when a referred job is completed and paid.</p>
          )}
          <p className="mt-2 text-[11px] text-slate-500">Paid referral commissions: GHS {paidReferralGhs.toFixed(2)}</p>
          <p className="mt-4 text-xs text-slate-400">
            {tier.nextRank
              ? `${tier.paidReferrals} paid referrals · ${tier.remaining} more to reach ${tier.nextRank}`
              : `${tier.paidReferrals} paid referrals · ${tier.rank} is the highest rank`}
          </p>
          <div
            role="progressbar"
            aria-label={tier.nextRank ? `Progress to ${tier.nextRank}` : 'Highest rank reached'}
            aria-valuenow={tier.progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-2 h-2 overflow-hidden rounded-full border border-white/10 bg-black/30"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${tier.progressPercent}%` }} />
          </div>
          <ol className="mt-4 grid grid-cols-3 gap-2">
            {tier.ladder.map((step) => (
              <li key={step.rank} className={`rounded-xl border px-2 py-2 text-center ${step.rank === tier.rank ? 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100' : 'border-white/10 bg-white/5 text-slate-500'}`}>
                <span className="block text-[11px] font-bold">{step.rank}</span>
                <span className="mt-0.5 block text-[10px]">{step.minPaidReferrals === 0 ? 'Starting rank' : `${step.minPaidReferrals}+ paid referrals`}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
