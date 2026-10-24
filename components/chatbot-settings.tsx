'use client'

import { useEffect, useState } from 'react'
import { Bot, Plus, Trash2, Save, Check, ChevronUp, ChevronDown } from 'lucide-react'

type Item = { question: string; keywords: string; reply: string; enabled: boolean }

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const field = 'w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50'

/** Super admin editor for the chatbot + live-chat automatic replies */
export function ChatbotSettings() {
  const [greeting, setGreeting] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/chatbot?scope=admin')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setGreeting(d.greeting || '')
        setEnabled(d.autoReplyEnabled !== false)
        setItems((d.replies || []).map((r: Item) => ({ question: r.question, keywords: r.keywords, reply: r.reply, enabled: r.enabled })))
      })
      .finally(() => setLoading(false))
  }, [])

  const update = (i: number, patch: Partial<Item>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)))
  const move = (i: number, dir: -1 | 1) =>
    setItems((list) => {
      const j = i + dir
      if (j < 0 || j >= list.length) return list
      const next = [...list]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const save = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const res = await fetch('/api/chatbot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ greeting, autoReplyEnabled: enabled, replies: items }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Could not save.')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold"><Bot className="size-4 text-cyan-300" /> Chatbot &amp; automatic replies</h2>
          <p className="mt-1 text-xs text-slate-500">
            These answers power the homepage assistant and reply automatically in Live Chat when a client's message contains a keyword.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4 accent-cyan-500" />
          Auto-reply in Live Chat
        </label>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <label className="mt-5 block text-xs font-medium text-slate-400">Greeting (sent automatically on a client's first message)</label>
          <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={2} maxLength={600} className={`${field} mt-2 py-2`} />

          <div className="mt-6 flex flex-col gap-3">
            {items.map((it, i) => (
              <div key={i} className={`rounded-2xl border p-4 ${it.enabled ? 'border-white/10 bg-white/5' : 'border-white/5 bg-white/[0.02] opacity-60'}`}>
                <div className="flex items-center gap-2">
                  <input value={it.question} onChange={(e) => update(i, { question: e.target.value })} placeholder="Question shown as a button" maxLength={120} className={`${field} h-10 flex-1 font-medium`} />
                  <button onClick={() => move(i, -1)} aria-label="Move up" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5"><ChevronUp className="size-4" /></button>
                  <button onClick={() => move(i, 1)} aria-label="Move down" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5"><ChevronDown className="size-4" /></button>
                  <button onClick={() => setItems((l) => l.filter((_, j) => j !== i))} aria-label="Delete answer" className="rounded-lg p-1.5 text-rose-300 hover:bg-rose-500/10"><Trash2 className="size-4" /></button>
                </div>
                <input value={it.keywords} onChange={(e) => update(i, { keywords: e.target.value })} placeholder="Keywords, comma separated: price, cost, how much" className={`${field} mt-2 h-10 font-mono text-xs`} />
                <textarea value={it.reply} onChange={(e) => update(i, { reply: e.target.value })} placeholder="Answer" rows={3} maxLength={1500} className={`${field} mt-2 py-2`} />
                <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                  <input type="checkbox" checked={it.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} className="accent-cyan-500" /> Active
                </label>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button onClick={() => setItems((l) => [...l, { question: '', keywords: '', reply: '', enabled: true }])} className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-sm hover:border-cyan-300/50">
              <Plus className="size-4" /> Add answer
            </button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50">
              <Save className="size-4" /> {saving ? 'Saving…' : 'Save chatbot'}
            </button>
            {saved && <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="size-4" /> Saved</span>}
            {error && <span role="alert" className="text-xs text-rose-300">{error}</span>}
          </div>
        </>
      )}
    </div>
  )
}
