import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { settings } from '@/lib/db/schema'
import { requireSuperAdmin } from '@/lib/auth'

export const runtime = 'nodejs'

const clean = (value: unknown, maxLength: number) => (typeof value === 'string' ? value.trim().slice(0, maxLength) : '')

const publicDefaults = { whatsapp: '233206478727', telegram: 'GeminiNexusAdmin', instagram: 'GeminiNexusAdmin', snapchat: 'GeminiNexus' }

const publicColumns = {
  whatsapp: settings.whatsappNumber,
  telegram: settings.telegramUsername,
  instagram: settings.instagramUsername,
  snapchat: settings.snapchatUsername,
}

// Public: connector handles. With ?scope=admin (super admin only) also the commission %.
export async function GET(request: Request) {
  const admin = new URL(request.url).searchParams.get('scope') === 'admin'
  try {
    if (admin) {
      if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
      const [row] = await db.select({ ...publicColumns, commissionPercent: settings.commissionPercent }).from(settings).where(eq(settings.id, 1)).limit(1)
      return NextResponse.json(row ? { ...row, commissionPercent: Number(row.commissionPercent ?? 10) } : { ...publicDefaults, commissionPercent: 10 })
    }
    const [row] = await db.select(publicColumns).from(settings).where(eq(settings.id, 1)).limit(1)
    return NextResponse.json(row ?? publicDefaults)
  } catch {
    return NextResponse.json(publicDefaults)
  }
}

// Super admin: update only the fields that were sent
export async function PATCH(request: Request) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: 'Super admin access required.' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const values: Partial<typeof settings.$inferInsert> = { updatedAt: new Date() }
    if (typeof body.whatsapp === 'string') values.whatsappNumber = clean(body.whatsapp, 20)
    if (typeof body.telegram === 'string') values.telegramUsername = clean(body.telegram, 50)
    if (typeof body.instagram === 'string') values.instagramUsername = clean(body.instagram, 50)
    if (typeof body.snapchat === 'string') values.snapchatUsername = clean(body.snapchat, 50)
    if (body.commissionPercent !== undefined) {
      const pct = Number(body.commissionPercent)
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ error: 'Commission must be between 0 and 100%.' }, { status: 400 })
      }
      values.commissionPercent = pct.toFixed(2)
    }

    await db.insert(settings).values({ id: 1, ...values }).onConflictDoUpdate({ target: settings.id, set: values })

    const [row] = await db.select({ ...publicColumns, commissionPercent: settings.commissionPercent }).from(settings).where(eq(settings.id, 1)).limit(1)
    return NextResponse.json(row ? { ...row, commissionPercent: Number(row.commissionPercent ?? 10) } : publicDefaults)
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json({ error: 'Failed to save settings.' }, { status: 500 })
  }
}
