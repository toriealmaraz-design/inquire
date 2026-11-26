'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock3 } from 'lucide-react'
import { extractDeadline, formatDeadline, type DeadlineSource } from './deadline'

const HOUR = 3_600_000

function overdue(ms: number) {
  const hours = Math.floor(ms / HOUR)
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`
  if (hours > 0) return `${hours}h`
  return `${Math.max(1, Math.ceil(ms / 60_000))}m`
}

/** Ticket aging badge. Silent when there is no parseable deadline or the job is paid. */
export function AgingBadge({ brief }: { brief: DeadlineSource }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  if (brief.paidAt) return null
  const deadline = extractDeadline(brief)
  if (!deadline) return null
  const left = deadline - now

  let label: string
  let tone: string
  let Icon = Clock3
  if (left < 0) {
    label = `Overdue ${overdue(-left)}`
    tone = 'animate-pulse border-rose-400/50 bg-rose-500/20 text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.35)]'
    Icon = AlertTriangle
  } else if (left < 3 * HOUR) {
    label = '<3h left'
    tone = 'animate-pulse border-fuchsia-400/50 bg-gradient-to-r from-violet-500/25 to-rose-500/25 text-fuchsia-100 shadow-[0_0_14px_rgba(217,70,239,0.3)]'
    Icon = AlertTriangle
  } else if (left < 12 * HOUR) {
    label = '<12h left'
    tone = 'border-amber-300/40 bg-amber-400/15 text-amber-200'
  } else if (left <= 24 * HOUR) {
    label = '~1d left'
    tone = 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
  } else {
    label = '>24h left'
    tone = 'border-emerald-300/40 bg-emerald-400/15 text-emerald-200'
  }

  return (
    <span title={`Deadline ${formatDeadline(deadline)}`} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>
      <Icon className="size-3" /> {label}
    </span>
  )
}
