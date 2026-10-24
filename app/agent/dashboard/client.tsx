'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, LogOut, FileText, Bell, Download, Zap } from 'lucide-react'

type User = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
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

        <h1 className="mt-8 text-3xl font-bold tracking-tight">Agent Portal</h1>
        <p className="mt-1 text-sm text-slate-400">Chat with clients and handle their files.</p>

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
