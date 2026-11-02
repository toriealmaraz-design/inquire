import { NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { requireSuperAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { isField, fieldLabel } from '@/lib/fields'
import { sendPush } from '@/lib/push'

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  academic_lead: 'Academic Lead',
  it_graphics_lead: 'IT/Graphics Lead',
  field_specialist: 'Field Specialist',
  admin: 'Admin',
  agent: 'Agent',
}

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
      onboardedAt: users.onboardedAt,
      profile: users.profile,
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

  const [before] = await db.select({ status: users.status, role: users.role, field: users.field }).from(users).where(eq(users.id, id)).limit(1)
  if (!before) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

  // pending -> active (approve) | rejected (reject); active -> disabled (removed / sacked)
  if (typeof body?.status === 'string' && ['pending', 'active', 'disabled', 'rejected'].includes(body.status)) {
    if (before.role === 'super_admin' && body.status !== 'active') {
      return NextResponse.json({ error: 'The super admin account cannot be removed.' }, { status: 400 })
    }
    updates.status = body.status
  }

  if (body?.role !== undefined) {
    const validRoles = ['super_admin', 'academic_lead', 'it_graphics_lead', 'field_specialist', 'admin', 'agent', null, '']
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

  if (!updated) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

  // Tell the user about changes to their own account (in-app bell + push).
  try {
    const home = updated.role && updated.role !== 'agent' ? '/dashboard' : '/agent/dashboard'
    const alerts: { title: string; body: string }[] = []
    if (updates.status !== undefined && updated.status !== before.status) {
      if (updated.status === 'active' && before.status === 'pending') alerts.push({ title: '✅ Account approved', body: 'Welcome aboard! Complete your skills profile to start receiving work.' })
      else if (updated.status === 'active') alerts.push({ title: '✅ Access restored', body: 'Your account is active again. Sign in to continue.' })
      else if (updated.status === 'rejected') alerts.push({ title: 'Account request declined', body: 'Your sign-up request was not approved. Contact the admin if you think this is a mistake.' })
      else if (updated.status === 'disabled') alerts.push({ title: 'Access removed', body: 'Your account has been deactivated. Contact the admin for details.' })
    }
    if (updates.role !== undefined && updated.role !== before.role) {
      alerts.push({ title: 'Your role was updated', body: `You are now ${updated.role ? ROLE_LABEL[updated.role] || updated.role : 'unassigned'}.` })
    }
    if (updates.field !== undefined && updated.field !== before.field) {
      alerts.push({ title: 'Your skill area was updated', body: `Your skill area is now ${fieldLabel(updated.field)}.` })
    }
    for (const a of alerts) {
      await sendPush({ userIds: [id] }, { title: a.title, body: a.body, url: home })
    }
  } catch (error) {
    console.error('Account notification failed:', error)
  }

  return NextResponse.json(updated)
}
