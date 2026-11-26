'use client'

import { AnimatedHeading } from '@/components/animated-heading'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, FileText, Bell, Zap, Copy, Check, Wallet, BookOpen } from 'lucide-react'
import { PushPrompt } from '@/components/push-prompt'
import { NotificationBell } from '@/components/notification-bell'
import { Announcements } from '@/components/announcements'
import { Leaderboard } from '@/components/leaderboard'
import { RoleWatcher } from '@/components/role-watcher'

type User = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
  field?: string | null
}


type Earnings = {
  referralCode: string
  commissionPercent: number
  assignedCount: number
  referred: number
  paidCount: number
  totalEarned: number
  pendingEarnings: number
  items: {
    id: number
    ticketId: string
    category: string
    serviceType: string
    title: string
    scope: string | null
    urgency: string | null
    briefDetails: string | null
    status: string | null
    priceGhs: string | null
    myCommission: number
    assignedToMe: boolean
    referredByMe: boolean
    paidAt: string | null
    createdAt: string | null
  }[]
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'



export function AgentDashboardClient({ user }: { user: User }) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [earnings, setEarnings] = useState<Earnings | null>(null)
  const [earningsError, setEarningsError] = useState('')
  const [copied, setCopied] = useState(false)
  const [kitCopied, setKitCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Agents don't handle client chat (admins only), so there is nothing to load here
  const load = useCallback(async () => {}, [])

  useEffect(() => {
    setOrigin(window.location.origin)
    fetch('/api/agent/earnings')
      .then(async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(data.error || 'Could not load your referral link.')
        setEarnings(data)
      })
      .catch((e) => setEarningsError(e instanceof Error ? e.message : 'Could not load your referral link.'))
  }, [])

  const referralLink = earnings && origin ? `${origin}/?ref=${earnings.referralCode}` : ''

  const copyLink = async () => {
    if (!referralLink) return
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy your link:', referralLink)
    }
  }

  const copyMarketingKit = async () => {
    if (!referralLink) return
    const kit = [
      `WhatsApp status: Need a hand with a research brief, presentation, or software project? Gemini Nexus connects you with the right specialist. Start here: ${referralLink}`,
      `Campus group: Gemini Nexus is taking requests for research support, slide decks, code debugging, and web systems. Share your brief for a custom GHS quote: ${referralLink}`,
      `Quick follow-up: Have a brief to move forward? Send it to Gemini Nexus and track progress with your ticket number: ${referralLink}`,
    ].join('\n\n')
    try {
      await navigator.clipboard.writeText(kit)
      setKitCopied(true)
      setTimeout(() => setKitCopied(false), 2500)
    } catch {
      window.prompt('Copy your marketing kit:', kit)
    }
  }


  const referralCount = earnings?.referred ?? 0
  const tier = referralCount >= 15 ? 'Nexus Partner' : referralCount >= 5 ? 'Campus Connector' : 'Starter'
  const nextTierAt = referralCount >= 15 ? 15 : referralCount >= 5 ? 15 : 5
  const tierProgress = referralCount >= 15 ? 100 : referralCount >= 5 ? Math.min(100, ((referralCount - 5) / 10) * 100) : Math.min(100, (referralCount / 5) * 100)

  useEffect(() => {
    load()
    let timer: ReturnType<typeof setTimeout> | undefined
    const scheduleReload = () => {
      clearTimeout(timer)
      timer = setTimeout(load, 300)
    }
    const channel = supabase
      .channel('agent-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, scheduleReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        scheduleReload()
      })
      .subscribe()
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [supabase, load])

  return (
    <main className="portal-page min-h-screen bg-transparent text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-4xl px-5 py-8 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.image ? (
              <img src={user.image} alt="" className="size-11 rounded-full" />
            ) : (
              <div className="size-11 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white">
                {user.name?.[0] || 'A'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-cyan-300">{user.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/help" aria-label="Help" className="flex h-11 items-center gap-2 rounded-2xl px-3 text-xs text-slate-400 hover:text-white">
              <BookOpen className="size-4" /> <span className="hidden sm:inline">Help</span>
            </a>
            <NotificationBell />
            <button onClick={handleSignOut} aria-label="Sign out" className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-slate-400 hover:text-white">
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        <RoleWatcher role={user.role} field={user.field} />
        <div className="mt-6"><PushPrompt showTest /></div>

        <AnimatedHeading as="h1" className="mt-2 text-3xl font-bold tracking-tight">Agent Portal</AnimatedHeading>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <a href="/onboarding" className="text-cyan-300 hover:underline">Edit my skills profile →</a>
          <a href="/complaints" className="text-amber-300 hover:underline">Lodge a complaint →</a>
        </div>
        <p className="mt-1 text-sm text-slate-400">Your assignments, referral link and commission.</p>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ['Assignments', earnings?.assignedCount ?? 0, FileText, 'text-violet-400'],
            ['Pending', `GHS ${(earnings?.pendingEarnings ?? 0).toFixed(2)}`, Bell, 'text-amber-300'],
            ['Earned', `GHS ${(earnings?.totalEarned ?? 0).toFixed(2)}`, Wallet, 'text-emerald-300'],
          ].map(([label, value, Icon, color]: any) => (
            <div key={label} className={`${glass} rounded-2xl p-5`}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{label}</span>
                <Icon className={`size-4 ${color}`} />
              </div>
              <p className="mt-4 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>


        {/* Referral link + commission */}
        <div className={`${glass} mt-6 rounded-3xl p-5 sm:p-6`}>
          <AnimatedHeading as="h2" className="flex items-center gap-2 font-bold"><Wallet className="size-4 text-emerald-300" /> Your referral link</AnimatedHeading>
          <p className="mt-1 text-xs text-slate-500">
            Share this link. When a client submits a brief through it and the job is paid, you earn {earnings ? `${earnings.commissionPercent}%` : 'a commission'} of the job price.
          </p>
          {earningsError ? (
            <p role="alert" className="mt-4 text-sm text-rose-300">{earningsError}</p>
          ) : !earnings ? (
            <p className="mt-4 text-sm text-slate-500">Loading…</p>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={referralLink}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Your referral link"
                  className="h-11 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 font-mono text-xs text-cyan-100 outline-none"
                />
                <button
                  onClick={copyLink}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-200"
                >
                  {copied ? <><Check className="size-4" /> Copied</> : <><Copy className="size-4" /> Copy link</>}
                </button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Briefs referred', String(earnings.referred)],
                  ['Pending', `GHS ${earnings.pendingEarnings.toFixed(2)}`],
                  ['Paid jobs', String(earnings.paidCount)],
                  ['Earned', `GHS ${earnings.totalEarned.toFixed(2)}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] text-slate-500">{label}</p>
                    <p className="mt-2 text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <section className={`${glass} mt-6 rounded-3xl p-5 sm:p-6`} aria-labelledby="growth-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><AnimatedHeading as="h2" id="growth-heading" className="font-bold">Campus growth</AnimatedHeading><p className="mt-1 text-xs text-slate-500">Your tier is based on the briefs attributed to your referral link.</p></div>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">{tier}</span>
          </div>
          <div className="mt-5" role="progressbar" aria-label="Progress to next agent tier" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(tierProgress)}>
            <div className="flex justify-between text-[11px] text-slate-400"><span>{referralCount} referred briefs</span><span>{referralCount >= 15 ? 'Top tier reached' : `${Math.max(0, nextTierAt - referralCount)} to next tier`}</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-[width]" style={{ width: `${tierProgress}%` }} /></div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[['Starter', '0–4 briefs', '10% target'], ['Campus Connector', '5–14 briefs', '15% target'], ['Nexus Partner', '15+ briefs', '20% target']].map(([name, range, reward]) => <div key={name} className={`rounded-xl border p-3 ${tier === name ? 'border-cyan-300/40 bg-cyan-300/[.06]' : 'border-white/10 bg-white/[.025]'}`}><p className="text-xs font-semibold text-white">{name}</p><p className="mt-1 text-[11px] text-slate-500">{range} · {reward}</p></div>)}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">Tier rates are growth targets. Your active commission rate is the approved rate shown in your earnings and is applied when jobs are priced.</p>
          <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4 sm:flex-row sm:items-center">
            <div><p className="text-sm font-semibold text-white">Copy marketing kit</p><p className="mt-1 text-xs text-slate-500">Three ready-to-share WhatsApp captions with your referral link.</p></div>
            <button onClick={copyMarketingKit} disabled={!referralLink} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 text-xs font-bold text-cyan-100 hover:bg-cyan-300/15 disabled:opacity-50"><Copy className="size-4" />{kitCopied ? 'Kit copied' : 'Copy kit'}</button>
          </div>
        </section>

        {/* Assignments (from admins) */}
        <div className={`${glass} mt-6 rounded-3xl p-5 sm:p-6`}>
          <AnimatedHeading as="h2" className="font-bold">My assignments</AnimatedHeading>
          <p className="mt-1 text-xs text-slate-500">Jobs an admin gave you, with the price and your commission. Commission is earned when the job is marked paid.</p>
          {!earnings ? (
            <p className="mt-4 text-sm text-slate-500">Loading…</p>
          ) : earnings.items.filter((i) => i.assignedToMe || i.referredByMe).length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No assignments yet. An admin will assign work to you.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {earnings.items.map((item) => (
                <li key={item.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{item.title}</span><span className="text-[11px] text-slate-500"><span className="font-mono text-cyan-300/80">{item.ticketId}</span> · {item.serviceType}</span></span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${item.paidAt ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{item.paidAt ? 'Paid' : item.status || 'Pending'}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {[item.assignedToMe ? 'Assigned to you' : null, item.referredByMe ? 'Your referral' : null, item.scope, item.urgency].filter(Boolean).join(' · ')}
                  </p>
                  {item.briefDetails && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.briefDetails}</p>}
                  <div className="mt-3 flex flex-wrap gap-4 border-t border-white/10 pt-3 text-xs">
                    {item.priceGhs && <span className="text-slate-400">Job price <strong className="text-white">GHS {Number(item.priceGhs).toFixed(2)}</strong></span>}
                    <span className="text-slate-400">Your commission <strong className={item.paidAt ? 'text-emerald-300' : 'text-amber-200'}>{item.myCommission ? `GHS ${item.myCommission.toFixed(2)}` : 'set when an admin prices it'}</strong></span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6"><Leaderboard compact /></div>

        <div className="mt-6"><Announcements role={user.role} field={user.field} limit={5} /></div>

        <a href="/" className="mt-6 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white">
          <Zap className="size-4" /> View Site
        </a>
      </div>
    </main>
  )
}
