import { NextResponse } from 'next/server'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { ADMIN_ROLES } from '@/lib/auth'
import { sendPush } from '@/lib/push'

export const runtime = 'nodejs'

// Public: someone opened Live Chat → "possible client" alert to admins.
// Globally throttled to one alert every 5 minutes so it can't be spammed.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const returning = body?.returning === true
  const { rows } = await db.execute(sql`
    update settings set visit_alert_at = now()
    where id = 1 and (visit_alert_at is null or visit_alert_at < now() - interval '5 minutes')
    returning id`)
  if (!rows.length) return NextResponse.json({ ok: true, sent: 0 })
  const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.status, 'active'), inArray(users.role, ADMIN_ROLES)))
  const sent = await sendPush(
    { userIds: admins.map((a) => a.id) },
    { title: '👀 Possible client on Live Chat', body: returning ? 'A returning client just opened Live Chat.' : 'Someone just opened Live Chat. Be ready to reply.', url: '/agent/chat', tag: 'visit' }
  ).catch(() => 0)
  return NextResponse.json({ ok: true, sent })
}
