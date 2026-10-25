import { NextResponse } from 'next/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/lib/db'
import { complaints, users } from '@/lib/db/schema'
import { ADMIN_ROLES, getStaffUser, isAdmin } from '@/lib/auth'
import { sendPush } from '@/lib/push'
import { COMPLAINT_CATEGORIES } from '@/lib/fields'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CATEGORIES = COMPLAINT_CATEGORIES
const STATUSES = ['Open', 'In review', 'Resolved', 'Closed']
const author = alias(users, 'author')
const responder = alias(users, 'responder')
const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')

// Staff: their own complaints. Admins: everyone's (?mine=1 for just their own).
export async function GET(request: Request) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })
  const mine = new URL(request.url).searchParams.get('mine') === '1' || !isAdmin(user.role)
  const rows = await db
    .select({
      id: complaints.id, category: complaints.category, subject: complaints.subject, body: complaints.body,
      anonymous: complaints.anonymous, status: complaints.status, response: complaints.response,
      createdAt: complaints.createdAt, updatedAt: complaints.updatedAt, userId: complaints.userId,
      authorName: author.name, authorRole: author.role, responderName: responder.name,
    })
    .from(complaints)
    .leftJoin(author, eq(complaints.userId, author.id))
    .leftJoin(responder, eq(complaints.respondedBy, responder.id))
    .where(mine ? eq(complaints.userId, user.id) : undefined)
    .orderBy(desc(complaints.createdAt))
    .limit(200)
  // Anonymous complaints hide the author from everyone except the super admin
  const out = rows.map((r) =>
    r.anonymous && !mine && user.role !== 'super_admin' ? { ...r, authorName: 'Anonymous', authorRole: null, userId: null } : r
  )
  return NextResponse.json(out)
}

// Any staff member: lodge a complaint
export async function POST(request: Request) {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })
  const b = await request.json().catch(() => null)
  const subject = str(b?.subject, 150)
  const body = str(b?.body, 3000)
  const category = CATEGORIES.includes(b?.category) ? b.category : 'Other'
  if (subject.length < 3 || body.length < 10) return NextResponse.json({ error: 'Add a short subject and describe the problem (at least 10 characters).' }, { status: 400 })
  const [row] = await db.insert(complaints).values({ userId: user.id, subject, body, category, anonymous: b?.anonymous === true }).returning()

  const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.status, 'active'), inArray(users.role, ADMIN_ROLES)))
  sendPush(
    { userIds: admins.map((a) => a.id).filter((id) => id !== user.id) },
    { title: `New complaint: ${subject}`, body: `${category}${b?.anonymous ? ' · anonymous' : ` · from ${user.name}`}`, url: '/dashboard?tab=Complaints', tag: `complaint-${row.id}` }
  ).catch(() => {})
  return NextResponse.json(row, { status: 201 })
}

// Admins: update status / reply. The person who lodged it is notified.
export async function PATCH(request: Request) {
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const b = await request.json().catch(() => null)
  const id = Number(b?.id)
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'Invalid complaint.' }, { status: 400 })
  const set: Partial<typeof complaints.$inferInsert> = { updatedAt: new Date() }
  if (STATUSES.includes(b?.status)) set.status = b.status
  if (typeof b?.response === 'string') {
    set.response = str(b.response, 3000) || null
    set.respondedBy = user.id
    if (!set.status) set.status = 'In review'
  }
  const [row] = await db.update(complaints).set(set).where(eq(complaints.id, id)).returning()
  if (!row) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (row.userId && row.userId !== user.id) {
    sendPush({ userIds: [row.userId] }, { title: `Complaint update: ${row.subject}`, body: `Status: ${row.status}${set.response ? ` · ${set.response.slice(0, 120)}` : ''}`, url: '/complaints', tag: `complaint-${row.id}` }).catch(() => {})
  }
  return NextResponse.json(row)
}
