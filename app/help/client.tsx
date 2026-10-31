'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, Search, ShieldCheck } from 'lucide-react'

import { MANUAL as GROUPS, CAN, RANK, ROLE_NAME, levelOf } from '@/lib/manual'

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

export function HelpClient({ role, status, name }: { role: string | null; status: string; name: string }) {
  const level = levelOf(role)
  const [q, setQ] = useState('')
  const home = level === 'agent' ? '/agent/dashboard' : '/dashboard'

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase()
    return GROUPS.map((g) => ({
      ...g,
      sections: g.sections.filter(
        (s) => RANK[s.min] <= RANK[level] && (!term || [s.title, s.body, ...(s.steps || []), ...(s.tips || [])].join(' ').toLowerCase().includes(term))
      ),
    })).filter((g) => g.sections.length)
  }, [q, level])

  return (
    <main className="min-h-screen bg-[#06121d] px-5 py-8 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-8 lg:h-fit">
          <a href={home} className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"><ArrowLeft className="size-4" /> Back to dashboard</a>
          <div className={`${glass} mt-4 rounded-3xl p-5`}>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-300"><BookOpen className="size-3.5" /> Staff manual</p>
            <p className="mt-3 text-sm text-slate-300">Hi {name.split(' ')[0]}, this guide shows what your role can do.</p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100"><ShieldCheck className="size-3.5" /> {ROLE_NAME[level]}{status !== 'active' ? ` · ${status}` : ''}</p>
          </div>
          <nav className={`${glass} mt-4 hidden rounded-3xl p-4 lg:block`} aria-label="Contents">
            {groups.map((g) => (
              <div key={g.title} className="mb-3 last:mb-0">
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{g.title}</p>
                {g.sections.map((s) => <a key={s.id} href={`#${s.id}`} className="mt-1 block truncate text-xs text-slate-300 hover:text-cyan-200">{s.title}</a>)}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex flex-col gap-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the manual (e.g. assign, commission, notifications)…" aria-label="Search the manual" className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500/50" />
          </div>

          {!q && (
            <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
              <h2 className="font-bold">What your role can do</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {CAN.map((c) => {
                  const ok = RANK[c.min] <= RANK[level]
                  return (
                    <li key={c.label} className={`flex items-start gap-2 text-sm ${ok ? 'text-slate-200' : 'text-slate-600 line-through'}`}>
                      <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${ok ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/5 text-slate-600'}`}>{ok ? '✓' : '–'}</span>
                      {c.label}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {groups.length === 0 && <p className="rounded-2xl border border-white/10 p-6 text-center text-sm text-slate-500">Nothing matches &ldquo;{q}&rdquo;.</p>}

          {groups.map((g) => (
            <section key={g.title} aria-label={g.title} className="flex flex-col gap-4">
              <h2 className="mt-2 text-xs font-bold uppercase tracking-[.18em] text-slate-400">{g.title}</h2>
              {g.sections.map((s) => (
                <article key={s.id} id={s.id} className={`${glass} scroll-mt-6 rounded-3xl p-5 sm:p-6`}>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  {s.body && <p className="mt-2 text-sm leading-6 text-slate-300">{s.body}</p>}
                  {s.steps && (
                    <ol className="mt-3 space-y-2">
                      {s.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm leading-6 text-slate-300">
                          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/15 text-xs font-bold text-cyan-200">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  )}
                  {s.tips && (
                    <ul className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-black/15 p-4">
                      {s.tips.map((t, i) => <li key={i} className="flex gap-2 text-sm leading-6 text-slate-300"><span className="text-cyan-300">•</span>{t}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
