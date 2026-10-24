import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { chatbotReplies, settings } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Public: the chatbot's answers (enabled only). ?scope=admin -> everything, for the editor.
export async function GET(request: Request) {
  const admin = new URL(request.url).searchParams.get('scope') === 'admin'
  if (admin && !(await requireSuperAdmin())) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  try {
    const [rows, [cfg]] = await Promise.all([
      db.select().from(chatbotReplies).orderBy(asc(chatbotReplies.sort), asc(chatbotReplies.id)),
      db.select({ greeting: settings.chatGreeting, autoReplyEnabled: settings.autoReplyEnabled }).from(settings).where(eq(settings.id, 1)).limit(1),
    ])
    const replies = (admin ? rows : rows.filter((r) => r.enabled)).map((r) => ({
      id: r.id, question: r.question, keywords: r.keywords, reply: r.reply, enabled: r.enabled,
    }))
    return NextResponse.json({ greeting: cfg?.greeting ?? '', autoReplyEnabled: cfg?.autoReplyEnabled ?? true, replies })
  } catch (error) {
    console.error('Chatbot GET failed:', error)
    return NextResponse.json({ greeting: '', autoReplyEnabled: false, replies: [] })
  }
}

type Incoming = { question?: unknown; keywords?: unknown; reply?: unknown; enabled?: unknown }
const clean = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

// Super admin: save greeting, on/off switch and the full list of answers
export async function PUT(request: Request) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.replies)) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const replies = (body.replies as Incoming[])
    .map((r, i) => ({
      question: clean(r.question, 120),
      keywords: clean(r.keywords, 500).toLowerCase(),
      reply: clean(r.reply, 1500),
      enabled: r.enabled !== false,
      sort: i + 1,
    }))
    .filter((r) => r.question && r.reply)
  if (replies.length > 60) return NextResponse.json({ error: 'Up to 60 answers.' }, { status: 400 })
  if (replies.some((r) => !r.keywords)) return NextResponse.json({ error: 'Every answer needs at least one keyword.' }, { status: 400 })

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(settings)
        .set({ chatGreeting: clean(body.greeting, 600), autoReplyEnabled: body.autoReplyEnabled !== false, updatedAt: new Date() })
        .where(eq(settings.id, 1))
      await tx.delete(chatbotReplies)
      if (replies.length) await tx.insert(chatbotReplies).values(replies)
    })
    return NextResponse.json({ ok: true, count: replies.length })
  } catch (error) {
    console.error('Chatbot PUT failed:', error)
    return NextResponse.json({ error: 'Could not save the chatbot.' }, { status: 500 })
  }
}
