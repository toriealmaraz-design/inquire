'use client'

import { useEffect, useState } from 'react'
import { Megaphone, Send } from 'lucide-react'
import { FIELDS, fieldLabel } from '@/lib/fields'

type Announcement = {
  id: number
  title: string
  body: string
  field: string | null
  createdAt: string
  author: string | null
}

const glass = 'border border-white/15 bg-white/[0.075] shadow-2xl shadow-black/20 backdrop-blur-2xl'

function when(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * Announcements feed. Admins also get a compose form:
 * super admin picks the audience, field admins post to their own field.
 */
export function Announcements({ role, field, limit }: { role?: string | null; field?: string | null; limit?: number }) {
  const isSuperAdmin = role === 'super_admin'
  const canPost = isSuperAdmin || ['academic_lead', 'it_graphics_lead', 'field_specialist'].includes(role || '')

  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('')
  const [posting, setPosting] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/announcements')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setItems(Array.isArray(rows) ? rows : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const post = async () => {
    setPosting(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, field: isSuperAdmin ? audience || null : undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not post the announcement.')
      setItems((prev) => [data.announcement, ...prev])
      setTitle('')
      setBody('')
      setNotice(`Posted. Push sent to ${data.sent} device${data.sent === 1 ? '' : 's'}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not post the announcement.')
    } finally {
      setPosting(false)
    }
  }

  const fieldAdminWithoutField = canPost && !isSuperAdmin && !field
  const shown = limit ? items.slice(0, limit) : items

  return (
    <div className="flex flex-col gap-6">
      {canPost && (
        <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
          <h2 className="flex items-center gap-2 font-bold"><Megaphone className="size-4 text-cyan-300" /> New announcement</h2>
          <p className="mt-1 text-xs text-slate-500">
            {isSuperAdmin ? 'Send to all staff or one field.' : field ? `Goes to staff in ${fieldLabel(field)}.` : ''}
          </p>
          {fieldAdminWithoutField ? (
            <p className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
              Ask the super admin to assign you a field in User Management before you can post.
            </p>
          ) : (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Title"
                className="mt-4 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="Message"
                className="mt-3 w-full resize-y rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-500/50"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                {isSuperAdmin && (
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    aria-label="Audience"
                    className="h-11 rounded-xl border border-white/10 bg-white/10 px-3 text-sm text-white"
                  >
                    <option value="" className="bg-slate-900">All staff</option>
                    {FIELDS.map((f) => (
                      <option key={f.value} value={f.value} className="bg-slate-900">{f.label}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={post}
                  disabled={posting || !title.trim() || !body.trim()}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-sm font-bold text-white hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  <Send className="size-4" /> {posting ? 'Sending…' : 'Send announcement'}
                </button>
              </div>
            </>
          )}
          {notice && <p className="mt-3 text-xs text-emerald-300">{notice}</p>}
          {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
        </div>
      )}

      <div className={`${glass} rounded-3xl p-5 sm:p-6`}>
        <h2 className="font-bold">Announcements</h2>
        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No announcements yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {shown.map((a) => (
              <li key={a.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{a.title}</p>
                  <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-[11px] text-cyan-200">{a.field ? fieldLabel(a.field) : 'All staff'}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{a.body}</p>
                <p className="mt-2 text-[11px] text-slate-500">{[a.author, when(a.createdAt)].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
