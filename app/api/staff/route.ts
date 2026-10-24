import { NextResponse } from 'next/server'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { CHAT_ROLES, getStaffUser, isAdmin } from '@/lib/auth'

export const runtime = 'nodejs'

// Admins: active staff who can take assignments (for the "Assign to" picker)
export async function GET() {
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const rows = await db
    .select({ id: users.id, name: users.name, role: users.role, field: users.field })
    .from(users)
    .where(and(eq(users.status, 'active'), inArray(users.role, CHAT_ROLES)))
    .orderBy(asc(users.name))
  return NextResponse.json(rows)
}
