'use client'

import { AnimatedHeading } from '@/components/visual/animated-heading'
import { Eye } from 'lucide-react'
import { COMMISSION_STAGES, type CommissionStage } from '@/lib/commission'

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

export type CommissionItem = {
  id: number
  ticketId: string
  title: string
  serviceType: string | null
  stage: CommissionStage
  status: string | null
  commissionStatus: string | null
  paidAt: string | null
  clientSignoffAt: string | null
  directCommissionGhs: number
  overrideGhs: number
  referredByMe: boolean
}

/** Ticket-by-ticket accounting with the full four-step lifecycle. */
export function CommissionBreakdown({ items, overridePaidGhs, loading, error = '' }: { items: CommissionItem[]; overridePaidGhs: number; loading: boolean; error?: string }) {
  const referrals = items.filter((item) => item.referredByMe)

  return (
    <section className={`${glass} mt-6 rounded-3xl p-5 sm:p-6`} aria-label="Commission transparency breakdown">
      <AnimatedHeading as="h2" className="flex items-center gap-2 font-bold"><Eye className="size-4 text-violet-300" /> Commission transparency</AnimatedHeading>
      <p className="mt-1 text-xs leading-5 text-slate-500">Follow each referred job from quote to payout. Your direct commission and any two-tier upline override are shown as exact GHS amounts.</p>
      <p className="mt-2 text-[11px] leading-5 text-slate-400">Overrides come only from the Gemini Nexus platform margin — never from specialist pay or the direct agent&apos;s cut.</p>
      <p className="mt-3 rounded-xl border border-violet-300/20 bg-violet-300/5 px-3 py-2 text-xs text-slate-300">Two-tier upline override earned from sub-agent referrals: <strong className="text-violet-200">GHS {overridePaidGhs.toFixed(2)}</strong></p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading your referral breakdown…</p>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-rose-300">Your referral breakdown is unavailable right now. No amounts are shown until it can be verified.</p>
      ) : referrals.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No referrals yet. When a classmate pays for a job you referred, its full journey and commission appear here.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {referrals.map((item) => {
            const step = Math.max(0, COMMISSION_STAGES.indexOf(item.stage))
            return (
              <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white" title={item.title}>{item.title}</span>
                    <span className="text-[11px] text-slate-500"><span className="font-mono text-cyan-300/80">{item.ticketId}</span> · {item.serviceType}</span>
                  </span>
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 text-[11px] font-bold text-cyan-200">{item.stage}</span>
                </div>
                <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {COMMISSION_STAGES.map((label, index) => (
                    <li
                      key={label}
                      aria-current={index === step ? 'step' : undefined}
                      className={`rounded-xl border px-2 py-2 text-[11px] leading-4 ${index <= step ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-white/10 bg-black/20 text-slate-500'}`}
                    >
                      <span className="mr-1 font-mono text-[10px]">{String(index + 1).padStart(2, '0')}</span>{label}
                    </li>
                  ))}
                </ol>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/10 pt-3 text-xs">
                  <span className="text-slate-400">Direct commission <strong className="text-emerald-300">GHS {item.directCommissionGhs.toFixed(2)}</strong></span>
                  <span className="text-slate-400">Two-tier upline override <strong className="text-violet-300">GHS {item.overrideGhs.toFixed(2)}</strong></span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
