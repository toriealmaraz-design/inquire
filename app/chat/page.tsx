'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, ArrowLeft, Paperclip, Smile, Mic, CheckCheck, Search, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: number
  text: string
  sender: 'user' | 'agent'
  time: string
  read?: boolean
}

type DbMessage = {
  id: number
  conversation_id: number
  sender_type: string
  content: string
  read: boolean | null
  created_at: string
}

const STORAGE_KEY = 'inquire_client'

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function rowToMessage(r: DbMessage): Message {
  return {
    id: r.id,
    text: r.content,
    sender: r.sender_type === 'client' ? 'user' : 'agent',
    time: fmtTime(r.created_at),
    read: r.read ?? false,
  }
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

export default function ChatPage() {
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [agentOnline] = useState(true)
  const [convoId, setConvoId] = useState<number | null>(null)
  const [clientName, setClientName] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load or create a persistent client identity
  useEffect(() => {
    let stored: { name: string; convoId: number | null } | null = null
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    } catch {
      stored = null
    }
    if (stored?.name) {
      setClientName(stored.name)
      if (stored.convoId) setConvoId(stored.convoId)
    } else {
      const name = `Client #${Math.floor(1000 + Math.random() * 9000)}`
      setClientName(name)
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, convoId: null }))
    }
  }, [])

  // Load existing messages + subscribe to realtime for this conversation
  useEffect(() => {
    if (!convoId) return
    let active = true

    ;(async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true })
      if (active && data) setMessages((data as DbMessage[]).map(rowToMessage))
    })()

    const channel = supabase
      .channel(`chat-client-${convoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convoId}` },
        (payload) => {
          const r = payload.new as DbMessage
          setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : [...prev, rowToMessage(r)]))
        }
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [convoId, supabase])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const ensureConversation = useCallback(async (): Promise<number | null> => {
    if (convoId) return convoId
    const { data, error } = await supabase
      .from('conversations')
      .insert({ client_name: clientName, status: 'active' })
      .select('id')
      .single()
    if (error || !data) return null
    const id = data.id as number
    setConvoId(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: clientName, convoId: id }))
    return id
  }, [convoId, clientName, supabase])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    const id = await ensureConversation()
    if (!id) {
      setSending(false)
      setInput(text)
      return
    }
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender_type: 'client', content: text, read: false })
      .select('*')
      .single()
    if (data) {
      const r = data as DbMessage
      setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : [...prev, rowToMessage(r)]))
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', id)
    }
    setSending(false)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = ''
    if (!file || uploading) return
    setUploading(true)
    const id = await ensureConversation()
    if (!id) {
      setUploading(false)
      return
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${id}/${Date.now()}-${safeName}`
    const { error: upErr } = await supabase.storage.from('uploads').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (upErr) {
      setUploading(false)
      return
    }
    const { data: pub } = supabase.storage.from('uploads').getPublicUrl(path)
    const url = pub.publicUrl
    // record upload + post a chat message so both sides see it live
    await supabase.from('uploads').insert({
      conversation_id: id,
      file_name: file.name,
      file_url: url,
      file_type: file.type || null,
      file_size: file.size,
      uploaded_by: 'client',
    })
    const { data } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender_type: 'client', content: `📎 ${file.name}\n${url}`, read: false })
      .select('*')
      .single()
    if (data) {
      const r = data as DbMessage
      setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : [...prev, rowToMessage(r)]))
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', id)
    }
    setUploading(false)
  }

  const today = 'Today'

  return (
    <main className="flex min-h-screen flex-col bg-[#06121d]">
      {/* Header - WhatsApp style */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a1929]">
        <div className="flex items-center gap-3 px-4 py-3">
          <a href="/" className="text-slate-400 hover:text-white"><ArrowLeft className="size-5" /></a>
          <div className="relative">
            <div className="size-10 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">GN</div>
            {agentOnline && <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-[#0a1929] bg-emerald-400" />}
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-white">Gemini Nexus Support</h1>
            <p className="text-xs text-emerald-400">{agentOnline ? 'Online' : 'Offline'}</p>
          </div>
          <button className="p-2 text-slate-400 hover:text-white"><Search className="size-5" /></button>
          <button className="p-2 text-slate-400 hover:text-white"><MoreVertical className="size-5" /></button>
        </div>
      </header>

      {/* Chat area with subtle pattern */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.02\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
      >
        {/* Date separator */}
        <div className="flex justify-center mb-4">
          <span className="rounded-lg bg-[#0f2847] px-3 py-1 text-[11px] text-slate-400 shadow">{today}</span>
        </div>

        {/* Welcome / empty state */}
        {messages.length === 0 && (
          <div className="flex justify-start max-w-2xl mx-auto mb-2">
            <div className="relative max-w-[80%] rounded-lg rounded-tl-none bg-[#0f2847] px-3 py-2 text-slate-100 shadow-md">
              <p className="text-sm leading-relaxed">Hello! Welcome to Gemini Nexus support. Send a message and an agent will reply here in real time.</p>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-2 max-w-2xl mx-auto">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative max-w-[80%] rounded-lg px-3 py-2 shadow-md ${
                  m.sender === 'user'
                    ? 'bg-[#0c5f4a] text-white rounded-tr-none'
                    : 'bg-[#0f2847] text-slate-100 rounded-tl-none'
                }`}
              >
                {/* Tail */}
                <div
                  className={`absolute top-0 w-0 h-0 ${
                    m.sender === 'user'
                      ? 'right-[-8px] border-l-[8px] border-l-[#0c5f4a] border-t-[8px] border-t-transparent'
                      : 'left-[-8px] border-r-[8px] border-r-[#0f2847] border-t-[8px] border-t-transparent'
                  }`}
                />
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{renderContent(m.text)}</p>
                <div className={`flex items-center gap-1 mt-1 ${m.sender === 'user' ? 'justify-end' : ''}`}>
                  <span className="text-[10px] text-slate-400">{m.time}</span>
                  {m.sender === 'user' && (
                    <CheckCheck className={`size-4 ${m.read ? 'text-cyan-400' : 'text-slate-500'}`} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input bar - WhatsApp style */}
      <div className="border-t border-white/10 bg-[#0a1929] px-3 py-2">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 text-slate-400 hover:text-cyan-300 transition disabled:opacity-50"><Paperclip className="size-5" /></button>
          <button className="p-2 text-slate-400 hover:text-cyan-300 transition"><Smile className="size-5" /></button>
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
          {input.trim() ? (
            <button onClick={send} disabled={sending} className="flex size-10 items-center justify-center rounded-full bg-cyan-500 text-white hover:bg-cyan-400 transition disabled:opacity-50">
              <Send className="size-5" />
            </button>
          ) : (
            <button className="flex size-10 items-center justify-center rounded-full bg-cyan-500 text-white hover:bg-cyan-400 transition">
              <Mic className="size-5" />
            </button>
          )}
        </div>
      </div>
    </main>
  )
}
