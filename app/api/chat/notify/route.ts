import { NextResponse } from 'next/server'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { ADMIN_ROLES } from '@/lib/auth'
import { sendPush } from '@/lib/push'

export const runtime = 'nodejs'

// Public (called by /chat after a client sends a message): push admins about it.
// Throttled to one alert per conversation every 3 minutes, and only if the
// conversation really has a client message from the last 2 minutes.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const id = Number(body?.conversationId)
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false }, { status: 400 })

  const { rows } = await db.execute(sql`
    update conversations set notified_at = now()
    where id = ${id}
      and (notified_at is null or notified_at < now() - interval '3 minutes')
      and exists (select 1 from messages m where m.conversation_id = ${id} and m.sender_type = 'client' and m.created_at > now() - interval '2 minutes')
    returning client_name,
      (select content from messages m where m.conversation_id = ${id} and m.sender_type = 'client' order by id desc limit 1) as last`)
  const hit = rows[0] as { client_name: string; last: string } | undefined
  if (!hit) return NextResponse.json({ ok: true, sent: 0 })

  const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.status, 'active'), inArray(users.role, ADMIN_ROLES)))
  const preview = hit.last?.startsWith('📎') ? '📎 Sent a file' : (hit.last || '').slice(0, 140)
  const sent = await sendPush(
    { userIds: admins.map((a) => a.id) },
    { title: `New message from ${hit.client_name}`, body: preview, url: '/agent/chat', tag: `chat-${id}` }
  ).catch(() => 0)
  return NextResponse.json({ ok: true, sent })
}
