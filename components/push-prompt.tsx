'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, X } from 'lucide-react'

type Status = 'checking' | 'unsupported' | 'ios-install' | 'default' | 'denied' | 'working' | 'on' | 'error'

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function subscribe() {
  const registration = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const keyRes = await fetch('/api/push/key')
  if (!keyRes.ok) throw new Error('Push is not configured on the server.')
  const { publicKey } = await keyRes.json()
  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }))
  const save = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  })
  if (!save.ok) throw new Error('Could not save this device.')
}

/**
 * Staff notification prompt. Stays visible until notifications are on,
 * and silently re-registers the device once permission is granted.
 */
export function PushPrompt({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>('checking')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!supported) {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
      const standalone = window.matchMedia('(display-mode: standalone)').matches
      setStatus(ios && !standalone ? 'ios-install' : 'unsupported')
      return
    }
    if (Notification.permission === 'granted') {
      subscribe().then(() => setStatus('on')).catch(() => setStatus('error'))
    } else {
      setStatus(Notification.permission === 'denied' ? 'denied' : 'default')
    }
  }, [])

  const enable = useCallback(async () => {
    setStatus('working')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'default')
        return
      }
      await subscribe()
      setStatus('on')
    } catch {
      setStatus('error')
    }
  }, [])

  if (status === 'checking' || status === 'on') return null
  // "Unsupported" can be hidden for the session; everything else keeps reminding.
  if (dismissed && (status === 'unsupported' || status === 'ios-install')) return null

  const message =
    status === 'denied'
      ? "Notifications are blocked. Click the lock icon next to the address bar, allow Notifications, then reload."
      : status === 'ios-install'
        ? 'On iPhone, tap Share → Add to Home Screen, open the app from there, then turn on notifications.'
        : status === 'unsupported'
          ? "This browser can't receive push notifications. Use Chrome, Edge, Firefox or Safari."
          : status === 'error'
            ? "We couldn't turn on notifications. Try again."
            : 'Turn on notifications so you hear about new client messages, briefs and announcements.'

  const canEnable = status === 'default' || status === 'error' || status === 'working'

  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-100 ${compact ? 'm-3 p-3 text-xs' : 'mb-6 p-4 text-sm'}`}
    >
      {status === 'denied' ? <BellOff className="size-5 shrink-0 text-amber-300" /> : <Bell className="size-5 shrink-0 text-amber-300" />}
      <p className="flex-1 leading-5">{message}</p>
      {canEnable && (
        <button
          onClick={enable}
          disabled={status === 'working'}
          className="shrink-0 rounded-xl bg-amber-300 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-200 disabled:opacity-60"
        >
          {status === 'working' ? 'Turning on…' : 'Turn on'}
        </button>
      )}
      {(status === 'unsupported' || status === 'ios-install') && (
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 text-amber-200/70 hover:text-amber-100">
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
