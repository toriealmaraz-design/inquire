'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, X, Send, MessageCircle, RotateCcw, FileText, BookOpen } from 'lucide-react'
import { bestReply } from '@/lib/chatbot-match'
import { TICKET_RE } from '@/lib/fields'
import { levelOf, ROLE_NAME, searchManual, type Level } from '@/lib/manual'

type Reply = { id: number; question: string; keywords: string; reply: string }
type Line = { from: 'bot' | 'me'; text: string; handoff?: string; brief?: boolean; manual?: boolean }

const HISTORY_KEY = 'nexa_bot_history'
// Nexa is available everywhere except the sign-in flow and the live-chat page itself.
const HIDDEN_ON = ['/auth', '/chat']

const GREETINGS = /^(hi|hello|hey|good (morning|afternoon|evening)|yo|hiya)\b/i
const THANKS = /\b(thanks|thank you|thx|ok(ay)?|cool|great)\b/i
const HUMAN = /\b(human|person|agent|admin|someone|real person|talk to|speak to|call)\b/i
const BRIEF = /\b(start|submit|new brief|order|request|get started|place an order)\b/i

const match = (text: string, replies: Reply[]) => bestReply(text, replies) as Reply | null

type Me = { signedIn: boolean; role?: string | null }

export function ChatbotWidget() {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const [replies, setReplies] = useState<Reply[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const staff = !!me?.signedIn
  const level: Level = levelOf(me?.role)
  const welcome: Line = staff
    ? { from: 'bot', text: `Hi! I'm Nexa, your ${ROLE_NAME[level]} assistant. Ask me how to do anything in your dashboard — assignments, commission, assigning jobs, payments, settings — and I'll answer from the staff manual for your role.` }
    : { from: 'bot', text: "Hi! I'm Nexa, the Gemini Nexus assistant. Ask me about prices, deadlines, files or payment, type your ticket number (like AC-2610-001) to check a brief, or pick a question below." }

  // Who's using Nexa? (drives role-aware answers)
  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then((d) => setMe({ signedIn: !!d.signedIn, role: d.role })).catch(() => setMe({ signedIn: false }))
  }, [])

  // Keep the conversation while moving around the site
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || 'null')
      if (Array.isArray(saved) && saved.length) setLines(saved)
    } catch {}
  }, [])
  useEffect(() => {
    if (lines.length) sessionStorage.setItem(HISTORY_KEY, JSON.stringify(lines.slice(-40)))
  }, [lines])

  // Show the (role-aware) welcome once we know who's here and there's no saved history
  useEffect(() => {
    if (me && !lines.length) setLines([welcome])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])

  useEffect(() => {
    if (!open || replies.length) return
    fetch('/api/chatbot').then((r) => (r.ok ? r.json() : { replies: [] })).then((d) => setReplies(d.replies || [])).catch(() => {})
  }, [open, replies.length])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (open) inputRef.current?.focus()
  }, [lines, open, typing])

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null

  const respond = async (q: string, picked?: Reply): Promise<Line> => {
    if (picked) return { from: 'bot', text: picked.reply }

    const ticket = q.match(TICKET_RE)
    if (ticket) {
      try {
        const res = await fetch(`/api/ticket?id=${encodeURIComponent(ticket[0])}`)
        const d = await res.json()
        if (d.found) return { from: 'bot', text: `“${d.title}” (${d.ticketId}) is currently: ${d.status}.`, handoff: `Hi, I'd like an update on my brief ${d.ticketId}.` }
        return { from: 'bot', text: `I couldn't find ${ticket[0]}. Please check the number.`, handoff: `Hi, I can't find my brief ${ticket[0]}.` }
      } catch {
        return { from: 'bot', text: "I couldn't check that ticket right now. Please ask our team in Live Chat.", handoff: `Hi, can you check my brief ${ticket[0]}?` }
      }
    }

    // Signed-in staff: answer from the role-scoped manual first.
    if (staff) {
      const hits = searchManual(q, level, 1)
      if (hits.length) return { from: 'bot', text: `${hits[0].title}\n\n${hits[0].text}`, manual: true }
      const kb = match(q, replies)
      if (kb) return { from: 'bot', text: kb.reply }
      if (GREETINGS.test(q)) return { from: 'bot', text: 'Hello! Ask me how to do something in your dashboard and I\'ll walk you through it.' }
      if (THANKS.test(q) && q.length < 25) return { from: 'bot', text: 'Anytime! Anything else?' }
      return { from: 'bot', text: "I couldn't find that in the manual for your role. Open the full manual for more, or ask the super admin.", manual: true }
    }

    // Clients / visitors: knowledge base + handoff to live chat.
    const hit = match(q, replies)
    if (hit) return { from: 'bot', text: hit.reply }
    if (HUMAN.test(q)) return { from: 'bot', text: 'Sure, our team is available in Live Chat. Your question will be ready to send.', handoff: q }
    if (BRIEF.test(q)) return { from: 'bot', text: 'You can submit a brief on the homepage in three quick steps (track, details, contact). You get a custom GHS quote with no deposit.', brief: true }
    if (GREETINGS.test(q)) return { from: 'bot', text: 'Hello! How can I help? You can ask about prices, deadlines, files, payment or your brief status.' }
    if (THANKS.test(q) && q.length < 25) return { from: 'bot', text: "You're welcome! Anything else I can help with?" }

    fetch('/api/chatbot/miss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q }) }).catch(() => {})
    return { from: 'bot', text: "I'm not sure about that one. Our team can answer it in Live Chat. I'll pass your question along.", handoff: q }
  }

  const ask = async (text: string, picked?: Reply) => {
    const q = text.trim()
    if (!q || typing) return
    setInput('')
    setLines((l) => [...l, { from: 'me', text: q }])
    setTyping(true)
    const [reply] = await Promise.all([respond(q, picked), new Promise((r) => setTimeout(r, 350))])
    setTyping(false)
    setLines((l) => [...l, reply])
  }

  const reset = () => {
    setLines([welcome])
    sessionStorage.removeItem(HISTORY_KEY)
  }

  // Suggestions: staff get common manual topics for their level; clients get KB questions.
  const asked = new Set(lines.filter((l) => l.from === 'me').map((l) => l.text.toLowerCase()))
  const staffSuggest = ['My assignments', 'Commission and earnings', 'Assign a job to an agent', 'Mark a job paid', 'Post an announcement', 'Upload logo and favicon']
  const suggestions: { label: string; reply?: Reply }[] = staff
    ? staffSuggest.filter((s) => !asked.has(s.toLowerCase())).slice(0, 5).map((label) => ({ label }))
    : replies.filter((r) => !asked.has(r.question.toLowerCase())).slice(0, 5).map((r) => ({ label: r.question, reply: r }))

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Nexa AI assistant"
          className="fixed bottom-24 right-4 z-50 flex h-[min(580px,calc(100dvh-8rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0a1929] shadow-2xl shadow-black/50"
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500"><Bot className="size-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Nexa AI</p>
              <p className="text-[11px] text-emerald-300">{staff ? `${ROLE_NAME[level]} assistant` : 'Instant answers, 24/7'}</p>
            </div>
            <button onClick={reset} aria-label="Start over" title="Start over" className="rounded-full p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><RotateCcw className="size-4" /></button>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-full p-1 text-slate-400 hover:bg-white/5 hover:text-white"><X className="size-5" /></button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4" aria-live="polite">
            {lines.map((l, i) => (
              <div key={i} className={`flex ${l.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${l.from === 'me' ? 'rounded-br-md bg-[#0c5f4a] text-white' : 'rounded-bl-md bg-[#0f2847] text-slate-100'}`}>
                  {l.text}
                  {l.handoff !== undefined && (
                    <a href={`/chat?msg=${encodeURIComponent(l.handoff)}`} className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300">
                      <MessageCircle className="size-3.5" /> Continue in Live Chat
                    </a>
                  )}
                  {l.brief && (
                    <a href="/#intake" onClick={() => setOpen(false)} className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300">
                      <FileText className="size-3.5" /> Start a brief
                    </a>
                  )}
                  {l.manual && (
                    <a href="/help" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-white/15">
                      <BookOpen className="size-3.5" /> Open the full manual
                    </a>
                  )}
                </div>
              </div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-md bg-[#0f2847] px-3 py-3" aria-label="Nexa is typing">
                  {[0, 150, 300].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />)}
                </div>
              </div>
            )}

            {!typing && suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {suggestions.map((s) => (
                  <button key={s.label} onClick={() => ask(s.label, s.reply)} className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-left text-xs text-cyan-100 hover:bg-cyan-300/20">
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-white/10 p-3">
            <form onSubmit={(e) => { e.preventDefault(); ask(input) }} className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={staff ? 'Ask how to do something…' : 'Ask a question or type your ticket no.…'}
                aria-label="Ask Nexa"
                maxLength={300}
                className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
              />
              <button type="submit" disabled={!input.trim() || typing} aria-label="Send" className="flex size-10 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400">
                <Send className="size-4" />
              </button>
            </form>
            {!staff && <a href="/chat" className="mt-2 block text-center text-[11px] text-slate-400 hover:text-cyan-200">Prefer a person? Open Live Chat →</a>}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Nexa' : 'Open Nexa AI'}
        aria-expanded={open}
        className="fixed bottom-5 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-xl shadow-cyan-500/30 transition hover:scale-105"
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </button>
    </>
  )
}
