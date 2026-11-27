'use client'

import { AnimatedHeading } from '@/components/visual/animated-heading'
import { BadgeCheck } from 'lucide-react'

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

/** One honest network counter: paid referrals, active sub-agents and paid GHS. */
export function VerifiedNetwork({ paidReferralCount, activeSubAgents, totalPaidGhs, loading, error = '' }: {
  paidReferralCount: number
  activeSubAgents: number
  totalPaidGhs: number
  loading: boolean
  error?: string
}) {
  const stats = [
    ['Paid referrals', error ? '—' : loading ? '…' : String(paidReferralCount)],
    ['Active sub-agents', error ? '—' : loading ? '…' : String(activeSubAgents)],
    ['Total paid', error ? '—' : loading ? '…' : `GHS ${totalPaidGhs.toFixed(2)}`],
  ]
  return (
    <section className={`${glass} mt-6 rounded-3xl p-5 sm:p-6`} aria-label="Verified network">
      <AnimatedHeading as="h2" className="flex items-center gap-2 font-bold"><BadgeCheck className="size-4 text-cyan-300" /> Verified network</AnimatedHeading>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] text-slate-500">{label}</p>
            <p className="mt-2 text-lg font-bold text-white">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-500">Paid referrals are completed jobs only. Active sub-agents are those with network activity in the last seven days.</p>
    </section>
  )
}
