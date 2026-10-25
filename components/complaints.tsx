'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, CheckCircle2, MessageSquareWarning, Send, Trash2 } from 'lucide-react'
import { COMPLAINT_CATEGORIES } from '@/lib/fields'
import { superDelete } from '@/lib/admin-delete'

type Complaint = {
  id: number
  category: string
  subject: string
  body: string
  anonymous: boolean
  status: string
  response: string | null
  createdAt: string
  authorName: string | null
  authorRole: string | null
  responderName: string | null
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'
const field = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50'
const STATUS_TONE: Record<string, string> = {
  Open: 'bg-amber-500/15 text-amber-300',
  'In review': 'bg-cyan-500/15 text-cyan-200',
  Resolved: 'bg-emerald-500/15 text-emerald-300',
  Closed: 'bg-white/10 text-slate-400',
}
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Any staff member: lodge a complaint and follow its replies */
export function ComplaintForm() {
  const [items, setItems] = useState<Complaint[]>([])
  const [f, setF] = useState({ category: COMPLAINT_CATEGORIES[0], subject: '', body: '', anonymous: false })
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = () => fetch('/api/complaints?mine=1').then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => {})
  useEffect(() => {
    load()
  }, [])

  const submit = async () => {
    setSending(true)
    setMsg(null)
    const res = await fetch('/api/complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
    const d = await res.json().catch(() => ({}))
    setSending(false)
    if (!res.ok) return setMsg({ ok: false, text: d.error || 'Could not send.' })
    setF({ category: COMPLAINT_CATEGORIES[0], subject: '', body: '', anonymous: false })
    setMsg({ ok: true, text: 'Sent. The admins have been notified, and replies will appear below and in your bell.' })
    load()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
        <h2 className="flex items-center gap-2 font-bold"><MessageSquareWarning className="size-4 text-amber-300" /> Lodge a complaint</h2>
        <p className="mt-1 text-xs text-slate-500">Raise a problem with payments, assignments, another staff member or the system. Admins are notified straight away.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr]">
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label="Category" className={`${field} h-11 bg-white/10`}>
            {COMPLAINT_CATEGORIES.map((c) => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
          </select>
          <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} maxLength={150} placeholder="Subject" aria-label="Subject" className={`${field} h-11`} />
        </div>
        <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={5} maxLength={3000} placeholder="Describe what happened. Include ticket numbers, dates and names if relevant." aria-label="Details" className={`${field} mt-3 py-3`} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={f.anonymous} onChange={(e) => setF({ ...f, anonymous: e.target.checked })} className="accent-cyan-500" />
            Hide my name from admins (only the super admin can see it)
          </label>
          <button onClick={submit} disabled={sending} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50">
            <Send className="size-4" /> {sending ? 'Sending…' : 'Send complaint'}
          </button>
        </div>
        {msg && <p role="status" className={`mt-3 flex items-start gap-2 text-xs ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{msg.ok ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}{msg.text}</p>}
      </div>

      <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
        <h2 className="font-bold">My complaints</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">You haven&apos;t lodged any complaints.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {items.map((c) => (
              <li key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 font-medium text-white">{c.subject}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${STATUS_TONE[c.status] || STATUS_TONE.Closed}`}>{c.status}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">{c.category} · {when(c.createdAt)}{c.anonymous ? ' · anonymous' : ''}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{c.body}</p>
                {c.response && (
                  <div className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-sm">
                    <p className="text-[11px] font-semibold text-cyan-200">Reply from {c.responderName || 'an admin'}</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-200">{c.response}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Admins: complaints inbox with replies and status */
export function ComplaintsInbox({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [items, setItems] = useState<Complaint[]>([])
  const [filter, setFilter] = useState<'active' | 'all'>('active')
  const [reply, setReply] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<number | null>(null)

  const load = () => fetch('/api/complaints').then((r) => (r.ok ? r.json() : [])).then((d) => setItems(Array.isArray(d) ? d : [])).catch(() => {})
  useEffect(() => {
    load()
  }, [])

  const update = async (id: number, payload: Record<string, unknown>) => {
    setBusy(id)
    const res = await fetch('/api/complaints', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...payload }) })
    setBusy(null)
    if (res.ok) {
      setReply((r) => ({ ...r, [id]: '' }))
      load()
    } else window.alert('Could not update the complaint.')
  }

  const shown = items.filter((c) => filter === 'all' || c.status === 'Open' || c.status === 'In review')
  const open = items.filter((c) => c.status === 'Open').length

  return (
    <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold"><MessageSquareWarning className="size-4 text-amber-300" /> Staff complaints</h2>
          <p className="mt-1 text-xs text-slate-500">{open} open · {items.length} total. Replies notify the person who raised it.</p>
        </div>
        <div className="flex rounded-xl bg-white/5 p-1 text-xs">
          {(['active', 'all'] as const).map((k) => (
            <button key={k} onClick={() => setFilter(k)} className={`rounded-lg px-3 py-1.5 ${filter === k ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'}`}>{k === 'active' ? 'Needs action' : 'All'}</button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">{filter === 'active' ? 'No complaints need action.' : 'No complaints yet.'}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {shown.map((c) => (
            <li key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 font-medium text-white">{c.subject}</p>
                <div className="flex items-center gap-2">
                  <select value={c.status} onChange={(e) => update(c.id, { status: e.target.value })} disabled={busy === c.id} aria-label="Status" className={`rounded-full border-0 px-2 py-0.5 text-[11px] ${STATUS_TONE[c.status] || STATUS_TONE.Closed}`}>
                    {['Open', 'In review', 'Resolved', 'Closed'].map((s) => <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>)}
                  </select>
                  {isSuperAdmin && (
                    <button onClick={async () => { if (await superDelete('complaint', [c.id], `Delete the complaint "${c.subject}"?`)) setItems((l) => l.filter((x) => x.id !== c.id)) }} aria-label="Delete complaint" className="text-slate-500 hover:text-rose-300"><Trash2 className="size-4" /></button>
                  )}
                </div>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {c.category} · from <strong className="text-slate-300">{c.authorName || 'Unknown'}</strong>{c.authorRole ? ` (${c.authorRole.replace(/_/g, ' ')})` : ''}{c.anonymous && isSuperAdmin ? ' · asked to stay anonymous' : ''} · {when(c.createdAt)}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{c.body}</p>
              {c.response && (
                <p className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 text-sm text-slate-200"><span className="block text-[11px] font-semibold text-cyan-200">Reply by {c.responderName || 'admin'}</span>{c.response}</p>
              )}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input value={reply[c.id] ?? ''} onChange={(e) => setReply((r) => ({ ...r, [c.id]: e.target.value }))} placeholder={c.response ? 'Update your reply…' : 'Write a reply…'} aria-label="Reply" className={`${field} h-10 flex-1`} />
                <button onClick={() => update(c.id, { response: reply[c.id] })} disabled={busy === c.id || !(reply[c.id] || '').trim()} className="h-10 rounded-xl bg-cyan-500/20 px-4 text-xs font-bold text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50">Send reply</button>
                <button onClick={() => update(c.id, { status: 'Resolved', ...(reply[c.id]?.trim() ? { response: reply[c.id] } : {}) })} disabled={busy === c.id} className="h-10 rounded-xl bg-emerald-500/20 px-4 text-xs font-bold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50">Resolve</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
