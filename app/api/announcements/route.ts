import { NextResponse } from 'next/server'
import { desc, eq, isNull, or } from 'drizzle-orm'
import { db } from '@/lib/db'
import { announcements, users } from '@/lib/db/schema'
import { getStaffUser, isAdmin } from '@/lib/auth'
import { fieldLabel, isField } from '@/lib/fields'
import { sendPush } from '@/lib/push'

export const runtime = 'nodejs'

// Staff see announcements for everyone plus their own field; super admin sees all
export async function GET() {
  const user = await getStaffUser()
  if (!user) return NextResponse.json({ error: 'Staff sign-in required.' }, { status: 403 })

  const visible =
    user.role === 'super_admin'
      ? undefined
      : user.field
        ? or(isNull(announcements.field), eq(announcements.field, user.field))
        : isNull(announcements.field)

  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      body: announcements.body,
      field: announcements.field,
      createdAt: announcements.createdAt,
      author: users.name,
    })
    .from(announcements)
    .leftJoin(users, eq(announcements.createdBy, users.id))
    .where(visible)
    .orderBy(desc(announcements.createdAt))
    .limit(30)

  return NextResponse.json(rows)
}

// Super admin: everyone or one field. Field admins: their own field only.
export async function POST(request: Request) {
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) {
    return NextResponse.json({ error: 'Only admins can post announcements.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : ''
  const text = typeof body?.body === 'string' ? body.body.trim().slice(0, 2000) : ''
  if (!title || !text) return NextResponse.json({ error: 'Add a title and a message.' }, { status: 400 })

  let field: string | null
  if (user.role === 'super_admin') {
    field = isField(body?.field) ? body.field : null
  } else {
    if (!user.field) {
      return NextResponse.json({ error: 'The super admin has not assigned you a field yet.' }, { status: 403 })
    }
    field = user.field
  }

  const [created] = await db
    .insert(announcements)
    .values({ title, body: text, field, createdBy: user.id })
    .returning()

  let sent = 0
  try {
    sent = await sendPush(
      { field },
      { title: field ? `${fieldLabel(field)}: ${title}` : title, body: text.slice(0, 180), url: '/dashboard', tag: `announcement-${created.id}` }
    )
  } catch (error) {
    console.error('Announcement push failed:', error)
  }

  return NextResponse.json({ announcement: { ...created, author: user.name }, sent }, { status: 201 })
}
