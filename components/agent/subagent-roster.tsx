'use client'

import { useEffect, useState } from 'react'
import { Network } from 'lucide-react'
import { AnimatedHeading } from '@/components/visual/animated-heading'

type Roster = {
  subAgentCount: number
  activeThisWeek: number
  totalOverrideGhs: number
  availableOverrideGhs: number
  agents: { label: string; referrals: number; jobs: number; activeThisWeek: boolean; overrideGhs: number }[]
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

/** Read-only, pseudonymous roster — no client, phone or email data is requested. */
export function SubagentRoster() {
  const [roster, setRoster] = useState<Roster | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/agent/subagents')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Could not load your roster.')
        return data as Roster
      })
      .then(setRoster)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your roster.'))
  }, [])

  return (
    <section className={`${glass} mt-6 rounded-3xl p-5 sm:p-6`} aria-label="Sub-agent roster">
      <AnimatedHeading as="h2" className="flex items-center gap-2 font-bold"><Network className="size-4 text-violet-300" /> My sub-agents</AnimatedHeading>
      <p className="mt-1 text-xs text-slate-500">Two levels only. Agents are shown by anonymous label — their contact details and clients stay private.</p>
      {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
      {!roster && !error && <p className="mt-4 text-sm text-slate-500">Loading…</p>}
      {roster && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['Sub-agents', String(roster.subAgentCount)],
              ['Active this week', String(roster.activeThisWeek)],
              ['Override earned', `GHS ${roster.totalOverrideGhs.toFixed(2)}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] text-slate-500">{label}</p>
                <p className="mt-2 text-lg font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
          {roster.agents.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No sub-agents yet. Share your invite link below to add your first one.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {roster.agents.map((agent, i) => (
                <li key={`${agent.label}-${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-slate-200">
                    {agent.label}
                    {agent.activeThisWeek && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] text-emerald-300">Active this week</span>}
                  </span>
                  <span className="text-slate-400">
                    {agent.referrals} referred · {agent.jobs} jobs · <strong className="text-cyan-200">GHS {agent.overrideGhs.toFixed(2)}</strong> override
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-slate-500">GHS {roster.availableOverrideGhs.toFixed(2)} cleared for payout. Overrides are funded from Gemini Nexus margin, never from specialist pay or your direct commission.</p>
        </>
      )}
    </section>
  )
}
