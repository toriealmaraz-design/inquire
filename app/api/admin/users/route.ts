import { NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { requireSuperAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { isField } from '@/lib/fields'

export const runtime = 'nodejs'

export async function GET() {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar: users.avatar,
      role: users.role,
      status: users.status,
      field: users.field,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name))

  return NextResponse.json(rows)
}

export async function PATCH(request: Request) {
  if (!await requireSuperAdmin()) {
    return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const id = Number(body?.id)

  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Valid user ID required.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (typeof body?.status === 'string' && ['pending', 'active', 'disabled'].includes(body.status)) {
    updates.status = body.status
  }

  if (body?.role !== undefined) {
    const validRoles = ['super_admin', 'academic_lead', 'it_graphics_lead', 'field_specialist', 'agent', null, '']
    if (validRoles.includes(body.role)) {
      updates.role = body.role || null
    }
  }

  if (body?.field !== undefined) {
    if (body.field === null || body.field === '') updates.field = null
    else if (isField(body.field)) updates.field = body.field
    else return NextResponse.json({ error: 'Unknown field.' }, { status: 400 })
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      role: users.role,
      status: users.status,
      field: users.field,
    })

  return updated
    ? NextResponse.json(updated)
    : NextResponse.json({ error: 'User not found.' }, { status: 404 })
}
