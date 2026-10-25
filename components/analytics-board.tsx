'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, BellRing, Bot, Clock, FileText, MessageCircle, RefreshCw, TrendingDown, TrendingUp, Trophy, UserCheck, Users, Wallet } from 'lucide-react'
import { fieldLabel } from '@/lib/fields'

type Data = {
  totals: Record<string, number>
  money: Record<string, number>
  timing: { hoursToAssign: number | null; hoursToPaid: number | null }
  daily: { day: string; briefs: number; revenue: number }[]
  byField: { field: string; briefs: number; revenue: number }[]
  urgency: { urgency: string; n: number }[]
  chats: Record<string, number | null>
  staff: Record<string, number>
  topAgents: { name: string; paid: number; active: number; earned: number }[]
  misses: { question: string; hits: number }[]
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const ghs = (n: number) => `GHS ${n.toLocaleString('en-GB', { maximumFractionDigits: n >= 100 ? 0 : 2 })}`
const hours = (h: number | null) => (h === null ? '—' : h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`)
const FIELD_COLORS: Record<string, string> = { academic: 'bg-cyan-400', media: 'bg-violet-400', systems: 'bg-emerald-400' }

function Delta({ now, prev }: { now: number; prev: number }) {
  if (!prev && !now) return <span className="text-[11px] text-slate-500">no change</span>
  if (!prev) return <span className="text-[11px] text-emerald-300">new</span>
  const pct = Math.round(((now - prev) / prev) * 100)
  const up = pct >= 0
  return (
    <span className={`flex items-center gap-0.5 text-[11px] ${up ? 'text-emerald-300' : 'text-rose-300'}`}>
      {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} {up ? '+' : ''}{pct}% vs previous
    </span>
  )
}

function Kpi({ label, value, sub, icon: Icon, tone }: { label: string; value: string; sub?: React.ReactNode; icon: typeof Activity; tone: string }) {
  return (
    <div className={`${glass} rounded-2xl p-5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">{label}</span>
        <Icon className={`size-4 ${tone}`} />
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      <div className="mt-1 min-h-4">{sub}</div>
    </div>
  )
}

