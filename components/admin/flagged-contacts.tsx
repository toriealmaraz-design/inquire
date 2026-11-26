'use client'

import { useState } from 'react'
import { AlertTriangle, Plus, Trash2 } from 'lucide-react'

export type Flag = {
  id: number
  phone: string
  phoneKey: string
  reason: string
  note: string | null
  createdAt: string
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

/** Admin-managed high-risk contact list. Flags are matched by the dashboard's client-folder key. */
export function FlaggedContacts({ flags, onUpdate }: { flags: Flag[]; onUpdate: (flags: Flag[]) => void }) {
  const [phone, setPhone] = useState('')
  const [reason, setReason] = useState('Spam briefs')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const add = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || !phone.trim()) return
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/flagged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, reason, note }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not save the flag.')
      const list = await fetch('/api/admin/flagged').then((r) => r.json()).catch(() => ({ flags: [] }))
      onUpdate(Array.isArray(list.flags) ? list.flags : [])
      setPhone('')
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the flag.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    try {
      await fetch('/api/admin/flagged', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
      onUpdate(flags.filter((flag) => flag.id !== id))
    } catch {
      setError('Could not remove the flag.')
    }
  }

  const field = 'h-9 rounded-lg border border-white/10 bg-[#0a0f1c]/80 px-2.5 text-xs text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50'

  return (
    <section className={`${glass} rounded-2xl p-4 sm:p-5`} aria-label="High-risk contact flags">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-rose-200"><AlertTriangle className="size-3.5" /> High-risk contacts <span className="rounded-full bg-rose-400/15 px-2 py-0.5 text-rose-100">{flags.length}</span></p>
        <p className="text-[10px] text-slate-500">Warns you when a flagged phone or handle appears in Submissions.</p>
      </div>

      <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)_minmax(0,1.4fr)_auto]">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone or @handle" aria-label="Phone or handle to flag" className={field} />
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" aria-label="Flag reason" className={field} />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" aria-label="Optional note" className={field} />
        <button type="submit" disabled={busy} className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-300/30 bg-rose-400/10 px-3 text-xs font-bold text-rose-100 transition hover:bg-rose-400/20 disabled:opacity-50">
          <Plus className="size-3.5" /> Flag
        </button>
      </form>

      {flags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {flags.map((flag) => (
            <span key={flag.id} title={flag.note || flag.reason} className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/25 bg-rose-400/10 py-1 pl-2.5 pr-1 text-[11px] text-rose-100">
              <span className="font-mono">{flag.phone}</span>
              <span className="text-rose-200/60">· {flag.reason}</span>
              <button type="button" onClick={() => remove(flag.id)} aria-label={`Remove flag for ${flag.phone}`} className="rounded-full p-0.5 text-rose-200/60 hover:bg-rose-300/20 hover:text-rose-100"><Trash2 className="size-3" /></button>
            </span>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[11px] text-rose-300">{error}</p>}
    </section>
  )
}
