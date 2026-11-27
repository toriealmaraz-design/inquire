'use client'

import { useState } from 'react'
import { Check, Send, Star } from 'lucide-react'

/** Compact one-tap rating for delivered tickets. Posts through the existing public testimonials API. */
export function PostDeliveryRating({ ticketId }: { ticketId: string }) {
  const [rating, setRating] = useState(5)
  const [name, setName] = useState('')
  const [review, setReview] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const field = 'h-10 w-full rounded-xl border border-[rgba(0,240,255,0.14)] bg-[#060B14]/50 px-3 text-sm text-[#F8FAFC] outline-none placeholder:text-[#94A3B8] focus:border-[#00F0FF]/60'

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || done) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Client',
          role: `Ticket ${ticketId}`,
          rating,
          body: review.trim() || `Great experience with ticket ${ticketId}.`,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not send your rating.')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your rating.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div role="status" className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">
        <Check className="size-5 shrink-0 text-emerald-300" />
        <span>Thank you! Your {rating}-star rating for <span className="font-mono text-emerald-200">{ticketId}</span> was received. It will appear once reviewed.</span>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-2xl border border-[rgba(0,240,255,0.14)] bg-white/[.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#00F0FF]">How did we do?</p>
          <p className="mt-1 text-[11px] text-[#94A3B8]">Delivered — tap a star, add a line if you like.</p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-pressed={rating === n}
              className="rounded-lg p-0.5 transition hover:scale-110"
            >
              <Star className={`size-6 ${n <= rating ? 'fill-amber-300 text-amber-300' : 'text-[#94A3B8]'}`} />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Display name (optional)" aria-label="Display name (optional)" className={field} />
        <input value={review} onChange={(e) => setReview(e.target.value)} maxLength={180} placeholder="One sentence about your experience (optional)" aria-label="One sentence about your experience (optional)" className={field} />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] text-[#94A3B8]">Optional, and separate from delivery sign-off. Reviews are published after a quick check.</span>
        <button type="submit" disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-[#00F0FF] px-4 py-2 text-xs font-bold text-[#060B14] hover:bg-[#F8FAFC] disabled:opacity-50">
          {busy ? 'Sending now' : <><Send className="size-3.5" /> Send rating</>}
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-rose-300">{error}</p>}
    </form>
  )
}
