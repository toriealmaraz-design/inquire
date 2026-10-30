'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Quote, Send, Star } from 'lucide-react'
import { BrandLogo } from '@/components/branding'

type Item = { id: number; name: string; role: string | null; rating: number; body: string; createdAt: string }

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type={onChange ? 'button' : undefined}
          onClick={onChange ? () => onChange(n) : undefined}
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <Star className={`size-4 ${n <= value ? 'fill-amber-300 text-amber-300' : 'text-slate-600'}`} />
        </button>
      ))}
    </div>
  )
}

export default function FeedbackPage() {
  const [items, setItems] = useState<Item[]>([])
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [rating, setRating] = useState(5)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/testimonials').then((r) => r.json()).then((d) => Array.isArray(d) && setItems(d)).catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, rating, body }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Could not send your feedback.')
      setMsg({ ok: true, text: 'Thank you! Your feedback was received and will appear once reviewed.' })
      setName(''); setRole(''); setBody(''); setRating(5)
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Something went wrong.' })
    } finally {
      setBusy(false)
    }
  }

  const field = 'w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/60'

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#06121d] text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#06121d]/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="/" className="flex items-center gap-3">
            <BrandLogo width={40} height={40} className="size-10 rounded-xl object-cover" />
            <span><strong className="block text-sm tracking-tight">Gemini Nexus</strong><small className="block text-[10px] uppercase tracking-[.2em] text-slate-500">Customer feedback</small></span>
          </a>
          <a href="/" className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-400 hover:border-cyan-300/40 hover:text-cyan-300"><ArrowLeft className="size-4" /> Home</a>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 py-14 lg:px-8">
        <h1 className="text-4xl font-bold tracking-[-.04em] text-white sm:text-5xl">What our clients say</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">Real feedback from people we&rsquo;ve worked with — and a space for you to share yours.</p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Testimonials */}
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
                No reviews published yet. Be the first to leave feedback.
              </div>
            ) : (
              items.map((t) => (
                <figure key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <Quote className="size-5 text-cyan-300/60" />
                  <blockquote className="mt-2 text-sm leading-6 text-slate-200">{t.body}</blockquote>
                  <figcaption className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-slate-400"><strong className="text-slate-200">{t.name}</strong>{t.role ? ` · ${t.role}` : ''}</span>
                    <Stars value={t.rating} />
                  </figcaption>
                </figure>
              ))
            )}
          </div>

          {/* Submit form */}
          <form onSubmit={submit} className="h-fit rounded-3xl border border-white/15 bg-white/[0.06] p-6 shadow-2xl shadow-black/20 backdrop-blur-2xl lg:sticky lg:top-24">
            <h2 className="text-lg font-bold text-white">Leave feedback</h2>
            <p className="mt-1 text-xs text-slate-500">Submissions are reviewed before they appear publicly.</p>
            <div className="mt-5 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required placeholder="Your name" className={field} />
              <input value={role} onChange={(e) => setRole(e.target.value)} maxLength={120} placeholder="Role or organisation (optional)" className={field} />
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 px-4 py-3">
                <span className="text-sm text-slate-300">Your rating</span>
                <Stars value={rating} onChange={setRating} />
              </div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} required placeholder="Tell us about your experience…" className={`${field} min-h-32 resize-y`} />
              <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50">
                <Send className="size-4" /> {busy ? 'Sending…' : 'Submit feedback'}
              </button>
            </div>
            {msg && <p role="status" className={`mt-3 text-xs ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.text}</p>}
          </form>
        </div>
      </section>
    </main>
  )
}
