'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Send, ArrowLeft, Paperclip, CheckCheck, Check, FileText, Download, Loader2, AlertCircle, X, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PRESENCE_CHANNEL } from '@/components/support-presence'

type Message = {
  id: number | string
  text: string
  sender: 'user' | 'agent'
  createdAt: string
  read?: boolean
  pending?: boolean
}

type DbMessage = {
  id: number
  conversation_id: number
  sender_type: string
  content: string
  read: boolean | null
  created_at: string
}

type Stored = { name: string; contact?: string; convoId: number | null; named?: boolean }

const STORAGE_KEY = 'inquire_client'
const MAX_FILE_BYTES = 50 * 1024 * 1024
const QUICK_STARTS = ['I need a quote for an assignment', 'I want to check on my brief', 'I have an urgent deadline']

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

function dayLabel(iso: string) {
  const d = new Date(iso)
  if (d.toDateString() === new Date().toDateString()) return 'Today'
  if (d.toDateString() === new Date(Date.now() - 86_400_000).toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

const rowToMessage = (r: DbMessage): Message => ({
  id: r.id,
  text: r.content,
  sender: r.sender_type === 'client' ? 'user' : 'agent',
  createdAt: r.created_at,
  read: r.read ?? false,
})

// "📎 name\nurl" -> file card
function parseFile(text: string) {
  const m = text.match(/^📎 (.+)\n(https?:\/\/\S+)$/)
  return m ? { name: m[1], url: m[2], isImage: /\.(png|jpe?g|gif|webp|avif)$/i.test(m[1]) } : null
}

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline text-cyan-300 hover:text-cyan-200">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

const displayName = (p: Stored | null) => (!p ? 'Client' : p.contact ? `${p.name} (${p.contact})` : p.name)

export default function ChatPage() {
  const supabase = useMemo(
    () => (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? createClient() : null),
    []
  )
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [online, setOnline] = useState<boolean | null>(null)
  const [convoId, setConvoId] = useState<number | null>(null)
  const [profile, setProfile] = useState<Stored | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [contactDraft, setContactDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  const save = (next: Stored) => {
    setProfile(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  // Persistent client identity
  useEffect(() => {
    let stored: Stored | null = null
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    } catch {}
    if (!stored?.name) stored = { name: `Client #${Math.floor(1000 + Math.random() * 9000)}`, convoId: null }
    save(stored)
    if (stored.convoId) setConvoId(stored.convoId)
    setNameDraft(stored.named ? stored.name : '')
    setContactDraft(stored.contact || '')
  }, [])

  // Real "online": is any admin on the chat console or dashboard right now?
  useEffect(() => {
    if (!supabase) return
    const channel = supabase.channel(PRESENCE_CHANNEL)
    const update = () => setOnline(Object.keys(channel.presenceState()).some((k) => k.startsWith('staff-')))
    channel.on('presence', { event: 'sync' }, update).subscribe((status) => {
      if (status === 'SUBSCRIBED') setTimeout(update, 1500)
    })
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // History + realtime (new messages and read receipts)
  useEffect(() => {
    if (!supabase || !convoId) return
    let active = true
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convoId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (active && data) setMessages((data as DbMessage[]).map(rowToMessage))
      })

    const filter = `conversation_id=eq.${convoId}`
    const channel = supabase
      .channel(`chat-client-${convoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter }, (payload) => {
        const r = payload.new as DbMessage
        setMessages((prev) => (prev.some((m) => m.id === r.id) ? prev : [...prev, rowToMessage(r)]))
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter }, (payload) => {
        const r = payload.new as DbMessage
        setMessages((prev) => prev.map((m) => (m.id === r.id ? { ...m, read: r.read ?? m.read } : m)))
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [convoId, supabase])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, uploadName])

  // Auto-grow the composer
  useEffect(() => {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [input])

  const ensureConversation = useCallback(async (): Promise<number | null> => {
    if (!supabase || !profile) return null
    if (convoId) return convoId
    const { data, error } = await supabase
      .from('conversations')
      .insert({ client_name: displayName(profile), status: 'active' })
      .select('id')
      .single()
    if (error || !data) return null
    const id = data.id as number
    setConvoId(id)
    save({ ...profile, convoId: id })
    return id
  }, [convoId, profile, supabase])

  const postMessage = async (content: string, tmpId?: string) => {
    if (!supabase) return false
    const id = await ensureConversation()
    if (!id) return false
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: id, sender_type: 'client', content, read: false })
      .select('*')
      .single()
    if (error || !data) return false
    const r = data as DbMessage
    setMessages((prev) => {
      const rest = prev.filter((m) => m.id !== tmpId)
      return rest.some((m) => m.id === r.id) ? rest : [...rest, rowToMessage(r)]
    })
    supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', id).then(() => {})
    return true
  }

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim()
    if (!text || sending) return
    if (!supabase) return setError('Chat is not available right now. Please use WhatsApp from the homepage.')
    setSending(true)
    setError('')
    if (!preset) setInput('')
    const tmpId = `tmp-${Date.now()}`
    setMessages((prev) => [...prev, { id: tmpId, text, sender: 'user', createdAt: new Date().toISOString(), pending: true }])
    const ok = await postMessage(text, tmpId)
    if (!ok) {
      setMessages((prev) => prev.filter((m) => m.id !== tmpId))
      setInput(text)
      setError("Your message didn't send. Check your connection and try again.")
    }
    setSending(false)
    textRef.current?.focus()
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !supabase || uploadName) return
    if (file.size > MAX_FILE_BYTES) return setError('That file is over 50 MB. Please compress it or send a link instead.')
    setError('')
    setUploadName(file.name)
    try {
      const id = await ensureConversation()
      if (!id) throw new Error()
      const path = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: upErr } = await supabase.storage.from('uploads').upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr
      const url = supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl
      await supabase.from('uploads').insert({
        conversation_id: id,
        file_name: file.name,
        file_url: url,
        file_type: file.type || null,
        file_size: file.size,
        uploaded_by: 'client',
      })
      if (!(await postMessage(`📎 ${file.name}\n${url}`))) throw new Error()
    } catch {
      setError(`We couldn't upload ${file.name}. Please try again.`)
    } finally {
      setUploadName('')
    }
  }

  const saveName = async () => {
    if (!profile) return
    const next = {
      ...profile,
      name: nameDraft.trim().slice(0, 60) || profile.name,
      contact: contactDraft.trim().slice(0, 40),
      named: !!nameDraft.trim() || profile.named,
    }
    save(next)
    setEditingName(false)
    if (convoId && supabase) await supabase.from('conversations').update({ client_name: displayName(next) }).eq('id', convoId)
  }

  // Group messages under day headers
  const groups = useMemo(() => {
    const out: { day: string; items: Message[] }[] = []
    for (const m of messages) {
      const day = dayLabel(m.createdAt)
      if (out.at(-1)?.day !== day) out.push({ day, items: [] })
      out.at(-1)!.items.push(m)
    }
    return out
  }, [messages])

  const statusText =
    online === null ? 'Connecting…' : online ? 'Online now · usually replies in minutes' : "Away · leave a message, we'll reply here"

  return (
    <main className="flex h-[100dvh] flex-col bg-[#06121d] text-white">
      {/* Header */}
      <header className="shrink-0 border-b border-white/10 bg-[#0a1929]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <a href="/" aria-label="Back to homepage" className="rounded-full p-1 text-slate-400 hover:bg-white/5 hover:text-white">
            <ArrowLeft className="size-5" />
          </a>
          <div className="relative">
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-sm font-bold">GN</div>
            <span className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-[#0a1929] ${online ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold">Gemini Nexus Support</h1>
            <p className={`truncate text-xs ${online ? 'text-emerald-400' : 'text-slate-400'}`} aria-live="polite">{statusText}</p>
          </div>
          <button
            onClick={() => setEditingName((v) => !v)}
            aria-expanded={editingName}
            className="flex max-w-[40%] items-center gap-1 truncate rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
          >
            <Pencil className="size-3 shrink-0" /> <span className="truncate">{profile?.named ? profile.name : 'Add your name'}</span>
          </button>
        </div>

        {editingName && (
          <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 pb-3 sm:flex-row">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your name"
              aria-label="Your name"
              autoFocus
              className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-cyan-500/50"
            />
            <input
              value={contactDraft}
              onChange={(e) => setContactDraft(e.target.value)}
              placeholder="WhatsApp / phone (optional)"
              aria-label="WhatsApp or phone number"
              inputMode="tel"
              className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm outline-none focus:border-cyan-500/50"
            />
            <button onClick={saveName} className="h-10 rounded-xl bg-cyan-500 px-4 text-sm font-bold text-slate-950 hover:bg-cyan-400">
              Save
            </button>
          </div>
        )}
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          {messages.length === 0 && (
            <div className="mx-auto mt-6 max-w-md text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/20 to-indigo-500/20 text-xl font-bold text-cyan-200">GN</div>
              <h2 className="mt-4 text-lg font-semibold">Chat with our team</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Tell us what you need. Attach your brief, slides or files with the clip. Replies appear here, so you can come back to this page any time on this device.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {QUICK_STARTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={sending}
                    className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {groups.map((g) => (
            <div key={g.day} className="flex flex-col gap-2">
              <div className="my-2 flex justify-center">
                <span className="rounded-lg bg-[#0f2847] px-3 py-1 text-[11px] text-slate-400">{g.day}</span>
              </div>
              {g.items.map((m) => {
                const mine = m.sender === 'user'
                const file = parseFile(m.text)
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-md sm:max-w-[70%] ${
                        mine ? 'rounded-br-md bg-[#0c5f4a]' : 'rounded-bl-md bg-[#0f2847]'
                      } ${m.pending ? 'opacity-70' : ''}`}
                    >
                      {!mine && <p className="mb-0.5 text-[11px] font-semibold text-cyan-300">Gemini Nexus</p>}
                      {file ? (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="block">
                          {file.isImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={file.url} alt={file.name} loading="lazy" className="mb-2 max-h-64 w-full rounded-xl object-cover" />
                          )}
                          <span className="flex items-center gap-3 rounded-xl bg-black/20 p-2.5">
                            <FileText className="size-5 shrink-0 text-cyan-300" />
                            <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                            <Download className="size-4 shrink-0 text-slate-300" />
                          </span>
                        </a>
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          <Linkified text={m.text} />
                        </p>
                      )}
                      <div className={`mt-1 flex items-center gap-1 ${mine ? 'justify-end' : ''}`}>
                        <span className="text-[10px] text-slate-400">{fmtTime(m.createdAt)}</span>
                        {mine &&
                          (m.pending ? (
                            <Loader2 className="size-3 animate-spin text-slate-400" aria-label="Sending" />
                          ) : m.read ? (
                            <CheckCheck className="size-4 text-cyan-400" aria-label="Read" />
                          ) : (
                            <Check className="size-4 text-slate-400" aria-label="Sent" />
                          ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {uploadName && (
            <div className="flex justify-end">
              <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-br-md bg-[#0c5f4a]/70 px-3 py-2.5 text-sm">
                <Loader2 className="size-4 shrink-0 animate-spin" /> <span className="truncate">Uploading {uploadName}…</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-white/10 bg-[#0a1929] px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {error && (
          <div role="alert" className="mx-auto mb-2 flex max-w-3xl items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')} aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!!uploadName}
            aria-label="Attach a file"
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/5 hover:text-cyan-300 disabled:opacity-50"
          >
            <Paperclip className="size-5" />
          </button>
          <textarea
            ref={textRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="Type a message"
            aria-label="Message"
            rows={1}
            maxLength={4000}
            className="min-h-11 flex-1 resize-none rounded-2xl border border-white/10 bg-[#0f2847] px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
          />
          <button
            onClick={() => send()}
            disabled={sending || !input.trim()}
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400"
          >
            {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
          </button>
        </div>
        <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-slate-500">Files up to 50 MB · kept for 7 days · only our admins can see them</p>
      </div>
    </main>
  )
}
