'use client'

import { Flame, Sparkles } from 'lucide-react'
import type { Payout } from '@/components/agent/payout-history'

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

/** Monday-based week number, so `week - 7` is the previous consecutive week. */
function weekKey(date: Date) {
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  return Math.floor(monday.getTime() / 86400000)
}

/** Consecutive weeks with at least one paid referral (client-side only). */
export function payoutStreak(payouts: Payout[]): number {
  const weeks = new Set<number>()
  for (const payout of payouts) {
    if (!payout.date) continue
    const date = new Date(payout.date)
    if (!Number.isNaN(date.getTime())) weeks.add(weekKey(date))
  }
  if (!weeks.size) return 0

  const current = weekKey(new Date())
  // This week counts; last week keeps the streak alive until the next referral.
  let cursor = weeks.has(current) ? current : weeks.has(current - 7) ? current - 7 : -1
  let streak = 0
  while (cursor >= 0 && weeks.has(cursor)) {
    streak++
    cursor -= 7
  }
  return streak
}

export function AgentStreak({ payouts }: { payouts: Payout[] | null }) {
  const streak = payoutStreak(payouts || [])
  return (
    <div className={`${glass} rounded-2xl p-5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">Referral streak</span>
        <Flame className={`size-4 ${streak > 0 ? 'text-orange-300' : 'text-slate-500'}`} />
      </div>
      <p className="mt-4 text-2xl font-bold">{payouts === null ? '…' : `${streak} ${streak === 1 ? 'week' : 'weeks'}`}</p>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">Consecutive weeks with a paid referral</p>
      {streak >= 2 && (
        <span
          title="Temporary streak reward; confirm the boost with an admin"
          className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[11px] font-bold text-amber-200"
        >
          <Sparkles className="size-3" /> +2% commission boost
        </span>
      )}
    </div>
  )
}
