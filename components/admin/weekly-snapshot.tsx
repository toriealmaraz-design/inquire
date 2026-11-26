'use client'

import { useMemo } from 'react'
import { ArrowRight } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const ghs = (n: number) => `GHS ${n.toLocaleString('en-GB', { maximumFractionDigits: n >= 100 ? 0 : 2 })}`

type SnapshotBrief = {
  createdAt?: string | null
  assignedTo?: number | null
  priceGhs?: string | null
  paidAt?: string | null
  commissionGhs?: string | null
}

/** Seven-day revenue + conversion strip built from the submissions already loaded in the dashboard. */
export function WeeklySnapshot({ briefs, commissionPercent }: { briefs: SnapshotBrief[]; commissionPercent?: string | number | null }) {
  const snap = useMemo(() => {
    const cutoff = Date.now() - 7 * 86_400_000
    const week = briefs.filter((b) => {
      const ts = b.createdAt ? Date.parse(b.createdAt) : NaN
      return Number.isFinite(ts) && ts >= cutoff
    })
    const accepted = week.filter((b) => !!b.assignedTo && Number(b.priceGhs) > 0)
    const paid = week.filter((b) => !!b.paidAt)
    const gross = paid.reduce((sum, b) => sum + Number(b.priceGhs || 0), 0)
    const savedRate = Number(commissionPercent)
    const fallback = Number.isFinite(savedRate) && savedRate >= 0 ? savedRate / 100 : 0.1
    const commission = paid.reduce((sum, b) => {
      const explicit = Number(b.commissionGhs)
      return sum + (Number.isFinite(explicit) && explicit > 0 ? explicit : Number(b.priceGhs || 0) * fallback)
    }, 0)
    return {
      briefs: week.length,
      accepted: accepted.length,
      paid: paid.length,
      gross,
      net: Math.max(0, gross - commission),
      acceptRate: week.length ? Math.round((accepted.length / week.length) * 100) : 0,
      payRate: accepted.length ? Math.round((paid.length / accepted.length) * 100) : 0,
    }
  }, [briefs, commissionPercent])

  const cells = [
    { label: 'Briefs', value: String(snap.briefs), sub: 'submitted this week', tone: 'text-cyan-200' },
    { label: 'Quotes accepted', value: String(snap.accepted), sub: `${snap.acceptRate}% of briefs`, tone: 'text-violet-200' },
    { label: 'Paid', value: String(snap.paid), sub: `${snap.payRate}% of accepted`, tone: 'text-amber-200' },
    { label: 'Gross GHS', value: ghs(snap.gross), sub: 'paid jobs only', tone: 'text-white' },
    { label: 'Net margin', value: ghs(snap.net), sub: 'after commissions', tone: 'text-emerald-300' },
  ]

  return (
    <section className={`${glass} rounded-3xl p-5 sm:p-6`} aria-label="Weekly revenue and conversion snapshot">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <AnimatedHeading as="h2" className="text-base font-bold">This week at a glance</AnimatedHeading>
        <p className="text-[10px] uppercase tracking-[.16em] text-slate-500">Briefs → accepted → paid → GHS → net</p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-5">
        {cells.map((cell, index) => (
          <div key={cell.label} className="flex items-center gap-2">
            <div className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="truncate text-[10px] uppercase tracking-wider text-slate-500">{cell.label}</p>
              <p className={`mt-1 truncate text-lg font-bold tracking-tight ${cell.tone}`}>{cell.value}</p>
              <p className="truncate text-[10px] text-slate-500">{cell.sub}</p>
            </div>
            {index < cells.length - 1 && <ArrowRight className="hidden size-3 shrink-0 text-cyan-300/40 sm:block" />}
          </div>
        ))}
      </div>
    </section>
  )
}
