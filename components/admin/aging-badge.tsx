'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Clock3 } from 'lucide-react'
import { extractDeadline, formatDeadline, type DeadlineSource } from './deadline'

const HOUR = 3_600_000

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Full-word duration: "2 days and 3 hours", never single-letter units. */
function overdue(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000))
  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const restHours = hours % 24
    return `${plural(days, 'day')}${restHours ? ` and ${plural(restHours, 'hour')}` : ''}`
  }
  if (hours > 0) return `${plural(hours, 'hour')}${restMinutes ? ` and ${plural(restMinutes, 'minute')}` : ''}`
  return plural(minutes, 'minute')
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
  if (!deadline && !brief.staleFlag) return null
  const left = deadline === null ? Infinity : deadline - now

  let label: string | null = null
  let tone = ''
  let Icon = Clock3
  if (left < 0) {
    label = `Overdue by ${overdue(-left)}`
    tone = 'animate-pulse motion-reduce:animate-none border-rose-400/50 bg-rose-500/20 text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.35)]'
    Icon = AlertTriangle
  } else if (left < 3 * HOUR) {
    label = 'Under 3 hours left'
    tone = 'animate-pulse motion-reduce:animate-none border-fuchsia-400/50 bg-gradient-to-r from-violet-500/25 to-rose-500/25 text-fuchsia-100 shadow-[0_0_14px_rgba(217,70,239,0.3)]'
    Icon = AlertTriangle
  } else if (left < 12 * HOUR) {
    label = 'Under 12 hours left'
    tone = 'border-amber-300/40 bg-amber-400/15 text-amber-200'
  } else if (left <= 24 * HOUR) {
    label = 'About 1 day left'
    tone = 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
  } else if (deadline !== null) {
    label = 'Over 1 day left'
    tone = 'border-emerald-300/40 bg-emerald-400/15 text-emerald-200'
  }

  return (
    <>
      {label && (
        <span title={deadline === null ? undefined : `Deadline ${formatDeadline(deadline)}`} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tone}`}>
          <Icon className="size-3" /> {label}
        </span>
      )}
      {brief.staleFlag && (
        <span title="Follow up with the client or specialist" className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-200">
          <AlertTriangle className="size-3" /> {brief.staleFlag}
        </span>
      )}
    </>
  )
}
