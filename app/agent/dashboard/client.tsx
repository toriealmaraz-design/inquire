'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, LogOut, FileText, Bell, Download, Zap, Copy, Check, Wallet } from 'lucide-react'
import { PushPrompt } from '@/components/push-prompt'
import { Announcements } from '@/components/announcements'

type User = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
  field?: string | null
}

type UploadRow = {
  id: number
  conversation_id: number | null
  file_name: string
  file_url: string
  file_size: number | null
  uploaded_by: string
  created_at: string
}

type Earnings = {
  referralCode: string
  commissionPercent: number
  referred: number
  paidCount: number
  totalEarned: number
  items: { id: number; ticketId: string; serviceType: string; status: string | null; commissionGhs: string | null; paidAt: string | null; createdAt: string | null }[]
}

type DbMsg = {
  id: number
  conversation_id: number
  sender_type: string
  read: boolean | null
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function AgentDashboardClient({ user }: { user: User }) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [convoCount, setConvoCount] = useState(0)
  const [unread, setUnread] = useState(0)
  const [uploads, setUploads] = useState<UploadRow[]>([])
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

  const load = useCallback(async () => {
    const { count } = await supabase.from('conversations').select('id', { count: 'exact', head: true })
    setConvoCount(count || 0)
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_type, read')
      .eq('sender_type', 'client')
      .eq('read', false)
    setUnread(((msgs as DbMsg[] | null) || []).length)
    const { data: ups } = await supabase
      .from('uploads')
      .select('id, conversation_id, file_name, file_url, file_size, uploaded_by, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    setUploads((ups as UploadRow[]) || [])
  }, [supabase])

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uploads' }, scheduleReload)
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

        <div className="mt-6"><PushPrompt /></div>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">Agent Portal</h1>
        <p className="mt-1 text-sm text-slate-400">Chat with clients, share your link, and track your commission.</p>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ['Conversations', convoCount, MessageCircle, 'text-blue-400'],
            ['Unread', unread, Bell, 'text-rose-400'],
            ['Files', uploads.length, FileText, 'text-violet-400'],
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

        {/* Open chat CTA */}
        <a
          href="/agent/chat"
          className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-4 text-sm font-bold text-white hover:from-cyan-400 hover:to-blue-500"
        >
          <MessageCircle className="size-5" /> Open Live Chat Console
        </a>

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
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ['Briefs referred', String(earnings.referred)],
                  ['Paid jobs', String(earnings.paidCount)],
                  ['Earned', `GHS ${earnings.totalEarned.toFixed(2)}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] text-slate-500">{label}</p>
                    <p className="mt-2 text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>
              {earnings.items.length > 0 && (
                <ul className="mt-4 flex flex-col divide-y divide-white/5 text-sm">
                  {earnings.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0 truncate"><span className="font-mono text-xs text-cyan-200">{item.ticketId}</span> <span className="text-slate-300">{item.serviceType}</span></span>
                      <span className={`shrink-0 text-xs ${item.paidAt ? 'text-emerald-300' : 'text-amber-300'}`}>
                        {item.paidAt ? `+GHS ${Number(item.commissionGhs || 0).toFixed(2)}` : item.status || 'Pending Quote'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="mt-6"><Announcements role={user.role} field={user.field} limit={5} /></div>

        {/* Recent files */}
        <div className={`${glass} mt-6 rounded-3xl p-5 sm:p-6`}>
          <h2 className="font-bold">Recent Files</h2>
          <p className="mt-1 text-xs text-slate-500">Latest uploads across conversations.</p>
          {uploads.length === 0 ? (
            <div className="mt-6 text-center py-10 text-slate-500">
              <FileText className="size-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No files yet</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {uploads.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{f.file_name}</p>
                    <p className="text-[11px] text-slate-500">
                      {f.uploaded_by === 'client' ? 'Client' : 'Agent'} · Convo #{f.conversation_id ?? '—'} · {fmtSize(f.file_size)} · {fmtTime(f.created_at)}
                    </p>
                  </div>
                  <a
                    href={f.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex shrink-0 items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-2 text-xs font-bold text-white hover:from-cyan-400 hover:to-blue-500"
                  >
                    <Download className="size-4" /> Download
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        <a href="/" className="mt-6 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white">
          <Zap className="size-4" /> View Site
        </a>
      </div>
    </main>
  )
}
