import { NextResponse } from 'next/server'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { ADMIN_ROLES } from '@/lib/auth'
import { sendPush } from '@/lib/push'

export const runtime = 'nodejs'

/**
 * Public (called by /chat). Keeps admins alerted about a client until someone replies:
 *  - first alert as soon as the client writes
 *  - then a reminder every 3 minutes while the client is still waiting (no admin reply after
 *    their latest message), escalating the wording. Stops once an admin answers or after 1 hour.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const id = Number(body?.conversationId)
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false }, { status: 400 })

  const { rows } = await db.execute(sql`
    with w as (
      select
        (select max(created_at) from messages where conversation_id = ${id} and sender_type = 'client') as last_client,
        (select max(created_at) from messages where conversation_id = ${id} and sender_type = 'agent') as last_agent
    )
    update conversations c set notified_at = now()
    from w
    where c.id = ${id}
      and w.last_client is not null
      and w.last_client > now() - interval '1 hour'
      and (w.last_agent is null or w.last_agent < w.last_client)
      and (c.notified_at is null or c.notified_at < now() - interval '3 minutes')
    returning c.client_name,
      extract(epoch from now() - (
        select min(created_at) from messages m
        where m.conversation_id = ${id} and m.sender_type = 'client'
          and m.created_at > coalesce(w.last_agent, '-infinity'::timestamptz)
      ))::int / 60 as waiting_min,
      (select content from messages m where m.conversation_id = ${id} and m.sender_type = 'client' order by id desc limit 1) as last`)
  const hit = rows[0] as { client_name: string; waiting_min: number; last: string } | undefined
  if (!hit) return NextResponse.json({ ok: true, sent: 0 })

  const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.status, 'active'), inArray(users.role, ADMIN_ROLES)))
  const preview = hit.last?.startsWith('📎') ? '📎 Sent a file' : (hit.last || '').slice(0, 140)
  const wait = Number(hit.waiting_min) || 0
  const title =
    wait < 2 ? `💬 New client: ${hit.client_name}` : wait < 10 ? `⏳ ${hit.client_name} is waiting (${wait} min)` : `🔴 ${hit.client_name} has waited ${wait} min. Please reply`
  const sent = await sendPush({ userIds: admins.map((a) => a.id) }, { title, body: preview, url: '/agent/chat', tag: `chat-${id}` }).catch(() => 0)
  return NextResponse.json({ ok: true, sent, waitingMinutes: wait })
}