export function AnalyticsBoard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [metric, setMetric] = useState<'briefs' | 'revenue'>('briefs')
  const [hover, setHover] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/analytics', { cache: 'no-store' })
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not load analytics.')
        setData(d)
        setError('')
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load analytics.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const series = useMemo(() => (data ? data.daily.map((d) => (metric === 'briefs' ? d.briefs : d.revenue)) : []), [data, metric])
  const max = Math.max(1, ...series)

  if (error) return <p role="alert" className="mt-8 rounded-2xl border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-rose-200">{error}</p>
  if (!data) return <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className={`${glass} h-28 animate-pulse rounded-2xl`} />)}</div>

  const { totals: t, money: m, staff: s, chats: c } = data
  const conversion = t.total ? Math.round((t.paid / t.total) * 100) : 0
  const pipeline = [
    { label: 'Open', n: t.open, color: 'bg-amber-400' },
    { label: 'Assigned', n: t.assigned, color: 'bg-cyan-400' },
    { label: 'Paid', n: t.paid, color: 'bg-emerald-400' },
  ]
  const fieldMax = Math.max(1, ...data.byField.map((f) => f.briefs))
  const urgencyTotal = data.urgency.reduce((a, u) => a + u.n, 0) || 1
  const hovered = hover !== null ? data.daily[hover] : null

  return (
    <div className="mt-8 flex flex-col gap-5">
      {/* Alerts that need action */}
      {(s.pending > 0 || t.open > 0 || (c.unread || 0) > 0) && (
        <div className="flex flex-wrap gap-2">
          {s.pending > 0 && <button onClick={() => onNavigate?.('User Management')} className="flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-xs text-amber-100 hover:bg-amber-300/20"><UserCheck className="size-4" /> {s.pending} signup{s.pending === 1 ? '' : 's'} waiting for approval</button>}
          {t.open > 0 && <button onClick={() => onNavigate?.('Submissions')} className="flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-300/20"><FileText className="size-4" /> {t.open} brief{t.open === 1 ? '' : 's'} not assigned yet</button>}
          {(c.unread || 0) > 0 && <button onClick={() => onNavigate?.('Chats')} className="flex items-center gap-2 rounded-xl border border-rose-300/30 bg-rose-300/10 px-3 py-2 text-xs text-rose-100 hover:bg-rose-300/20"><MessageCircle className="size-4" /> {c.unread} unread client message{c.unread === 1 ? '' : 's'}</button>}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenue this month" value={ghs(m.revenue_month)} sub={<Delta now={m.revenue_month} prev={m.revenue_prev_month} />} icon={Wallet} tone="text-emerald-300" />
        <Kpi label="Briefs (30 days)" value={String(t.last30)} sub={<Delta now={t.last30} prev={t.prev30} />} icon={FileText} tone="text-cyan-300" />
        <Kpi label="Pipeline (assigned, unpaid)" value={ghs(m.pipeline)} sub={<span className="text-[11px] text-slate-500">{t.assigned} job{t.assigned === 1 ? '' : 's'} in progress</span>} icon={Activity} tone="text-violet-300" />
        <Kpi label="Conversion to paid" value={`${conversion}%`} sub={<span className="text-[11px] text-slate-500">{t.paid} of {t.total} briefs · avg {ghs(m.avg_price)}</span>} icon={TrendingUp} tone="text-amber-300" />
      </div>

      {/* Trend chart */}
      <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Last 30 days</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {hovered ? `${new Date(hovered.day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}: ${hovered.briefs} brief${hovered.briefs === 1 ? '' : 's'} · ${ghs(hovered.revenue)} paid` : 'Hover or tap a bar for the day’s numbers'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-white/5 p-1 text-xs">
              {(['briefs', 'revenue'] as const).map((k) => (
                <button key={k} onClick={() => setMetric(k)} className={`rounded-lg px-3 py-1.5 capitalize ${metric === k ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>{k}</button>
              ))}
            </div>
            <button onClick={load} aria-label="Refresh" className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
        <div className="mt-5 flex h-40 items-end gap-[3px]" onMouseLeave={() => setHover(null)}>
          {series.map((v, i) => (
            <button
              key={data.daily[i].day}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onClick={() => setHover(i)}
              aria-label={`${data.daily[i].day}: ${v}`}
              className="group relative flex h-full flex-1 items-end"
            >
              <span
                className={`w-full rounded-t-md transition-all ${hover === i ? 'bg-cyan-300' : metric === 'briefs' ? 'bg-cyan-500/60 group-hover:bg-cyan-400' : 'bg-emerald-500/60 group-hover:bg-emerald-400'}`}
                style={{ height: `${v ? Math.max(4, (v / max) * 100) : 2}%` }}
              />
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-slate-600">
          <span>{new Date(data.daily[0].day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          <span>Today</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Pipeline */}
        <div className={`${glass} rounded-3xl p-5`}>
          <h3 className="font-bold">Job pipeline</h3>
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-white/5">
            {pipeline.map((p) => p.n > 0 && <span key={p.label} className={p.color} style={{ width: `${(p.n / Math.max(1, t.total)) * 100}%` }} />)}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {pipeline.map((p) => (
              <li key={p.label} className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-300"><span className={`size-2.5 rounded-full ${p.color}`} />{p.label}</span><strong>{p.n}</strong></li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-xs text-slate-400">
            <span><Clock className="mr-1 inline size-3" />To assign: <strong className="text-white">{hours(data.timing.hoursToAssign)}</strong></span>
            <span><Clock className="mr-1 inline size-3" />To paid: <strong className="text-white">{hours(data.timing.hoursToPaid)}</strong></span>
          </div>
        </div>

        {/* By field */}
        <div className={`${glass} rounded-3xl p-5`}>
          <h3 className="font-bold">By service track</h3>
          {data.byField.length === 0 ? <p className="mt-4 text-sm text-slate-500">No briefs yet.</p> : (
            <ul className="mt-4 space-y-3">
              {data.byField.map((f) => (
                <li key={f.field}>
                  <div className="flex justify-between text-xs"><span className="text-slate-300">{fieldLabel(f.field)}</span><span className="text-slate-400">{f.briefs} · {ghs(f.revenue)}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${FIELD_COLORS[f.field] || 'bg-slate-400'}`} style={{ width: `${(f.briefs / fieldMax) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
          <h4 className="mt-5 text-xs font-semibold text-slate-400">Urgency mix</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.urgency.map((u) => <span key={u.urgency} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">{u.urgency} {Math.round((u.n / urgencyTotal) * 100)}%</span>)}
          </div>
        </div>

        {/* Money */}
        <div className={`${glass} rounded-3xl p-5`}>
          <h3 className="font-bold">Money</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex justify-between"><span className="text-slate-400">Revenue (all time)</span><strong>{ghs(m.revenue)}</strong></li>
            <li className="flex justify-between"><span className="text-slate-400">Last month</span><strong>{ghs(m.revenue_prev_month)}</strong></li>
            <li className="flex justify-between"><span className="text-slate-400">Commissions earned</span><strong className="text-emerald-300">{ghs(m.commissions_earned)}</strong></li>
            <li className="flex justify-between"><span className="text-slate-400">Commissions pending</span><strong className="text-amber-300">{ghs(m.commissions_pending)}</strong></li>
            <li className="flex justify-between"><span className="text-slate-400">Briefs from referrals</span><strong>{t.referred}</strong></li>
          </ul>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Chat */}
        <div className={`${glass} rounded-3xl p-5`}>
          <h3 className="flex items-center gap-2 font-bold"><MessageCircle className="size-4 text-cyan-300" /> Live chat</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            {[
              ['Conversations', c.conversations],
              ['Active (7d)', c.active7],
              ['Messages (7d)', c.messages7],
              ['First reply', c.firstResponseMinutes === null ? '—' : `${c.firstResponseMinutes} min`],
            ].map(([l, v]) => <div key={l as string} className="rounded-xl bg-white/5 p-3"><p className="text-lg font-bold">{v as string}</p><p className="text-[11px] text-slate-500">{l}</p></div>)}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400"><Bot className="size-3.5" /> {c.bot_replies30} auto-replies sent in 30 days</p>
        </div>

        {/* Team */}
        <div className={`${glass} rounded-3xl p-5`}>
          <h3 className="flex items-center gap-2 font-bold"><Users className="size-4 text-violet-300" /> Team</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li className="flex justify-between"><span className="text-slate-400">Active agents</span><strong>{s.agents}</strong></li>
            <li className="flex justify-between"><span className="text-slate-400">Admins &amp; leads</span><strong>{s.admins}</strong></li>
            <li className="flex justify-between"><span className="text-slate-400">Waiting for approval</span><strong className={s.pending ? 'text-amber-300' : ''}>{s.pending}</strong></li>
            <li className="flex justify-between"><span className="text-slate-400">Questionnaire not done</span><strong>{s.not_onboarded}</strong></li>
            <li className="flex justify-between"><span className="flex items-center gap-1 text-slate-400"><BellRing className="size-3.5" /> Push notifications on</span><strong>{s.push_enabled}</strong></li>
          </ul>
          <h4 className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-slate-400"><Trophy className="size-3.5 text-amber-300" /> Top performers</h4>
          {data.topAgents.length === 0 ? <p className="mt-2 text-xs text-slate-500">No assigned jobs yet.</p> : (
            <ol className="mt-2 space-y-1.5 text-xs">
              {data.topAgents.map((a, i) => <li key={a.name} className="flex justify-between"><span className="text-slate-300">{i + 1}. {a.name}</span><span className="text-slate-400">{a.paid} paid · {a.active} active</span></li>)}
            </ol>
          )}
        </div>

        {/* Chatbot gaps */}
        <div className={`${glass} rounded-3xl p-5`}>
          <h3 className="flex items-center gap-2 font-bold"><AlertTriangle className="size-4 text-amber-300" /> Chatbot gaps</h3>
          <p className="mt-1 text-xs text-slate-500">Questions clients asked that the bot couldn&apos;t answer.</p>
          {data.misses.length === 0 ? <p className="mt-4 text-sm text-slate-500">None. The bot is answering everything.</p> : (
            <ul className="mt-3 space-y-2 text-sm">
              {data.misses.map((q) => <li key={q.question} className="flex justify-between gap-2"><span className="truncate text-slate-300">&ldquo;{q.question}&rdquo;</span><span className="shrink-0 text-xs text-slate-500">{q.hits}×</span></li>)}
            </ul>
          )}
          {onNavigate && data.misses.length > 0 && <button onClick={() => onNavigate('Settings')} className="mt-4 text-xs font-semibold text-cyan-300 hover:underline">Add answers in Settings →</button>}
        </div>
      </div>
    </div>
  )
}
