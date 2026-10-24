'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PushPrompt } from '@/components/push-prompt'
import { SupportPresence } from '@/components/support-presence'
import { RoleWatcher } from '@/components/role-watcher'
import { Send, ArrowLeft, Paperclip, LogOut, Users, CheckCheck, Bell, BellOff } from 'lucide-react'

type User = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
  field?: string | null
}

type Message = {
  id: number
  text: string
  sender: 'agent' | 'client'
  bot?: boolean
  time: string
  read?: boolean
}

type DbMessage = {
  id: number
  conversation_id: number
  sender_type: string
  sender_id: number | null
  content: string
  read: boolean | null
  created_at: string
}

type Conversation = {
  id: number
  clientName: string
  lastMessage: string
  unread: number
  time: string
  updatedAt: string
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function rowToMessage(r: DbMessage): Message {
  return {
    id: r.id,
    text: r.content,
    sender: r.sender_type === 'client' ? 'client' : 'agent',
    bot: r.sender_type === 'bot',
    time: fmtTime(r.created_at),
    read: r.read ?? false,
  }
}

// Agents never see client files; admins do
const ADMIN_ROLE_LIST = ['super_admin', 'academic_lead', 'it_graphics_lead', 'field_specialist', 'admin']
function maskFiles(text: string, admin: boolean) {
  return !admin && text.startsWith('📎') ? '📎 A file was shared (visible to admins only)' : text
}

function renderContent(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline break-all text-cyan-300 hover:text-cyan-200">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export function AgentChatClient({ user }: { user: User }) {
  const isAdminUser = ADMIN_ROLE_LIST.includes(user.role || '')
  const supabase = createClient()
  const router = useRouter()
  const numericUserId = user.id ? parseInt(user.id, 10) : null

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvo, setActiveConvo] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notifEnabled, setNotifEnabled] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeConvoRef = useRef<number | null>(null)
  activeConvoRef.current = activeConvo

  const isAdmin = user.role !== 'agent'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Build conversation list with last message + unread counts
  const loadConversations = useCallback(async () => {
    const { data: convos } = await supabase
      .from('conversations')
      .select('id, client_name, status, updated_at')
      .order('updated_at', { ascending: false })
    if (!convos) return
    const { data: msgs } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_type, content, read, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)
    const byConvo = new Map<number, DbMessage[]>()
    ;(msgs as DbMessage[] | null)?.forEach((m) => {
      const arr = byConvo.get(m.conversation_id) || []
      arr.push(m)
      byConvo.set(m.conversation_id, arr)
    })
    const list: Conversation[] = convos.map((c: any) => {
      const cm = byConvo.get(c.id) || []
      const last = cm[0]
      const unread = cm.filter((m) => m.sender_type === 'client' && !m.read).length
      return {
        id: c.id,
        clientName: c.client_name,
        lastMessage: last ? maskFiles(last.content, isAdminUser) : 'No messages yet',
        unread,
        time: last ? fmtTime(last.created_at) : fmtTime(c.updated_at),
        updatedAt: c.updated_at,
      }
    })
    setConversations(list)
  }, [supabase])

  // Ask for browser notification permission
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
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setNotifEnabled(true)
    }
  }, [])

  // Initial load + global realtime subscriptions (new convos + all new messages)
  useEffect(() => {
    loadConversations()
    // Batch bursts of realtime events into one list refetch.
    let timer: ReturnType<typeof setTimeout> | undefined
    const scheduleReload = () => {
      clearTimeout(timer)
      timer = setTimeout(loadConversations, 300)
    }

    const channel = supabase
      .channel('agent-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, scheduleReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const r = payload.new as DbMessage
        scheduleReload()
        if (activeConvoRef.current === r.conversation_id) {
          setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : [...prev, rowToMessage(r)]))
        }
        if (r.sender_type === 'client' && activeConvoRef.current !== r.conversation_id) {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('New client message', { body: maskFiles(r.content, isAdminUser).slice(0, 120) })
          }
        }
      })
      .subscribe()

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [supabase, loadConversations])

  // Load messages when a conversation is opened + mark client msgs read
  useEffect(() => {
    if (!activeConvo) {
      setMessages([])
      return
    }
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvo)
        .order('created_at', { ascending: true })
      if (active && data) setMessages((data as DbMessage[]).map(rowToMessage))
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', activeConvo)
        .eq('sender_type', 'client')
        .eq('read', false)
      loadConversations()
    })()
    return () => {
      active = false
    }
  }, [activeConvo, supabase, loadConversations])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || !activeConvo || sending) return
    setSending(true)
    setInput('')
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: activeConvo, sender_type: 'agent', sender_id: numericUserId, content: text, read: false })
      .select('*')
      .single()
    if (data) {
      const r = data as DbMessage
      setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : [...prev, rowToMessage(r)]))
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvo)
    }
    setSending(false)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file || !activeConvo || uploading) return
    setUploading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${activeConvo}/${Date.now()}-${safeName}`
    const { error: upErr } = await supabase.storage.from('uploads').upload(path, file, { cacheControl: '3600', upsert: false })
    if (upErr) {
      setUploading(false)
      return
    }
    const { data: pub } = supabase.storage.from('uploads').getPublicUrl(path)
    const url = pub.publicUrl
    await supabase.from('uploads').insert({
      conversation_id: activeConvo,
      file_name: file.name,
      file_url: url,
      file_type: file.type || null,
      file_size: file.size,
      uploaded_by: 'agent',
      user_id: numericUserId,
    })
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: activeConvo, sender_type: 'agent', sender_id: numericUserId, content: `📎 ${file.name}\n${url}`, read: false })
      .select('*')
      .single()
    if (data) {
      const r = data as DbMessage
      setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : [...prev, rowToMessage(r)]))
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConvo)
    }
    setUploading(false)
  }

  const activeConvoData = conversations.find((c) => c.id === activeConvo)

  return (
    <main className="flex h-screen bg-[#06121d]">
      {/* Sidebar - conversation list */}
      <aside className="w-80 border-r border-white/10 bg-[#0a1929] flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            {user.image ? (
              <img src={user.image} alt="" className="size-10 rounded-full" />
            ) : (
              <div className="size-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold">
                {user.name?.[0] || 'A'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-cyan-300 uppercase">{user.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={requestNotif}
              title={notifEnabled ? 'Notifications on' : 'Enable notifications'}
              className={`p-2 rounded-lg hover:bg-white/10 ${notifEnabled ? 'text-cyan-300' : 'text-slate-500'}`}
            >
              {notifEnabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
            </button>
          </div>
        </div>

        <PushPrompt compact />
        <SupportPresence userId={String(user.id)} />
        <RoleWatcher role={user.role} field={user.field} />

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">No conversations yet. When a client messages from the Live Chat, it appears here.</div>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveConvo(c.id)}
              className={`w-full p-4 text-left border-b border-white/5 hover:bg-white/5 ${
                activeConvo === c.id ? 'bg-white/10' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{c.clientName}</span>
                <span className="text-[10px] text-slate-500">{c.time}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-slate-400 truncate pr-2">{c.lastMessage}</p>
                {c.unread > 0 && (
                  <span className="shrink-0 size-5 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] text-white font-bold">
                    {c.unread}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-white/10 flex gap-2">
          {isAdmin && (
            <a
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 text-xs text-slate-300 hover:bg-white/20"
            >
              <Users className="size-4" /> Dashboard
            </a>
          )}
          <button
            onClick={handleSignOut}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 text-xs text-slate-300 hover:bg-white/20"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Chat area */}
      {activeConvo ? (
        <div className="flex-1 flex flex-col">
          {/* Chat header */}
          <header className="px-4 py-3 border-b border-white/10 bg-[#0a1929] flex items-center gap-3">
            <button onClick={() => setActiveConvo(null)} className="lg:hidden text-slate-400">
              <ArrowLeft className="size-5" />
            </button>
            <div className="size-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold">
              C
            </div>
            <div>
              <p className="font-medium text-white">{activeConvoData?.clientName}</p>
              <p className="text-xs text-emerald-400">Live</p>
            </div>
          </header>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
          >
            <div className="flex flex-col gap-2 max-w-2xl mx-auto">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`relative max-w-[80%] rounded-lg px-3 py-2 shadow-md ${
                      m.sender === 'agent'
                        ? 'bg-[#0c5f4a] text-white rounded-tr-none'
                        : 'bg-[#0f2847] text-slate-100 rounded-tl-none'
                    }`}
                  >
                    {m.bot && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/80">Auto-reply</p>}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderContent(maskFiles(m.text, isAdminUser))}</p>
                    <div className={`flex items-center gap-1 mt-1 ${m.sender === 'agent' ? 'justify-end' : ''}`}>
                      <span className="text-[10px] text-slate-400">{m.time}</span>
                      {m.sender === 'agent' && (
                        <CheckCheck className={`size-4 ${m.read ? 'text-cyan-400' : 'text-slate-500'}`} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-white/10 bg-[#0a1929] px-3 py-2">
            <div className="flex items-end gap-2 max-w-2xl mx-auto">
              {isAdminUser && <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 text-slate-400 hover:text-cyan-300 disabled:opacity-50">
                <Paperclip className="size-5" />
              </button>}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
              <div className="flex-1 rounded-2xl bg-[#0f2847] border border-white/10">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="Type a message"
                  rows={1}
                  className="w-full resize-none bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
              </div>
              <button
                onClick={send}
                disabled={sending}
                className="flex size-10 items-center justify-center rounded-full bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-50"
              >
                <Send className="size-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          <div className="text-center">
            <Users className="size-16 mx-auto mb-4 opacity-50" />
            <p>Select a conversation to start chatting</p>
          </div>
        </div>
      )}
    </main>
  )
}
