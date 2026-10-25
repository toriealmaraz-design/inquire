import webpush from 'web-push'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { pushSubscriptions, settings, users } from '@/lib/db/schema'

export type PushPayload = { title: string; body: string; url?: string; tag?: string }

type Target = { userIds?: number[]; field?: string | null }

let configured = false

async function configure() {
  if (configured) return true
  const [row] = await db
    .select({ pub: settings.vapidPublicKey, priv: settings.vapidPrivateKey })
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1)
  if (!row?.pub || !row?.priv) return false
  const contact = process.env.SUPER_ADMIN_EMAIL ? `mailto:${process.env.SUPER_ADMIN_EMAIL}` : 'mailto:admin@example.com'
  webpush.setVapidDetails(contact, row.pub, row.priv)
  configured = true
  return true
}

export async function getVapidPublicKey() {
  const [row] = await db.select({ pub: settings.vapidPublicKey }).from(settings).where(eq(settings.id, 1)).limit(1)
  return row?.pub ?? null
}

/**
 * Send a push to active staff devices.
 * - userIds: only those users
 * - field: only staff assigned to that field
 * - neither: every active staff member
 * Dead subscriptions (404/410) are removed. Returns devices reached.
 */
export async function sendPush(target: Target, payload: PushPayload) {
  if (!(await configure())) return 0

  const conditions = [eq(users.status, 'active')]
  if (target.userIds?.length) conditions.push(inArray(users.id, target.userIds))
  else if (target.field) conditions.push(eq(users.field, target.field))

  const subs = await db
    .select({ id: pushSubscriptions.id, endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth: pushSubscriptions.auth })
    .from(pushSubscriptions)
    .innerJoin(users, eq(pushSubscriptions.userId, users.id))
    .where(and(...conditions))

  const body = JSON.stringify(payload)
  const deliver = (s: (typeof subs)[number]) =>
    webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24, timeout: 10_000 })
  const results = await Promise.allSettled(
    subs.map(async (s) => {
      try {
        return await deliver(s)
      } catch (error) {
        // Network blips have no status code: retry once
        if ((error as { statusCode?: number })?.statusCode) throw error
        await new Promise((r) => setTimeout(r, 800))
        return deliver(s)
      }
    })
  )

  const dead: number[] = []
  let sent = 0
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') sent++
    else {
      const err = r.reason as { statusCode?: number; body?: string; message?: string }
      if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(subs[i].id)
      else console.error('Push send failed:', err?.statusCode ?? 'network', new URL(subs[i].endpoint).host, (err?.body || err?.message || String(r.reason)).slice(0, 200))
    }
  })
  if (dead.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead))
  return sent
}
