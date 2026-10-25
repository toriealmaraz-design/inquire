'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, FileText, Bell, Zap, Copy, Check, Wallet } from 'lucide-react'
import { PushPrompt } from '@/components/push-prompt'
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
  const unread = 0
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [earnings, setEarnings] = useState<Earnings | null>(null)
  const [earningsError, setEarningsError] = useState('')
  const [copied, setCopied] = useState(false)
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

  const requestNotif = useCallback(async () => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'granted') {
      setNotifEnabled(true)
      return
    }
    const perm = await Notification.requestPermission()
    setNotifEnabled(perm === 'granted')
  }, [])

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') setNotifEnabled(true)
    load()
    let timer: ReturnType<typeof setTimeout> | undefined
    const scheduleReload = () => {
      clearTimeout(timer)
      timer = setTimeout(load, 300)
    }
    const channel = supabase
      .channel('agent-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, scheduleReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        scheduleReload()
        const r = payload.new as any
        if (r.sender_type === 'client' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('New client message', { body: String(r.content || '').slice(0, 120) })
        }
      })
      .subscribe()
    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [supabase, load])

  return (
    <main className="min-h-screen bg-[#06121d] text-slate-100">
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
            <div>
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-[10px] uppercase tracking-wider text-cyan-300">{user.role?.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={requestNotif}
              title={notifEnabled ? 'Notifications on' : 'Enable notifications'}
              className={`relative flex size-11 items-center justify-center rounded-2xl ${glass} ${notifEnabled ? 'text-cyan-300' : 'text-slate-400'} hover:text-white`}
            >
              <Bell className="size-5" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-slate-400 hover:text-white">
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>

        <RoleWatcher role={user.role} field={user.field} />
        <div className="mt-6"><PushPrompt showTest /></div>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">Agent Portal</h1>
        <a href="/onboarding" className="mt-1 inline-block text-xs text-cyan-300 hover:underline">Edit my skills profile →</a>
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
          <h2 className="flex items-center gap-2 font-bold"><Wallet className="size-4 text-emerald-300" /> Your referral link</h2>
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

        {/* Assignments (from admins) */}
        <div className={`${glass} mt-6 rounded-3xl p-5 sm:p-6`}>
          <h2 className="font-bold">My assignments</h2>
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
