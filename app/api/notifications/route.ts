import { NextResponse } from 'next/server'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { notifications } from '@/lib/db/schema'
import { getStaffUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Your latest notifications + unread count
export async function GET() {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })
  const [items, [{ unread }]] = await Promise.all([
    db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(desc(notifications.createdAt)).limit(40),
    db.select({ unread: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, user.id), eq(notifications.read, false))),
  ])
  return NextResponse.json({ unread, items }, { headers: { 'Cache-Control': 'no-store' } })
}

// { ids: number[] } marks some read; { all: true } marks everything read; { clear: true } deletes read ones
export async function POST(request: Request) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  const mine = eq(notifications.userId, user.id)
  if (body?.clear === true) {
    await db.delete(notifications).where(and(mine, eq(notifications.read, true)))
  } else if (body?.all === true) {
    await db.update(notifications).set({ read: true }).where(and(mine, eq(notifications.read, false)))
  } else if (Array.isArray(body?.ids) && body.ids.length) {
    const ids = body.ids.map(Number).filter(Number.isInteger).slice(0, 100)
    await db.update(notifications).set({ read: true }).where(and(mine, inArray(notifications.id, ids)))
  }
  return NextResponse.json({ ok: true })
}
