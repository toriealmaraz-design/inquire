'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PushPrompt } from '@/components/push-prompt'
import { NotificationBell } from '@/components/notification-bell'
import { SupportPresence } from '@/components/support-presence'
import { RoleWatcher } from '@/components/role-watcher'
import { Send, ArrowLeft, Paperclip, LogOut, Users, CheckCheck, BookOpen, Search, ChevronDown, X, MoreVertical, CornerUpLeft, CornerUpRight, Trash2, Pencil } from 'lucide-react'
import { WebCall } from '@/components/web-call'
import { Lightbox } from '@/components/lightbox'

type User = {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
  field?: string | null
}

type Reactions = Record<string, string[]>
type Message = {
  id: number
  text: string
  sender: 'agent' | 'client'
  bot?: boolean
  time: string
  createdAt: string
  read?: boolean
  replyTo?: number | null
  editedAt?: string | null
  deletedAt?: string | null
  reactions?: Reactions | null
}

type DbMessage = {
  id: number
  conversation_id: number
  sender_type: string
  sender_id: number | null
  content: string
  read: boolean | null
  created_at: string
  reply_to?: number | null
  edited_at?: string | null
  deleted_at?: string | null
  reactions?: Reactions | null
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
    createdAt: r.created_at,
    read: r.read ?? false,
    replyTo: r.reply_to ?? null,
    editedAt: r.edited_at ?? null,
    deletedAt: r.deleted_at ?? null,
    reactions: r.reactions ?? null,
  }
}

const REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '🙏']

// Agents never see client files; admins do
const ADMIN_ROLE_LIST = ['super_admin', 'academic_lead', 'it_graphics_lead', 'field_specialist', 'admin']
function maskFiles(text: string, admin: boolean) {
  return !admin && text.startsWith('📎') ? '📎 A file was shared (visible to admins only)' : text
}

