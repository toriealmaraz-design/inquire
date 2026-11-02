import { NextResponse } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { conversations, users } from '@/lib/db/schema'
import { ADMIN_ROLES } from '@/lib/auth'
import { sendPush } from '@/lib/push'

export const runtime = 'nodejs'

// Public (called by the client live chat when a visitor starts a call).
// Always alerts every active admin so they can open the chat and answer — even if they
// are not currently on the chat page.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const id = Number(body?.conversationId)
  const video = body?.callType === 'video'
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ ok: false }, { status: 400 })

  const [convo] = await db.select({ name: conversations.clientName }).from(conversations).where(eq(conversations.id, id)).limit(1)
  const name = convo?.name || 'A client'
  const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.status, 'active'), inArray(users.role, ADMIN_ROLES)))

  const sent = await sendPush(
    { userIds: admins.map((a) => a.id) },
    { title: `📞 ${video ? 'Video ' : ''}call from ${name}`, body: 'Tap to open Live Chat and answer.', url: '/agent/chat', tag: `call-${id}` }
  ).catch(() => 0)

  return NextResponse.json({ ok: true, sent })
}
