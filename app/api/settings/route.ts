import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { getStaffUser, isAdmin, requireSuperAdmin } from '@/lib/auth'

export const runtime = 'nodejs'

const clean = (value: unknown, maxLength: number) => (typeof value === 'string' ? value.trim().slice(0, maxLength) : '')

// The super admin's own contact handles: visible to admins only (never public)
const contactColumns = {
  whatsapp: settings.whatsappNumber,
  telegram: settings.telegramUsername,
  instagram: settings.instagramUsername,
  snapchat: settings.snapchatUsername,
  email: settings.contactEmail,
}

// Admins: super admin contact handles. ?scope=admin (super admin): also commission %.
export async function GET(request: Request) {
  const scopeAdmin = new URL(request.url).searchParams.get('scope') === 'admin'
  if (scopeAdmin) {
    if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
    const [row] = await db.select({ ...contactColumns, commissionPercent: settings.commissionPercent }).from(settings).where(eq(settings.id, 1)).limit(1)
    return NextResponse.json({ ...row, commissionPercent: Number(row?.commissionPercent ?? 10) })
  }
  const user = await getStaffUser()
  if (!user || !isAdmin(user.role)) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  const [row] = await db.select(contactColumns).from(settings).where(eq(settings.id, 1)).limit(1)
  return NextResponse.json(row ?? {})
}

// Super admin: update only the fields that were sent
export async function PATCH(request: Request) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const values: Partial<typeof settings.$inferInsert> = { updatedAt: new Date() }
    if (typeof body.whatsapp === 'string') values.whatsappNumber = clean(body.whatsapp, 20).replace(/[^\d+]/g, '')
    if (typeof body.telegram === 'string') values.telegramUsername = clean(body.telegram, 50).replace(/^@/, '')
    if (typeof body.instagram === 'string') values.instagramUsername = clean(body.instagram, 50).replace(/^@/, '')
    if (typeof body.snapchat === 'string') values.snapchatUsername = clean(body.snapchat, 50).replace(/^@/, '')
    if (typeof body.email === 'string') values.contactEmail = clean(body.email, 120)
    if (body.commissionPercent !== undefined) {
      const pct = Number(body.commissionPercent)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ error: 'Commission must be between 0 and 100%.' }, { status: 400 })
      }
      values.commissionPercent = pct.toFixed(2)
    }

    await db.insert(settings).values({ id: 1, ...values }).onConflictDoUpdate({ target: settings.id, set: values })

    const [row] = await db.select({ ...contactColumns, commissionPercent: settings.commissionPercent }).from(settings).where(eq(settings.id, 1)).limit(1)
    return NextResponse.json({ ...row, commissionPercent: Number(row?.commissionPercent ?? 10) })
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 })
  }
}
