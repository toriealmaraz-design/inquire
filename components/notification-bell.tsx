'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'

type Item = { id: number; title: string; body: string | null; url: string | null; read: boolean; createdAt: string }

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * Live notification bell for staff. Refreshes every 15s, when the tab regains focus,
 * and instantly when a push arrives (the service worker pings open tabs).
 * Also shows the unread count in the browser tab title.
 */
export function NotificationBell({ className = '' }: { className?: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const lastUnread = useRef(0)
  const baseTitle = useRef('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications', { cache: 'no-store' })
      if (!r.ok) return
      const d = await r.json()
      setItems(d.items || [])
      setUnread(d.unread || 0)
      if ((d.unread || 0) > lastUnread.current) {
        setPulse(true)
        setTimeout(() => setPulse(false), 1500)
      }
      lastUnread.current = d.unread || 0
    } catch {}
  }, [])

  useEffect(() => {
    baseTitle.current = document.title.replace(/^\(\d+\)\s*/, '')
    load()
    const t = setInterval(() => document.visibilityState === 'visible' && load(), 15_000)
    const onVis = () => document.visibilityState === 'visible' && load()
    const onSw = (e: MessageEvent) => e.data?.type === 'push' && load()
    document.addEventListener('visibilitychange', onVis)
    navigator.serviceWorker?.addEventListener('message', onSw)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
      navigator.serviceWorker?.removeEventListener('message', onSw)
    }
  }, [load])

  useEffect(() => {
    document.title = unread ? `(${unread}) ${baseTitle.current}` : baseTitle.current
  }, [unread])

  // close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const click = (e: MouseEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', click)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', click)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  const mark = async (payload: Record<string, unknown>) => {
    await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {})
    load()
  }

  const openItem = async (n: Item) => {
    if (!n.read) {
      setItems((l) => l.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnread((u) => Math.max(0, u - 1))
      await mark({ ids: [n.id] })
    }
    if (n.url) window.location.assign(n.url)
  }

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className={`relative flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.075] text-slate-300 backdrop-blur-2xl hover:text-white ${pulse ? 'animate-bounce' : ''}`}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-13 z-50 mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/15 bg-[#0a1929] shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            <div className="flex gap-3 text-[11px]">
              {unread > 0 && <button onClick={() => mark({ all: true })} className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200"><CheckCheck className="size-3.5" /> Mark all read</button>}
              {items.some((i) => i.read) && <button onClick={() => mark({ clear: true })} className="flex items-center gap-1 text-slate-400 hover:text-rose-300"><Trash2 className="size-3.5" /> Clear read</button>}
            </div>
          </div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-500">You&apos;re all caught up.</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button onClick={() => openItem(n)} className={`flex w-full gap-3 border-b border-white/5 px-4 py-3 text-left hover:bg-white/5 ${n.read ? 'opacity-60' : ''}`}>
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-cyan-400'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-white">{n.title}</span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-400">{n.body}</span>}
                      <span className="mt-1 block text-[10px] text-slate-500">{ago(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