// "📎 name\nurl" where url is an image -> {url, name}
function imageOf(text: string): { url: string; name: string } | null {
  const m = text.match(/^📎 (.+)\n(https?:\/\/\S+)$/)
  return m && /\.(png|jpe?g|gif|webp|avif)$/i.test(m[1]) ? { url: m[2], name: m[1] } : null
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
  const [lightbox, setLightbox] = useState<{ url: string; name?: string } | null>(null)
  const [peerTyping, setPeerTyping] = useState(false)
  const [atBottom, setAtBottom] = useState(true)
  const [unseen, setUnseen] = useState(0)
  const [showSearch, setShowSearch] = useState(false)
  const [search, setSearch] = useState('')
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editing, setEditing] = useState<Message | null>(null)
  const [forwarding, setForwarding] = useState<Message | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const activeConvoRef = useRef<number | null>(null)
  activeConvoRef.current = activeConvo
  const typingChRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const atBottomRef = useRef(true)
  const typingSentRef = useRef(0)

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    atBottomRef.current = near
    setAtBottom(near)
    if (near) setUnseen(0)
  }
  const jumpToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    setUnseen(0)
  }
  const emitTyping = () => {
    const now = Date.now()
    if (now - typingSentRef.current > 1500) {
      typingSentRef.current = now
      typingChRef.current?.send({ type: 'broadcast', event: 'typing', payload: { sender: 'agent' } })
    }
  }

  const react = async (m: Message, emoji: string) => {
    setMenuFor(null)
    const current: Reactions = { ...(m.reactions || {}) }
    const who = 'agent'
    const has = current[emoji]?.includes(who)
    const next: Reactions = {}
    for (const [e, arr] of Object.entries(current)) {
      const filtered = arr.filter((x) => x !== who)
      if (filtered.length) next[e] = filtered
    }
    if (!has) next[emoji] = [...(next[emoji] || []), who]
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, reactions: next } : x)))
    await supabase.from('messages').update({ reactions: next }).eq('id', m.id)
  }
  const unsend = async (m: Message) => {
    setMenuFor(null)
    if (!window.confirm('Delete this message for everyone?')) return
    const now = new Date().toISOString()
    setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, deletedAt: now } : x)))
    await supabase.from('messages').update({ deleted_at: now }).eq('id', m.id)
  }
  const startEdit = (m: Message) => { setMenuFor(null); setReplyTo(null); setEditing(m); setInput(m.text) }
  const startReply = (m: Message) => { setMenuFor(null); setEditing(null); setReplyTo(m) }
  const forwardTo = async (targetConvo: number) => {
    if (!forwarding) return
    const content = forwarding.text
    setForwarding(null)
    await supabase.from('messages').insert({ conversation_id: targetConvo, sender_type: 'agent', sender_id: numericUserId, content, read: false })
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', targetConvo)
    loadConversations()
  }

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
          if (!atBottomRef.current && r.sender_type === 'client') setUnseen((n) => n + 1)
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const r = payload.new as DbMessage
        if (activeConvoRef.current === r.conversation_id) {
          setMessages((prev) => prev.map((m) => (m.id === r.id ? { ...m, ...rowToMessage(r) } : m)))
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
    if (atBottomRef.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Per-conversation typing channel (shared name with the client side)
  useEffect(() => {
    setPeerTyping(false)
    setUnseen(0)
    atBottomRef.current = true
    setAtBottom(true)
    if (!activeConvo) return
    let typingTimer: ReturnType<typeof setTimeout>
    const ch = supabase
      .channel(`chat-client-${activeConvo}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.sender === 'client') {
          setPeerTyping(true)
          clearTimeout(typingTimer)
          typingTimer = setTimeout(() => setPeerTyping(false), 2500)
        }
      })
      .subscribe()
    typingChRef.current = ch
    return () => { clearTimeout(typingTimer); typingChRef.current = null; supabase.removeChannel(ch) }
  }, [activeConvo, supabase])

  const send = async () => {
    const text = input.trim()
    if (!text || !activeConvo || sending) return
    // Editing an existing message
    if (editing) {
      setInput('')
      const now = new Date().toISOString()
      setMessages((prev) => prev.map((m) => (m.id === editing.id ? { ...m, text, editedAt: now } : m)))
      await supabase.from('messages').update({ content: text, edited_at: now }).eq('id', editing.id)
      setEditing(null)
      return
    }
    setSending(true)
    setInput('')
    const replyId = replyTo ? replyTo.id : null
    setReplyTo(null)
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: activeConvo, sender_type: 'agent', sender_id: numericUserId, content: text, read: false, reply_to: replyId })
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
    <main className="flex h-[100dvh] overflow-hidden bg-[#06121d]">
      {/* Sidebar - conversation list */}
      <aside className={`${activeConvo ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col border-r border-white/10 bg-[#0a1929] lg:w-80`}>
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
            <a href="/help" title="How to use" aria-label="Help manual" className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white">
              <BookOpen className="size-4" />
            </a>
            <NotificationBell />
          </div>
        </div>

        <PushPrompt compact />
        <SupportPresence userId={String(user.id)} showVisitors />
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
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Chat header */}
          <header className="px-4 py-3 border-b border-white/10 bg-[#0a1929] flex items-center gap-3">
            <button onClick={() => setActiveConvo(null)} aria-label="Back to conversations" className="-ml-1 rounded-full p-1 text-slate-400 hover:bg-white/10 lg:hidden">
              <ArrowLeft className="size-5" />
            </button>
            <div className="size-10 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold">
              C
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{activeConvoData?.clientName}</p>
              <p className={`text-xs ${peerTyping ? 'text-cyan-300' : 'text-emerald-400'}`}>{peerTyping ? 'typing…' : 'Live'}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => { setShowSearch((v) => !v); setSearch('') }} aria-label="Search messages" className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-cyan-300"><Search className="size-4" /></button>
              <WebCall conversationId={activeConvo} role="agent" peerLabel={activeConvoData?.clientName || 'the client'} />
            </div>
          </header>
          {showSearch && (
            <div className="flex items-center gap-2 border-b border-white/10 bg-[#0a1929] px-4 py-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} autoFocus placeholder="Search in this chat…" aria-label="Search messages" className="h-9 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-500/50" />
              </div>
              <button onClick={() => { setShowSearch(false); setSearch('') }} aria-label="Close search" className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
            </div>
          )}

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="relative flex-1 overflow-y-auto p-4"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
          >
            <div className="flex flex-col gap-2 max-w-2xl mx-auto">
              {messages.filter((m) => !search.trim() || m.text.toLowerCase().includes(search.trim().toLowerCase())).map((m) => {
                const deleted = !!m.deletedAt
                const img = deleted || !isAdminUser ? null : imageOf(m.text)
                const mineA = m.sender === 'agent'
                const replied = m.replyTo ? messages.find((x) => x.id === m.replyTo) : null
                const reactions = m.reactions ? Object.entries(m.reactions).filter(([, arr]) => arr.length) : []
                const canEdit = mineA && !deleted && !img && !m.text.startsWith('📎') && !m.text.startsWith('🎙️')
                const canDelete = !deleted && (mineA || user.role === 'super_admin')
                return (
                <div
                  key={m.id}
                  className={`group flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`relative max-w-[85%] break-words sm:max-w-[70%] rounded-lg px-3 py-2 shadow-md ${
                      m.sender === 'agent'
                        ? 'bg-[#0c5f4a] text-white rounded-tr-none'
                        : 'bg-[#0f2847] text-slate-100 rounded-tl-none'
                    }`}
                  >
                    {m.bot && !deleted && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200/80">Auto-reply</p>}
                    {replied && (
                      <div className="mb-1 rounded border-l-2 border-cyan-300/60 bg-black/20 px-2 py-1 text-[11px] text-slate-300">
                        <span className="block font-semibold text-cyan-200">{replied.sender === 'agent' ? 'You' : 'Client'}</span>
                        <span className="block truncate">{replied.deletedAt ? 'deleted message' : maskFiles(replied.text, isAdminUser).replace(/^📎 |^🎙️ /, '').split('\n')[0].slice(0, 80)}</span>
                      </div>
                    )}
                    {deleted ? (
                      <p className="text-sm italic text-slate-400">🚫 This message was deleted</p>
                    ) : img ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={img.name} loading="lazy" onClick={() => setLightbox({ url: img.url, name: img.name })} className="mb-1 max-h-64 max-w-full cursor-zoom-in rounded-lg object-cover" />
                        <p className="truncate text-xs text-slate-300">{img.name}</p>
                      </>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderContent(maskFiles(m.text, isAdminUser))}</p>
                    )}
                    {reactions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {reactions.map(([e, arr]) => (
                          <button key={e} onClick={() => react(m, e)} className="rounded-full bg-black/30 px-1.5 py-0.5 text-[11px] hover:bg-black/40">{e} {arr.length}</button>
                        ))}
                      </div>
                    )}
                    <div className={`flex items-center gap-1 mt-1 ${m.sender === 'agent' ? 'justify-end' : ''}`}>
                      {m.editedAt && !deleted && <span className="text-[10px] text-slate-500">edited</span>}
                      <span className="text-[10px] text-slate-400">{m.time}</span>
                      {m.sender === 'agent' && !deleted && (
                        <CheckCheck className={`size-4 ${m.read ? 'text-cyan-400' : 'text-slate-500'}`} />
                      )}
                    </div>

                    {!deleted && (
                      <button
                        onClick={() => setMenuFor(menuFor === m.id ? null : m.id)}
                        aria-label="Message actions"
                        className={`absolute top-1 opacity-0 transition group-hover:opacity-100 ${mineA ? '-left-7' : '-right-7'} rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white ${menuFor === m.id ? 'opacity-100' : ''}`}
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    )}
                    {menuFor === m.id && (
                      <div className={`absolute top-7 z-30 w-40 rounded-xl border border-white/10 bg-[#0b1a28] p-1 shadow-2xl ${mineA ? 'right-0' : 'left-0'}`}>
                        <div className="flex justify-between px-1 pb-1">
                          {REACTION_EMOJI.map((e) => (
                            <button key={e} onClick={() => react(m, e)} className="rounded-full p-1 text-lg hover:bg-white/10" aria-label={`React ${e}`}>{e}</button>
                          ))}
                        </div>
                        <button onClick={() => startReply(m)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10"><CornerUpLeft className="size-3.5" /> Reply</button>
                        {isAdminUser && <button onClick={() => { setMenuFor(null); setForwarding(m) }} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10"><CornerUpRight className="size-3.5" /> Forward</button>}
                        {canEdit && <button onClick={() => startEdit(m)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10"><Pencil className="size-3.5" /> Edit</button>}
                        {canDelete && <button onClick={() => unsend(m)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-rose-300 hover:bg-rose-500/10"><Trash2 className="size-3.5" /> Delete</button>}
                      </div>
                    )}
                  </div>
                </div>
                )
              })}
            </div>
          </div>

          {!atBottom && (
            <button onClick={jumpToBottom} aria-label="Scroll to latest" className="absolute bottom-24 right-6 z-20 flex items-center gap-1 rounded-full bg-[#0f2847] px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10 hover:bg-[#143055]">
              <ChevronDown className="size-4" />
              {unseen > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold">{unseen}</span>}
            </button>
          )}

          {/* Input */}
          <div className="border-t border-white/10 bg-[#0a1929] px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {(replyTo || editing) && (
              <div className="mx-auto mb-2 flex max-w-2xl items-center gap-2 rounded-xl border-l-2 border-cyan-300/60 bg-white/5 px-3 py-2 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-cyan-200">{editing ? 'Editing message' : `Replying to ${replyTo?.sender === 'agent' ? 'yourself' : 'client'}`}</p>
                  <p className="truncate text-slate-400">{maskFiles((editing || replyTo)?.text || '', isAdminUser).replace(/^📎 |^🎙️ /, '').split('\n')[0].slice(0, 90)}</p>
                </div>
                <button onClick={() => { setReplyTo(null); setEditing(null); setInput('') }} aria-label="Cancel" className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
              </div>
            )}
            <div className="flex items-end gap-2 max-w-2xl mx-auto">
              {isAdminUser && <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 text-slate-400 hover:text-cyan-300 disabled:opacity-50">
                <Paperclip className="size-5" />
              </button>}
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
              <div className="flex-1 rounded-2xl bg-[#0f2847] border border-white/10">
                <textarea
                  value={input}
                  onChange={(e) => { setInput(e.target.value); emitTyping() }}
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
        <div className="hidden flex-1 items-center justify-center text-slate-500 lg:flex">
          <div className="text-center">
            <Users className="size-16 mx-auto mb-4 opacity-50" />
            <p>Select a conversation to start chatting</p>
          </div>
        </div>
      )}
      {menuFor !== null && <button className="fixed inset-0 z-20 cursor-default" aria-label="Close menu" onClick={() => setMenuFor(null)} />}
      {forwarding && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" onClick={() => setForwarding(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0b1a28] p-4 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">Forward to…</h3>
              <button onClick={() => setForwarding(null)} aria-label="Close" className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
            </div>
            <p className="mb-2 truncate rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-400">{maskFiles(forwarding.text, isAdminUser).replace(/^📎 |^🎙️ /, '').split('\n')[0].slice(0, 90)}</p>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {conversations.filter((c) => c.id !== activeConvo).map((c) => (
                <button key={c.id} onClick={() => forwardTo(c.id)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10">
                  <span className="truncate">{c.clientName}</span>
                  <CornerUpRight className="size-4 shrink-0 text-cyan-300" />
                </button>
              ))}
              {conversations.filter((c) => c.id !== activeConvo).length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-500">No other conversations.</p>}
            </div>
          </div>
        </div>
      )}
      <Lightbox url={lightbox?.url ?? null} name={lightbox?.name} onClose={() => setLightbox(null)} />
    </main>
  )
}
