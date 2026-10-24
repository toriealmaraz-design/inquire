'use client'

import { useEffect, useState } from 'react'
import { Trophy, ArrowUpCircle } from 'lucide-react'
import { fieldLabel } from '@/lib/fields'

type Entry = {
  rank: number
  id: number
  name: string
  avatar: string | null
  field: string | null
  paidJobs: number
  inProgress: number
  referrals: number
  earned?: number
  isMe: boolean
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const MEDALS = ['text-amber-300', 'text-slate-200', 'text-orange-400']

// Promotion gives the basic admin role (fewer privileges than field leads)
const PROMOTED = { role: 'admin', label: 'Admin' }

export function Leaderboard({ compact = false }: { compact?: boolean }) {
  const [period, setPeriod] = useState<'month' | 'all'>('month')
  const [board, setBoard] = useState<Entry[]>([])
  const [canPromote, setCanPromote] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [notice, setNotice] = useState('')

  const load = (p: 'month' | 'all') => {
    setLoading(true)
    fetch(`/api/leaderboard?period=${p}`)
      .then((r) => (r.ok ? r.json() : { board: [] }))
      .then((d) => {
        setBoard(d.board || [])
        setCanPromote(!!d.canPromote)
      })
      .catch(() => setBoard([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => load(period), [period])

  const promote = async (e: Entry) => {
    const target = PROMOTED
    if (!window.confirm(`Promote ${e.name} to ${target.label}? They'll be able to chat with clients, see briefs and files, and assign jobs.`)) return
    setBusy(e.id)
    setNotice('')
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id, role: target.role }),
    })
    setBusy(null)
    if (res.ok) {
      setNotice(`${e.name} is now ${target.label}.`)
      load(period)
    } else {
      setNotice('Could not promote. Please try again.')
    }
  }

  const shown = compact ? board.slice(0, 5) : board

  return (
    <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold"><Trophy className="size-4 text-amber-300" /> Agent leaderboard</h2>
          <p className="mt-1 text-xs text-slate-500">Ranked by paid jobs, then commission, then referrals. The top 3 can be promoted to admin.</p>
        </div>
        <div className="flex rounded-xl bg-white/5 p-1 text-xs">
          {(['month', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 ${period === p ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {p === 'month' ? 'This month' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {notice && <p className="mt-3 text-xs text-emerald-300">{notice}</p>}

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">No active agents yet.</p>
      ) : (
        <ol className="mt-5 flex flex-col gap-2">
          {shown.map((e) => {
            const top3 = e.rank <= 3 && e.paidJobs > 0
            return (
              <li
                key={e.id}
                className={`flex flex-wrap items-center gap-3 rounded-2xl border p-3 ${
                  e.isMe ? 'border-cyan-400/40 bg-cyan-400/10' : top3 ? 'border-amber-300/20 bg-amber-300/[0.06]' : 'border-white/10 bg-white/5'
                }`}
              >
                <span className={`w-8 text-center text-lg font-bold ${top3 ? MEDALS[e.rank - 1] : 'text-slate-500'}`}>
                  {top3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : e.rank}
                </span>
                {e.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.avatar} alt="" className="size-9 rounded-full object-cover" />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-xs font-bold">
                    {e.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{e.name}{e.isMe && <span className="ml-2 text-[11px] text-cyan-300">You</span>}</p>
                  <p className="text-[11px] text-slate-500">{fieldLabel(e.field)}</p>
                </div>
                <div className="flex gap-4 text-center text-[11px] text-slate-400">
                  <span><strong className="block text-sm text-white">{e.paidJobs}</strong>paid</span>
                  <span><strong className="block text-sm text-white">{e.inProgress}</strong>active</span>
                  <span><strong className="block text-sm text-white">{e.referrals}</strong>referrals</span>
                  {e.earned !== undefined && <span><strong className="block text-sm text-emerald-300">GHS {e.earned.toFixed(0)}</strong>earned</span>}
                </div>
                {canPromote && top3 && (
                  <button
                    onClick={() => promote(e)}
                    disabled={busy === e.id}
                    className="flex items-center gap-1 rounded-lg bg-amber-300/20 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-300/30 disabled:opacity-50"
                  >
                    <ArrowUpCircle className="size-3.5" /> Promote
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
