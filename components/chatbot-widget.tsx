'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, X, Send, MessageCircle } from 'lucide-react'

type Reply = { id: number; question: string; keywords: string; reply: string }
type Line = { from: 'bot' | 'me'; text: string; handoff?: boolean }

const FALLBACK = "I'm not sure about that one. Our team can help you directly in Live Chat."

// Simple keyword matching: no AI service, works for free and instantly
function answer(text: string, replies: Reply[]): Reply | null {
  const msg = text.toLowerCase()
  let best: { r: Reply; score: number } | null = null
  for (const r of replies) {
    const score = r.keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 1 && msg.includes(k))
      .reduce((s, k) => s + k.length, 0)
    if (score > 0 && (!best || score > best.score)) best = { r, score }
  }
  return best?.r ?? null
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [replies, setReplies] = useState<Reply[]>([])
  const [lines, setLines] = useState<Line[]>([
    { from: 'bot', text: "Hi! I'm the Gemini Nexus assistant. Ask me about prices, deadlines, files or payment, or pick a question below." },
  ])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || replies.length) return
    fetch('/api/chatbot')
      .then((r) => (r.ok ? r.json() : { replies: [] }))
      .then((d) => setReplies(d.replies || []))
      .catch(() => {})
  }, [open, replies.length])

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [lines, open])

  const ask = (text: string, picked?: Reply) => {
    const q = text.trim()
    if (!q) return
    const hit = picked ?? answer(q, replies)
    setLines((l) => [...l, { from: 'me', text: q }, hit ? { from: 'bot', text: hit.reply } : { from: 'bot', text: FALLBACK, handoff: true }])
    setInput('')
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Gemini Nexus assistant"
          className="fixed bottom-24 right-4 z-50 flex h-[min(560px,calc(100dvh-8rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0a1929] shadow-2xl shadow-black/50"
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500"><Bot className="size-5" /></div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Nexus Assistant</p>
              <p className="text-[11px] text-emerald-300">Instant answers</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-full p-1 text-slate-400 hover:bg-white/5 hover:text-white">
              <X className="size-5" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
            {lines.map((l, i) => (
              <div key={i} className={`flex ${l.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${l.from === 'me' ? 'rounded-br-md bg-[#0c5f4a] text-white' : 'rounded-bl-md bg-[#0f2847] text-slate-100'}`}>
                  {l.text}
                  {l.handoff && (
                    <a href="/chat" className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300">
                      <MessageCircle className="size-3.5" /> Talk to our team
                    </a>
                  )}
                </div>
              </div>
            ))}

            {replies.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {replies.slice(0, 7).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => ask(r.question, r)}
                    className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-left text-xs text-cyan-100 hover:bg-cyan-300/20"
                  >
                    {r.question}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-white/10 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                ask(input)
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question…"
                aria-label="Ask the assistant"
                maxLength={300}
                className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50"
              />
              <button type="submit" disabled={!input.trim()} aria-label="Send" className="flex size-10 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-400">
                <Send className="size-4" />
              </button>
            </form>
            <a href="/chat" className="mt-2 block text-center text-[11px] text-slate-400 hover:text-cyan-200">Prefer a person? Open Live Chat →</a>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        aria-expanded={open}
        className="fixed bottom-5 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-xl shadow-cyan-500/30 transition hover:scale-105"
      >
        {open ? <X className="size-6" /> : <Bot className="size-6" />}
      </button>
    </>
  )
}
