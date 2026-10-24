import { NextResponse } from 'next/server'
import { desc, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { chatbotMisses } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth'

export const runtime = 'nodejs'

// Public: record a question the chatbot couldn't answer
export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const question = typeof body?.question === 'string' ? body.question.trim().replace(/\s+/g, ' ').slice(0, 300).toLowerCase() : ''
  if (question.length < 3) return NextResponse.json({ ok: false }, { status: 400 })
  try {
    await db
      .insert(chatbotMisses)
      .values({ question })
      .onConflictDoUpdate({ target: chatbotMisses.question, set: { hits: sql`${chatbotMisses.hits} + 1`, lastAt: new Date() } })
  } catch (error) {
    console.error('Miss log failed:', error)
  }
  return NextResponse.json({ ok: true })
}

// Super admin: most-asked unanswered questions
export async function GET() {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  const rows = await db.select().from(chatbotMisses).orderBy(desc(chatbotMisses.hits), desc(chatbotMisses.lastAt)).limit(25)
  return NextResponse.json(rows)
}

// Super admin: dismiss questions (after answering them)
export async function DELETE(request: Request) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  const body = await request.json().catch(() => null)
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Number.isInteger) : []
  if (ids.length) await db.delete(chatbotMisses).where(inArray(chatbotMisses.id, ids))
  return NextResponse.json({ ok: true })
}
