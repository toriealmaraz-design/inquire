'use client'

import { useEffect, useState } from 'react'
import { Check, EyeOff, Star, Trash2 } from 'lucide-react'

type Item = { id: number; name: string; role: string | null; rating: number; body: string; status: string; createdAt: string }

/** Admin moderation for public customer feedback / testimonials. */
export function FeedbackManager() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/testimonials?all=1')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setItems(d); else setError(d.error || 'Could not load feedback.') })
      .catch(() => setError('Could not load feedback.'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const act = async (id: number, action: 'approve' | 'hide' | 'delete') => {
    if (action === 'delete' && !window.confirm('Delete this feedback permanently?')) return
    const res = await fetch('/api/testimonials', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    })
    if (!res.ok) return
    if (action === 'delete') setItems((xs) => xs.filter((x) => x.id !== id))
    else setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: action === 'approve' ? 'approved' : 'hidden' } : x)))
  }

  const badge: Record<string, string> = {
    pending: 'bg-amber-300/15 text-amber-200',
    approved: 'bg-emerald-300/15 text-emerald-200',
    hidden: 'bg-slate-500/20 text-slate-300',
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold">Customer feedback</h2>
      <p className="mt-1 text-xs text-slate-500">Approve feedback to publish it on the public Feedback page. Pending items are not shown to visitors.</p>
      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No feedback submitted yet.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((t) => (
            <div key={t.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{t.name}</span>
                  {t.role && <span className="text-xs text-slate-500">· {t.role}</span>}
                  <span className="flex items-center gap-0.5 text-amber-300">
                    {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="size-3 fill-amber-300" />)}
                  </span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${badge[t.status] || badge.hidden}`}>{t.status}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{t.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {t.status !== 'approved' && (
                  <button onClick={() => act(t.id, 'approve')} className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30"><Check className="size-3.5" /> Approve</button>
                )}
                {t.status === 'approved' && (
                  <button onClick={() => act(t.id, 'hide')} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/15"><EyeOff className="size-3.5" /> Hide</button>
                )}
                <button onClick={() => act(t.id, 'delete')} className="flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-500/25"><Trash2 className="size-3.5" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
